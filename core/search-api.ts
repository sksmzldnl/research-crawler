import {z} from 'zod';
import {Network} from './network.js';
import type {Vault} from './vault.js';
import {clean} from './text.js';
import {normalizedDate} from './quality.js';
import {naverEndpoint} from './naver-connection.js';
import {type NaverType} from './api-types.js';
import type {Candidate} from './types.js';
export interface ApiPage {items:Candidate[];next:number|null;}
export interface SearchProvider {validate():void;search(type:NaverType,query:string,start:number,signal:AbortSignal):Promise<ApiPage>;}
const responseSchema=z.object({total:z.number().nonnegative(),items:z.array(z.object({link:z.string(),title:z.string(),description:z.string().default(''),postdate:z.string().optional()}))});
export class SearchApi implements SearchProvider {
 constructor(public net:Network,private vault:Vault){}
 validate(){if(!this.vault.get('naverId')||!this.vault.get('naverSecret'))throw Error('설정에서 네이버 Client ID와 Client Secret을 등록하세요.');}
 async search(type:NaverType,query:string,start:number,signal:AbortSignal):Promise<ApiPage>{
  const url=naverEndpoint(type);this.validate();if(!Number.isInteger(start)||start<1||start>1000)throw Error('검색 재개 위치를 읽지 못했습니다. 새 수집을 시작하세요.');
  url.search=new URLSearchParams({query,display:'100',start:String(start),sort:'date',format:'json'}).toString();
  const raw=await this.net.json(url.href,{headers:{'x-ncp-apigw-api-key-id':this.vault.get('naverId'),'x-ncp-apigw-api-key':this.vault.get('naverSecret')}},'네이버',signal);
  const parsed=responseSchema.safeParse(raw);if(!parsed.success)throw Error('네이버 검색 응답을 읽지 못했습니다. 응답 형식이 예상과 다릅니다.');
  const data=parsed.data;return {items:data.items.map(i=>({id:i.link,url:i.link,title:clean(i.title),text:clean(i.description),date:normalizedDate(i.postdate),language:'ko'})),next:data.items.length===100&&start+100<=Math.min(data.total,1000)?start+100:null};
 }
}
