import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Store} from './store.js';
import {AI} from './ai.js';
import {ApiError,NetworkFailure} from './network.js';
import {importSchema,prepareImport} from './import.js';
import type {LocalJob} from './types.js';
export const processSchema=z.object({researchId:z.string().min(1),ids:z.array(z.string()).min(1).max(1000),focus:z.string().max(1000).default(''),consent:z.literal(true)}).strict();
export class Workspace {
 job?:LocalJob;private controller?:AbortController;private pending?:Promise<void>;
 constructor(private store:Store,private ai:AI){}
 get busy(){return this.job?.status==='running';}
 import(args:unknown){if(this.busy)throw Error('AI 정리를 마친 뒤 CSV를 가져오세요.');const {research,records}=prepareImport(importSchema.parse(args));this.store.db.exec('BEGIN');try{this.store.put('researches',research);for(const record of records)this.store.record(record);this.store.db.exec('COMMIT');}catch(error){this.store.db.exec('ROLLBACK');throw error;}return research;}
 process(args:unknown){
  if(this.busy)throw Error('현재 AI 정리가 끝난 뒤 실행하세요.');const a=processSchema.parse(args),settings=this.store.settings();this.ai.key(settings.aiProvider);
  const research=this.store.research(a.researchId);if(!research)throw Error('자료 모음을 찾을 수 없습니다.');const ids=new Set(a.ids),rows=this.store.records(research.id).filter(row=>ids.has(row.record_id));if(rows.length!==ids.size)throw Error('선택한 행을 찾을 수 없습니다.');
  this.controller=new AbortController();const signal=this.controller.signal;const job:LocalJob={id:randomUUID(),researchId:research.id,kind:'insights',status:'running',total:rows.length,processed:0,failed:0,message:''};this.job=job;
  this.pending=(async()=>{for(const row of rows){signal.throwIfAborted();try{
   if(row.mode==='demo')throw Error('이전 합성 예시는 AI 정리 대상에서 제외하세요.');
   const result=await this.ai.insights(row.original_full_text,settings.aiProvider,settings.aiModel,a.focus,signal);signal.throwIfAborted();
   row.korean_summary=result.results.map(r=>r.summary).join('\n');row.ai_insight=result.results.map(r=>r.insight).join('\n');row.insight_category=[...new Set(result.results.flatMap(r=>r.categories))];
   for(const field of ['pain_point','improvement_request','user_behavior','workaround'] as const)row[field]=[...new Set(result.results.map(r=>r[field]).filter(Boolean))].join('\n');
   row.sentiment=[...new Set(result.results.map(r=>r.sentiment))].join(', ');row.evidence=result.results.flatMap(r=>r.evidence);row.ai_provider=settings.aiProvider;row.ai_model=result.model;if(result.model!==settings.aiModel){settings.aiModel=result.model;const current=this.store.settings();if(current.aiProvider===settings.aiProvider)this.store.saveSettings({...current,aiModel:result.model});}row.ai_error='';row.processing_status='insights_ready';research.usage.input+=result.input;research.usage.output+=result.output;job.message=row.title;
  }catch(error){if(signal.aborted)throw error;row.ai_error=(error as Error).message;row.processing_status='ai_failed';job.failed++;job.lastError=row.ai_error;job.message=row.ai_error;if(error instanceof ApiError||error instanceof NetworkFailure)throw error;
  }finally{if(!signal.aborted){const current=this.store.records(research.id).find(r=>r.record_id===row.record_id);this.store.record({...row,review_status:current?.review_status||row.review_status});const latest=this.store.research(research.id)!;this.store.put('researches',{...latest,usage:research.usage});job.processed++;}}}})().catch(error=>{if(!signal.aborted){job.status='failed';job.message=(error as Error).message;}}).finally(()=>{if(signal.aborted)job.status='cancelled';else if(job.status==='running')job.status=job.failed===job.total?'failed':job.failed?'partial':'completed';});
  return job;
 }
 cancel(){this.controller?.abort();return true;}
 async idle(){await this.pending;}
}
