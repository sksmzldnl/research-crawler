import {browserQueries} from './search-plan.js';
import {SearchCollector} from './search.js';
import {SearchApi} from './search-api.js';
import {Workspace} from './workspace.js';
import {parseCsv} from './import.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Store} from './store.js';
import {Network} from './network.js';
import {AI,geminiModel} from './ai.js';
import {GeminiCheck} from './gemini-check.js';
import {exportData} from './export.js';
import {plan} from './query.js';
import type {Vault} from './vault.js';
import {aiProviders,type Bundle,type RecordItem,type Research,type State} from './types.js';
const id=z.string().min(1).max(200);
const bundleSchema=z.object({id:z.string().max(200).optional(),name:z.string().trim().min(1).max(100),expression:z.string().min(1).max(3000),exclusions:z.string().max(2000).default(''),priority:z.number().int().min(1).max(100).default(1),suggestions:z.array(z.string()).default([])}).strict();
const settingsSchema=z.object({aiProvider:z.enum(aiProviders),aiModel:z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9._:/-]+$/)}).strict();
const exportSchema=z.object({researchId:id,ids:z.array(id).min(1).max(5000).optional()}).strict();
export class Service {
 api:SearchApi;search:SearchCollector;workspace:Workspace;ai:AI;geminiCheck:GeminiCheck;
 constructor(public store:Store,public vault:Vault,net=new Network()){this.api=new SearchApi(net,vault);this.search=new SearchCollector(store,this.api);this.ai=new AI(net,vault);this.workspace=new Workspace(store,this.ai);this.geminiCheck=new GeminiCheck(this.ai);}
 state():State{const all=this.vault.status();return {geminiCheck:this.geminiCheck.state(this.vault.get('geminiKey')||'',this.store.settings().aiModel),localJob:this.workspace.job,bundles:this.store.list<Bundle>('bundles'),researches:this.store.list<Research>('researches'),records:this.store.list<RecordItem>('records').reverse(),settings:this.store.settings(),credentials:Object.fromEntries(['naverId','naverSecret','openaiKey','geminiKey'].map(name=>[name,!!all[name]])),secureStorage:this.vault.available};}
 async call(method:string,args:unknown):Promise<unknown>{switch(method){
  case 'state':return this.state();
  case 'import.preview':{const a=z.object({text:z.string().max(5_000_000),delimiter:z.enum([',',';','\t']).optional()}).strict().parse(args);const p=parseCsv(a.text,a.delimiter);return {...p,rows:p.rows.slice(0,4),count:p.rows.length};}
  case 'import.save':if(this.search.active.size)throw Error('검색을 일시정지한 뒤 CSV를 가져오세요.');return this.workspace.import(args);
  case 'gemini.check.start':{z.object({consent:z.literal(true)}).strict().parse(args);if(this.workspace.busy||this.search.active.size)throw Error('진행 중인 작업을 마친 뒤 연결을 확인하세요.');if(this.store.settings().aiProvider!=='gemini')throw Error('AI 제공자를 Gemini로 선택하세요.');return this.geminiCheck.start(this.store.settings().aiModel);}
  case 'gemini.check.cancel':return this.geminiCheck.cancel();
  case 'ai.process':if(this.geminiCheck.busy)throw Error('Gemini 연결 확인이 끝난 뒤 실행하세요.');if(this.store.settings().aiProvider==='gemini'&&!this.geminiCheck.passed(this.vault.get('geminiKey')||'',this.store.settings().aiModel))throw Error('설정에서 Gemini 연결 확인을 먼저 완료하세요.');if(this.search.active.size)throw Error('검색을 일시정지하거나 마친 뒤 AI 정리를 실행하세요.');return this.workspace.process(args);
  case 'job.cancel':return this.workspace.cancel();
  case 'search.start':if(this.geminiCheck.busy)throw Error('연결 확인이 끝난 뒤 검색하세요.');if(this.workspace.busy)throw Error('AI 정리가 끝난 뒤 검색하세요.');return this.search.start(args);
  case 'search.pause':return this.search.pause(id.parse(args));
  case 'search.stop':return this.search.pause(id.parse(args),true);
  case 'search.resume':if(this.geminiCheck.busy)throw Error('연결 확인이 끝난 뒤 검색하세요.');if(this.workspace.busy)throw Error('AI 정리가 끝난 뒤 검색을 재개하세요.');return this.search.resume(id.parse(args));
  case 'search.plan':return {queries:browserQueries(z.string().max(3000).parse(args))};
  case 'bundle.save':{const b=bundleSchema.parse(args);plan(b.expression);const value={...b,id:b.id||randomUUID()};this.store.put('bundles',value);return value;}
  case 'bundle.delete':this.store.remove('bundles',id.parse(args));return true;
  case 'research.delete':{const key=id.parse(args);if(this.search.active.has(key)||this.workspace.busy)throw Error('진행 중인 작업을 먼저 중지하세요.');this.store.remove('researches',key);return true;}
  case 'record.review':{const a=z.object({id,review:z.enum(['included','excluded','pending'])}).strict().parse(args),row=this.store.list<RecordItem>('records').find(r=>r.record_id===a.id);if(!row)throw Error('자료를 찾지 못했습니다.');row.review_status=a.review;this.store.record(row);this.recount(row.research_id);return true;}
  case 'settings.save':{if(this.workspace.busy)throw Error('AI 정리를 중지한 뒤 모델을 변경하세요.');const settings=settingsSchema.parse(args);if(settings.aiProvider==='gemini')settings.aiModel=geminiModel(settings.aiModel);const old=this.store.settings();if(old.aiModel!==settings.aiModel||old.aiProvider!==settings.aiProvider)this.geminiCheck.invalidate();this.store.saveSettings(settings);return true;}
  case 'credential.set':{const a=z.object({name:z.enum(['openaiKey','geminiKey','naverId','naverSecret']),value:z.string().max(10000)}).strict().parse(args);let value=a.value.trim();if(a.name==='openaiKey')value=value.replace(/^Bearer\s+/i,'');if(/[\r\n\t]/.test(value))throw Error('인증정보의 전체값을 한 줄로 입력하세요.');if(['geminiKey','openaiKey'].includes(a.name)&&this.workspace.busy)throw Error('AI 정리를 중지한 뒤 키를 변경하세요.');if(a.name==='geminiKey'&&this.vault.get(a.name)!==value)this.geminiCheck.invalidate();this.vault.set(a.name,value);return true;}
  case 'export':{const request=exportSchema.parse(args);return {data:(await exportData(this.store.records(request.researchId),request)).toString('base64'),filename:'insights-'+request.researchId.slice(0,8)+'.csv',mime:'text/csv;charset=utf-8'};}
  default:throw Error('현재 버전에서 제공하지 않는 기능입니다.');
 }}
 private recount(key:string){const research=this.search.active.get(key)?.r||this.store.research(key);if(research){const rows=this.store.records(key);research.valid=rows.filter(row=>row.review_status!=='excluded').length;research.excluded=rows.length-research.valid;this.store.put('researches',research);}}
 async idle(){await Promise.all([this.workspace.idle(),this.search.idle(),this.geminiCheck.idle()]);}
 close(){this.search.close();this.workspace.cancel();this.geminiCheck.cancel();}
}
