import {CollectionStalledError} from './operation.js';
import {attachComments,emptyComments} from './comments.js';
import type {Original,ReadObserver} from './original.js';
/** Keep collected content privately; diagnostic progress must never contain the content itself. */
export function monitoredRead(action:(signal:AbortSignal,observe:ReadObserver)=>Promise<Original>,signal:AbortSignal,includeComments:boolean,notify:ReadObserver,idleMs=75000):Promise<Original>{
 return new Promise((resolve,reject)=>{const controller=new AbortController(),combined=AbortSignal.any([signal,controller.signal]);let latest:Original|undefined,settled=false,timer:ReturnType<typeof setTimeout>|undefined;
  const finish=(ok:boolean,value:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(ok)resolve(value as Original);else reject(value);};
  const abort=()=>finish(false,signal.reason||Error('수집 중지'));if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
  const arm=(ms:number)=>{clearTimeout(timer);timer=setTimeout(()=>{const error=new CollectionStalledError('원문 수집이 75초 동안 응답하지 않았습니다. 진행 진단을 복사한 뒤 수집을 재개하세요.');if(latest){const saved=includeComments?attachComments(latest,{...(latest.comments||emptyComments()),status:latest.comments?.status==='complete'?'complete':latest.comments?.items.length?'partial':'unavailable',reason:'페이지 응답이 멈춰 현재까지 확보한 본문·댓글을 저장했습니다.'}):latest;notify({phase:'body',message:'응답 지연 · 확보한 원문 저장',url:latest.url});finish(true,saved);}else finish(false,error);controller.abort(error);},ms);};
  const observe:ReadObserver=progress=>{if(settled||combined.aborted)return;if(progress.original)latest=progress.original;const {original:_private,...safe}=progress;notify(safe);arm(progress.phase==='verification'?660000:idleMs);};arm(idleMs);
  const failed=(error:unknown)=>{if(error instanceof CollectionStalledError&&latest){const saved=includeComments?attachComments(latest,{...(latest.comments||emptyComments()),status:latest.comments?.status==='complete'?'complete':latest.comments?.items.length?'partial':'unavailable',reason:'수집 창의 응답이 멈춰 현재까지 확보한 본문·댓글을 저장했습니다.'}):latest;notify({phase:'body',message:'수집 창 응답 지연 · 확보한 원문 저장',url:latest.url});finish(true,saved);controller.abort(error);}else finish(false,error);};
  try{action(combined,observe).then(value=>finish(true,value),failed);}catch(error){failed(error);}
 });
}
