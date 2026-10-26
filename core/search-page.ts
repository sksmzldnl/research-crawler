import type {Candidate} from './types.js';
export const searchEngines=['naver','daum','bing','google'] as const;
export type SearchEngine=typeof searchEngines[number];
export const engineLabels:Record<SearchEngine,string>={naver:'네이버',daum:'다음',bing:'Bing',google:'Google'};
export interface SearchPage {items:Candidate[];next:boolean;blocked?:string;}
export interface BrowserSearch {search(engine:SearchEngine,query:string,page:number,signal:AbortSignal):Promise<SearchPage>;show():void;close():void;}
export function searchUrl(engine:SearchEngine,query:string,page:number){
 const u=new URL({naver:'https://search.naver.com/search.naver',daum:'https://search.daum.net/search',bing:'https://www.bing.com/search',google:'https://www.google.com/search'}[engine]);
 if(engine==='naver'){u.searchParams.set('where','webkr');u.searchParams.set('query',query);u.searchParams.set('start',String((page-1)*10+1));}
 else if(engine==='daum'){u.searchParams.set('w','web');u.searchParams.set('q',query);u.searchParams.set('p',String(page));}
 else {u.searchParams.set('q',query);u.searchParams.set(engine==='bing'?'first':'start',String((page-1)*10+(engine==='bing'?1:0)));}
 return u.href;
}
// Self-contained: the desktop executes this function in an isolated search window.
export function readSearchDocument(doc:Document,engine:SearchEngine,address:string):SearchPage {
 const body=doc.body?.innerText||doc.body?.textContent||'';
 if(/consent\.google\./.test(address)||doc.querySelector('form[action*="sorry"],#captcha,#captcha-form,.g-recaptcha,iframe[src*="recaptcha"],input[name="captcha"]')||/unusual traffic|verify you are human|비정상적인 접근|자동입력 방지|자동 입력 방지|접근이 제한|요청이 차단/i.test(body))return {items:[],next:false,blocked:'검색 엔진의 접근 확인 또는 차단 화면입니다. 검색창에서 안내를 확인한 뒤 재개하세요.'};
 const selectors={naver:'a.link_tit, a.total_tit, a.api_txt_lines.total_tit, .webdocument_flick a.link_tit',daum:'a.tit_main, a.f_link_b, a.tit-g',bing:'.b_algo h2 a',google:'#search a h3, #rso a h3'};
 const items:Candidate[]=[],seen=new Set<string>();
 for(const node of Array.from(doc.querySelectorAll(selectors[engine]))){
  const a=(node.tagName==='A'?node:node.closest('a')) as HTMLAnchorElement|null;if(!a)continue;
  let url:URL;try{url=new URL(a.getAttribute('href')||'',address);if(url.pathname==='/url'&&url.searchParams.get('q'))url=new URL(url.searchParams.get('q')!);if(url.protocol!=='https:'||url.username||url.password)continue;
   if(engine==='bing'&&url.pathname==='/ck/a'){const raw=url.searchParams.get('u');if(!raw?.startsWith('a1'))continue;url=new URL(atob(raw.slice(2).replace(/-/g,'+').replace(/_/g,'/')));if(url.protocol!=='https:')continue;}
   if(/(^|\.)(?:google|bing|naver|daum)\.(?:com|net)$/.test(url.hostname)&&/^(\/search|\/search.naver|\/url|\/ck\/)/.test(url.pathname))continue;
  }catch{continue;}
  if(seen.has(url.href))continue;seen.add(url.href);
  const card=a.closest(engine==='bing'?'.b_algo':engine==='naver'?'.total_wrap, .webdocument_flick, .api_subject_bx':engine==='daum'?'.c-item-content, .wrap_cont, li':'.MjjYud, .g, .tF2Cxc')||a.parentElement?.parentElement;
  const snippet=card?.querySelector(engine==='bing'?'.b_caption p':engine==='naver'?'.total_dsc, .dsc_txt, .api_txt_lines.dsc_txt':engine==='daum'?'.desc, .f_eb, .c-item-content .desc':'[data-sncf], .VwiC3b, .IsZvec')?.textContent||card?.textContent||'';
  const dateRaw=card?.querySelector('time')?.getAttribute('datetime')||snippet.match(/\b(20\d{2})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/);
  const date=typeof dateRaw==='string'?dateRaw:dateRaw?`${dateRaw[1]}-${dateRaw[2].padStart(2,'0')}-${dateRaw[3].padStart(2,'0')}`:null;
  items.push({id:url.href,url:url.href,title:(a.textContent||'').replace(/\s+/g,' ').trim(),text:snippet.replace(/\s+/g,' ').trim().slice(0,5000),date});
 }
 const next=!!Array.from(doc.querySelectorAll('a[rel="next"],a#pnnext,a.sb_pagN,a.btn_next,a.btn_next_page,a.link_next')).find(a=>!a.hasAttribute('disabled')&&a.getAttribute('aria-disabled')!=='true');
 if(!items.length&&!/검색\s*결과가?\s*없|검색결과를 찾을 수 없|No results found|did not match any documents|There are no results/i.test(body))return {items:[],next:false,blocked:'검색 결과 구조를 확인하지 못했습니다. 검색창을 확인하세요. 빈 결과로 완료하지 않고 일시정지했습니다.'};
 return {items,next};
}
