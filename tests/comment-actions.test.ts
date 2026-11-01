import {it,expect} from 'vitest';
import {JSDOM} from 'jsdom';
import {commentActionScript} from '../desktop/comment-actions.js';
function run(html:string){
 const dom=new JSDOM(html,{url:'https://cafe.naver.com/fixture/15641',runScripts:'outside-only'}),clicked:string[]=[];
 Object.defineProperty(dom.window.HTMLElement.prototype,'getClientRects',{value:()=>[{width:100,height:30}]});dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 for(const button of dom.window.document.querySelectorAll('button,a'))button.addEventListener('click',event=>{event.preventDefault();clicked.push(button.id);});
 try{return {result:dom.window.eval(commentActionScript()),clicked};}finally{dom.window.close();}
}
it('does not treat bare reply/edit/login controls as public comment expansion',()=>{
 const html='<div class="CommentBox"><button class="u_cbox_btn_reply" id="reply">답글</button><button class="button_comment" id="write">댓글 쓰기</button><button class="_commentBtn" id="login">로그인</button><a class="u_cbox_btn_more" id="auth" href="https://nid.naver.com/nidlogin.login">댓글 더보기</a><button class="u_cbox_btn_more" id="title" title="로그인이 필요합니다">더보기</button><form><button class="u_cbox_btn_more" id="submit">댓글 더보기</button></form></div>';
 expect(run(html)).toEqual({result:{action:''},clicked:[]});
});
for(const label of ['답글 2','답글 2개','답글 2 개','답글 2개 보기'])it('still expands a counted reply list: '+label,()=>{
 expect(run('<div class="CommentBox"><button class="u_cbox_btn_reply" id="read">'+label+'</button></div>')).toEqual({result:{action:'more:'+label},clicked:['read']});
});
it('opens a public comment counter and deduplicates only reading actions',()=>{
 expect(run('<button class="_commentBtn" id="counter">댓글 (2)</button>')).toEqual({result:{action:'open'},clicked:['counter']});
 expect(run('<div class="CommentBox"><button class="button_comment" id="editor">답글</button><button class="u_cbox_btn_more" id="more">댓글 더보기</button></div>')).toEqual({result:{action:'more:댓글 더보기'},clicked:['more']});
});
