import {it,expect} from 'vitest';
import {attachComments,extractNaverComments,extractNaverCommentResponse,mergeComments} from '../core/comments.js';
import {extractOriginal,OriginalReader} from '../core/original.js';
import {Network} from '../core/network.js';
import {originalFile} from '../core/original-export.js';
import {applySearchFilters} from '../core/search.js';
import type {SearchConfig} from '../core/types.js';
import {makeRecord} from '../core/record.js';
const url='https://cafe.naver.com/ArticleRead.nhn?clubid=123&articleid=15641';
const html='<div class="ArticleWriter"><span class="date">2026.04.15</span></div><div class="ContentRenderer"><p>원문 첫 문단</p><p>원문 마지막</p></div><div class="CommentBox"><h3 class="comment_title">댓글 2</h3><div class="CommentItem" data-comment-id="1"><span class="comment_nickname">첫 작성자</span><span class="comment_info_date">2026.04.16</span><div class="comment_text_view">댓글 원문 전체 #태그</div></div><div class="CommentItem CommentItem--reply" data-comment-id="2" data-parent-id="1"><span class="comment_nickname">답글 작성자</span><span class="comment_info_date">2026.04.17</span><div class="comment_text_view">답글 마지막</div></div></div>';
it('appends comments and replies after the unmodified post, with author/date and no duplicate section on retry',()=>{
 const post=extractOriginal(html,url,true),report=extractNaverComments(html,url,true,true),joined=attachComments(post,report),retry=attachComments(joined,report);
 expect(report.status).toBe('complete');expect(report.items[1].parentId).toBe('1');expect(joined.date?.slice(0,10)).toBe('2026-04-15');expect(joined.text.indexOf('원문 마지막')).toBeLessThan(joined.text.indexOf('댓글 원문 전체'));expect(joined.markdown).toContain('#### 답글 2');expect(joined.text).toContain('첫 작성자');expect(joined.text).not.toContain('#태그');expect(retry.markdown).toBe(joined.markdown);
});
it('distinguishes zero, partial and unknown comments without borrowing their dates',()=>{
 expect(extractNaverComments('<div class="u_cbox_wrap"><span class="u_cbox_count">0</span></div>',url).status).toBe('complete');expect(extractNaverComments(html.replace('댓글 2','댓글 5'),url)).toMatchObject({status:'partial',expected:5});expect(extractNaverComments('<div class="ContentRenderer">본문</div>',url).status).toBe('unavailable');
 expect(extractOriginal('<div class="ContentRenderer">본문</div><div class="u_cbox_comment"><time datetime="2026-04-17">댓글 날짜</time></div>',url,true).date).toBeNull();
});
it('extracts nested blog replies without copying their body into the parent comment',()=>{
 const source='<div class="u_cbox_wrap"><span class="u_cbox_count">2</span><li class="u_cbox_comment" data-comment-no="1"><span class="u_cbox_nick">작성자</span><span class="u_cbox_contents">부모 본문</span><ul class="u_cbox_reply_area"><li class="u_cbox_comment" data-comment-no="2"><span class="u_cbox_nick">답글</span><span class="u_cbox_contents">자식 본문</span></li></ul></li></div>',report=extractNaverComments(source,'https://blog.naver.com/person/123');expect(report.items).toHaveLength(2);expect(report.items[0].text).toBe('부모 본문');expect(report.items[1].parentId).toBe('1');
});
it('parses the page-owned comment JSON/JSONP, merges pages and rejects unrelated article responses',()=>{
 const endpoint='https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/123/articles/15641/comments',first={result:{comments:{items:[{id:1,content:'첫 댓글',writer:{nick:'작성자'},writeDate:'2026.04.16'}],totalCount:2}}},second={result:{comments:{items:[{id:2,refCommentId:1,content:'답글',writeDate:'2026.04.17'}],totalCount:2}}};
 const a=extractNaverCommentResponse(JSON.stringify(first),endpoint,url)!,b=extractNaverCommentResponse(JSON.stringify(second),endpoint,url)!;expect(a.status).toBe('partial');expect(mergeComments(a,b,a)).toMatchObject({status:'complete',items:[{id:'1'},{id:'2',parentId:'1'}]});expect(extractNaverCommentResponse(JSON.stringify(first),endpoint.replace('15641','15642'),url)).toBeNull();expect(extractNaverCommentResponse(JSON.stringify(first),endpoint.replace('apis.naver.com','evil.org'),url)).toBeNull();
 const jsonp='/**/callback('+JSON.stringify({result:{count:{total:1},commentList:[{commentNo:5,contents:'댓글 전체',regTime:'2026.04.16'}]}})+');';expect(extractNaverCommentResponse(jsonp,'https://apis.naver.com/commentBox/cbox/web_naver_list_jsonp.json?ticket=blog&objectId=person_123','https://blog.naver.com/person/123')?.status).toBe('complete');
});
it('keeps body and comments together in MD and JSON while retaining structured reply links',async()=>{
 const body=await new OriginalReader(new Network(async()=>new Response(html))).read(url,true,new AbortController().signal,false,true),row=makeRecord('r',body.text,'제목',url);row.original_markdown=body.markdown;row.comments=body.comments;row.original_post_text=body.postText;row.original_post_markdown=body.postMarkdown;
 const md=originalFile(row,'md'),json=JSON.parse(originalFile(row,'json'));expect(md.indexOf('원문 마지막')).toBeLessThan(md.indexOf('댓글 원문 전체'));expect(json.body).toContain('답글 마지막');expect(json.post_body).not.toContain('댓글 원문 전체');expect(json.comments[1].parentId).toBe('1');expect(json.comments_status).toBe('complete');
});

it('does not call a count-matched page complete while replies or another page are still collapsed',()=>{const source='<div class="u_cbox_wrap"><span class="u_cbox_count">1</span><div class="u_cbox_comment" data-comment-no="1"><div class="u_cbox_contents">첫 댓글</div><button class="u_cbox_btn_reply" aria-expanded="false">답글 2개</button></div></div>';expect(extractNaverComments(source,url).status).toBe('partial');expect(extractNaverComments(source.replace('aria-expanded="false"','aria-expanded="true"'),url).status).toBe('complete');});
it('retains a bounded partial result when a comment response exceeds the collection limit',()=>{const items=Array.from({length:5001},(_,i)=>({id:String(i),parentId:null,author:'a',date:null,text:'comment '+i,markdown:'comment '+i}));const report=mergeComments({items,status:'complete',expected:5001});expect(report.items).toHaveLength(5000);expect(report.status).toBe('partial');expect(report.reason).toContain('한도');});

it('matches real comment text while ignoring generated section headings and collection warnings',()=>{const original={url,text:'본문',markdown:'본문',date:null},bundle={id:'b',name:'b',expression:'댓글',exclusions:'',priority:1,suggestions:[]},config={includeUnknownDate:true,startDate:'',endDate:''} as SearchConfig;const empty=attachComments(original,{items:[],expected:0,status:'complete'}),row=makeRecord('r',empty.text,'제목',url);row.original_post_text=empty.postText;row.comments=empty.comments;applySearchFilters(row,bundle,config);expect(row.exclusion_reasons).toContain('번들 논리식 불일치');row.comments={status:'complete',items:[{id:'1',parentId:null,author:'a',date:null,text:'실제 댓글 경험',markdown:'실제 댓글 경험'}]};applySearchFilters(row,bundle,config);expect(row.exclusion_reasons).toEqual([]);});
