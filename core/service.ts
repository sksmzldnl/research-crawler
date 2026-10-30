import {forumIdentity,forumTypes,type ForumBrowsers} from './forum.js';
import {isReddit} from './reddit.js';
import type {RedditBrowser} from './reddit-browser.js';
import {ConnectionCheck} from './connection-check.js';
import {browserQueries} from './search-plan.js';
import {SearchCollector,applySearchFilters} from './search.js';
import {SearchApi} from './search-api.js';
import {OriginalReader,type OriginalSource} from './original.js';
import {checkDirectory,saveOriginal} from './original-export.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Store} from './store.js';
import {Network} from './network.js';
import {plan} from './query.js';
import type {Vault} from './vault.js';
import type {Bundle,RecordItem,Research,State} from './types.js';
const id=z.string().min(1).max(200);
const bundleSchema=z.object({id:z.string().max(200).optional(),name:z.string().trim().min(1).max(100),expression:z.string().min(1).max(3000),exclusions:z.string().max(2000).default(''),priority:z.number().int().min(1).max(100).default(1),suggestions:z.array(z.string()).default([])}).strict();
export class Service {
 api:SearchApi;search:SearchCollector;connection:ConnectionCheck;private original:OriginalSource;private directories=new Set<string>();private retry?:{controller:AbortController;pending:Promise<boolean>};
 selectDirectory?:()=>Promise<string|undefined>;
 constructor(public store:Store,public vault:Vault,net=new Network(),original?:OriginalSource,private browser?:RedditBrowser,private forums:ForumBrowsers={}){this.api=new SearchApi(net,vault,browser,forums);const naver=original||new OriginalReader(net);this.original={read:(url,ads,signal,tags,comments)=>{const forum=forumIdentity(url);if(forum){const browser=this.forums[forum.type];if(!browser)throw Error('설치된 데스크톱 앱에서 수집하세요.');return browser.read(url,ads,signal,tags,comments);}if(isReddit(url)){if(!this.browser)throw Error('Reddit 수집은 설치된 데스크톱 앱에서 사용할 수 있습니다.');return this.browser.read(url,ads,signal,tags,comments);}return naver.read(url,ads,signal,tags,comments);}};this.search=new SearchCollector(store,this.api,undefined,this.original);this.connection=new ConnectionCheck(this.api,this.original,()=>['naverId','naverSecret'].map(name=>vault.get(name)));}
 state():State{const all=this.vault.status();return {forumBrowsers:Object.fromEntries(forumTypes.filter(type=>this.forums[type]).map(type=>[type,this.forums[type]!.state()])),redditBrowser:this.browser?.state(),readingOriginal:!!this.retry,connectionCheck:this.connection.report,bundles:this.store.list<Bundle>('bundles'),researches:this.store.list<Research>('researches'),records:this.store.list<RecordItem>('records').reverse(),settings:this.store.settings(),credentials:Object.fromEntries(['naverId','naverSecret'].map(name=>[name,!!all[name]])),secureStorage:this.vault.available};}
 async call(method:string,args:unknown):Promise<unknown>{switch(method){
  case 'state':return this.state();
  case 'reddit.browser.open':if(!this.browser)throw Error('설치된 데스크톱 앱에서 브라우저를 열 수 있습니다.');await this.browser.open();return true;
  case 'reddit.browser.clear':if(this.search.active.size||this.connection.busy||this.retry)throw Error('진행 중인 작업을 먼저 중지하세요.');if(!this.browser)throw Error('설치된 데스크톱 앱에서 사용할 수 있습니다.');await this.browser.clear();if(this.connection.report?.scopes.some(scope=>scope.type==='reddit'))this.connection.invalidate();return true;
  case 'community.browser.open':case 'community.browser.clear':{const {provider}=z.object({provider:z.enum(forumTypes)}).strict().parse(args),browser=this.forums[provider];if(!browser)throw Error('설치된 데스크톱 앱에서 사용할 수 있습니다.');if(method==='community.browser.open')await browser.open();else{if(this.search.active.size||this.connection.busy||this.retry)throw Error('진행 중인 작업을 먼저 중지하세요.');await browser.clear();if(this.connection.report?.scopes.some(scope=>scope.type===provider))this.connection.invalidate();}return true;}
  case 'output.choose':{if(!this.selectDirectory)throw Error('폴더 선택은 설치된 데스크톱 앱에서 사용할 수 있습니다.');const directory=await this.selectDirectory();if(directory){await checkDirectory(directory);this.directories.add(directory);}return {directory:directory||''};}
  case 'connection.check':{if(this.search.active.size||this.retry)throw Error('수집을 중지한 뒤 확인하세요.');const a=z.object({url:z.string().max(4000).optional(),provider:z.enum(['naver','reddit',...forumTypes]).optional()}).strict().optional().parse(args||undefined);return this.connection.start(a?.url,a?.provider||'naver');}
  case 'connection.cancel':return this.connection.cancel();
  case 'search.start':{if(this.connection.busy||this.retry)throw Error('연결 확인을 마친 뒤 수집하세요.');const directory=z.object({outputDirectory:z.string()}).passthrough().parse(args).outputDirectory;await this.directory(directory);if(this.connection.busy||this.retry)throw Error('진행 중인 확인을 마치세요.');return this.search.start(args);}
  case 'search.pause':return this.search.pause(id.parse(args));
  case 'search.stop':return this.search.pause(id.parse(args),true);
  case 'search.resume':{if(this.connection.busy||this.retry)throw Error('진행 중인 확인을 마치세요.');const key=id.parse(args),r=this.store.research(key);if(r?.apiSearch?.version==='naver-original-v2')await this.directory(r.apiSearch.outputDirectory||'');if(this.connection.busy||this.retry)throw Error('진행 중인 확인을 마치세요.');return this.search.resume(key);}
  case 'search.plan':return {queries:browserQueries(z.string().max(3000).parse(args))};
  case 'bundle.save':{const b=bundleSchema.parse(args);plan(b.expression);const value={...b,id:b.id||randomUUID()};this.store.put('bundles',value);return value;}
  case 'bundle.delete':this.store.remove('bundles',id.parse(args));return true;
  case 'research.delete':{const key=id.parse(args);if(this.search.active.has(key)||this.retry)throw Error('진행 중인 수집을 먼저 중지하세요.');this.store.remove('researches',key);return true;}
  case 'original.export':{if(this.search.active.size)throw Error('수집을 마치거나 일시정지한 뒤 저장하세요.');const a=z.object({researchId:id,ids:z.array(id).min(1).max(5000),directory:z.string(),format:z.enum(['md','json'])}).strict().parse(args);await this.directory(a.directory);const rows=this.store.records(a.researchId).filter(r=>a.ids.includes(r.record_id));if(rows.length!==new Set(a.ids).size||rows.some(r=>r.content_status!=='full_text'||!r.original_markdown))throw Error('전문 수집에 성공한 자료만 선택하세요.');let saved=0;for(const row of rows){try{await saveOriginal(row,a.directory,a.format);saved++;}catch(e){throw Error(`${saved}개 저장 후 중지: ${(e as Error).message}`);}}return {saved};}
  case 'original.retry':return this.retryOriginal(id.parse(args));
  case 'credential.set':{const a=z.object({name:z.enum(['naverId','naverSecret']),value:z.string().max(10000)}).strict().parse(args);const value=a.value.trim();if(/[\r\n\t]/.test(value))throw Error('인증정보의 전체값을 한 줄로 입력하세요.');if(this.vault.get(a.name)!==value)this.connection.invalidate();this.vault.set(a.name,value);return true;}
  default:throw Error('현재 버전에서 제공하지 않는 기능입니다.');
 }}
 private async retryOriginal(key:string){
  if(this.search.active.size||this.connection.busy||this.retry)throw Error('진행 중인 작업을 중지하세요.');
  const stored=this.store.list<RecordItem>('records').find(r=>r.record_id===key);if(!stored)throw Error('자료를 찾지 못했습니다.');
  const row=structuredClone(stored),r=this.store.research(row.research_id),config=r?.apiSearch;
  if(!r||!config?.outputDirectory)throw Error('새 수집을 시작하세요.');await this.directory(config.outputDirectory);
  if(this.search.active.size||this.connection.busy||this.retry)throw Error('진행 중인 작업을 중지하세요.');
  const controller=new AbortController(),entry={controller,pending:Promise.resolve(true)};this.retry=entry;
  entry.pending=(async()=>{const result=await this.original.read(row.source_url,config.removeAds,controller.signal,config.removeHashtags,config.includeComments??true);controller.signal.throwIfAborted();row.original_full_text=result.text;row.original_markdown=result.markdown;row.original_post_text=result.postText;row.original_post_markdown=result.postMarkdown;row.comments=result.comments;row.published_at=result.date||row.published_at;row.published_at_confidence=result.date?'page_reported':row.published_at_confidence;row.content_status='full_text';row.collection_error='';
   const bundle=r.bundles.find(b=>b.expression===row.query_expression)||{id:'',name:row.query_bundle_name,expression:row.query_expression||'자료',exclusions:'',priority:1,suggestions:[]};applySearchFilters(row,bundle,config);
   if(!row.exclusion_reasons.length)row.saved_path=await saveOriginal(row,config.outputDirectory!,config.outputFormat||'md');else row.saved_path=undefined;
   row.processing_status=row.saved_path?'file_saved':'original_collected';this.store.record(row);const rows=this.store.records(r.id);r.valid=rows.filter(x=>x.saved_path&&x.review_status!=='excluded').length;r.excluded=rows.length-r.valid;if(r.status==='failed'&&r.valid){r.status='completed';r.stage='수집 완료';}r.stage=r.stage.replace(/ · 댓글 확인 \d+건$/,'');const partial=rows.filter(x=>x.comments&&x.comments.status!=='complete').length;if(partial)r.stage+=` · 댓글 확인 ${partial}건`;this.store.put('researches',r);return true;
  })().finally(()=>{if(this.retry===entry)this.retry=undefined;});return entry.pending;
 }
 private async directory(path:string){if(!this.directories.has(path))throw Error('폴더 선택 버튼으로 저장 폴더를 지정하세요. 앱을 다시 실행한 경우 같은 폴더를 다시 선택하세요.');await checkDirectory(path);}
 async idle(){await Promise.all([this.search.idle(),this.connection.idle(),this.retry?.pending.catch(()=>{})]);}
 close(){this.search.close();this.connection.cancel();this.retry?.controller.abort(Error('중지'));this.browser?.close();for(const browser of Object.values(this.forums))browser?.close();}
}
