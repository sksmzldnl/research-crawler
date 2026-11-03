import {afterEach,it,expect,vi} from 'vitest';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../core/store.js';
import {SearchCollector,preflightReasons} from '../core/search.js';
import {collectPage} from '../core/search-work.js';
import {naverArticleKey} from '../core/original-url.js';
import {wait} from '../core/network.js';
import type {Bundle,Candidate,SearchConfig} from '../core/types.js';

const cleanups:(()=>Promise<unknown>)[]=[];afterEach(async()=>{vi.useRealTimers();for(const cleanup of cleanups.splice(0))await cleanup();});
const item=(id:string,title='A B'):Candidate=>({id,url:'https://blog.naver.com/test/'+id,title,text:'Snippet does not prove the whole article',date:null});
async function setup(){const store=new Store(':memory:'),directory=await mkdtemp(join(tmpdir(),'naver-speed-'));cleanups.push(async()=>{store.close();await rm(directory,{recursive:true,force:true});});const bundle=store.list<Bundle>('bundles')[0];store.put('bundles',{...bundle,expression:'A',exclusions:''});const config:SearchConfig={version:'naver-original-v2',name:'speed',naverType:'blog',bundleIds:[bundle.id],target:20,pages:2,startDate:'',endDate:'',includeUnknownDate:true,removeAds:true,outputDirectory:directory};return {store,directory,bundle:store.list<Bundle>('bundles')[0],config};}
it('caps in-flight Naver reads at three while preserving every original',async()=>{
 const {store,directory,config}=await setup();let active=0,peak=0;const read=vi.fn(async(url:string,_ads:boolean,signal:AbortSignal)=>{active++;peak=Math.max(peak,active);try{await wait(15,signal);return {url,date:null,text:'A full original ending',markdown:'A full original ending'};}finally{active--;}});
 const collector=new SearchCollector(store,{validate(){},async search(){return {items:Array.from({length:7},(_,i)=>item(String(i))),next:null};}},async()=>{}, {read}),r=collector.start(config);await collector.idle();expect(peak).toBe(3);expect(store.research(r.id)?.valid).toBe(7);expect(await readdir(directory)).toHaveLength(7);
});
it('saves the first usable result and cancels a stalled sibling without exceeding the target',async()=>{
 const {store,directory,config}=await setup();let cancelled=false;const read=async(url:string,_ads:boolean,signal:AbortSignal)=>{if(url.endsWith('/slow')){try{await wait(60000,signal);}catch(error){cancelled=true;throw error;}}return {url,date:null,text:'A full original',markdown:'A full original'};};
 const collector=new SearchCollector(store,{validate(){},async search(){return {items:[item('slow'),item('fast'),item('also-fast'),item('not-started')],next:null};}},async()=>{},{read}),r=collector.start({...config,target:1});await collector.idle();expect(cancelled).toBe(true);expect(store.research(r.id)?.valid).toBe(1);expect(await readdir(directory)).toHaveLength(1);expect(store.records(r.id).filter(row=>row.collection_error)).toHaveLength(0);
});
it('reuses API pages and failed originals across bundles, and retries recovered originals on resume',async()=>{
 const {store,config,bundle}=await setup();store.put('bundles',{...bundle,id:'second',priority:2});let broken=true;const search=vi.fn(async()=>({items:[item('bad')],next:null})),read=vi.fn(async(url:string)=>{if(broken)throw Error('temporarily unavailable');return {url,date:null,text:'A full original',markdown:'A full original'};});
 const collector=new SearchCollector(store,{validate(){},search},async()=>{},{read}),r=collector.start({...config,bundleIds:[bundle.id,'second']});await collector.idle();expect(search).toHaveBeenCalledTimes(1);expect(read).toHaveBeenCalledTimes(1);expect(store.research(r.id)?.status).toBe('failed');broken=false;collector.resume(r.id);await collector.idle();expect(read).toHaveBeenCalledTimes(2);expect(store.research(r.id)?.valid).toBe(1);expect(store.research(r.id)?.errors).toEqual([]);
});
it('does not fetch known out-of-period results or titles that can never pass the full expression',async()=>{
 const {store,config,bundle}=await setup();store.put('bundles',{...bundle,expression:'A AND NOT forbidden'});const read=vi.fn(async(url:string)=>({url,date:null,text:'A full original',markdown:'A full original'}));const rows=[{...item('old'),date:'2020-01-01'},item('excluded','A forbidden'),item('public')];
 const collector=new SearchCollector(store,{validate(){},async search(){return {items:rows,next:null};}},async()=>{},{read}),r=collector.start({...config,startDate:'2026-01-01'});await collector.idle();expect(read).toHaveBeenCalledTimes(1);expect(store.research(r.id)?.valid).toBe(1);expect(store.records(r.id).filter(row=>row.processing_status==='search_filtered')).toHaveLength(2);
});
it('keeps candidates whose missing words can occur in the full post or comments',async()=>{
 const {bundle,config}=await setup();expect(preflightReasons(item('1','A'),{...bundle,expression:'A AND B'},config)).toEqual([]);expect(preflightReasons(item('1','A forbidden'),{...bundle,expression:'(A AND NOT forbidden) OR B'},config)).toEqual([]);expect(preflightReasons({...item('1','A'),text:'forbidden'}, {...bundle,expression:'A AND NOT forbidden'},config)).toEqual([]);
});
it('deduplicates mobile/desktop and Knowledge answer/tracking aliases without mixing different Cafe clubs',()=>{
 expect(naverArticleKey('https://m.blog.naver.com/test/123?utm_source=x')).toBe(naverArticleKey('https://blog.naver.com/PostView.naver?blogId=test&logNo=123'));
 expect(naverArticleKey('https://kin.naver.com/qna/detail.naver?docId=123&answerNo=1')).toBe(naverArticleKey('https://m.kin.naver.com/qna/detail.naver?docId=123&answerNo=2'));
 expect(naverArticleKey('https://cafe.naver.com/ArticleRead.nhn?clubid=123&articleid=456')).not.toBe(naverArticleKey('https://cafe.naver.com/ArticleRead.nhn?clubid=789&articleid=456'));
});
it('preserves serial Reddit browser collection',async()=>{
 const {config,store}=await setup();let active=0,peak=0;const read=async(url:string,_ads:boolean,signal:AbortSignal)=>{peak=Math.max(peak,++active);try{await wait(10,signal);return {url,date:null,text:'A post',markdown:'A post'};}finally{active--;}};const collector=new SearchCollector(store,{validate(){},async search(){return {items:[item('1'),item('2')],next:null};}},async()=>{},{read});collector.start({...config,naverType:'reddit'});await collector.idle();expect(peak).toBe(1);
});
it('defaults new searches to relevance but preserves the date cursor ordering of an old resumed search',async()=>{
 const {store,config}=await setup();let broken=true;const sorts:unknown[]=[];const collector=new SearchCollector(store,{validate(){},async search(_type,_query,_start,_signal,_display,_community,sort){sorts.push(sort);if(broken)throw Error('pause');return {items:[],next:null};}},async()=>{});
 const r=collector.start(config);await collector.idle();const old=store.research(r.id)!;delete old.apiSearch!.naverSort;store.put('researches',old);broken=false;collector.resume(r.id);await collector.idle();expect(sorts).toEqual(['sim','date']);expect(store.research(r.id)?.errors).toEqual([]);
});
it('reduces a deterministic nine-post simulated workload from nine waits to three, with a fixed concurrency cap',async()=>{
 vi.useFakeTimers();let parallelMs=0,serialMs=0;for(const concurrency of [1,3]){const start=Date.now();await Promise.all([collectPage(Array.from({length:9},(_,i)=>i),concurrency,new AbortController().signal,()=>false,async(_item,signal)=>wait(1000,signal)),vi.runAllTimersAsync()]);const elapsed=Date.now()-start;if(concurrency===1)serialMs=elapsed;else parallelMs=elapsed;}
 expect(serialMs).toBe(9000);expect(parallelMs).toBe(3000);
});
