import type {Original} from './original.js';
import type {ApiPage} from './search-api.js';
/** Per-run caches: resuming starts a fresh run, so recovered pages can be retried. */
export class SearchWork {
 private bodies=new Map<string,Promise<Original>>();private pages=new Map<string,Promise<ApiPage>>();private tail:Promise<unknown>=Promise.resolve();
 private cached<T>(cache:Map<string,Promise<T>>,key:string,load:()=>Promise<T>){const previous=cache.get(key);if(previous){cache.delete(key);cache.set(key,previous);return previous;}const value=load();cache.set(key,value);if(cache.size>64)cache.delete(cache.keys().next().value!);return value;}
 body(key:string,load:()=>Promise<Original>){return this.cached(this.bodies,key,load);}
 page(key:string,load:()=>Promise<ApiPage>){return this.cached(this.pages,key,load);}
 commit<T>(action:()=>Promise<T>){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
}
/** Bounded article reads; commits stay serial, and reaching the target cancels unnecessary reads. */
export async function collectPage<T>(items:T[],concurrency:number,signal:AbortSignal,done:()=>boolean,consume:(item:T,signal:AbortSignal)=>Promise<void>){
 const controller=new AbortController(),combined=AbortSignal.any([signal,controller.signal]);let index=0,failure:unknown;
 const worker=async()=>{while(!combined.aborted&&!done()&&index<items.length){const item=items[index++]!;try{await consume(item,combined);if(done())controller.abort();}catch(error){if(!combined.aborted){failure=error;controller.abort(error);}return;}}};
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},worker));signal.throwIfAborted();if(failure)throw failure;
}
