import {afterEach,it,expect,vi} from 'vitest';
import {bounded,CollectionStalledError} from '../core/operation.js';
import {PageRead} from '../core/page-read.js';
import {monitoredRead} from '../core/monitored-read.js';
import {Network} from '../core/network.js';
import {Store} from '../core/store.js';
import {Service} from '../core/service.js';
import {MemoryVault} from '../core/vault.js';
import {researchDiagnostics} from '../core/diagnostics.js';
import {makeRecord,localResearch} from '../core/record.js';
import type {ReadObserver} from '../core/original.js';
import {BrowserAttentionError} from '../core/reddit-browser.js';

afterEach(()=>vi.useRealTimers());
it('settles an operation even when the OS promise ignores cancellation',async()=>{
 vi.useFakeTimers();let aborted=false;const pending=bounded(async signal=>{signal.addEventListener('abort',()=>{aborted=true;});return new Promise(()=>{});},2000,'storage timeout'),check=expect(pending).rejects.toBeInstanceOf(CollectionStalledError);await vi.advanceTimersByTimeAsync(2000);await check;expect(aborted).toBe(true);
});
it('keeps an explicit cancellation separate from a timeout and handles late completion',async()=>{
 vi.useFakeTimers();const controller=new AbortController();let complete!:(n:number)=>void;const pending=bounded(()=>new Promise<number>(resolve=>{complete=resolve;}),2000,'timeout',controller.signal),check=expect(pending).rejects.toThrow('user stop');controller.abort(Error('user stop'));await check;complete(42);await vi.runAllTimersAsync();
});
it('preserves a rejection whose value is undefined',async()=>{await expect(bounded(()=>Promise.reject(undefined),100,'timeout')).rejects.toBeUndefined();});
it('retains a slow DOM read after the short wait and delivers its result without queuing more scripts',async()=>{
 vi.useFakeTimers();const reads=new PageRead<string>();let finish!:(value:string)=>void;const action=vi.fn(()=>new Promise<string>(resolve=>{finish=resolve;})),signal=new AbortController().signal;const first=reads.read('html',action,signal);await vi.advanceTimersByTimeAsync(1500);expect(await first).toBeNull();const second=reads.read('html',action,signal);await vi.advanceTimersByTimeAsync(500);finish('full late original');expect(await second).toBe('full late original');expect(action).toHaveBeenCalledTimes(1);
});
it('does not run comment actions concurrently with a still-running HTML snapshot',async()=>{
 vi.useFakeTimers();const reads=new PageRead<string>();let finish!:(value:string)=>void;const html=vi.fn(()=>new Promise<string>(resolve=>{finish=resolve;})),comments=vi.fn(async()=>'clicked');const signal=new AbortController().signal,first=reads.read('html',html,signal);await vi.advanceTimersByTimeAsync(1500);expect(await first).toBeNull();const next=reads.read('comments',comments,signal);await vi.advanceTimersByTimeAsync(100);expect(comments).not.toHaveBeenCalled();finish('old HTML');expect(await next).toBe('clicked');expect(comments).toHaveBeenCalledTimes(1);
});
it('surfaces a persistently hung renderer instead of adding DOM reads forever',async()=>{
 vi.useFakeTimers();const reads=new PageRead<string>(),action=vi.fn(()=>new Promise<string>(()=>{})),signal=new AbortController().signal;const first=reads.read('html',action,signal,1500,3000);await vi.advanceTimersByTimeAsync(1500);expect(await first).toBeNull();const next=reads.read('html',action,signal,1500,3000),check=expect(next).rejects.toBeInstanceOf(CollectionStalledError);await vi.advanceTimersByTimeAsync(1500);await check;expect(action).toHaveBeenCalledTimes(1);
});
it('enforces network deadlines even if a transport does not reject on abort',async()=>{
 const keep=setTimeout(()=>{},100);try{await expect(new Network(async()=>new Promise(()=>{})).json('https://example.com',{},'네이버',undefined,{timeoutMs:10})).rejects.toMatchObject({kind:'timeout'});}finally{clearTimeout(keep);}
});
it('pauses a read with no progress and exposes no original content in diagnostic notifications',async()=>{
 vi.useFakeTimers();const notify=vi.fn(),pending=monitoredRead(async()=>new Promise(()=>{}),new AbortController().signal,true,notify,1000),check=expect(pending).rejects.toBeInstanceOf(CollectionStalledError);await vi.advanceTimersByTimeAsync(1000);await check;
});
it('preserves the full collected body and comments when a later operation never settles',async()=>{
 vi.useFakeTimers();const notify=vi.fn();const original={url:'https://kin.naver.com/qna/detail.naver?docId=123',date:null,text:'FULL ORIGINAL PRIVATE CONTENT',markdown:'FULL ORIGINAL PRIVATE CONTENT',comments:{items:[{id:'c1',parentId:null,author:'a',date:null,text:'COMMENT PRIVATE CONTENT',markdown:'COMMENT PRIVATE CONTENT'}],status:'partial' as const,expected:2}};
 const pending=monitoredRead(async(_signal,observe)=>{observe({phase:'comments',message:'댓글 확인',original,comments:1});return new Promise(()=>{});},new AbortController().signal,true,notify,1000);await vi.advanceTimersByTimeAsync(1000);const result=await pending;expect(result.postText).toContain('FULL ORIGINAL PRIVATE CONTENT');expect(result.text).toContain('COMMENT PRIVATE CONTENT');expect(result.comments?.status).toBe('partial');expect(JSON.stringify(notify.mock.calls)).not.toContain('PRIVATE CONTENT');
});
it('keeps genuine manual verification separate from an idle read watchdog',async()=>{
 vi.useFakeTimers();let observe!:ReadObserver,finish!:(value:{url:string;text:string;markdown:string;date:null})=>void;const pending=monitoredRead(async(_signal,report)=>{observe=report;return new Promise(resolve=>{finish=resolve;});},new AbortController().signal,false,()=>{},1000);observe({phase:'verification',message:'본인 확인'});await vi.advanceTimersByTimeAsync(10000);observe({phase:'body',message:'본문 확인'});finish({url:'https://www.reddit.com/comments/abc123/',text:'full',markdown:'full',date:null});expect((await pending).text).toBe('full');
});
it('saves a captured body if its renderer later becomes unresponsive',async()=>{
 const body={url:'https://www.reddit.com/comments/abc123/',text:'FULL BODY',markdown:'FULL BODY',date:null};const result=await monitoredRead(async(_signal,observe)=>{observe({phase:'body',message:'본문 확인',original:body});throw new CollectionStalledError('renderer stalled');},new AbortController().signal,true,()=>{});expect(result.postText).toBe('FULL BODY');expect(result.comments?.reason).toContain('응답이 멈춰');
});
it('does not turn a genuine security-verification pause into an automatic success',async()=>{
 await expect(monitoredRead(async(_signal,observe)=>{observe({phase:'body',message:'본문 확인',original:{url:'https://www.reddit.com/comments/abc123/',text:'FULL BODY',markdown:'FULL BODY',date:null}});throw new BrowserAttentionError('직접 확인 필요');},new AbortController().signal,true,()=>{})).rejects.toBeInstanceOf(BrowserAttentionError);
});
it('does not retransmit unchanged bodies, but includes changes and deletions in later snapshots',async()=>{
 const store=new Store(':memory:'),service=new Service(store,new MemoryVault());try{const r=localResearch('test',1);store.put('researches',r);const row=makeRecord(r.id,'LARGE ORIGINAL','test','https://kin.naver.com/qna/detail.naver?docId=123');store.record(row);const initial=service.state(),unchanged=await service.call('state',{recordsRevision:initial.recordsRevision}) as ReturnType<Service['state']>;expect(initial.records).toHaveLength(1);expect(unchanged.records).toEqual([]);expect(unchanged.recordsUnchanged).toBe(true);row.original_full_text+=' updated';store.record(row);const updated=service.state(initial.recordsRevision);expect(updated.recordsUnchanged).toBe(false);expect(updated.records[0].original_full_text).toContain('updated');store.remove('researches',r.id);const deleted=service.state(updated.recordsRevision);expect(deleted.recordsUnchanged).toBe(false);expect(deleted.records).toEqual([]);}finally{service.close();store.close();}
});
it('invalidates an old client snapshot when the backend restarts with the same numeric revision',()=>{
 const a=new Store(':memory:'),b=new Store(':memory:'),first=new Service(a,new MemoryVault()),second=new Service(b,new MemoryVault());try{const ar=localResearch('a',1),br=localResearch('b',1);a.put('researches',ar);b.put('researches',br);a.record(makeRecord(ar.id,'FIRST DATA','first'));b.record(makeRecord(br.id,'SECOND DATA','second'));const snapshot=first.state(),next=second.state(snapshot.recordsRevision,snapshot.recordsEpoch);expect(next.recordsUnchanged).toBe(false);expect(next.records[0].original_full_text).toBe('SECOND DATA');}finally{first.close();second.close();a.close();b.close();}
});
it('copies only selected safe diagnostic fields without keys, full text or storage paths',async()=>{
 const store=new Store(':memory:'),vault=new MemoryVault(),service=new Service(store,vault);try{vault.set('naverSecret','DO-NOT-COPY-SECRET');const r=localResearch('test',1);r.progress={query:'A B',queryIndex:1,queryTotal:2,page:1,pageLimit:3,active:[{id:'x',phase:'comments',message:'댓글 확인',url:'https://kin.naver.com/qna/detail.naver?docId=123&api_key=DO-NOT-COPY-SECRET',startedAt:'2026-11-03T00:00:00Z',updatedAt:'2026-11-03T00:00:01Z'}],events:[]};store.put('researches',r);const row=makeRecord(r.id,'PRIVATE ORIGINAL TEXT','PRIVATE TITLE');row.saved_path='C:\\Users\\private\\folder';store.record(row);let copied='';service.copyText=text=>{copied=text;};await service.call('research.diagnostics.copy',r.id);const report=JSON.parse(copied);expect(report.active[0].url).toBe('https://kin.naver.com/qna/detail.naver?docId=123');expect(report.counts.saved).toBe(1);for(const value of ['DO-NOT-COPY-SECRET','PRIVATE ORIGINAL TEXT','PRIVATE TITLE','C:\\Users'])expect(copied).not.toContain(value);expect(researchDiagnostics(r,[row],{version:'test',platform:'win32',arch:'x64'})).toContain('win32');}finally{service.close();store.close();}
});
