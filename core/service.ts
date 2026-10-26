import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Store } from './store.js';
import { Network } from './network.js';
import { Connectors } from './connectors.js';
import { AI } from './ai.js';
import { Engine } from './engine.js';
import { RedditOAuth } from './oauth.js';
import { exportData } from './export.js';
import { plan } from './query.js';
import { credentialNames,type Vault } from './vault.js';
import { sources,type Bundle,type RecordItem,type Research,type State } from './types.js';
const id=z.string().min(1).max(200);
const date=z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).refine(s=>!s||(!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s),'올바른 날짜를 입력하세요.');
export const configSchema=z.object({name:z.string().trim().min(1).max(100),mode:z.enum(['demo','live']),bundleIds:z.array(id).min(1).max(30),sources:z.array(z.enum(sources)).max(8),startDate:date,endDate:date,target:z.number().int().min(1).max(1000),removeAds:z.boolean(),deduplicate:z.boolean(),semanticDedupe:z.boolean(),fetchOriginal:z.boolean(),ai:z.boolean(),aiProvider:z.enum(['openai','gemini']),aiModel:z.string().min(1).max(120),aiInputPrice:z.number().min(0).max(10000),aiOutputPrice:z.number().min(0).max(10000)}).refine(c=>!c.startDate||!c.endDate||c.startDate<=c.endDate,'종료일은 시작일 이후여야 합니다.');
const bundleSchema=z.object({id:z.string().max(200).optional(),name:z.string().trim().min(1).max(100),expression:z.string().min(1).max(3000),exclusions:z.string().max(2000),priority:z.number().int().min(1).max(100),suggestions:z.array(z.string().max(80)).max(20),aiApproved:z.array(z.string().max(80)).max(100).optional()});
const settingsSchema=z.object({redditApproved:z.boolean(),redditClientId:z.string().max(100),rssUrls:z.array(z.string().url().max(2000)).max(20),originalAllowedHosts:z.array(z.string().regex(/^[a-z0-9.-]+$/)).max(100),consentAi:z.boolean(),retentionDays:z.number().int().min(1).max(365)});
const exportSchema=z.object({researchId:id,scope:z.enum(['all','valid','excluded','bundle']),bundle:z.string().optional(),korean:z.boolean(),bom:z.boolean(),format:z.enum(['csv','xlsx'])});
export class Service {
  connectors:Connectors;ai:AI;engine:Engine;oauth:RedditOAuth;
  constructor(public store:Store,public vault:Vault,net=new Network()){this.connectors=new Connectors(net,vault,()=>store.settings());this.ai=new AI(net,vault);this.engine=new Engine(store,this.connectors,this.ai);this.oauth=new RedditOAuth(net,vault);}
  state():State{return {bundles:this.store.list<Bundle>('bundles'),researches:this.store.list<Research>('researches'),records:this.store.list<RecordItem>('records'),settings:this.store.settings(),credentials:this.vault.status(),secureStorage:this.vault.available};}
  async call(method:string,args:unknown):Promise<unknown>{
    switch(method){
      case 'state':return this.state();
      case 'plan':{const s=z.string().max(3000).parse(args);const p=plan(s);return {queries:p.queries,notice:p.notice};}
      case 'bundle.save':{const b=bundleSchema.parse(args);plan(b.expression);const bundle={...b,id:b.id||randomUUID()};this.store.put('bundles',bundle);return bundle;}
      case 'bundle.delete':this.store.remove('bundles',id.parse(args));return true;
      case 'research.start':return this.engine.start(configSchema.parse(args));
      case 'research.pause':return this.engine.pause(id.parse(args));
      case 'research.stop':return this.engine.pause(id.parse(args),true);
      case 'research.resume':return this.engine.resume(id.parse(args));
      case 'research.delete':{const key=id.parse(args);if(this.engine.active.has(key))throw Error('먼저 조사를 중지하고 요청이 끝날 때까지 기다려 주세요.');this.store.remove('researches',key);return true;}
      case 'record.review':{const a=z.object({id,review:z.enum(['included','excluded','pending'])}).parse(args);const record=this.store.list<RecordItem>('records').find(r=>r.record_id===a.id);if(!record)throw Error('자료를 찾지 못했습니다.');record.review_status=a.review;this.store.record(record);this.recount(record.research_id);return true;}
      case 'record.retry':{const record=this.store.list<RecordItem>('records').find(r=>r.record_id===id.parse(args));if(!record)throw Error('자료를 찾지 못했습니다.');const research=this.store.research(record.research_id)!;if(this.engine.active.has(research.id))throw Error('조사가 끝난 뒤 재처리해 주세요.');try{await this.engine.analyzeRecord(record,research);}catch(e){record.ai_error=(e as Error).message;record.processing_status='ai_failed';this.store.record(record);throw e;}return true;}
      case 'settings.save':{const s=settingsSchema.parse(args);this.store.saveSettings(s);return true;}
      case 'credential.set':{const a=z.object({name:z.enum(credentialNames),value:z.string().max(10000)}).parse(args);this.vault.set(a.name,a.value.trim());return true;}
      case 'connection.test':{const p=z.enum(['naver','kakao','reddit','rss','openai','gemini']).parse(args);if(p==='openai'||p==='gemini')return {message:'API 인증·모델 목록 조회 확인 · 생성/번역은 별도 검증',models:await this.ai.models(p)};return {message:await this.connectors.test(p),models:[]};}
      case 'reddit.oauth':if(!this.store.settings().redditApproved)throw Error('Reddit API 사용 승인을 확인하세요.');return {url:await this.oauth.begin(this.store.settings().redditClientId)};
      case 'bundle.suggest':{const a=z.object({expression:z.string().max(3000),provider:z.enum(['openai','gemini']),model:z.string().max(120),demo:z.boolean()}).parse(args);if(a.demo)return ['리필','용기 세척','휴대성','접근성'];if(!this.store.settings().consentAi)throw Error('외부 AI 전송에 동의해 주세요.');return this.ai.suggest(a.expression,a.provider,a.model);}
      case 'export':{const request=exportSchema.parse(args);return {data:(await exportData(this.store.records(request.researchId),request)).toString('base64'),filename:`zerowaste-${request.researchId.slice(0,8)}-${request.scope}.${request.format}`,mime:request.format==='csv'?'text/csv;charset=utf-8':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};}
      case 'retention.purge':{if(this.engine.active.size)throw Error('실행 중인 조사를 먼저 중지해 주세요.');let count=0;const limit=Date.now()-this.store.settings().retentionDays*86400000;for(const r of this.store.list<RecordItem>('records'))if(Date.parse(r.collected_at)<limit){this.store.remove('records',r.record_id);count++;}for(const r of this.store.list<Research>('researches'))this.recount(r.id);return count;}
      case 'reddit.sync':{if(this.engine.active.size)throw Error('실행 중인 조사를 먼저 중지해 주세요.');if(!this.store.settings().redditApproved)throw Error('Reddit API 승인 확인이 필요합니다.');const records=this.store.list<RecordItem>('records').filter(r=>r.mode==='live'&&r.source_platform==='reddit');let count=0;for(let i=0;i<records.length;i+=100){const batch=records.slice(i,i+100);const data=await this.connectors.reddit('https://oauth.reddit.com/api/info?raw_json=1&id='+encodeURIComponent(batch.map(r=>r.native_id).join(',')));const available=new Map<string,any>((data.data?.children||[]).map((c:any)=>[c.data.name,c.data]));for(const r of batch){const p=available.get(r.native_id);if(!p||p.removed_by_category||['[removed]','[deleted]'].includes(p.body||p.selftext)){this.store.remove('records',r.record_id);count++;}}}for(const r of this.store.list<Research>('researches'))this.recount(r.id);return count;}
      case 'data.delete':{if(z.literal('DELETE ALL').parse(args)!=='DELETE ALL')return false;if(this.engine.active.size)throw Error('실행 중인 조사를 먼저 중지해 주세요.');for(const r of this.store.list<Research>('researches'))this.store.remove('researches',r.id);this.vault.clear();return true;}
      default:throw Error('지원하지 않는 명령입니다.');
    }
  }
  recount(key:string){const active=this.engine.active.get(key)?.r;const research=active||this.store.research(key);if(research){const rows=this.store.records(key);research.valid=rows.filter(r=>r.review_status!=='excluded').length;research.excluded=rows.length-research.valid;this.store.put('researches',research);}}
  close(){this.engine.shutdown();this.oauth.close();}
}
