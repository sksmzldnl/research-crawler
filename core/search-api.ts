import {z} from 'zod';
import {Network} from './network.js';
import type {Vault} from './vault.js';
import {clean} from './text.js';
import {normalizedDate} from './quality.js';
import {naverEndpoint} from './naver-connection.js';
import {type SearchType} from './api-types.js';
import {redditArticle} from './reddit.js';
import type {Candidate} from './types.js';
export interface ApiPage {items:Candidate[];next:number|null;}
export interface SearchProvider {validate(type?:SearchType):void;search(type:SearchType,query:string,start:number,signal:AbortSignal,display?:number,community?:string):Promise<ApiPage>;}
const responseSchema=z.object({total:z.number().nonnegative(),items:z.array(z.object({link:z.string(),title:z.string(),description:z.string().default(''),postdate:z.string().optional(),postDate:z.string().optional(),pubDate:z.string().optional()}))});
export class SearchApi implements SearchProvider {
 constructor(public net:Network,private vault:Vault){}
 validate(type:SearchType='blog'){if(type==='reddit'){if(!this.vault.get('serpApiKey')||!this.vault.get('redditClientId')||!this.vault.get('redditClientSecret'))throw Error('설정에서 SerpApi 키와 승인된 Reddit 앱의 Client ID·Client Secret을 등록하세요.');return;}if(!this.vault.get('naverId')||!this.vault.get('naverSecret'))throw Error('설정에서 네이버 Client ID와 Client Secret을 등록하세요.');}
 async search(type:SearchType,query:string,start:number,signal:AbortSignal,display=100,community=''):Promise<ApiPage>{
  if(type==='reddit')return this.googleReddit(query,start,signal,display,community);
  const url=naverEndpoint(type);this.validate();if(!Number.isInteger(start)||start<1||start>1000)throw Error('검색 재개 위치를 읽지 못했습니다. 새 수집을 시작하세요.');
  url.search=new URLSearchParams({query,display:String(display),start:String(start),sort:'date',format:'json'}).toString();
  const raw=await this.net.json(url.href,{headers:{'x-ncp-apigw-api-key-id':this.vault.get('naverId'),'x-ncp-apigw-api-key':this.vault.get('naverSecret')}},'네이버',signal);
  const parsed=responseSchema.safeParse(raw);if(!parsed.success)throw Error('네이버 검색 응답을 읽지 못했습니다. 응답 형식이 예상과 다릅니다.');
  const data=parsed.data;return {items:data.items.map(i=>({id:i.link,url:i.link,title:clean(i.title),text:clean(i.description),date:normalizedDate(i.postdate||i.postDate||i.pubDate),language:'ko'})),next:data.items.length===100&&start+100<=Math.min(data.total,1000)?start+100:null};
 }
 private async googleReddit(query:string,start:number,signal:AbortSignal,display:number,community:string):Promise<ApiPage>{this.validate('reddit');if(!Number.isInteger(start)||start<1||start>100||community&&!/^[A-Za-z0-9_]{1,50}$/.test(community))throw Error('Reddit 검색 범위를 확인하세요.');const url=new URL('https://serpapi.com/search.json'),site=community?'site:reddit.com/r/'+community+'/comments/':'site:reddit.com';url.search=new URLSearchParams({engine:'google',api_key:this.vault.get('serpApiKey'),q:site+' '+query,start:String(start-1),num:'10',hl:'en'}).toString();
  const data=await this.net.json(url.href,{},'Google 검색 · SerpApi',signal);if(data.error)throw Error('Google 검색 서비스가 요청을 거부했습니다. SerpApi 키·이용 한도와 계정 상태를 확인하세요.');if(!Array.isArray(data.organic_results)){if(data.search_information?.organic_results_state==='Fully empty'||data.search_information?.total_results===0)return {items:[],next:null};throw Error('Google 검색 결과를 읽지 못했습니다.');}const items:Candidate[]=[],seen=new Set<string>();for(const result of data.organic_results){try{const post=redditArticle(result.link);if(community&&!new RegExp('^/r/'+community+'/comments/','i').test(new URL(result.link).pathname))continue;if(seen.has(post.id))continue;seen.add(post.id);items.push({id:post.id,url:post.url,title:clean(result.title),text:clean(result.snippet),date:null,language:'en'});}catch{}}
  let next:number|null=null;try{const offset=Number(new URL(data.serpapi_pagination?.next).searchParams.get('start'));if(Number.isInteger(offset)&&offset>=start&&offset<100)next=offset+1;}catch{}return {items:items.slice(0,display),next:display===1?null:next};
 }

}
