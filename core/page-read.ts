import {bounded,CollectionStalledError} from './operation.js';
/** executeJavaScript cannot be cancelled by Promise.race: retain one pending call and deliver its late result. */
export class PageRead<T> {
 private flight?:{key:string;startedAt:number;done:boolean;value?:T;error?:unknown;failed:boolean;promise:Promise<void>};
 async read(key:string,action:()=>Promise<T>,signal:AbortSignal,waitMs=1500,maxMs=15000):Promise<T|null>{
  signal.throwIfAborted();let flight=this.flight;
  if(!flight){const next={key,startedAt:Date.now(),done:false,failed:false,promise:Promise.resolve()} as NonNullable<PageRead<T>['flight']>;this.flight=flight=next;try{next.promise=action().then(value=>{next.value=value;next.done=true;},error=>{next.failed=true;next.error=error;next.done=true;});}catch(error){next.failed=true;next.error=error;next.done=true;}}
  if(!flight.done){if(Date.now()-flight.startedAt>=maxMs)throw new CollectionStalledError('페이지 분석이 15초 동안 응답하지 않았습니다.');try{await bounded(()=>flight!.promise,Math.min(waitMs,Math.max(1,maxMs-(Date.now()-flight.startedAt))),'페이지 분석 대기',signal);}catch(error){signal.throwIfAborted();if(error instanceof CollectionStalledError){if(Date.now()-flight.startedAt>=maxMs)throw new CollectionStalledError('페이지 분석이 15초 동안 응답하지 않았습니다.');return null;}throw error;}}
  if(!flight.done)return null;this.flight=undefined;if(flight.key!==key)return this.read(key,action,signal,waitMs,maxMs);if(flight.failed)throw flight.error;return flight.value!;
 }
}
