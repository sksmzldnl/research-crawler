import {JSDOM} from 'jsdom';
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
function removeHashtagWords(root:Element){
 // Work on HTML text before Markdown adds its own # headings and link destinations.
 for(const el of root.querySelectorAll('a,.se-hashtag,.post_tag,.post-tag')){
  if(el.closest('pre,code,kbd,samp'))continue;
  const label=(el.textContent||'').trim();
  if(/^(?:[#＃][\p{L}\p{M}\p{N}_]+\s*)+$/u.test(label))el.replaceWith(' ');
 }
 const walker=root.ownerDocument.createTreeWalker(root,4);let node:Node|null;
 while((node=walker.nextNode())){
  if(node.parentElement?.closest('pre,code,kbd,samp'))continue;
  // Keep literal URLs (including their #fragments) and words such as C# intact.
  node.textContent=(node.textContent||'').split(/(https?:\/\/[^\s<>]+|www\.[^\s<>]+)/gi).map((part,i)=>i%2?part:part.replace(/(?<![\p{L}\p{M}\p{N}_/\\?=&%#＃])(?:[#＃][\p{L}\p{M}\p{N}_]+)+/gu,'')).join('');
 }
}
export function content(root:Element,url:string,removeAds:boolean,removeHashtags=false,allowEmpty=false){
 for(const el of root.querySelectorAll('script,style,noscript,button,input,select,textarea,[hidden],[aria-hidden="true"]'))el.remove();
 if(removeAds)for(const el of root.querySelectorAll('ins.adsbygoogle,[data-ad],[data-ad-slot],[data-ad-unit],[data-advertisement],[id^="adpost"],[id^="ad_"],[id^="ad-"],.adpost,.adsbygoogle,.advertisement,.banner-ad,.ad-banner,.popup-ad,.ad-popup,[role="dialog"],iframe[src*="doubleclick"],iframe[src*="ad.naver"],iframe[src*="ads."]'))el.remove();
 if(removeHashtags)removeHashtagWords(root);
 const text=visibleText(root),md=markdown(root,url).replace(/\n{3,}/g,'\n\n').trim();
 if(!allowEmpty&&((!text&&!root.querySelector('img'))||/^(로딩\s*중\.?|loading\.?|잠시만 기다려\s*주세요\.?)$/i.test(text)))throw new Error('본문을 불러오는 중입니다.');
 return {text,markdown:md};
}

export function htmlContent(html:string,url:string,removeAds=true,removeHashtags=false,allowEmpty=false){const dom=new JSDOM('<div id="collected-body"></div>',{url});try{const root=dom.window.document.getElementById('collected-body')!;root.innerHTML=html;return content(root,url,removeAds,removeHashtags,allowEmpty);}finally{dom.window.close();}}
