import type {OriginalSource} from './original.js';
import type {ApiPage} from './search-api.js';
import type {RedditBrowserState} from './reddit-browser.js';

export const forumTypes=['mumsnet','mse'] as const;
export type ForumType=typeof forumTypes[number];
export const forumLabels:Record<ForumType,string>={mumsnet:'Mumsnet',mse:'MoneySavingExpert'};
export const forumHomes:Record<ForumType,string>={mumsnet:'https://www.mumsnet.com/talk',mse:'https://forums.moneysavingexpert.com/'};
export const forumPartitions:Record<ForumType,string>={mumsnet:'persist:mumsnet-research-browser',mse:'persist:mse-research-browser'};
export function isForumType(value:unknown):value is ForumType{return forumTypes.includes(value as ForumType);}
export interface ForumBrowser extends OriginalSource {
 state():RedditBrowserState;
 search(query:string,start:number,signal:AbortSignal,display?:number):Promise<ApiPage>;
 open():Promise<void>;
 clear():Promise<void>;
 close():void;
}
export type ForumBrowsers=Partial<Record<ForumType,ForumBrowser>>;
export function forumArticle(raw:string):{type:ForumType;id:string;url:string;page:number}{
 const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('공개 토론의 HTTPS 주소를 입력하세요.');
 if(['www.mumsnet.com','mumsnet.com'].includes(u.hostname)){
  const m=u.pathname.match(/^\/talk\/([a-z0-9_-]+)\/([1-9]\d{2,12})(-[^/]+)?\/?$/i);if(!m)throw Error('Mumsnet 토론 주소를 입력하세요.');
  const pg=u.searchParams.get('page')??u.searchParams.get('pg')??'1';if(!/^\d+$/.test(pg)||Number(pg)<1||Number(pg)>10000)throw Error('토론 페이지 번호를 확인하세요.');
  return {type:'mumsnet',id:m[2],url:'https://www.mumsnet.com/talk/'+m[1]+'/'+m[2]+(m[3]||''),page:Number(pg)};
 }
 if(u.hostname==='forums.moneysavingexpert.com'){
  const m=u.pathname.match(/^\/discussion\/([1-9]\d{2,12})(?:\/((?!p\d+(?:\/|$))[^/]+))?(?:\/p([1-9]\d{0,3}))?\/?$/i);if(!m)throw Error('MoneySavingExpert 토론 주소를 입력하세요.');
  return {type:'mse',id:m[1],url:'https://forums.moneysavingexpert.com/discussion/'+m[1]+(m[2]?'/'+m[2]:''),page:Number(m[3]||1)};
 }
 throw Error('지원하는 Mumsnet·MoneySavingExpert 토론 주소가 아닙니다.');
}
export function forumIdentity(raw:string){try{return forumArticle(raw);}catch{return undefined;}}
export function forumAllowed(type:ForumType,raw:string){try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['www.google.com','google.com','consent.google.com','accounts.google.com',...(type==='mumsnet'?['www.mumsnet.com','mumsnet.com']:['forums.moneysavingexpert.com','www.moneysavingexpert.com'])].includes(u.hostname);}catch{return false;}}
