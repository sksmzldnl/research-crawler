import { JSDOM } from 'jsdom';
import { XMLParser } from 'fast-xml-parser';
import { Network, limitedText, safeUrl } from './network.js';
import type {Candidate,Source,ProviderSettings} from './types.js';
import type {Vault} from './vault.js';
import { normalizedDate } from './quality.js';
export function clean(s:unknown){const value=typeof s==='object'&&s!==null?(s as Record<string,unknown>)['#text']||'':s;const doc=new JSDOM(`<body>${String(value||'')}</body>`).window.document;doc.querySelectorAll('script,style').forEach(e=>e.remove());return doc.body.textContent?.replace(/\s+/g,' ').trim()||'';}
export function anonymize(s:string){return s.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[이메일 삭제]').replace(/(?<!\d)(?:\+82[- ]?|0)1[016789][- ]?\d{3,4}[- ]?\d{4}(?!\d)/g,'[전화번호 삭제]');}
export interface Page {items:Candidate[];next:string|number|null;note?:string;}
export class Connectors {
  constructor(public net:Network,public vault:Vault,public settings:()=>ProviderSettings){}
  async search(source:Source,_query:string,_cursor:string|number=1,signal?:AbortSignal):Promise<Page>{
    if(source!=='rss')throw Error('검색 API는 사용하지 않습니다. 공개 RSS·URL을 가져오세요.');
    const items:Candidate[]=[];for(const url of this.settings().rssUrls)items.push(...await this.rssFeed(url,signal));return {items,next:null};
  }
  async rssFeed(raw:string,signal?:AbortSignal):Promise<Candidate[]>{
    const u=await safeUrl(raw),response=await this.net.request(u.href,{},'RSS',signal),text=await limitedText(response);
    if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('RSS 외부 엔티티는 허용하지 않습니다.');
    const xml=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(text);
    if(!xml.rss?.channel&&!xml.feed)throw Error('RSS/Atom 피드 형식이 아닙니다.');
    const feed=xml.rss?.channel?.item??xml.feed?.entry??[],items:Candidate[]=[];
    for(const entry of (Array.isArray(feed)?feed:[feed]).slice(0,1000)){
      const links=Array.isArray(entry.link)?entry.link:[entry.link];
      const link=links.find((l:any)=>typeof l==='string'||!l?.['@_rel']||l['@_rel']==='alternate');
      const rawLink=typeof link==='string'?link:link?.['@_href'];if(!rawLink)continue;
      let url:URL;try{url=new URL(rawLink,u);if(url.protocol!=='https:'||url.username||url.password)continue;}catch{continue;}
      items.push({id:String(entry.guid?.['#text']||entry.guid||entry.id||url.href),url:url.href,title:clean(entry.title),text:anonymize(clean(entry['content:encoded']||entry.content||entry.description||entry.summary)),date:normalizedDate(entry.pubDate||entry.published||entry.updated)});
    }
    return items;
  }
}
