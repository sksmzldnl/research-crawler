import {isForumType,forumLabels,type ForumBrowsers} from './forum.js';
import {z} from 'zod';
import {Network} from './network.js';
import type {Vault} from './vault.js';
import {clean} from './text.js';
import {normalizedDate} from './quality.js';
import {naverEndpoint} from './naver-connection.js';
import {type SearchType} from './api-types.js';
import type {RedditBrowser} from './reddit-browser.js';
import type {Candidate} from './types.js';
export interface ApiPage {items:Candidate[];next:number|null;}
export interface SearchProvider {validate(type?:SearchType):void;search(type:SearchType,query:string,start:number,signal:AbortSignal,display?:number,community?:string):Promise<ApiPage>;}
const responseSchema=z.object({total:z.number().nonnegative(),items:z.array(z.object({link:z.string(),title:z.string(),description:z.string().default(''),postdate:z.string().optional(),postDate:z.string().optional(),pubDate:z.string().optional()}))});
export class SearchApi implements SearchProvider {
 constructor(public net:Network,private vault:Vault,private browser?:RedditBrowser,private forums:ForumBrowsers={}){}
 validate(type:SearchType='blog'){if(isForumType(type)){if(!this.forums[type])throw Error(forumLabels[type]+' 수집은 설치된 데스크톱 앱에서 사용할 수 있습니다.');return;}if(type==='reddit'){if(!this.browser)throw Error('Reddit 수집은 설치된 데스크톱 앱에서 사용할 수 있습니다.');return;}if(!this.vault.get('naverId')||!this.vault.get('naverSecret'))throw Error('설정에서 네이버 Client ID와 Client Secret을 등록하세요.');}
 async search(type:SearchType,query:string,start:number,signal:AbortSignal,display=100,community=''):Promise<ApiPage>{
  if(isForumType(type)){this.validate(type);return this.forums[type]!.search(query,start,signal,display);}
  if(type==='reddit'){this.validate(type);return this.browser!.search(query,start,signal,display,community);}
  const url=naverEndpoint(type);this.validate();if(!Number.isInteger(start)||start<1||start>1000)throw Error('검색 재개 위치를 읽지 못했습니다. 새 수집을 시작하세요.');
  url.search=new URLSearchParams({query,display:String(display),start:String(start),sort:'date',format:'json'}).toString();
  const raw=await this.net.json(url.href,{headers:{'x-ncp-apigw-api-key-id':this.vault.get('naverId'),'x-ncp-apigw-api-key':this.vault.get('naverSecret')}},'네이버',signal);
  const parsed=responseSchema.safeParse(raw);if(!parsed.success)throw Error('네이버 검색 응답을 읽지 못했습니다. 응답 형식이 예상과 다릅니다.');
  const data=parsed.data;return {items:data.items.map(i=>({id:i.link,url:i.link,title:clean(i.title),text:clean(i.description),date:normalizedDate(i.postdate||i.postDate||i.pubDate),language:'ko'})),next:data.items.length===100&&start+100<=Math.min(data.total,1000)?start+100:null};
 }
}
