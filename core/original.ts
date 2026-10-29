import {JSDOM} from 'jsdom';
import {content} from './html-content.js';
import {attachComments,extractNaverComments,type CommentReport} from './comments.js';
import {Network} from './network.js';
import {kinPublishedDate} from './kin-date.js';
import {articleDate} from './article-date.js';
import {publicNaverUrl,articleIdentity} from './original-url.js';
export interface Original {text:string;markdown:string;date:string|null;url:string;postText?:string;postMarkdown?:string;comments?:CommentReport;}
export interface OriginalSource {read(url:string,removeAds:boolean,signal:AbortSignal,removeHashtags?:boolean,includeComments?:boolean):Promise<Original>;}
export class OriginalUnavailable extends Error {}
export const articleSelectors=['.ArticleContentBox .article_viewer','.article_viewer','.ContentRenderer','#postViewArea','.post-view','.se_doc_viewer','.se-main-container','.NHN_Writeform_Main','#tbody','#postContent','#articleContent','#articleBody','.post_content'];
const questionSelectors=['.question-content .c-heading__content','._questionContentsArea','.questionDetail','.question-content__body','.question-content'];
const answerSelectors=['.answerDetail','._answerContentsArea','._answerContents','.answer-content ._endContentsText','.answer-content .c-heading-answer__content-user','.answer-content .se-main-container','.answer-content__body'];
export const readerSelectors=[...articleSelectors,...questionSelectors,...answerSelectors].join(',');
function posted(doc:Document,kin:boolean){
 if(kin)return kinPublishedDate(doc);
 const selectors=['meta[property="article:published_time"]','meta[property="og:article:published_time"]','meta[itemprop="datePublished"]','.ArticleWriter .date','.WriterInfo .date','.se_publishDate','.blog_date','.post_date',...(kin?['.question-content .c-userinfo__info','.question-content .userInfo__info','.question-content .date','.question-content .info']:[]),'time[datetime]:not([itemprop="dateModified"])','meta[name="date"]','.date'];
 for(const selector of selectors)for(const el of doc.querySelectorAll(selector)){
  if(el.closest('.CommentBox,.CommentItem,.u_cbox_comment,[data-comment-id],.c-user-comment__item,.end_comment_list,.comment,#commentList,.answer-content,.answer_wrap')||/수정일|수정됨|updated/i.test(el.textContent||''))continue;
  for(const value of [el.getAttribute('content'),el.getAttribute('datetime'),el.getAttribute('data-timestamp'),el.getAttribute('title'),el.textContent]){const date=articleDate(value);if(date)return date;}
 }
 for(const el of doc.querySelectorAll('script[type="application/ld+json"]')){try{
  const walk=(v:any):string|null=>{if(!v||typeof v!=='object')return null;if(Array.isArray(v)){for(const x of v){const d=walk(x);if(d)return d;}return null;}
   if(v['@type']==='QAPage')return articleDate(v.mainEntity?.datePublished||v.mainEntity?.dateCreated||v.datePublished);
   if(v['@type']==='Answer'||v['@type']==='Comment')return null;
   const d=articleDate(v.datePublished||v.dateCreated);if(d)return d;return walk(v['@graph']);};
  const d=walk(JSON.parse(el.textContent||''));if(d)return d;
 }catch{}}
 return null;
}
export function extractOriginal(html:string,url:string,removeAds:boolean,removeHashtags=false):Original{
 const dom=new JSDOM(html,{url});try{const doc=dom.window.document,kin=articleIdentity(url).kind==='kin',date=posted(doc,kin);
  if(kin){
   const question=questionSelectors.map(s=>doc.querySelector(s)).find(Boolean);if(!question)throw new OriginalUnavailable('질문 본문을 찾지 못했습니다.');
   const q=content(question,url,removeAds,removeHashtags),answers:Element[]=[];
   for(const selector of answerSelectors)for(const el of doc.querySelectorAll(selector))if(!answers.some(a=>a.contains(el)||el.contains(a))&&!question.contains(el))answers.push(el);
   answers.sort((a,b)=>a.compareDocumentPosition(b)&4?-1:1);const parts=answers.map(el=>content(el,url,removeAds,removeHashtags));return {url,date,text:['질문\n'+q.text,...parts.map((a,i)=>`답변 ${i+1}\n${a.text}`)].join('\n\n'),markdown:['## 질문\n\n'+q.markdown,...parts.map((a,i)=>`## 답변 ${i+1}\n\n${a.markdown}`)].join('\n\n')};
  }
  const root=articleSelectors.map(selector=>doc.querySelector(selector)).find(Boolean);
  if(!root)throw new OriginalUnavailable('공개 본문을 찾지 못했습니다.');
  return {...content(root,url,removeAds,removeHashtags),date,url};
 }finally{dom.window.close();}
}
/** Parse only the article returned by the public page's own request; never execute state scripts. */
export function extractCafeResponse(data:unknown,url:string,removeAds:boolean,removeHashtags=false):Original|null{
 const identity=articleIdentity(url);if(identity.kind!=='cafe'||!identity.id||!data||typeof data!=='object')return null;
 const root=data as any,article=root.result?.article||root.message?.result?.article||root.article;
 if(!article||typeof article!=='object'||String(article.id??article.articleId??'')!==identity.id)return null;
 if(root.error||root.result?.error||article.isBlocked===true||article.isDeleted===true)return null;
 const html=article.contentHtml??article.content;if(typeof html!=='string'||!html.trim())return null;
 const dom=new JSDOM('<div id="collected-body"></div>',{url});try{const body=dom.window.document.getElementById('collected-body')!;body.innerHTML=html;return {...content(body,url,removeAds,removeHashtags),url,date:articleDate(article.writeDate??article.writeTime??article.createdAt??article.registeredAt)};}finally{dom.window.close();}
}
function embeddedArticle(html:string,url:string,removeAds:boolean,removeHashtags:boolean){
 const dom=new JSDOM(html,{url});try{
  for(const script of dom.window.document.querySelectorAll('script[type="application/json"],script#__NEXT_DATA__')){try{const data=JSON.parse(script.textContent||''),queue=[data];for(let n=0;queue.length&&n<200;n++){const value=queue.shift();if(!value||typeof value!=='object')continue;const result=extractCafeResponse(value,url,removeAds,removeHashtags);if(result)return result;for(const [key,item] of Object.entries(value))if(!['comments','replies','members'].includes(key)&&item&&typeof item==='object')queue.push(item);}}catch{}}
 }finally{dom.window.close();}return null;
}
export class OriginalReader implements OriginalSource{
 constructor(private net:Network){}
 async read(raw:string,removeAds:boolean,signal:AbortSignal,removeHashtags=false,includeComments=false):Promise<Original>{let url=publicNaverUrl(raw);
  for(let n=0;n<5;n++){signal.throwIfAborted();const result=await this.net.page(url,signal),dom=new JSDOM(result.html,{url:result.url});let frame:string|undefined;
   try{frame=dom.window.document.querySelector('iframe#mainFrame,iframe[name="mainFrame"],iframe#cafe_main,iframe[name="cafe_main"]')?.getAttribute('src')||undefined;}finally{dom.window.close();}
   if(frame){url=publicNaverUrl(new URL(frame,result.url).href);continue;}
   const embedded=embeddedArticle(result.html,result.url,removeAds,removeHashtags),body=embedded||extractOriginal(result.html,result.url,removeAds,removeHashtags);
   return includeComments?attachComments(body,extractNaverComments(result.html,result.url,removeAds,removeHashtags)):body;
  }throw new OriginalUnavailable('본문 프레임을 읽지 못했습니다.');
 }
}
