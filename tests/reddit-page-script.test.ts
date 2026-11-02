import {it,expect} from 'vitest';
import {JSDOM} from 'jsdom';
import {redditPageScript,type BrowserPageSnapshot} from '../desktop/reddit-page-script.js';

const post='<shreddit-post id="t3_abc123"><h1>Original</h1><div slot="text-body">Full body</div></shreddit-post>';
function setup(extra:string){const dom=new JSDOM(post+extra,{url:'https://www.reddit.com/comments/abc123/',runScripts:'outside-only'}),win=dom.window;Object.defineProperty(win.HTMLElement.prototype,'getBoundingClientRect',{writable:true,value(){return {width:100,height:100,left:0,right:100,top:0,bottom:this.id==='feed'?100000:100};}});win.HTMLElement.prototype.scrollIntoView=()=>{};win.scrollBy=()=>{};return {dom,read:(act=true)=>win.eval(redditPageScript('reddit',act)) as BrowserPageSnapshot};}
it('stops retrying a no-op load-more button when only unrelated page content changes',()=>{
 const {dom,read}=setup('<shreddit-comment-tree><button id="more">Load more comments</button></shreddit-comment-tree><div id="feed">Recommendation</div>');try{let clicks=0;dom.window.document.querySelector('#more')!.addEventListener('click',()=>clicks++);expect(read().acted).toBe(true);dom.window.document.querySelector('#feed')!.textContent='New recommended post';const second=read();expect(second.acted).toBe(false);expect(second.pending).toBe(false);expect(second.bottom).toBe(true);expect(clicks).toBe(1);}finally{dom.window.close();}
});
it('retries a remaining control after actual new thread content arrives',()=>{
 const {dom,read}=setup('<shreddit-comment-tree><button id="more">Load more comments</button></shreddit-comment-tree>');try{expect(read().acted).toBe(true);dom.window.document.querySelector('shreddit-comment-tree')!.insertAdjacentHTML('afterbegin','<shreddit-comment thingid="t1_c1"><div slot="comment">New comment</div></shreddit-comment>');expect(read().acted).toBe(true);expect(read().acted).toBe(false);}finally{dom.window.close();}
});
it('excludes recommended posts, their controls and unrelated comment trees',()=>{
 const {dom,read}=setup('<shreddit-comment-tree post-id="t3_abc123"></shreddit-comment-tree><shreddit-post id="t3_def456"><h1>Recommended</h1><button id="wrong">Read more</button><shreddit-comment-tree><button>Load more comments</button></shreddit-comment-tree></shreddit-post><shreddit-comment-tree post-id="t3_def456"><button>Show replies</button></shreddit-comment-tree>');try{const result=read();expect(result.acted).toBe(false);expect(result.pending).toBe(false);expect(result.html).not.toContain('def456');expect(result.html).not.toContain('Recommended');}finally{dom.window.close();}
});
it('does not click forms, reply editors or login/security controls',()=>{
 const {dom,read}=setup('<shreddit-comment-tree><form><button>Show replies</button></form><button>Reply</button><button>Log In</button><button>Verify you are human</button><button>Accept</button></shreddit-comment-tree>');try{expect(read().acted).toBe(false);}finally{dom.window.close();}
});
it('scrolls the comment container when Reddit uses a nested scrolling panel',()=>{
 const {dom,read}=setup('<div id="panel" style="overflow-y:auto"><shreddit-comment-tree id="thread"></shreddit-comment-tree></div>');try{const panel=dom.window.document.querySelector<HTMLElement>('#panel')!,tree=dom.window.document.querySelector('#thread')!;Object.defineProperties(panel,{scrollHeight:{value:3000},clientHeight:{value:500}});tree.getBoundingClientRect=()=>({width:100,height:2000,top:0,bottom:2000} as DOMRect);let distance=0;panel.scrollBy=options=>{distance=(options as ScrollToOptions).top||0;};expect(read().bottom).toBe(false);expect(distance).toBe(500);}finally{dom.window.close();}
});
it('reads a normal post with a passive reCAPTCHA badge without asking for verification',()=>{
 const {dom,read}=setup('<div class="grecaptcha-badge"><iframe src="https://www.google.com/recaptcha/api2/anchor?size=invisible"></iframe></div><div class="g-recaptcha" data-size="invisible"></div>');try{const result=read(false);expect(result.gate).toBe('');expect(result.html).toContain('Full body');}finally{dom.window.close();}
});
it('still blocks an active CAPTCHA challenge over readable content, and resumes after a user removes it',()=>{
 const {dom,read}=setup('<div class="grecaptcha-badge"><iframe src="https://www.google.com/recaptcha/api2/anchor?size=invisible"></iframe><iframe id="challenge" src="https://www.google.com/recaptcha/api2/bframe"></iframe></div>');try{expect(read(false).gate).toContain('보안 확인');expect(read(false).html).toBe('');dom.window.document.querySelector('#challenge')!.remove();expect(read(false).gate).toBe('');}finally{dom.window.close();}
});
it('keeps a visible interactive CAPTCHA checkbox as a manual verification step',()=>{
 const {dom,read}=setup('<div class="g-recaptcha" data-size="normal"><iframe src="https://www.google.com/recaptcha/api2/anchor?size=normal"></iframe></div>');try{expect(read(false).gate).toContain('보안 확인');}finally{dom.window.close();}
});
it('ignores offscreen, aria-hidden and transparent-parent login dialogs when the article is readable',()=>{
 const {dom,read}=setup('<div role="dialog" id="offscreen">Log in to continue</div><div role="dialog" aria-hidden="true">Log in to continue</div><div style="opacity:0"><div role="dialog">Log in to continue</div><iframe src="https://www.google.com/recaptcha/api2/bframe"></iframe></div>');try{dom.window.document.querySelector('#offscreen')!.getBoundingClientRect=()=>({left:0,right:200,width:200,height:100,top:5000,bottom:5100} as DOMRect);expect(read(false).gate).toBe('');}finally{dom.window.close();}
});
it('still waits for an actual visible login dialog',()=>{
 const {dom,read}=setup('<div role="dialog">Log in to continue<input type="password"></div>');try{expect(read(false).gate).toContain('로그인');expect(read(false).html).toBe('');}finally{dom.window.close();}
});
it('does not mistake an empty post placeholder for readable content on a network-security block page',()=>{
 const {dom,read}=setup('');try{dom.window.document.body.innerHTML='<shreddit-post id="t3_abc123"></shreddit-post><p>Blocked by network security</p>';Object.defineProperty(dom.window.document.body,'innerText',{get:()=>dom.window.document.body.textContent||''});expect(read(false).gate).toContain('보안 확인');}finally{dom.window.close();}
});
