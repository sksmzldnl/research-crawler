import {JSDOM} from 'jsdom';
import {createHash} from 'node:crypto';
import {content,htmlContent} from './html-content.js';
import {articleDate} from './article-date.js';
import {articleIdentity} from './original-url.js';
import type {Original} from './original.js';

export interface CollectedComment {id:string;parentId:string|null;author:string;date:string|null;text:string;markdown:string;}
export interface CommentReport {items:CollectedComment[];status:'complete'|'partial'|'unavailable';expected?:number;reason?:string;pending?:boolean;}
export const commentRoots='.CommentBox,.u_cbox_wrap,.comment_area,.end_comment,.c-user-comment';
export const commentItems='.CommentItem,.u_cbox_comment,[data-comment-id],.c-user-comment__item,.end_comment_list li';
const normalizedId=(value:string|null)=>value?.replace(/^comment[_-]/i,'').trim()||'';
export function emptyComments(reason='댓글을 확인하지 못했습니다.'):CommentReport{return {items:[],status:'unavailable',reason};}
export function mergeComments(...reports:(CommentReport|undefined)[]):CommentReport{
 const items=new Map<string,CollectedComment>(),fingerprints=new Map<string,CollectedComment>();let expected:number|undefined,complete=false,reason='',pending:boolean|undefined,truncated=false;
 for(const report of reports){if(!report)continue;if(report.pending!==undefined)pending=report.pending;if(report.expected!==undefined)expected=Math.max(expected??0,report.expected);complete||=report.status==='complete';if(report.reason)reason=report.reason;
  for(const item of report.items){const fingerprint=JSON.stringify([item.author,item.date,item.text]),old=fingerprints.get(fingerprint);if(old&&(old.id.startsWith('anon:')||item.id.startsWith('anon:'))){if(old.id.startsWith('anon:')&&!item.id.startsWith('anon:'))items.delete(old.id);else continue;}if(!items.has(item.id)&&items.size>=5000){truncated=true;break;}items.set(item.id,item);fingerprints.set(fingerprint,item);}
 }
 if(truncated){pending=true;reason='댓글 5,000개 수집 한도에 도달했습니다.';}
 const list=[...items.values()],covered=expected!==undefined&&list.length>=expected&&!pending,done=covered||complete&&expected===undefined&&!pending;
 return {items:list,expected,pending,status:done?'complete':list.length?'partial':'unavailable',...(!done?{reason:reason||'댓글 일부를 불러오지 못했습니다.'}:{})};
}
function ordered(items:CollectedComment[]){
 const children=new Map<string|null,CollectedComment[]>(),ids=new Set(items.map(i=>i.id));for(const item of items){const parent=item.parentId&&ids.has(item.parentId)&&item.parentId!==item.id?item.parentId:null;if(!children.has(parent))children.set(parent,[]);children.get(parent)!.push(item);}
 const result:{item:CollectedComment;depth:number}[]=[],seen=new Set<string>(),stack=(children.get(null)||[]).slice().reverse().map(item=>({item,depth:0}));
 const drain=()=>{while(stack.length){const current=stack.pop()!;if(seen.has(current.item.id))continue;seen.add(current.item.id);result.push(current);const next=children.get(current.item.id)||[];for(let i=next.length-1;i>=0;i--)stack.push({item:next[i],depth:Math.min(current.depth+1,12)});}};drain();for(const item of items)if(!seen.has(item.id)){stack.push({item,depth:0});drain();}return result;
}
export function attachComments(original:Original,report:CommentReport):Original{
 const postText=original.postText??original.text,postMarkdown=original.postMarkdown??original.markdown,sequence=ordered(report.items);
 const label=report.status==='complete'?`댓글 ${report.items.length}개`:`댓글 ${report.items.length}개 · ${report.status==='partial'?'일부 수집':'확인 실패'}`;
 const text=sequence.map(({item,depth},i)=>`${'  '.repeat(depth)}${depth?'답글':'댓글'} ${i+1} · ${item.author||'작성자 미확인'}${item.date?' · '+item.date:''}\n${item.text}`).join('\n\n');
 const md=sequence.map(({item,depth},i)=>`${'#'.repeat(Math.min(3+depth,6))} ${depth?'답글':'댓글'} ${i+1}\n\n${[item.author,item.date].filter(Boolean).join(' · ')}\n\n${item.markdown}`).join('\n\n');
 const note=report.status!=='complete'?'\n\n'+(report.reason||'댓글 수집 미완료'):'';
 return {...original,postText,postMarkdown,comments:report,text:postText+'\n\n── '+label+' ──'+(text?'\n\n'+text:report.status==='complete'?'\n\n댓글 없음':'')+note,markdown:postMarkdown+'\n\n---\n\n## '+label+(md?'\n\n'+md:report.status==='complete'?'\n\n댓글 없음':'')+note};
}
export function extractNaverComments(html:string,url:string,removeAds=true,removeHashtags=false):CommentReport{
 const dom=new JSDOM(html,{url});try{const doc=dom.window.document,items:CollectedComment[]=[];let lastRoot:string|null=null;
  for(const el of doc.querySelectorAll(commentItems)){
   const body=el.querySelector('.comment_text_view,.u_cbox_contents,.comment_text,.end_comment_content,.c-user-comment__content,[data-comment-body]');if(!body||body.closest(commentItems)!==el)continue;
   const copy=body.cloneNode(true) as Element;for(const nested of copy.querySelectorAll(commentItems))nested.remove();let parsed;try{parsed=content(copy,url,removeAds,removeHashtags,true);}catch{continue;}
   const author=el.querySelector('.comment_nickname,.u_cbox_nick,.nickname,[data-comment-author]')?.textContent?.trim()||'',dateEl=el.querySelector('time[datetime],.comment_info_date,.u_cbox_date,[data-comment-date]'),date=articleDate(dateEl?.getAttribute('datetime')||dateEl?.getAttribute('title')||dateEl?.textContent);
   const id=normalizedId(el.getAttribute('data-comment-no')||el.getAttribute('data-comment-id')||el.getAttribute('id'))||'anon:'+createHash('sha256').update(JSON.stringify([author,date,parsed.text])).digest('hex');
   let parentId=normalizedId(el.getAttribute('data-parent-comment-no')||el.getAttribute('data-parent-id'))||null;
   if(!parentId){const outer=el.parentElement?.closest(commentItems);parentId=normalizedId(outer?.getAttribute('data-comment-no')||outer?.getAttribute('data-comment-id')||outer?.id||null)||null;}
   if(!parentId&&el.matches('.CommentItem--reply,.u_cbox_reply'))parentId=lastRoot;if(!parentId)lastRoot=id;if(parentId==='0')parentId=null;
   items.push({id,parentId,author,date,...parsed});
  }
  const countEls=doc.querySelectorAll('.u_cbox_count,.CommentBox .comment_title .num,.CommentBox .comment_title,.end_comment .count,[data-comment-count]');let expected:number|undefined;
  for(const el of countEls){const value=(el.getAttribute('data-comment-count')||el.textContent||'').replaceAll(',','').match(/\d+/);if(value)expected=Math.max(expected??0,Number(value[0]));}
  const knownEmpty=!!doc.querySelector(commentRoots)&&/등록된 댓글이 없습니다|아직 댓글이 없습니다|첫 댓글을 남겨/.test(doc.querySelector(commentRoots)?.textContent||'');if(knownEmpty&&expected===undefined)expected=0;
  const pending=Array.from(doc.querySelectorAll(commentRoots)).some(root=>Array.from(root.querySelectorAll('button,a')).some(el=>{if(el.closest('[hidden],[aria-hidden="true"]')||el.hasAttribute('disabled')||el.getAttribute('aria-disabled')==='true'||el.getAttribute('aria-expanded')==='true')return false;const label=(el.textContent||'').trim();if(/접기|닫기|쓰기|등록|삭제|신고|좋아요/.test(label))return false;const pages=el.closest('.u_cbox_page_wrap,.pagination,.Pagination');if(pages){const current=Number(pages.querySelector('[aria-current="page"],.u_cbox_page_on,.on,.active')?.textContent?.trim()||0);return current>0&&Number(label)>current||/^(다음|Next)$/i.test(label);}if(el.matches('.u_cbox_btn_reply')&&el.closest('.u_cbox_comment')?.querySelector('.u_cbox_reply_area:not([hidden])'))return false;return /더\s*보기|댓글\s*더|답글\s*더|답글\s*[\d,]+개|다음\s*댓글/.test(label)||el.matches('.u_cbox_btn_reply')&&/답글|[\d,]+/.test(label);}));
  return mergeComments({items,expected,pending,status:expected!==undefined&&items.length>=expected&&!pending?'complete':items.length?'partial':'unavailable',reason:expected===undefined?'댓글 총수를 확인하지 못했습니다.':'댓글 일부를 불러오지 못했습니다.'});
 }finally{dom.window.close();}
}
/** Only the JSON/JSONP response the article's normal public page already requested. */
export function extractNaverCommentResponse(raw:string,responseUrl:string,articleUrl:string,removeAds=true,removeHashtags=false):CommentReport|null{
 const request=new URL(responseUrl),identity=articleIdentity(articleUrl);if(request.hostname!=='apis.naver.com'||!identity.id)return null;
 const cafe=/\/cafe-web\/cafe-articleapi\/.+\/articles\/(\d+)(?:\/comments)?(?:\/|$)/.exec(request.pathname),box=request.pathname.startsWith('/commentBox/')&&new RegExp('(?:^|[^0-9])'+identity.id+'(?:[^0-9]|$)').test(request.searchParams.get('objectId')||'');
 if(!(cafe&&cafe[1]===identity.id||box))return null;if(cafe&&identity.club&&request.pathname.match(/\/cafes\/(\d+)\//)?.[1]!==identity.club)return null;
 let data:any;try{const json=raw.trim().replace(/^\/\*[\s\S]*?\*\//,'').trim();data=JSON.parse(json.startsWith('{')?json:json.replace(/^[\w.$]+\s*\(/,'').replace(/\)\s*;?\s*$/,''));}catch{return null;}
 if(data.error||data.success===false)return null;const result=data.result||data.message?.result;if(!result||result.error||result.article&&String(result.article.id??result.article.articleId??'')!==identity.id)return null;
 const rows=result.commentList||result.comments?.items||result.comments||result.items;if(!Array.isArray(rows))return null;
 const items:CollectedComment[]=[];
 for(const row of rows){const id=normalizedId(String(row.commentNo??row.id??row.commentId??''));if(!id)continue;const body=row.contents??row.content??row.contentHtml;if(typeof body!=='string'||!body.trim())continue;let parsed;try{parsed=htmlContent(body.replaceAll('\n','<br>'),articleUrl,removeAds,removeHashtags,true);}catch{continue;}
  const parentId=normalizedId(String(row.parentCommentNo??row.parentId??row.refCommentId??''));items.push({id,parentId:parentId&&parentId!==id&&parentId!=='0'?parentId:null,author:String(row.userName??row.writer?.nick??row.writer?.nickname??row.nickName??''),date:articleDate(row.regTime??row.writeDate??row.createdAt),...parsed});
 }
 const count=result.count?.total??result.totalCount??result.comments?.totalCount,expected=!request.searchParams.has('parentCommentNo')&&typeof count==='number'&&count>=0?count:undefined;
 return mergeComments({items,expected,status:expected!==undefined&&items.length>=expected?'complete':items.length?'partial':'unavailable'});
}
