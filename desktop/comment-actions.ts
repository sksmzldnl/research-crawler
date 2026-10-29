/** Runs only inside the isolated public article frame. Only read-more controls are clicked. */
export function commentActionScript(){return `(${actOnComments.toString()})()`;}
function actOnComments(){
 const roots='.CommentBox,.u_cbox_wrap,.comment_area,.end_comment,.c-user-comment';
 const visible=(el:Element)=>{const style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden'&&(el as HTMLElement).getClientRects().length>0;};
 const disabled=(el:Element)=>el.getAttribute('aria-disabled')==='true'||el.hasAttribute('disabled');
 const click=(el:Element,kind:string)=>{const target=el as HTMLElement;if(!visible(el)||disabled(el))return '';const fingerprint=(document.querySelectorAll('.CommentItem,.u_cbox_comment,[data-comment-id],.c-user-comment__item').length)+'|'+Array.from(document.querySelectorAll('.comment_text_view,.u_cbox_contents,[data-comment-body]')).map(e=>e.textContent).join('|').slice(-1000),key=kind+'|'+fingerprint;if(el.getAttribute('data-studio-read-action')===key)return '';el.setAttribute('data-studio-read-action',key);target.scrollIntoView({block:'center'});target.click();return kind;};
 // Open a closed public comment panel; never click a login or write-comment button.
 for(const el of document.querySelectorAll('a._commentBtn,button._commentBtn,a.btn_comment,button.btn_comment,.CommentBox .button_comment')){if(!/접기|닫기|쓰기|등록/.test(el.textContent||'')&&!Array.from(document.querySelectorAll(roots.split(',').flatMap(root=>[root+' .comment_text_view',root+' .u_cbox_contents']).join(','))).some(visible)){const action=click(el,'open');if(action)return {action};}}
 for(const root of document.querySelectorAll(roots)){
  for(const el of root.querySelectorAll('button,a')){
   if(el.closest('.u_cbox_page_wrap,.pagination,.Pagination'))continue;const label=(el.textContent||'').trim();if(/접기|닫기|쓰기|등록|삭제|신고|좋아요|이전 페이지/.test(label)||/이전/.test(label)&&!/더/.test(label)||el.getAttribute('aria-expanded')==='true')continue;
   if(el.matches('.u_cbox_btn_reply')){const reply=el.closest('.u_cbox_comment')?.querySelector('.u_cbox_reply_area');if(reply&&visible(reply))continue;}
   const readMore=/더\s*보기|이전\s*댓글|다음\s*댓글|댓글\s*더|답글\s*더|답글\s*[\d,]+개|^다음$|^Next$/i.test(label)||el.matches('.u_cbox_btn_more,.u_cbox_page_more,.u_cbox_btn_reply')&&/더|답글|이전|다음|[\d,]+/.test(label);
   if(readMore){const action=click(el,'more:'+label);if(action)return {action};}
  }
  const pages=root.querySelector('.u_cbox_page_wrap,.pagination,.Pagination');if(pages){const current=Number(pages.querySelector('[aria-current="page"],.u_cbox_page_on,.on,.active')?.textContent?.trim()||0);if(current)for(const el of pages.querySelectorAll('a,button')){const next=Number(el.textContent?.trim());if(next===current+1){const action=click(el,'page:'+next);if(action)return {action};}}}
  if(pages)for(const el of pages.querySelectorAll('a,button'))if(/^(다음|Next)$/i.test((el.textContent||'').trim())){const action=click(el,'next-pages');if(action)return {action};}
 }
 return {action:''};
}
