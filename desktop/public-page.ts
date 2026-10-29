import {BrowserWindow,session} from 'electron';
import {attachComments,extractNaverComments,extractNaverCommentResponse,mergeComments,emptyComments,type CommentReport} from '../core/comments.js';
import {commentActionScript} from './comment-actions.js';
import {OriginalReader,extractOriginal,extractCafeResponse,readerSelectors,type OriginalSource,type Original} from '../core/original.js';
import {publicNaverUrl,articleIdentity} from '../core/original-url.js';
import {Network,wait} from '../core/network.js';
export class DesktopOriginalReader implements OriginalSource {
 constructor(private net:Network){}
 async read(raw:string,removeAds:boolean,signal:AbortSignal,removeHashtags=false,includeComments=false):Promise<Original>{
  const safe=publicNaverUrl(raw);let staticBody:Original|undefined,staticError:unknown;
  try{staticBody=await new OriginalReader(this.net).read(safe,removeAds,signal,removeHashtags,includeComments);if(staticBody.date&&(!includeComments||staticBody.comments?.status==='complete'))return staticBody;}catch(error){signal.throwIfAborted();staticError=error;}
  try{return await this.render(safe,removeAds,signal,removeHashtags,includeComments,staticBody);}catch(error){signal.throwIfAborted();if(staticBody)return includeComments?attachComments(staticBody,emptyComments('댓글 페이지 연결 실패: '+(error as Error).message)):staticBody;throw Error((error as Error).message+(staticError?' · '+(staticError as Error).message:''));}
 }
 private async render(safe:string,removeAds:boolean,signal:AbortSignal,removeHashtags:boolean,includeComments:boolean,initial?:Original):Promise<Original>{
  signal.throwIfAborted();const partition='public-original-reader',isolated=session.fromPartition(partition);
  isolated.setPermissionRequestHandler((_w,_p,callback)=>callback(false));isolated.setPermissionCheckHandler(()=>false);
  const win=new BrowserWindow({show:false,webPreferences:{partition,sandbox:true,nodeIntegration:false,contextIsolation:true,webSecurity:true,backgroundThrottling:false}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(e,raw)=>{try{publicNaverUrl(raw);}catch{e.preventDefault();}});
  const onDownload=(event:Electron.Event)=>event.preventDefault();isolated.on('will-download',onDownload);
  let timedOut=false,loadError='',responseBody:Original|undefined,comments:CommentReport|undefined,lastAction=0,actions=0,lastCommentChange=Date.now(),commentSignature='';
  const abort=()=>{if(!win.isDestroyed())win.destroy();};signal.addEventListener('abort',abort,{once:true});
  const timeout=setTimeout(()=>{timedOut=true;abort();},includeComments?120000:45000);
  // Observe the JSON that the normal public page already requests. No alternate/private endpoint calls.
  const pending=new Map<string,string>(),tasks=new Set<Promise<void>>();
  try{
   win.webContents.debugger.attach('1.3');void win.webContents.debugger.sendCommand('Network.enable').catch(()=>{});
   win.webContents.debugger.on('message',(_event,method,params)=>{
    if(method==='Network.responseReceived'){
     try{const u=new URL(params.response.url);if(params.response.status===200&&u.hostname==='apis.naver.com'&&/^\/cafe-web\/cafe-articleapi\//.test(u.pathname)&&u.pathname.includes('/articles/'+articleIdentity(safe).id)||includeComments&&params.response.status===200&&u.hostname==='apis.naver.com'&&(u.pathname.startsWith('/commentBox/')||u.pathname.includes('/comments')))pending.set(params.requestId,u.href);}catch{}
    }
    if(method==='Network.loadingFinished'&&pending.has(params.requestId)){const responseUrl=pending.get(params.requestId)!;pending.delete(params.requestId);
     const task=(async()=>{try{const result=await win.webContents.debugger.sendCommand('Network.getResponseBody',{requestId:params.requestId});if(result.body.length>8_000_000)return;const text=result.base64Encoded?Buffer.from(result.body,'base64').toString('utf8'):result.body;if(includeComments){const report=extractNaverCommentResponse(text,responseUrl,safe,removeAds,removeHashtags);if(report)comments=mergeComments(comments,report);}try{const body=extractCafeResponse(JSON.parse(text),safe,removeAds,removeHashtags);if(body)responseBody=body;}catch{}}catch{}})();tasks.add(task);void task.finally(()=>tasks.delete(task));
    }
   });
  }catch{/* A usable article DOM is sufficient when debugger observation is unavailable. */}
  // Do not await did-finish-load: ads/resources can hang, and normal redirects can reject loadURL with ERR_ABORTED.
  void win.loadURL(safe).catch(error=>{if(!String(error.message).includes('ERR_ABORTED'))loadError=error.message;});
  const renderStarted=Date.now();let candidate=initial,lastSignature='',stableSince=Date.now(),firstBodyAt=0;
  try{
   while(!win.isDestroyed()){
    signal.throwIfAborted();if(responseBody?.date&&!includeComments)return responseBody;if(loadError&&!candidate&&!responseBody&&Date.now()-renderStarted>1500)throw Error('원문 페이지 연결 실패: '+loadError);
    let denial='';for(const frame of win.webContents.mainFrame.framesInSubtree){
     try{
      const frameUrl=publicNaverUrl(frame.url);
      let frameTimer:ReturnType<typeof setTimeout>|undefined;const snapshot=await Promise.race([frame.executeJavaScript(`(()=>{const text=document.body?.innerText||'';return {html:document.documentElement.outerHTML,denied:!document.querySelector(${JSON.stringify(readerSelectors)})&&text.length<2000&&/로그인이 필요|카페 멤버만|멤버공개|권한이 없|접근 권한|삭제된 게시글|존재하지 않는 게시글|forbidden/i.test(text)?text.slice(0,300):''};})()`),new Promise<never>((_resolve,reject)=>{frameTimer=setTimeout(()=>reject(Error('프레임 준비 중')),1500);})]).finally(()=>clearTimeout(frameTimer)) as {html:string;denied:string};
      if(snapshot.denied){denial=snapshot.denied;continue;}const html=snapshot.html;
      if(typeof html!=='string'||!html||html.length>8_000_000)continue;
      if(includeComments){const expected=articleIdentity(safe),actual=articleIdentity(frameUrl);if(actual.kind!==expected.kind||actual.id&&expected.id&&actual.id!==expected.id)continue;comments=mergeComments(comments,extractNaverComments(html,frameUrl,removeAds,removeHashtags));if(Date.now()-lastAction>1700&&actions<100){let actionTimer:ReturnType<typeof setTimeout>|undefined;const acted=await Promise.race([frame.executeJavaScript(commentActionScript()),new Promise<{action:string}>(resolve=>{actionTimer=setTimeout(()=>resolve({action:''}),1200);})]).finally(()=>clearTimeout(actionTimer)) as {action:string};if(acted?.action){lastAction=Date.now();actions++;}}}
      const body=extractOriginal(html,frameUrl,removeAds,removeHashtags),signature=body.markdown+'|'+body.date;
      if(signature!==lastSignature){stableSince=Date.now();lastSignature=signature;candidate=body;}if(!firstBodyAt)firstBodyAt=Date.now();
     }catch{signal.throwIfAborted();}
    }
    if(denial&&!candidate&&!responseBody)throw Error('원문 접근 제한: '+denial);
    if(responseBody)candidate=responseBody;
    if(includeComments){const signature=JSON.stringify(comments);if(signature!==commentSignature){commentSignature=signature;lastCommentChange=Date.now();}}
    const elapsed=Date.now()-stableSince;
    // Wait for both author/date and body rendering, then for the content to stop changing.
    if(candidate&&elapsed>=1500&&(candidate.date||firstBodyAt&&Date.now()-firstBodyAt>=8000)){if(!includeComments)return candidate;const quiet=Date.now()-Math.max(lastAction,lastCommentChange)>2500&&!pending.size&&!tasks.size;if(quiet&&(comments?.status==='complete'||Date.now()-renderStarted>10000))return attachComments(candidate,comments||emptyComments());}
    await wait(350,signal);
   }
   signal.throwIfAborted();if(candidate)return includeComments?attachComments(candidate,{...(comments||emptyComments()),status:comments?.status==='complete'?'complete':comments?.items.length?'partial':'unavailable',...(comments?.status!=='complete'?{reason:timedOut?'댓글 읽기 시간 제한에 도달했습니다.':comments?.reason||'댓글 수집 미완료'}:{})}):candidate;
   throw Error(timedOut?'원문 로딩 시간 초과':loadError?'원문 페이지 연결 실패: '+loadError:'공개 원문을 읽지 못했습니다.');
  }finally{
   clearTimeout(timeout);signal.removeEventListener('abort',abort);isolated.removeListener('will-download',onDownload);
   if(!win.isDestroyed()){try{win.webContents.debugger.detach();}catch{}win.destroy();}await Promise.allSettled([...tasks]);await isolated.clearStorageData();
  }
 }
}
