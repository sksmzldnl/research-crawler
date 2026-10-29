import {JSDOM} from 'jsdom';
import {Network} from './network.js';
import {normalizedDate} from './quality.js';
export interface Original {text:string;markdown:string;date:string|null;url:string;}
export interface OriginalSource {read(url:string,removeAds:boolean,signal:AbortSignal):Promise<Original>;}
import {publicNaverUrl} from './original-url.js';
function safeLink(raw:string,base:string){try{const u=new URL(raw,base);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href.replaceAll(')','%29'):'';}catch{return '';}}
const blocks=new Set(['P','DIV','SECTION','ARTICLE','FIGURE','FIGCAPTION','BLOCKQUOTE','UL','OL','TABLE','TR','PRE']);
function markdown(node:Node,base:string):string{
 if(node.nodeType===3)return (node.textContent||'').replace(/([\\`*_\[\]<>])/g,'\\$1');if(node.nodeType!==1)return '';const el=node as Element,tag=el.tagName;
 if(['IFRAME','VIDEO','AUDIO','SOURCE','EMBED','OBJECT'].includes(tag)){const url=safeLink(el.getAttribute('src')||el.getAttribute('data')||'',base);return url?'\n[임베디드 콘텐츠]('+url+')\n':'';}
 if(tag==='BR')return '\n';if(tag==='HR')return '\n\n---\n\n';if(tag==='IMG'){const raw=el.getAttribute('data-lazy-src')||el.getAttribute('data-src')||el.getAttribute('src')||'',url=safeLink(raw,base);return url?'\n!['+(el.getAttribute('alt')||'이미지').replace(/[\[\]\n]/g,' ')+']('+url+')\n':'';}
 const content=Array.from(el.childNodes).map(n=>markdown(n,base)).join('');if(tag==='A'){const url=safeLink(el.getAttribute('href')||'',base);return url?'['+(content.trim()||url)+']('+url+')':content;}
 if(/^H[1-6]$/.test(tag))return '\n\n'+'#'.repeat(Number(tag[1]))+' '+content.trim()+'\n\n';if(tag==='LI')return '\n- '+content.trim();if(tag==='STRONG'||tag==='B')return '**'+content+'**';if(tag==='TD'||tag==='TH')return content+' | ';return blocks.has(tag)?'\n\n'+content.trim()+'\n\n':content;
}
function visibleText(root:Element){const copy=root.cloneNode(true) as Element;for(const el of copy.querySelectorAll('br'))el.replaceWith('\n');for(const el of copy.querySelectorAll('p,div,li,h1,h2,h3,h4,tr,blockquote,figcaption')){el.prepend('\n');el.append('\n');}return (copy.textContent||'').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function posted(doc:Document){
 for(const selector of ['meta[property="article:published_time"]','meta[property="og:article:published_time"]','meta[itemprop="datePublished"]','.se_publishDate','.ArticleWriter .date','.blog_date','.post_date','time[datetime]:not([itemprop="dateModified"])','meta[name="date"]','.date'])for(const el of doc.querySelectorAll(selector)){const date=normalizedDate(el.getAttribute('content')||el.getAttribute('datetime')||el.textContent);if(date)return date;}
 for(const el of doc.querySelectorAll('script[type="application/ld+json"]')){try{const walk=(v:any):string|null=>{if(!v||typeof v!=='object')return null;if(v.datePublished)return normalizedDate(v.datePublished);for(const value of Object.values(v)){if(value&&typeof value==='object'){const result=walk(value);if(result)return result;}}return null;};const d=walk(JSON.parse(el.textContent||''));if(d)return d;}catch{}}
 return null;
}
export function extractOriginal(html:string,url:string,removeAds:boolean):Original{
 const dom=new JSDOM(html,{url});try{const doc=dom.window.document,date=posted(doc);
 // Scope extraction to the article itself. No navigation, recommendations, comments or login screen fallback.
 const root=['.se-main-container','#postViewArea','.post-view','.se_doc_viewer','.ContentRenderer','.article_viewer','.NHN_Writeform_Main','#tbody'].map(selector=>doc.querySelector(selector)).find(Boolean);
 if(!root)throw Error('공개 본문을 찾지 못했습니다. 로그인·가입이 필요하거나 지원하지 않는 페이지 구조일 수 있습니다.');
 for(const el of root.querySelectorAll('script,style,noscript,form,button,input,select,textarea,[hidden],[aria-hidden="true"]'))el.remove();
 if(removeAds)for(const el of root.querySelectorAll('ins.adsbygoogle, [data-ad], [data-ad-slot], [data-ad-unit], [data-advertisement], [id^="adpost"], [id^="ad_"], [id^="ad-"], .adpost, .adsbygoogle, .advertisement, .banner-ad, .ad-banner, .popup-ad, .ad-popup, [role="dialog"], iframe[src*="doubleclick"], iframe[src*="ad.naver"], iframe[src*="ads."]'))el.remove();
 const text=visibleText(root),md=markdown(root,url).replace(/\n{3,}/g,'\n\n').trim();if(!text&&!root.querySelector('img'))throw Error('게시글 본문이 비어 있습니다.');
 return {text,markdown:md,date,url};}finally{dom.window.close();}
}
export class OriginalReader implements OriginalSource{
 constructor(private net:Network){}
 async read(raw:string,removeAds:boolean,signal:AbortSignal):Promise<Original>{let url=publicNaverUrl(raw);
  // Blog desktop pages wrap the real public post in mainFrame. Cafe also uses cafe_main.
  for(let n=0;n<4;n++){signal.throwIfAborted();const result=await this.net.page(url,signal),dom=new JSDOM(result.html,{url:result.url});let frame:string|undefined;
   try{frame=dom.window.document.querySelector('iframe#mainFrame, iframe[name="mainFrame"], iframe#cafe_main, iframe[name="cafe_main"]')?.getAttribute('src')||undefined;}finally{dom.window.close();}
   if(frame){url=publicNaverUrl(new URL(frame,result.url).href);continue;}
   return extractOriginal(result.html,result.url,removeAds);
  }throw Error('본문 프레임이 반복되어 수집을 중지했습니다.');
 }
}
