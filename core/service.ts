import {browserQueries} from './search-plan.js';
import {SearchCollector} from './search.js';
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
 api:SearchApi;search:SearchCollector;private directories=new Set<string>();
 selectDirectory?:()=>Promise<string|undefined>;
 constructor(public store:Store,public vault:Vault,net=new Network(),original?:OriginalSource){this.api=new SearchApi(net,vault);this.search=new SearchCollector(store,this.api,undefined,original||new OriginalReader(net));}
 state():State{const all=this.vault.status();return {bundles:this.store.list<Bundle>('bundles'),researches:this.store.list<Research>('researches'),records:this.store.list<RecordItem>('records').reverse(),settings:this.store.settings(),credentials:Object.fromEntries(['naverId','naverSecret'].map(name=>[name,!!all[name]])),secureStorage:this.vault.available};}
 async call(method:string,args:unknown):Promise<unknown>{switch(method){
  case 'state':return this.state();
  case 'output.choose':{if(!this.selectDirectory)throw Error('폴더 선택은 설치된 데스크톱 앱에서 사용할 수 있습니다.');const directory=await this.selectDirectory();if(directory){await checkDirectory(directory);this.directories.add(directory);}return {directory:directory||''};}
  case 'search.start':{const directory=z.object({outputDirectory:z.string()}).passthrough().parse(args).outputDirectory;await this.directory(directory);return this.search.start(args);}
  case 'search.pause':return this.search.pause(id.parse(args));
  case 'search.stop':return this.search.pause(id.parse(args),true);
  case 'search.resume':{const key=id.parse(args),r=this.store.research(key);if(r?.apiSearch?.version==='naver-original-v2')await this.directory(r.apiSearch.outputDirectory||'');return this.search.resume(key);}
  case 'search.plan':return {queries:browserQueries(z.string().max(3000).parse(args))};
  case 'bundle.save':{const b=bundleSchema.parse(args);plan(b.expression);const value={...b,id:b.id||randomUUID()};this.store.put('bundles',value);return value;}
  case 'bundle.delete':this.store.remove('bundles',id.parse(args));return true;
  case 'research.delete':{const key=id.parse(args);if(this.search.active.has(key))throw Error('진행 중인 수집을 먼저 중지하세요.');this.store.remove('researches',key);return true;}
  case 'original.export':{if(this.search.active.size)throw Error('수집을 마치거나 일시정지한 뒤 저장하세요.');const a=z.object({researchId:id,ids:z.array(id).min(1).max(5000),directory:z.string(),format:z.enum(['md','json'])}).strict().parse(args);await this.directory(a.directory);const rows=this.store.records(a.researchId).filter(r=>a.ids.includes(r.record_id));if(rows.length!==new Set(a.ids).size||rows.some(r=>r.content_status!=='full_text'||!r.original_markdown))throw Error('전문 수집에 성공한 자료만 선택하세요.');let saved=0;for(const row of rows){try{await saveOriginal(row,a.directory,a.format);saved++;}catch(e){throw Error(`${saved}개 저장 후 중지: ${(e as Error).message}`);}}return {saved};}
  case 'credential.set':{const a=z.object({name:z.enum(['naverId','naverSecret']),value:z.string().max(10000)}).strict().parse(args);const value=a.value.trim();if(/[\r\n\t]/.test(value))throw Error('인증정보의 전체값을 한 줄로 입력하세요.');this.vault.set(a.name,value);return true;}
  default:throw Error('현재 버전에서 제공하지 않는 기능입니다.');
 }}
 private async directory(path:string){if(!this.directories.has(path))throw Error('폴더 선택 버튼으로 저장 폴더를 지정하세요. 앱을 다시 실행한 경우 같은 폴더를 다시 선택하세요.');await checkDirectory(path);}
 async idle(){await this.search.idle();}
 close(){this.search.close();}
}
