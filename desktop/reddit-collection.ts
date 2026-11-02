import {attachComments,mergeComments,type CommentReport} from '../core/comments.js';
import {wait} from '../core/network.js';
import {parseRedditOriginal} from '../core/reddit-page.js';
import {redditArticle} from '../core/reddit.js';
import type {Original} from '../core/original.js';
import type {BrowserPageSnapshot} from './reddit-page-script.js';

interface Reader {
 snapshot(act:boolean):Promise<BrowserPageSnapshot|null>;
 navigate(url:string):void;
 userCheck(snapshot:BrowserPageSnapshot):Promise<number>;
 progress(message:string):void;
}
/** Only new article/comment content resets the idle deadline, never clicks or page height. */
export async function collectRedditOriginal(url:string,removeAds:boolean,removeHashtags:boolean,includeComments:boolean,signal:AbortSignal,reader:Reader):Promise<Original>{
 const article=redditArticle(url),started=Date.now();let deadline=started+120000,bodyDeadline=started+30000,lastProgress=started,lastAction=0,actions=0,body:Original|undefined,comments:CommentReport|undefined,signature='',lastHtml='',lastAddress='';
 const visited=new Set<string>(['']),branches=new Map<string,string>();
 const finish=(reason?:string)=>attachComments(body!,reason?{...comments!,status:comments!.items.length?'partial':'unavailable',reason}:comments!);
 reader.navigate(article.url);reader.progress('Reddit 본문을 불러오는 중입니다.');
 while(Date.now()<deadline){
  signal.throwIfAborted();const snapshot=await reader.snapshot(Date.now()-lastAction>1200&&actions<100);
  if(snapshot?.gate){const elapsed=await reader.userCheck(snapshot);deadline+=elapsed;bodyDeadline+=elapsed;lastProgress+=elapsed;lastAction+=elapsed;continue;}
  if(snapshot){let same=false;try{same=redditArticle(snapshot.address).id===article.id;}catch{}
   if(same&&snapshot.html.length<=8_000_000){
    if(snapshot.html!==lastHtml||snapshot.address!==lastAddress){
     lastHtml=snapshot.html;lastAddress=snapshot.address;const parsed=parseRedditOriginal(snapshot.html,snapshot.address,removeAds,removeHashtags);
     if(parsed){body=parsed.original;if(!includeComments)return body;comments=mergeComments(comments,parsed.comments);const nextSignature=JSON.stringify([body.text,comments.items]);if(nextSignature!==signature){signature=nextSignature;lastProgress=Date.now();reader.progress(`Reddit 댓글 ${comments.items.length}개 수집 중`);}}
    }
    if(body&&comments){
     for(const raw of snapshot.branches){try{const u=new URL(raw);if(redditArticle(u.href).id!==article.id)continue;const parts=u.pathname.split('/').filter(Boolean),index=parts.indexOf('comments'),comment=parts[index+3]||'';if(comment&&!/^[a-z0-9]+$/i.test(comment))continue;if(visited.has(comment))continue;u.hash='';for(const key of [...u.searchParams.keys()])if(!['context','depth','sort','show','limit'].includes(key))u.searchParams.delete(key);if(!branches.has(comment))branches.set(comment,u.href);}catch{}}
     comments=mergeComments(comments,{...comments,pending:snapshot.pending||branches.size>0});
     if(snapshot.acted){lastAction=Date.now();actions++;}
     if(actions>=100)return finish('댓글 읽기 동작 한도에 도달했습니다.');
     if(!snapshot.pending&&!snapshot.acted&&snapshot.bottom&&branches.size&&Date.now()-lastAction>1200){const [key,next]=branches.entries().next().value!;branches.delete(key);visited.add(key);reader.navigate(next);lastHtml='';lastAction=Date.now();actions++;lastProgress=Date.now();continue;}
     const idle=Date.now()-lastProgress,quiet=Date.now()-Math.max(lastProgress,lastAction)>2200;
     if(quiet&&snapshot.bottom&&!branches.size&&!snapshot.pending&&comments.status==='complete')return finish();
     // A no-op button, endless recommendations or an inaccessible comment must not stall the queue.
     if(idle>=8000)return finish(comments.status==='complete'?undefined:'추가 댓글이 8초 동안 불러와지지 않아 현재까지 수집한 댓글을 저장했습니다.');
    }
   }
  }
  if(!body&&Date.now()>=bodyDeadline)throw Error('Reddit 본문을 30초 안에 읽지 못했습니다. 해당 글의 접근 상태를 확인하세요.');
  if(body&&comments&&Date.now()-lastProgress>=12000)return finish('페이지 응답이 멈춰 현재까지 수집한 댓글을 저장했습니다.');
  await wait(400,signal);
 }
 if(body&&comments)return finish('댓글 읽기 시간 한도에 도달했습니다.');
 throw Error('Reddit 본문을 읽지 못했습니다. 해당 글의 접근 상태를 확인하세요.');
}
