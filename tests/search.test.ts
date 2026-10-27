import {it,expect,vi} from 'vitest';
import {browserQueries} from '../core/search-plan.js';
import {SearchCollector} from '../core/search.js';
import type {SearchProvider} from '../core/search-api.js';
import {apiDefaults,type ApiEngine} from '../core/api-types.js';
import {Store} from '../core/store.js';
import {Network} from '../core/network.js';
import type {Bundle} from '../core/types.js';
function setup(expression='A AND (B OR C)'){const store=new Store(':memory:');const bundle=store.list<Bundle>('bundles')[0];store.put('bundles',{...bundle,expression,exclusions:'제외어'});const config={name:'자동 검색',engines:['daum'] as ApiEngine[],bundleIds:[bundle.id],sites:[],target:20,pages:2,startDate:'',endDate:'',includeUnknownDate:true,removeAds:true,fetchOriginal:false};return {store,config};}
it('makes combined AND queries, expands OR branches, keeps exclusions local and safely falls back on large expressions',()=>{expect(browserQueries('A AND (B OR C) NOT D')).toEqual(['"A" "B"','"A" "C"']);expect(browserQueries('"zero waste" AND 후기')).toEqual(['"zero waste" "후기"']);expect(()=>browserQueries('A OR NOT B')).toThrow();const large=Array.from({length:6},(_,i)=>`(A${i} OR B${i})`).join(' AND ');expect(browserQueries(large).length).toBeGreaterThan(0);});
it('collects API pages, persists provider cursors, applies full Boolean and site filters without invoking AI',async()=>{
 const {store,config}=setup();const calls:any[]=[];const provider:SearchProvider={validate(){},async search(engine,q,page,_signal,cursor){calls.push({engine,q,page,cursor});return {items:[{id:'same',url:'https://example.com/same',title:'A B',text:'A B actual experience '+'.'.repeat(50),date:null},{id:'ad',url:'https://example.com/ad',title:'A B 협찬',text:'협찬',date:null},{id:'other',url:'https://other.example/a',title:'A B',text:'other',date:null},{id:'no',url:'https://example.com/no',title:'A only',text:'unrelated',date:null}],next:page===1?2:null};}};
 const search=new SearchCollector(store,provider,new Network(),()=>apiDefaults,async()=>{});const r=search.start({...config,sites:['example.com']});await search.idle();expect(calls).toHaveLength(4);expect(calls[1].cursor).toBe(2);expect(store.records(r.id)).toHaveLength(3);expect(store.research(r.id)?.valid).toBe(1);expect(store.records(r.id).every(r=>r.ai_provider==='')).toBe(true);expect(store.research(r.id)?.apiSearch?.apiOptions).toMatchObject({daumType:'web'});store.close();
});
it('pauses on API errors and resumes the saved after cursor without repeating completed pages',async()=>{
 const {store,config}=setup('A');let fail=true;const cursors:any[]=[];const provider:SearchProvider={validate(){},async search(_e,_q,page,_s,cursor){cursors.push(cursor);if(page===2&&fail)throw Error('HTTP 401');return {items:[{id:String(page),url:'https://example.com/'+page,title:'A',text:'A '+page,date:null}],next:page===1?'t3_next':null};}};
 const search=new SearchCollector(store,provider,new Network(),()=>apiDefaults,async()=>{}),r=search.start(config);await search.idle();expect(store.research(r.id)?.status).toBe('paused');expect(store.records(r.id)).toHaveLength(1);fail=false;search.resume(r.id);await search.idle();expect(cursors).toEqual([null,'t3_next','t3_next']);expect(store.records(r.id)).toHaveLength(2);expect(store.research(r.id)?.status).toBe('completed');store.close();
});
it('fails missing provider authorization before creating a research record',()=>{const {store,config}=setup();const provider:SearchProvider={validate(){throw Error('키 등록 필요');},async search(){return {items:[],next:null};}};const search=new SearchCollector(store,provider,new Network(),()=>apiDefaults);expect(()=>search.start(config)).toThrow(/키 등록/);expect(store.list('researches')).toHaveLength(0);store.close();});
