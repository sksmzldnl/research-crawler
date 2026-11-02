import {it,expect} from 'vitest';
import {JSDOM} from 'jsdom';
import {redditPageScript,type BrowserPageSnapshot} from '../desktop/reddit-page-script.js';

const post='<shreddit-post id="t3_abc123"><h1>Original</h1><div slot="text-body">Full body</div></shreddit-post>';
function setup(extra:string){const dom=new JSDOM(post+extra,{url:'https://www.reddit.com/comments/abc123/',runScripts:'outside-only'}),win=dom.window;Object.defineProperty(win.HTMLElement.prototype,'getBoundingClientRect',{writable:true,value(){return {width:100,height:100,top:0,bottom:this.id==='feed'?100000:100};}});win.HTMLElement.prototype.scrollIntoView=()=>{};win.scrollBy=()=>{};return {dom,read:(act=true)=>win.eval(redditPageScript('reddit',act)) as BrowserPageSnapshot};}
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
