import {BrowserWindow,session} from 'electron';
import {attachComments,extractNaverComments,extractNaverCommentResponse,mergeComments,emptyComments,type CommentReport} from '../core/comments.js';
import {commentActionScript} from './comment-actions.js';
import {OriginalReader,extractOriginal,extractCafeResponse,readerSelectors,type OriginalSource,type Original} from '../core/original.js';
import {publicNaverUrl,articleIdentity} from '../core/original-url.js';
import {PageRead} from '../core/page-read.js';
import {bounded,CollectionStalledError} from '../core/operation.js';
import type {ReadObserver} from '../core/original.js';
import {Network,wait} from '../core/network.js';
export class DesktopOriginalReader implements OriginalSource {
 private activeRenders=0;private clearing?:Promise<void>;private partition='public-original-reader';private generation=0;private cleanupFailed=false;
 private recoverSession(observe?:ReadObserver){if(++this.generation>3)throw new CollectionStalledError('수집 브라우저 저장소가 반복해서 응답하지 않습니다. 진단을 복사한 뒤 앱을 다시 실행하세요.');this.partition='public-original-reader-recovery-'+this.generation;this.clearing=undefined;this.cleanupFailed=false;observe?.({phase:'loading',message:'수집 저장소 응답 지연 · 새 임시 세션으로 복구'});}
 constructor(private net:Network){}
 async read(raw:string,removeAds:boolean,signal:AbortSignal,removeHashtags=false,includeComments=false,observe?:ReadObserver):Promise<Original>{
  observe?.({phase:'loading',message:'정적 원문 연결 확인',url:raw});
  const safe=publicNaverUrl(raw),staticDeadline=AbortSignal.timeout(20000),staticSignal=AbortSignal.any([signal,staticDeadline]);let staticBody:Original|undefined,staticError:unknown;
  try{staticBody=await new OriginalReader(this.net).read(safe,removeAds,staticSignal,removeHashtags,includeComments);observe?.({phase:'body',message:'원문 확인',url:staticBody.url,comments:staticBody.comments?.items.length,original:staticBody});if(staticBody.date&&(!includeComments||staticBody.comments?.status==='complete'))return staticBody;}catch(error){signal.throwIfAborted();staticError=staticDeadline.aborted?Error('정적 원문 요청 20초 시간 초과'):error;}
  try{return await this.render(safe,removeAds,signal,removeHashtags,includeComments,staticBody,observe);}catch(error){signal.throwIfAborted();if(staticBody)return includeComments?attachComments(staticBody,emptyComments('댓글 페이지 연결 실패: '+(error as Error).message)):staticBody;throw Error((error as Error).message+(staticError?' · '+(staticError as Error).message:''));}
 }
 private async render(safe:string,removeAds:boolean,signal:AbortSignal,removeHashtags:boolean,includeComments:boolean,initial?:Original,observe?:ReadObserver):Promise<Original>{
  if(this.cleanupFailed)this.recoverSession(observe);while(this.clearing){const cleanup=this.clearing;try{await bounded(()=>cleanup,2000,'수집 저장소 정리 응답 지연',signal);}catch{signal.throwIfAborted();if(this.clearing===cleanup)this.recoverSession(observe);}}
  signal.throwIfAborted();this.activeRenders++;const partition=this.partition;observe?.({phase:'loading',message:'브라우저 본문 로딩',url:safe});
  try{return await this.renderPage(safe,removeAds,signal,removeHashtags,includeComments,initial,partition,observe);}finally{if(--this.activeRenders===0){const cleanup=Promise.resolve().then(()=>session.fromPartition(partition).clearStorageData());this.clearing=cleanup;void cleanup.then(()=>{if(this.clearing===cleanup)this.clearing=undefined;},()=>{if(this.clearing===cleanup){this.clearing=undefined;if(this.partition===partition)this.cleanupFailed=true;}});}}
 }
 private async renderPage(safe:string,removeAds:boolean,signal:AbortSignal,removeHashtags:boolean,includeComments:boolean,initial:Original|undefined,partition:string,observe?:ReadObserver):Promise<Original>{
  signal.throwIfAborted();const isolated=session.fromPartition(partition);
  isolated.setPermissionRequestHandler((_w,_p,callback)=>callback(false));isolated.setPermissionCheckHandler(()=>false);
  const win=new BrowserWindow({show:false,webPreferences:{partition,sandbox:true,nodeIntegration:false,contextIsolation:true,webSecurity:true,backgroundThrottling:false,disableDialogs:true}});
  win.webContents.on('will-navigate',(e,raw)=>{try{publicNaverUrl(raw);}catch{e.preventDefault();}});
  const onDownload=(event:Electron.Event)=>event.preventDefault();isolated.on('will-download',onDownload);
  let timedOut=false,loadError='',processError='',responseBody:Original|undefined,comments:CommentReport|undefined,lastAction=0,actions=0,lastCommentChange=Date.now(),commentSignature='',readingComments=false,commentNotice='',pageNotice='';
  // Cancel native alert/confirm dialogs in this unattended reader; keep all new windows blocked.
  win.webContents.setWindowOpenHandler(()=>{pageNotice='네이버가 새 창을 요청했지만 공개 원문 수집 창에서는 허용하지 않았습니다.';if(readingComments||includeComments&&lastAction>0&&Date.now()-lastAction<3000)commentNotice='댓글 기능에서 새 창을 요청해 해당 댓글을 확인하지 못했습니다.';return {action:'deny'};});
  const finish=(body:Original,report:CommentReport|undefined)=>{const result=report||emptyComments();return attachComments(body,commentNotice?{...result,status:result.items.length?'partial':'unavailable',reason:commentNotice}:result);};
  const abort=()=>{if(!win.isDestroyed())win.destroy();};win.on('unresponsive',()=>{processError='원문 수집 창이 응답하지 않습니다.';abort();});win.webContents.on('render-process-gone',(_event,details)=>{processError='원문 수집 렌더러 종료 ('+details.reason+')';abort();});signal.addEventListener('abort',abort,{once:true});
  const timeout=setTimeout(()=>{timedOut=true;abort();},includeComments?120000:45000);
  // Observe the JSON that the normal public page already requests. No alternate/private endpoint calls.
  const pending=new Map<string,string>(),tasks=new Set<Promise<void>>();
  try{
   win.webContents.debugger.attach('1.3');
   win.webContents.debugger.on('message',(_event,method,params)=>{
    if(method==='Network.responseReceived'){
     try{const u=new URL(params.response.url);if(params.response.status===200&&u.hostname==='apis.naver.com'&&/^\/cafe-web\/cafe-articleapi\//.test(u.pathname)&&u.pathname.includes('/articles/'+articleIdentity(safe).id)||includeComments&&params.response.status===200&&u.hostname==='apis.naver.com'&&(u.pathname.startsWith('/commentBox/')||u.pathname.includes('/comments')))pending.set(params.requestId,u.href);}catch{}
    }
    if(method==='Network.loadingFinished'&&pending.has(params.requestId)){const responseUrl=pending.get(params.requestId)!;pending.delete(params.requestId);
     const task=(async()=>{try{const result=await bounded(()=>win.webContents.debugger.sendCommand('Network.getResponseBody',{requestId:params.requestId}),1800,'원문 페이지 응답 분석 지연',signal);if(result.body.length>8_000_000)return;const text=result.base64Encoded?Buffer.from(result.body,'base64').toString('utf8'):result.body;if(includeComments){const report=extractNaverCommentResponse(text,responseUrl,safe,removeAds,removeHashtags);if(report)comments=mergeComments(comments,report);}try{const body=extractCafeResponse(JSON.parse(text),safe,removeAds,removeHashtags);if(body)responseBody=body;}catch{}}catch{}})();tasks.add(task);void task.finally(()=>tasks.delete(task));
    }
   });void win.webContents.debugger.sendCommand('Network.enable').catch(()=>{});
  }catch{/* A usable article DOM is sufficient when debugger observation is unavailable. */}
  // Do not await did-finish-load: ads/resources can hang, and normal redirects can reject loadURL with ERR_ABORTED.
  void win.loadURL(safe).catch(error=>{if(!String(error.message).includes('ERR_ABORTED'))loadError=error.message;});
  const renderStarted=Date.now(),frameCache=new Map<string,{html:string;body?:Original;comments?:CommentReport}>(),frameReads=new WeakMap<Electron.WebFrameMain,PageRead<unknown>>();let candidate=initial,lastSignature='',reportedSignature='',stableSince=Date.now(),firstBodyAt=initial?Date.now():0;
  const bodyTimeout=setTimeout(()=>{if(!candidate&&!responseBody){timedOut=true;abort();}},25000);
  try{
   while(!win.isDestroyed()){
    signal.throwIfAborted();if(responseBody?.date&&!includeComments)return responseBody;if(loadError&&!candidate&&!responseBody&&Date.now()-renderStarted>1500)throw Error('원문 페이지 연결 실패: '+loadError);
    let denial='';for(const frame of win.webContents.mainFrame.framesInSubtree){
     try{
      const frameUrl=publicNaverUrl(frame.url);
      let frameRead=frameReads.get(frame);if(!frameRead){frameRead=new PageRead<unknown>();frameReads.set(frame,frameRead);}const snapshot=await frameRead.read('html',()=>frame.executeJavaScript(`(()=>{const text=document.body?.innerText||'';return {html:document.documentElement.outerHTML,denied:!document.querySelector(${JSON.stringify(readerSelectors)})&&text.length<2000&&/로그인이 필요|카페 멤버만|멤버공개|권한이 없|접근 권한|삭제된 게시글|존재하지 않는 게시글|forbidden/i.test(text)?text.slice(0,300):''};})()`),signal) as {html:string;denied:string}|null;if(!snapshot)continue;
      if(snapshot.denied){denial=snapshot.denied;continue;}const html=snapshot.html;
      if(typeof html!=='string'||!html||html.length>8_000_000)continue;
      let parsed=frameCache.get(frameUrl);if(!parsed||parsed.html!==html){parsed={html};try{parsed.body=extractOriginal(html,frameUrl,removeAds,removeHashtags);}catch{}if(includeComments)parsed.comments=extractNaverComments(html,frameUrl,removeAds,removeHashtags);frameCache.set(frameUrl,parsed);}
      if(includeComments){const expected=articleIdentity(safe),actual=articleIdentity(frameUrl);if(actual.kind!==expected.kind||actual.id&&expected.id&&actual.id!==expected.id)continue;comments=mergeComments(comments,parsed.comments);if(Date.now()-lastAction>1700&&actions<100){readingComments=true;const acted=await frameRead.read('comments',()=>frame.executeJavaScript(commentActionScript()),signal).finally(()=>{readingComments=false;}) as {action:string}|null;if(acted?.action){lastAction=Date.now();actions++;}}}
      const body=parsed.body;if(body){const signature=body.markdown+'|'+body.date;if(signature!==lastSignature){stableSince=Date.now();lastSignature=signature;candidate=body;}if(!firstBodyAt)firstBodyAt=Date.now();}
     }catch(error){signal.throwIfAborted();if(error instanceof CollectionStalledError){processError=error.message;observe?.({phase:includeComments?'comments':'loading',message:processError,url:safe});abort();}}
    }
    if(denial&&!candidate&&!responseBody)throw Error('원문 접근 제한: '+denial);
    if(responseBody)candidate=responseBody;
    if(includeComments){const signature=JSON.stringify([comments?.expected,comments?.items]);if(signature!==commentSignature){commentSignature=signature;lastCommentChange=Date.now();}}
    if(candidate){const reportSignature=candidate.markdown+'|'+candidate.date+'|'+commentSignature;if(reportSignature!==reportedSignature){reportedSignature=reportSignature;observe?.({phase:includeComments?'comments':'body',message:includeComments?'댓글·답글 확인':'원문 확인',url:candidate.url,comments:comments?.items.length,original:includeComments?finish(candidate,comments):candidate});}}
    const elapsed=Date.now()-stableSince;
    // Wait for both author/date and body rendering, then for the content to stop changing.
    if(candidate&&elapsed>=1500&&(candidate.date||firstBodyAt&&Date.now()-firstBodyAt>=8000)){if(!includeComments)return candidate;const idle=Date.now()-Math.max(stableSince,lastCommentChange),quiet=Date.now()-Math.max(lastAction,lastCommentChange)>1800&&!pending.size&&!tasks.size;if(quiet&&comments?.status==='complete')return finish(candidate,comments);if((quiet&&idle>=6000)||idle>=8000)return finish(candidate,comments?.status==='complete'?comments:{...(comments||emptyComments()),status:comments?.items.length?'partial':'unavailable',reason:'추가 댓글이 불러와지지 않아 현재까지 수집한 내용을 저장했습니다.'});}
    await wait(350,signal);
   }
   signal.throwIfAborted();if(candidate)return includeComments?finish(candidate,{...(comments||emptyComments()),status:comments?.status==='complete'?'complete':comments?.items.length?'partial':'unavailable',...(comments?.status!=='complete'?{reason:processError|| (timedOut?'댓글 읽기 시간 제한에 도달했습니다.':comments?.reason||'댓글 수집 미완료')}:{})}):candidate;
   throw Error(processError|| (pageNotice?'네이버 원문을 확인하지 못했습니다. '+pageNotice:timedOut?'원문 로딩 시간 초과':loadError?'원문 페이지 연결 실패: '+loadError:'공개 원문을 읽지 못했습니다.'));
  }finally{
   clearTimeout(timeout);clearTimeout(bodyTimeout);signal.removeEventListener('abort',abort);isolated.removeListener('will-download',onDownload);
   if(!win.isDestroyed()){try{win.webContents.debugger.detach();}catch{}win.destroy();}await Promise.allSettled([...tasks]);
  }
 }
}
