import {JSDOM} from 'jsdom';
import {createHash} from 'node:crypto';
import {forumArticle,forumLabels,type ForumType} from './forum.js';
import {forumDate} from './forum-date.js';
import {content} from './html-content.js';
import {mergeComments,type CollectedComment,type CommentReport} from './comments.js';
import type {Original} from './original.js';
import type {ApiPage} from './search-api.js';

/** Legacy selectors plus semantic/current-markup candidates; live selectors remain separately unverified. */
export const forumSelectors:Record<ForumType,{posts:string;body:string;author:string;date:string}>={
 mumsnet:{posts:'#posts > .post,.talk-post,[data-testid="post"],[data-testid="talk-post"],[data-post-id],[data-postid],article[id^="post"],div[id^="post-"]',body:'[data-testid="post-content"],[data-testid="post-body"],.talk-post__body,.talk-post__content,.post__body,.post-body,.post-content,.message,[itemprop="articleBody"]',author:'[data-testid="post-author"],.nickname .nick,.nickname,.talk-post__username,[itemprop="author"]',date:'time[datetime],[data-testid="post-date"],.post_time,.talk-post__timestamp,[itemprop="datePublished"]'},
 mse:{posts:'.Discussion,.ItemDiscussion,.ItemComment,[data-discussion-id],[data-commentid],[data-comment-id],article[itemtype$="DiscussionForumPosting"]',body:'.Message.userContent,.Message,[data-testid="post-content"],[itemprop="articleBody"]',author:'.Author a.Username,.Username,[itemprop="author"]',date:'time[datetime],.DateCreated,[itemprop="datePublished"]'},
};
export function googleForumUrl(type:ForumType,query:string,start:number){
 if(!Number.isInteger(start)||start<1||start>100)throw Error('검색 재개 위치를 확인하세요.');const u=new URL('https://www.google.com/search');u.search=new URLSearchParams({q:(type==='mumsnet'?'site:mumsnet.com/talk/':'site:forums.moneysavingexpert.com/discussion/')+' '+query,start:String(start-1),hl:'en'}).toString();return u.href;
}
export function parseGoogleForum(type:ForumType,html:string,address:string):ApiPage|null {
 const page=new URL(address);if(page.hostname!=='www.google.com'||page.pathname!=='/search')return null;const dom=new JSDOM(html,{url:address});try{const doc=dom.window.document,items:ApiPage['items']=[],seen=new Set<string>();
  const roots=doc.querySelectorAll('#search,#rso,main,[role="main"]');
  for(const root of roots)for(const a of root.querySelectorAll('a[href]')){if(a.closest('nav,[role="navigation"],header,footer'))continue;try{let u=new URL(a.getAttribute('href')||'',address);if(['www.google.com','google.com'].includes(u.hostname)&&u.pathname==='/url')u=new URL(u.searchParams.get('q')||u.searchParams.get('url')||'');const article=forumArticle(u.href);if(article.type!==type||seen.has(article.id))continue;const heading=a.querySelector('h3,[role="heading"]')||a.closest('h3,[role="heading"]'),title=(heading?.textContent||a.textContent||'').trim();if(!title)continue;seen.add(article.id);const card=a.closest('.MjjYud,.g,.tF2Cxc')||a.parentElement?.parentElement;items.push({id:article.id,url:article.url,title,text:card?.querySelector('[data-sncf],.VwiC3b,.IsZvec')?.textContent?.trim()||'',date:null,language:'en'});}catch{}}
  let next:number|null=null;for(const a of doc.querySelectorAll('a#pnnext,a[rel="next"],a[aria-label="Next"],a[aria-label="다음"]'))try{const u=new URL(a.getAttribute('href')||'',address),offset=Number(u.searchParams.get('start'));if(u.hostname==='www.google.com'&&u.pathname==='/search'&&u.searchParams.get('q')===page.searchParams.get('q')&&Number.isInteger(offset)&&offset>Number(page.searchParams.get('start')||0)&&offset<100)next=offset+1;}catch{}
  const noResults=/did not match any documents|No results found|There are no results|검색결과를 찾을 수 없|검색 결과가 없습니다/i.test(doc.body.textContent||''),headings=doc.querySelectorAll('#search h3,#rso h3,main h3,[role="main"] [role="heading"]');
  if(!items.length&&!headings.length&&!noResults)return null;
  return {items,next,...(!items.length&&headings.length?{notice:'Google 검색 결과에서 수집 가능한 '+forumLabels[type]+' 토론 주소를 찾지 못했습니다.'}:{})};
 }finally{dom.window.close();}
}
export interface ForumPage {original?:Original;comments:CommentReport;next?:string;postId?:string;}
/** A later page may contain only comments; never relabel its first comment as the original. */
export function parseForumPage(type:ForumType,html:string,address:string,removeAds=true,removeHashtags=false,knownPostId?:string):ForumPage|null {
 const article=forumArticle(address);if(article.type!==type)return null;const dom=new JSDOM(html,{url:address});try{const doc=dom.window.document,selectors=forumSelectors[type];
  const canonical=doc.querySelector('link[rel="canonical"]')?.getAttribute('href');if(canonical){try{const expected=forumArticle(new URL(canonical,address).href);if(expected.type!==type||expected.id!==article.id)return null;}catch{return null;}}
  const topic=doc.querySelector('[data-discussion-id]');if(type==='mse'&&topic&&topic.getAttribute('data-discussion-id')!==article.id)return null;
  const posts=Array.from(doc.querySelectorAll(selectors.posts)).filter(el=>!el.closest('blockquote,q,.Quote'));
  const own=(el:Element,selector:string)=>Array.from(el.querySelectorAll(selector)).find(node=>node.closest(selectors.posts)===el);
  const rows:{id:string;author:string;date:string|null;text:string;markdown:string;el:Element}[]=[];
  for(const el of posts){const body=own(el,selectors.body);if(!body)continue;const copy=body.cloneNode(true) as Element;for(const node of copy.querySelectorAll('.Signature,.signature,.post-actions,.post-footer,[data-testid="post-actions"]'))node.remove();let parsed;try{parsed=content(copy,address,removeAds,removeHashtags,true);}catch{continue;}
   if(!parsed.text.trim())continue;const author=own(el,selectors.author)?.textContent?.trim()||'';
   const publication=(selector:string)=>Array.from(el.querySelectorAll(selector)).find(node=>node.closest(selectors.posts)===el&&!node.closest(selectors.body)&&!node.closest('blockquote,[itemprop="dateModified"],.DateUpdated,.Edited,[data-testid="edited-date"]'));
   const dateNode=publication('time[datetime],meta[itemprop="datePublished"][content]')||publication(selectors.date),date=forumDate(dateNode?.getAttribute('datetime')||dateNode?.getAttribute('content')||dateNode?.getAttribute('title')||dateNode?.textContent);
   const id=el.getAttribute('data-post-id')||el.getAttribute('data-postid')||el.getAttribute('data-comment-id')||el.getAttribute('data-commentid')||el.id||'anon:'+createHash('sha256').update(JSON.stringify([author,date,parsed.text])).digest('hex');rows.push({id,author,date,...parsed,el});
  }
  if(!rows.length)return null;
  let original:Original|undefined,postId=knownPostId;
  const first=knownPostId?rows.find(row=>row.id===knownPostId):article.page===1?rows.find(row=>type==='mse'?row.el.matches('.Discussion,.ItemDiscussion,article[itemtype$="DiscussionForumPosting"]')||row.el.hasAttribute('data-discussion-id')&&!row.el.matches('.ItemComment,[data-comment-id],[data-commentid]')&&!/^Comment[_-]/i.test(row.id):true):undefined;
  if(first){if(/^\s*\[(?:removed|deleted)\]\s*$/i.test(first.text))throw Error('삭제되거나 접근이 제한된 토론입니다.');postId=first.id;original={url:article.url,date:first.date,text:first.text,markdown:first.markdown};}
  const items:CollectedComment[]=rows.filter(row=>row.id!==postId).map(({id,author,date,text,markdown,el})=>({id,parentId:el.getAttribute('data-parent-id')||null,author,date,text,markdown}));
  let expected:number|undefined;for(const el of doc.querySelectorAll('[data-comment-count],[data-reply-count],.CommentCount .Number,[data-testid="reply-count"],.talk-thread__reply-count')){const raw=el.getAttribute('data-comment-count')||el.getAttribute('data-reply-count')||el.textContent||'';if(/^\s*[\d,]+\s*(?:repl(?:y|ies)|comments|posts)?\s*$/i.test(raw)){const n=Number(raw.replace(/[^\d]/g,''));if(Number.isSafeInteger(n)&&n>=0)expected=Math.max(expected??0,n);}}
  if(expected===undefined&&/\b(?:no replies yet|no comments yet|be the first to (?:reply|comment))\b/i.test(doc.querySelector('main,#posts,.CommentHeading,.Comments')?.textContent||''))expected=0;
  let next:string|undefined;for(const a of doc.querySelectorAll('a[rel="next"],.pagination a,.Pagination a,.Pager a,[aria-label*="pagination" i] a,[data-testid="pagination"] a')){const label=(a.getAttribute('aria-label')||a.textContent||'').trim();if(a.getAttribute('rel')!=='next'&&!/^(?:next(?: page)?\s*[›»>]?|[›»>]|\d+)$/i.test(label))continue;try{const u=new URL(a.getAttribute('href')||'',address),identity=forumArticle(u.href);if(identity.type!==type||identity.id!==article.id||identity.page!==article.page+1)continue;u.hash='';for(const key of [...u.searchParams.keys()])if(!['page','pg','messages'].includes(key))u.searchParams.delete(key);next=u.href;break;}catch{}}
  const comments=mergeComments({items,expected,pending:!!next,status:expected!==undefined&&items.length>=expected&&!next?'complete':items.length?'partial':'unavailable',reason:expected===undefined?'댓글 총수를 확인하지 못했습니다.':'추가 댓글 페이지를 확인해야 합니다.'});
  return {original,comments,next,postId};
 }finally{dom.window.close();}
}
