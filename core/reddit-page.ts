import {JSDOM} from 'jsdom';
import {createHash} from 'node:crypto';
import {redditArticle} from './reddit.js';
import {content} from './html-content.js';
import {articleDate} from './article-date.js';
import {mergeComments,type CollectedComment,type CommentReport} from './comments.js';
import type {Original} from './original.js';
import type {ApiPage} from './search-api.js';
export function googleRedditUrl(query:string,start:number,community=''){
 if(!Number.isInteger(start)||start<1||start>100||community&&!/^[A-Za-z0-9_]{1,50}$/.test(community))throw Error('Reddit 검색 범위를 확인하세요.');
 const url=new URL('https://www.google.com/search');url.search=new URLSearchParams({q:(community?'site:reddit.com/r/'+community+'/comments/':'site:reddit.com')+' '+query,start:String(start-1),hl:'en'}).toString();return url.href;
}
export function parseGoogleReddit(html:string,address:string,community=''):ApiPage|null{
 const page=new URL(address);if(page.hostname!=='www.google.com'||page.pathname!=='/search')return null;const dom=new JSDOM(html,{url:address});try{const doc=dom.window.document,items:ApiPage['items']=[],seen=new Set<string>();
  for(const heading of doc.querySelectorAll('#search a h3,#rso a h3')){const link=heading.closest('a');if(!link)continue;try{let u=new URL(link.getAttribute('href')||'',address);if(u.hostname==='www.google.com'&&u.pathname==='/url')u=new URL(u.searchParams.get('q')||u.searchParams.get('url')||'');const article=redditArticle(u.href);const subreddit=u.pathname.match(/^\/r\/([^/]+)\/comments\//i)?.[1];if(community&&subreddit&&subreddit.toLowerCase()!==community.toLowerCase()||seen.has(article.id))continue;seen.add(article.id);const card=heading.closest('.MjjYud,.g,.tF2Cxc')||link.parentElement?.parentElement;items.push({id:article.id,url:article.url,title:heading.textContent?.trim()||'Reddit',text:card?.querySelector('[data-sncf],.VwiC3b,.IsZvec')?.textContent?.trim()||'',date:null,language:'en'});}catch{}}
  let next:number|null=null;for(const link of doc.querySelectorAll('a#pnnext,a[rel="next"],a[aria-label="Next"],a[aria-label="다음"]')){try{const u=new URL(link.getAttribute('href')||'',address),offset=Number(u.searchParams.get('start'));if(u.hostname==='www.google.com'&&u.pathname==='/search'&&u.searchParams.get('q')===page.searchParams.get('q')&&Number.isInteger(offset)&&offset>Number(page.searchParams.get('start')||0)&&offset<100)next=offset+1;}catch{}}
  if(!items.length&&!doc.querySelector('#search h3,#rso h3')&&!/did not match any documents|No results found|There are no results|검색결과를 찾을 수 없|검색 결과가 없습니다/i.test(doc.body.textContent||''))return null;
  return {items,next};
 }finally{dom.window.close();}
}
export const redditPostSelector='shreddit-post,article[data-post-id],.thing.link,[data-testid="post-container"]';
export const redditCommentSelector='shreddit-comment,.thing.comment,[data-comment-id]';
export function parseRedditOriginal(html:string,address:string,removeAds=true,removeHashtags=false):{original:Original;comments:CommentReport}|null{
 const {id,url}=redditArticle(address),dom=new JSDOM(html,{url:address});try{const doc=dom.window.document;
  const post=Array.from(doc.querySelectorAll(redditPostSelector)).find(el=>{const identity=el.getAttribute('data-fullname')||el.getAttribute('id')||el.getAttribute('data-post-id')||'';if(identity)return identity.replace(/^t3_/,'')===id;const link=el.getAttribute('permalink')||el.getAttribute('content-href');if(!link)return false;try{return redditArticle(new URL(link,address).href).id===id;}catch{return false;}});if(!post)return null;
  const title=post.querySelector('h1,[slot="title"],a.title')?.textContent?.trim()||post.getAttribute('post-title')||'';
  const body=post.querySelector('[slot="text-body"],[property="schema:articleBody"],.usertext-body .md,[data-testid="post-content"],[data-click-id="text"]');let parsed:{text:string;markdown:string};
  if(body){try{parsed=content(body.cloneNode(true) as Element,address,removeAds,removeHashtags);}catch{return null;}}
  else {const media=post.querySelector('[slot="post-media-container"],[slot="post-media"],.media-preview,.expando')?.cloneNode(true) as Element|undefined;if(media){try{parsed=content(media,address,removeAds,removeHashtags);}catch{return null;}}else{const href=post.getAttribute('content-href'),kind=post.getAttribute('post-type');if(!title||!['image','video','link','gallery'].includes(kind||''))return null;let link='';try{const u=new URL(href||'',address);if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)link=u.href;}catch{}parsed={text:title+(link?'\n'+link:''),markdown:title+(link?'\n\n[미디어·링크]('+link.replaceAll(')','%29')+')':'')};}}
  if(/^\s*\[(?:removed|deleted)\]\s*$/i.test(parsed.text))throw Error('삭제되거나 접근이 제한된 Reddit 원문입니다.');
  const time=Array.from(post.querySelectorAll('time[datetime]')).find(el=>!el.closest(redditCommentSelector));const date=articleDate(post.getAttribute('created-timestamp')||post.getAttribute('data-timestamp')||time?.getAttribute('datetime')||doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content'));
  const items:CollectedComment[]=[];for(const el of doc.querySelectorAll(redditCommentSelector)){const body=Array.from(el.querySelectorAll('[slot="comment"],[slot="comment-body"],.usertext-body .md,[data-testid="comment-body"],[data-comment-body]')).find(node=>node.closest(redditCommentSelector)===el);if(!body)continue;const copy=body.cloneNode(true) as Element;for(const nested of copy.querySelectorAll(redditCommentSelector))nested.remove();let value;try{value=content(copy,address,removeAds,removeHashtags,true);}catch{continue;}
   const author=el.getAttribute('author')||Array.from(el.querySelectorAll('a.author,a[href^="/user/"],[data-comment-author]')).find(node=>node.closest(redditCommentSelector)===el)?.textContent?.trim()||'',dateEl=Array.from(el.querySelectorAll('time[datetime]')).find(node=>node.closest(redditCommentSelector)===el),date=articleDate(el.getAttribute('created-timestamp')||dateEl?.getAttribute('datetime'));
   const commentId=(el.getAttribute('thingid')||el.getAttribute('data-fullname')||el.getAttribute('data-comment-id')||el.id||'').replace(/^t1_/,'')||'anon:'+createHash('sha256').update(JSON.stringify([author,date,value.text])).digest('hex'),parent=(el.getAttribute('parentid')||el.getAttribute('data-parent-id')||el.parentElement?.closest(redditCommentSelector)?.getAttribute('thingid')||el.parentElement?.closest(redditCommentSelector)?.getAttribute('data-fullname')||'');
   items.push({id:commentId,parentId:parent&&!parent.startsWith('t3_')?parent.replace(/^t1_/,''):null,author,date,...value});
  }
  let expected:number|undefined;const count=post.getAttribute('comment-count')||post.getAttribute('data-comment-count')||post.querySelector('a[data-post-click-location="comments"] faceplate-number[number]')?.getAttribute('number');if(count!==null&&count!==undefined&&/^\d+$/.test(count))expected=Number(count);
  if(expected===undefined){const area=doc.querySelector('shreddit-comment-tree,.commentarea,[data-comment-tree]');if(area&&/Be the first to comment|No comments yet|아직 댓글이 없습니다/i.test(area.textContent||''))expected=0;}
  const comments=mergeComments({items,expected,status:expected!==undefined&&items.length>=expected?'complete':items.length?'partial':'unavailable',reason:expected===undefined?'댓글 총수를 확인하지 못했습니다.':'추가 댓글을 불러오지 못했습니다.'});
  return {original:{url,date,...parsed},comments};
 }finally{dom.window.close();}
}
