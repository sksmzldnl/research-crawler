import { JSDOM } from 'jsdom';
import { XMLParser } from 'fast-xml-parser';
import { Network, limitedText, safeUrl } from './network.js';
import type {Candidate,Source,ProviderSettings} from './types.js';
import type {Vault} from './vault.js';
import { normalizedDate } from './quality.js';
export function clean(s:unknown){const doc=new JSDOM(`<body>${String(s||'')}</body>`).window.document;doc.querySelectorAll('script,style').forEach(e=>e.remove());return doc.body.textContent?.replace(/\s+/g,' ').trim()||'';}
export function anonymize(s:string){return s.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[이메일 삭제]').replace(/(?<!\d)(?:\+82[- ]?|0)1[016789][- ]?\d{3,4}[- ]?\d{4}(?!\d)/g,'[전화번호 삭제]');}
export interface Page {items:Candidate[];next:string|number|null;note?:string;}
export class Connectors {
  constructor(public net:Network,public vault:Vault,public settings:()=>ProviderSettings){}
  async search(source:Source,query:string,cursor:string|number=1,signal?:AbortSignal):Promise<Page>{
    if(source.startsWith('naver_')){
      const id=this.required('naverId'),secret=this.required('naverSecret');const offset=Number(cursor);if(offset>1000)return {items:[],next:null};
      const u=new URL(`https://openapi.naver.com/v1/search/${source.slice(6)}.json`);u.search=new URLSearchParams({query,display:'100',start:String(offset),sort:'date'}).toString();
      const data=await this.net.json(u.href,{headers:{'X-Naver-Client-Id':id,'X-Naver-Client-Secret':secret}},'네이버',signal);
      if(!Array.isArray(data.items)||typeof data.total!=='number')throw Error('네이버 응답 형식이 예상과 다릅니다. 공식 API 지원 상태를 확인하세요.');
      return {items:(data.items||[]).map((i:any)=>({id:i.link,url:i.link,title:clean(i.title),text:clean(i.description),date:normalizedDate(i.postdate),language:'ko'})),next:data.items?.length===100&&offset+100<=Math.min(1000,data.total)?offset+100:null,note:'네이버 웹문서·카페 API는 게시일을 제공하지 않을 수 있습니다. 미확인 자료는 유효 수량에서 제외합니다.'};
    }
    if(source.startsWith('daum_')){
      const u=new URL(`https://dapi.kakao.com/v2/search/${source.slice(5)}`);u.search=new URLSearchParams({query,page:String(cursor),size:'50',sort:'recency'}).toString();
      const data=await this.net.json(u.href,{headers:{Authorization:`KakaoAK ${this.required('kakaoKey')}`}},'다음',signal);
      if(!Array.isArray(data.documents)||typeof data.meta?.is_end!=='boolean')throw Error('다음 응답 형식이 예상과 다릅니다. 공식 API 지원 상태를 확인하세요.');
      return {items:(data.documents||[]).map((i:any)=>({id:i.url,url:i.url,title:clean(i.title),text:clean(i.contents),date:normalizedDate(i.datetime),language:'ko'})),next:!data.meta?.is_end&&Number(cursor)<50?Number(cursor)+1:null};
    }
    if(source==='reddit'){
      if(!this.settings().redditApproved)throw Error('Reddit Data API 사용 승인을 확인한 뒤 활성화하세요.');
      const u=new URL('https://oauth.reddit.com/search');u.search=new URLSearchParams({q:query,limit:'100',sort:'new',restrict_sr:'false',raw_json:'1',...typeof cursor==='string'?{after:cursor}:{}}).toString();
      const data=await this.reddit(u.href,signal);const items:Candidate[]=[];
      for(const {data:p} of data.data?.children||[]){items.push({id:p.name,url:`https://www.reddit.com${p.permalink}`,title:p.title,text:p.selftext||'',date:normalizedDate(new Date(p.created_utc*1000).toISOString()),language:'en',full:!!p.selftext});
        // Only accessible top-level comment trees returned by the API, without 'more' expansion.
        const comments=await this.reddit(`https://oauth.reddit.com/comments/${encodeURIComponent(p.id)}?limit=100&depth=3&raw_json=1`,signal);
        function walk(children:any[]){for(const c of children||[]){if(c.kind!=='t1')continue;const d=c.data;if(d.body&&!['[deleted]','[removed]'].includes(d.body))items.push({id:d.name,url:`https://www.reddit.com${d.permalink}`,title:`댓글 · ${p.title}`,text:d.body,date:normalizedDate(new Date(d.created_utc*1000).toISOString()),language:'en',full:true,kind:'comment',parent:d.parent_id});if(d.replies?.data)walk(d.replies.data.children);}}walk(comments[1]?.data?.children);}
      return {items,next:data.data?.after||null,note:'Reddit: 접근 가능한 댓글만 수집하며 더 보기·삭제·비공개 댓글은 제외합니다. 공개/배포 전에 최신 Data API 약관과 보존 조건을 확인하세요.'};
    }
    if(!this.settings().rssUrls.length)throw Error('API 설정에서 허용된 RSS 피드 URL을 먼저 저장하세요.');
    const items:Candidate[]=[];for(const raw of this.settings().rssUrls){const u=await safeUrl(raw);const response=await this.net.request(u.href,{},'RSS',signal);const text=await limitedText(response);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('RSS 외부 엔티티는 허용하지 않습니다.');const xml=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(text);if(!xml.rss?.channel&&!xml.feed)throw Error('RSS/Atom 피드 형식이 아닙니다.');const feed=xml.rss?.channel?.item??xml.feed?.entry??[];for(const i of Array.isArray(feed)?feed:[feed]){const url=typeof i.link==='string'?i.link:i.link?.['@_href'];if(!url)continue;items.push({id:String(i.guid?.['#text']||i.guid||i.id||url),url,title:clean(i.title),text:clean(i.description||i.summary||i.content||i['content:encoded']),date:normalizedDate(i.pubDate||i.published||i.updated)});}}
    return {items,next:null,note:'RSS 날짜는 피드 제공 값입니다. 피드 원문 저장 권한을 확인하세요.'};
  }
  required(name:string){const v=this.vault.get(name);if(!v)throw Error(`${name}: API 설정에서 연결해 주세요.`);return v;}
  async reddit(url:string,signal?:AbortSignal){const headers={Authorization:`Bearer ${this.required('redditAccess')}`,'User-Agent':'desktop:org.zerowaste.listeningstudio:v0.1.0 (research tool)'};try{return await this.net.json(url,{headers},'Reddit',signal);}catch(e){if((e as any).status!==401||!this.vault.get('redditRefresh'))throw e;const token=await this.net.json('https://www.reddit.com/api/v1/access_token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(this.settings().redditClientId+':').toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:this.vault.get('redditRefresh')}).toString()},'Reddit 갱신',signal);this.vault.set('redditAccess',token.access_token);return this.net.json(url,{headers:{...headers,Authorization:`Bearer ${token.access_token}`}},'Reddit',signal);}}
  async test(provider:string){if(provider==='reddit'){if(!this.settings().redditApproved)throw Error('Reddit API 승인을 먼저 확인하세요.');await this.reddit('https://oauth.reddit.com/api/v1/me');return 'Reddit OAuth 인증 확인';}const result=await this.search(provider==='naver'?'naver_blog':provider==='kakao'?'daum_blog':'rss','제로웨이스트');return `연결 확인 · 응답 ${result.items.length}건 (저장하지 않음)`;}
}
