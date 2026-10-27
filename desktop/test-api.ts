// Explicit integration-test transport. Normal launches never enable it.
import {readFileSync,appendFileSync} from 'node:fs';
import {wait,type Transport} from '../core/network.js';
interface Route {host:string;path?:string;params:Record<string,string>;headers?:Record<string,string>;status:number;body:unknown;delayMs?:number;bodyIncludes?:string;}
export function fixtureTransport(path:string,log:string):Transport{return async(raw,init)=>{
 const u=new URL(raw),routes=JSON.parse(readFileSync(path,'utf8')) as Route[],headers=new Headers(init?.headers);
 const route=routes.find(r=>r.host===u.hostname&&(!r.path||r.path===u.pathname)&&(!r.bodyIncludes||String(init?.body||'').includes(r.bodyIncludes))&&Object.entries(r.params).every(([k,v])=>u.searchParams.get(k)===v));
 const authenticated=!!route&&Object.entries(route.headers||{}).every(([k,v])=>headers.get(k)===v);
 const params=Object.fromEntries([...u.searchParams].filter(([key])=>['query','q','page','start','offset','display','sort','format'].includes(key)));
 appendFileSync(log,JSON.stringify({host:u.hostname,path:u.pathname,params,matched:!!route,authenticated})+'\n');
 if(!route)throw Error('Unmatched integration fixture request.');if(route.delayMs)await wait(Math.min(60000,Math.max(0,route.delayMs)),init?.signal||undefined);return new Response(JSON.stringify(authenticated?route.body:{error:'fixture authentication mismatch'}),{status:authenticated?route.status:401,headers:{'Content-Type':'application/json'}});
};}
