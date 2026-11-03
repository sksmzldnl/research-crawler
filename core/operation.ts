export class CollectionStalledError extends Error {}
/** A real deadline even if an OS/network operation does not settle when its signal is aborted. */
export function bounded<T>(action:(signal:AbortSignal)=>Promise<T>,timeoutMs:number,message:string,signal?:AbortSignal):Promise<T>{
 return new Promise((resolve,reject)=>{const controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;let settled=false,timer:ReturnType<typeof setTimeout>|undefined;
  const finish=(ok:boolean,value:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(ok)resolve(value as T);else reject(value);};
  const abort=()=>{finish(false,signal?.reason||new Error('작업 중지'));};if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>{const error=new CollectionStalledError(message);finish(false,error);controller.abort(error);},timeoutMs);
  try{action(combined).then(value=>finish(true,value),error=>finish(false,error));}catch(error){finish(false,error);}
 });
}
