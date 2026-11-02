import {afterEach,it,expect,vi} from 'vitest';
import {collectRedditOriginal} from '../desktop/reddit-collection.js';
import {BrowserAttentionError} from '../core/reddit-browser.js';
import type {BrowserPageSnapshot} from '../desktop/reddit-page-script.js';

const url='https://www.reddit.com/comments/abc123/';
const comment=(id:string)=>`<shreddit-comment thingid="t1_${id}"><div slot="comment">Full comment ${id}</div></shreddit-comment>`;
function page(count=1,loaded=['c1']):BrowserPageSnapshot{return {address:url,gate:'',html:`<shreddit-post id="t3_abc123" comment-count="${count}"><h1>Full post</h1><div slot="text-body">Full original ending</div></shreddit-post><shreddit-comment-tree>${loaded.map(comment).join('')}</shreddit-comment-tree>`,acted:false,branches:[],pending:false,bottom:true};}
function reader(snapshot:()=>Promise<BrowserPageSnapshot|null>){return {snapshot:vi.fn(snapshot),navigate:vi.fn(),userCheck:vi.fn(async()=>0),progress:vi.fn()};}
afterEach(()=>vi.useRealTimers());
it('finishes a thread even when the unrelated recommendation feed never reaches bottom',async()=>{
 vi.useFakeTimers();const started=Date.now(),r=reader(async()=>({...page(3),bottom:false,pending:true,acted:true}));
 const result=collectRedditOriginal(url,true,false,true,new AbortController().signal,r);await vi.runAllTimersAsync();const original=await result;
 expect(Date.now()-started).toBeLessThan(10000);expect(original.postText).toBe('Full original ending');expect(original.comments?.items).toHaveLength(1);expect(original.comments?.status).toBe('partial');expect(original.comments?.reason).toContain('8초');
});
it('keeps collecting delayed new comments instead of timing out from the original start time',async()=>{
 vi.useFakeTimers();const started=Date.now(),r=reader(async()=>{const elapsed=Date.now()-started;return elapsed<6000?page(3):elapsed<12000?page(3,['c1','c2']):page(3,['c1','c2','c3']);});
 const result=collectRedditOriginal(url,true,false,true,new AbortController().signal,r);await vi.runAllTimersAsync();const original=await result;
 expect(original.comments?.status).toBe('complete');expect(original.comments?.items.map(item=>item.id)).toEqual(['c1','c2','c3']);expect(Date.now()-started).toBeLessThan(16000);
});
it('does not chase full-discussion aliases or revisit the same comment branch via query variants',async()=>{
 vi.useFakeTimers();const first=url+'_/c2/?context=3',r=reader(async()=>({...page(2,r.navigate.mock.calls.length>1?['c1','c2']:['c1']),branches:[url+'?sort=best',first,'https://www.reddit.com/r/ZeroWaste/comments/abc123/title/c2/?context=8']}));
 const result=collectRedditOriginal(url,true,false,true,new AbortController().signal,r);await vi.runAllTimersAsync();expect((await result).comments?.status).toBe('complete');expect(r.navigate.mock.calls).toEqual([[url],[first]]);
});
it('saves the already collected body/comments when the renderer stops answering',async()=>{
 vi.useFakeTimers();let calls=0;const r=reader(async()=>++calls===1?page(3):null),result=collectRedditOriginal(url,true,false,true,new AbortController().signal,r);await vi.runAllTimersAsync();expect((await result).comments).toMatchObject({status:'partial',items:[{id:'c1'}],reason:expect.stringContaining('페이지 응답')});
});
it('treats an unreadable post as an individual failure rather than a browser verification pause',async()=>{
 vi.useFakeTimers();const r=reader(async()=>({...page(),html:'<p>Loading failed</p>'})),result=collectRedditOriginal(url,true,false,true,new AbortController().signal,r);
 const check=expect(result).rejects.toSatisfy((error:Error)=>!(error instanceof BrowserAttentionError)&&error.message.includes('30초'));await vi.runAllTimersAsync();await check;
});
it('retains explicit manual login/security verification and excludes its wait from collection time',async()=>{
 vi.useFakeTimers();let calls=0;const r=reader(async()=>++calls===1?{...page(),gate:'로그인 확인'}:page());r.userCheck.mockImplementation(async()=>{vi.setSystemTime(Date.now()+60000);return 60000;});
 const result=collectRedditOriginal(url,true,false,true,new AbortController().signal,r);await vi.runAllTimersAsync();expect((await result).comments?.status).toBe('complete');expect(r.userCheck).toHaveBeenCalledOnce();
});
it('responds to cancellation during a stuck thread without returning a misleading saved result',async()=>{
 vi.useFakeTimers();const controller=new AbortController(),r=reader(async()=>page(3)),result=collectRedditOriginal(url,true,false,true,controller.signal,r),check=expect(result).rejects.toThrow('stop');await vi.advanceTimersByTimeAsync(1000);controller.abort(Error('stop'));await check;
});
