import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Store} from './store.js';
import {AI} from './ai.js';
import {Connectors} from './connectors.js';
import {extract} from './extract.js';
import {safeUrl,wait} from './network.js';
import {importSchema,prepareImport,localResearch,makeRecord} from './import.js';
import type {LocalJob,RecordItem} from './types.js';
export const processSchema=z.object({researchId:z.string(),ids:z.array(z.string()).min(1).max(1000),task:z.enum(['translate','organize']),provider:z.enum(['openai','gemini']),model:z.string().min(1).max(120)});
export class Workspace {
 job?:LocalJob;private controller?:AbortController;private pending?:Promise<void>;
 constructor(private store:Store,private ai:AI,private connectors:Connectors){}
 get busy(){return this.job?.status==='running';}
 import(args:unknown){const {research,records}=prepareImport(importSchema.parse(args));this.saveImport(research,records);return research;}
 private saveImport(research:ReturnType<typeof localResearch>,records:RecordItem[]){this.store.db.exec('BEGIN');try{this.store.put('researches',research);for(const r of records)this.store.record(r);this.store.db.exec('COMMIT');}catch(e){this.store.db.exec('ROLLBACK');throw e;}}
 private start(kind:string,total:number,run:(signal:AbortSignal,job:LocalJob)=>Promise<void>){if(this.busy)throw Error('현재 작업이 끝난 뒤 실행하세요.');this.controller=new AbortController();const signal=this.controller.signal;const job:LocalJob={id:randomUUID(),kind,status:'running',total,processed:0,failed:0,message:''};this.job=job;this.pending=run(signal,job).catch(e=>{job.message=(e as Error).message;}).finally(()=>{job.status=signal.aborted?'cancelled':'completed';});return job;}
 collect(args:unknown){if(this.busy)throw Error('현재 작업이 끝난 뒤 실행하세요.');const a=z.object({name:z.string().trim().min(1).max(100),kind:z.enum(['url','rss']),urls:z.array(z.string().url().max(2000)).min(1).max(20)}).parse(args);const research=localResearch(a.name,1);research.notes=['사용자가 지정한 공개 주소만 수집합니다. 검색 API·AI는 호출하지 않습니다.'];this.store.put('researches',research);
  try{return this.start(a.kind,a.urls.length,async(signal,job)=>{let rows:RecordItem[]=[];
   for(const url of a.urls){signal.throwIfAborted();try{await safeUrl(url);if(a.kind==='url'){const u=new URL(url);const p=await extract(url,this.store.settings().originalAllowedHosts,this.connectors.net,signal);rows.push(makeRecord(research.id,p.text,p.title||u.hostname,url,p.date||'','und','url'));}
    else{const page=await this.connectors.rssFeed(url,signal);rows.push(...page.map(c=>({...makeRecord(research.id,c.text,c.title,c.url,c.date||'',c.language||'und','rss'),content_status:'snippet_only' as const})));}
    if(rows.length>1000)rows=rows.slice(0,1000);job.message=`${rows.length}건 확보`;
   }catch(e){if(signal.aborted)throw e;job.failed++;research.errors.push(url+': '+(e as Error).message);}finally{job.processed++;const seen=new Set<string>();for(const r of rows){const key=r.source_url||r.original_full_text;if(seen.has(key)){r.duplicate_flag=true;r.review_status='excluded';r.exclusion_reasons=['같은 주소 또는 본문 중복'];}seen.add(key);}research.config.target=Math.max(1,rows.length);research.totalTasks=a.urls.length;research.processed=job.processed;research.valid=rows.filter(r=>r.review_status!=='excluded').length;research.excluded=rows.length-research.valid;research.stage=signal.aborted?'수집 중지 · 확보한 자료 저장':'저장 완료';this.saveImport(research,rows);}
   if(rows.length>=1000)break;await wait(500,signal);
   }
  });}catch(e){this.store.remove('researches',research.id);throw e;}
 }
 process(args:unknown){if(this.busy)throw Error('현재 작업이 끝난 뒤 실행하세요.');const a=processSchema.parse(args);if(!this.store.settings().consentAi)throw Error('AI 설정에서 선택한 원문을 외부 AI로 전송하는 데 동의하고 저장하세요.');this.ai.key(a.provider);const research=this.store.research(a.researchId);if(!research)throw Error('조사를 찾을 수 없습니다.');const ids=new Set(a.ids),rows=this.store.records(research.id).filter(r=>ids.has(r.record_id));if(rows.length!==ids.size)throw Error('선택한 자료를 찾을 수 없습니다.');if(rows.some(r=>r.mode==='demo'))throw Error('합성 데모는 외부 AI로 전송하지 않습니다.');if(rows.some(r=>!r.original_full_text.trim()))throw Error('본문이 비어 있는 행은 선택에서 빼 주세요.');
 return this.start(a.task,rows.length,async(signal,job)=>{for(const r of rows){signal.throwIfAborted();try{
  if(a.task==='translate'){const result=await this.ai.translate(r.original_full_text,a.provider,a.model,signal);r.korean_full_translation=result.translation;research.usage.input+=result.input;research.usage.output+=result.output;}
  else{const result=await this.ai.analyze(r.original_full_text,a.provider,a.model,signal,true);r.korean_summary=result.results.map(x=>x.summary).join('\n');r.insight_category=[...new Set(result.results.flatMap(x=>x.categories))];for(const k of ['pain_point','improvement_request','user_behavior','workaround','relevance_reason'] as const)r[k]=result.results.map(x=>x[k]).filter(Boolean).join('\n');r.sentiment=[...new Set(result.results.map(x=>x.sentiment))].join(', ');r.relevance_score=Math.min(...result.results.map(x=>x.relevance_score));r.evidence=result.results.flatMap(x=>x.evidence);research.usage.input+=result.input;research.usage.output+=result.output;}
  signal.throwIfAborted();r.ai_provider=a.provider;r.ai_model=a.model;r.processing_status=a.task==='translate'?'translated':'csv_organized';r.ai_error='';job.message=r.title;
 }catch(e){if(signal.aborted)throw e;r.ai_error=(e as Error).message;r.processing_status='ai_failed';job.failed++;job.message=r.ai_error;}finally{if(!signal.aborted){this.store.record({...r,review_status:this.store.records(research.id).find(x=>x.record_id===r.record_id)?.review_status||r.review_status});const latest=this.store.research(research.id)!;this.store.put('researches',{...latest,usage:research.usage});job.processed++;}}}
 });}
 cancel(){this.controller?.abort();return true;}
 async idle(){await this.pending;}
}
