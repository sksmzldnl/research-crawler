import {browserQueries} from './search-plan.js';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {Store} from './store.js';
import {plan,matches,terms} from './query.js';
import {canonicalUrl,normalizedDate,matchedContext,dateReason} from './quality.js';
import {OriginalReader,type OriginalSource} from './original.js';
import {Network} from './network.js';
import {saveOriginal} from './original-export.js';
import {wait} from './network.js';
import {makeRecord,localResearch} from './record.js';
import {naverTypes,naverLabels} from './api-types.js';
import type {SearchProvider} from './search-api.js';
import type {Bundle,Research,Candidate,SearchConfig} from './types.js';
const date=z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).refine(s=>!s||(!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s),'날짜를 확인하세요.');
export const searchSchema=z.object({version:z.literal('naver-original-v2').default('naver-original-v2'),name:z.string().trim().min(1).max(100),naverType:z.enum(naverTypes),bundleIds:z.array(z.string()).min(1).max(30),target:z.number().int().min(1).max(1000),pages:z.number().int().min(1).max(10),startDate:date.default(''),endDate:date.default(''),includeUnknownDate:z.boolean().default(true),removeAds:z.boolean().default(true),removeHashtags:z.boolean().default(false),outputFormat:z.enum(['md','json']).default('md'),outputDirectory:z.string().min(1).max(4096)}).strict().refine(s=>!s.startDate||!s.endDate||s.startDate<=s.endDate,'시작일과 종료일을 확인하세요.');
export function resumable(r:Research){return r.apiSearch?.version==='naver-original-v2'&&naverTypes.includes(r.apiSearch.naverType);}
export function applySearchFilters(row:import('./types.js').RecordItem,b:Bundle,config:SearchConfig){row.exclusion_reasons=[];const combined=row.title+' '+row.original_full_text,ast=plan(b.expression).expression;row.matched_keywords=terms(ast).filter(t=>combined.toLowerCase().includes(t.toLowerCase()));row.evidence=matchedContext(combined,row.matched_keywords);
  if(!matches(ast,combined))row.exclusion_reasons.push('번들 논리식 불일치');row.excluded_keywords=b.exclusions.split(/[,\n]/).map(s=>s.trim()).filter(Boolean).filter(t=>combined.toLowerCase().includes(t.toLowerCase()));if(row.excluded_keywords.length)row.exclusion_reasons.push('제외어: '+row.excluded_keywords.join(', '));
  if(row.published_at||!config.includeUnknownDate){const reason=dateReason(row.published_at,config.startDate,config.endDate);if(reason)row.exclusion_reasons.push(reason);}
  row.advertisement_flag=false;row.duplicate_flag=false;row.review_status=row.exclusion_reasons.length?'excluded':'pending';row.processing_status='original_collected';
}
export class SearchCollector {
 active=new Map<string,{r:Research;controller:AbortController;pending:Promise<void>}>();
 constructor(private store:Store,private provider:SearchProvider,private sleep=wait,private original:OriginalSource=new OriginalReader(new Network())){}
 start(args:unknown){
  if(this.active.size)throw Error('현재 수집을 중지한 뒤 시작하세요.');const config:SearchConfig=searchSchema.parse(args);this.provider.validate();
  const bundles=this.store.list<Bundle>('bundles').filter(b=>config.bundleIds.includes(b.id)).sort((a,b)=>a.priority-b.priority);if(bundles.length!==new Set(config.bundleIds).size)throw Error('쿼리 번들을 다시 선택하세요.');for(const b of bundles)plan(b.expression);
  const r=localResearch(config.name,config.target);r.id=randomUUID();r.bundles=bundles;r.apiSearch=config;r.config={...r.config,bundleIds:config.bundleIds,sources:[('naver_'+config.naverType) as import('./types.js').Source],target:config.target,startDate:config.startDate,endDate:config.endDate,removeAds:config.removeAds};
  r.totalTasks=bundles.reduce((n,b)=>n+browserQueries(b.expression).length,0)*config.pages;r.processed=0;r.valid=0;r.status='running';r.stage='검색 준비';r.notes=['공개 게시글의 본문 전체를 수집해 지정 폴더에 개별 파일로 저장합니다. 이미지·첨부는 원문 링크로 남깁니다. 로그인·가입이 필요한 글은 수집하지 않습니다.'];this.store.put('researches',r);this.launch(r);return r;
 }
 private launch(r:Research){if(this.active.size)throw Error('다른 수집이 진행 중입니다.');const controller=new AbortController();r.status='running';const entry={r,controller,pending:Promise.resolve()};this.active.set(r.id,entry);entry.pending=this.run(r,controller.signal).catch(e=>{if(controller.signal.aborted)return;r.status='paused';r.stage='수집 일시정지';r.errors=[...r.errors,(e as Error).message].slice(-100);}).finally(()=>{this.save(r);this.active.delete(r.id);});}
 private save(r:Research){const rows=this.store.records(r.id);r.valid=rows.filter(row=>!!row.saved_path&&row.review_status!=='excluded').length;r.excluded=rows.length-r.valid;r.updatedAt=new Date().toISOString();this.store.put('researches',r);}
 private async run(r:Research,signal:AbortSignal){const config=r.apiSearch!;let first=true;
  outer:for(const bundle of r.bundles)for(const query of browserQueries(bundle.expression)){
   const key=JSON.stringify([config.naverType,bundle.id,query]);if(r.cursors[key]==='done')continue;let page=Number(r.cursors[key]||1);
   for(;page<=config.pages;page++){
    signal.throwIfAborted();this.save(r);if(r.valid>=config.target)break outer;if(this.store.records(r.id).length>=5000){r.notes.push('자료 5,000건 보존 한도에 도달했습니다.');break outer;}
    if(!first)await this.sleep(2500,signal);first=false;r.stage=`${naverLabels[config.naverType]} · ${bundle.name} · ${page}페이지`;this.save(r);
    const found=await this.provider.search(config.naverType,query,Number(r.cursors[key+':start']||1),signal);
    for(const item of found.items){signal.throwIfAborted();await this.consume(r,bundle,query,page,item,signal);this.save(r);if(r.valid>=config.target||this.store.records(r.id).length>=5000)break;}
    r.processed++;r.cursors[key]=found.next===null||page===config.pages?'done':page+1;if(found.next!==null)r.cursors[key+':start']=found.next;this.save(r);if(found.next===null)break;
   }
  }
  this.save(r);const failures=this.store.records(r.id).filter(row=>!!row.collection_error).length;r.status=!r.valid&&failures?'failed':'completed';r.stage=r.status==='failed'?'원문 수집 실패':r.valid?'수집 완료':'수집 종료 · 조건 일치 없음';this.save(r);if(r.valid<config.target){r.notes.push(`목표 ${config.target}건 중 ${r.valid}건을 확보했습니다. 검색 결과·필터·페이지 한도에 따라 수량이 달라집니다.`);this.save(r);}
 }
 private async consume(r:Research,b:Bundle,query:string,page:number,item:Candidate,signal:AbortSignal){
  const url=canonicalUrl(item.url),config=r.apiSearch!,type=config.naverType,path=`${naverLabels[type]} / ${b.name} / ${query} / ${page}페이지`,id=createHash('sha256').update(JSON.stringify([r.id,url])).digest('hex');
  const existing=this.store.records(r.id).find(x=>x.record_id===id);
  if(existing){existing.discovery_paths=[...new Set([...existing.discovery_paths,path])];this.store.record(existing);if(existing.saved_path)return;}
  const row=existing||makeRecord(r.id,'',item.title,url,'','ko','naver_'+type);row.record_id=id;row.native_id=item.id;row.source_search_engine=naverLabels[type];row.query_bundle_name=b.name;row.query_expression=b.expression;row.search_snippet=item.text;row.discovery_paths=[...new Set([...(existing?.discovery_paths||[]),path])];row.exclusion_reasons=[];row.collection_error='';
  try{
   if(row.content_status!=='full_text'||!row.original_markdown){r.stage=`원문 수집 · ${item.title}`;this.save(r);const body=await this.original.read(url,config.removeAds,signal,config.removeHashtags);row.original_full_text=body.text;row.original_markdown=body.markdown;row.content_status='full_text';row.published_at=normalizedDate(item.date)||body.date;row.published_at_confidence=normalizedDate(item.date)?'provider_reported':body.date?'page_reported':'unknown';}
  }catch(error){signal.throwIfAborted();row.content_status='snippet_only';row.processing_status='collection_failed';row.collection_error=(error as Error).message;row.exclusion_reasons=['원문 수집 실패'];row.review_status='excluded';this.store.record(row);return;}
  signal.throwIfAborted();applySearchFilters(row,b,config);this.store.record(row);
  if(!row.exclusion_reasons.length){try{row.saved_path=await saveOriginal(row,config.outputDirectory!,config.outputFormat||'md');row.processing_status='file_saved';this.store.record(row);}catch(error){row.processing_status='save_failed';row.collection_error='파일 저장 실패: '+(error as Error).message;row.review_status='excluded';row.exclusion_reasons=['파일 저장 실패'];this.store.record(row);throw Error(row.collection_error);}}
 }

 pause(id:string,stop=false){const entry=this.active.get(id),r=entry?.r||this.store.research(id);if(!r||!resumable(r))throw Error('현재 버전의 네이버 수집 기록이 아닙니다.');r.status=stop?'stopped':'paused';r.stage=stop?'수집 중지':'일시정지';entry?.controller.abort();this.save(r);return r;}
 resume(id:string){if(this.active.size)throw Error('진행 중인 요청 정리가 끝난 뒤 재개하세요.');const r=this.store.research(id);if(!r||!resumable(r)||!['paused','failed','stopped'].includes(r.status))throw Error('이전 자료는 보존됩니다. 네이버 검색을 새로 시작하세요.');this.provider.validate();if(r.status==='failed'){r.cursors={};r.processed=0;}this.launch(r);return r;}
 close(){for(const id of this.active.keys())this.pause(id);}
 async idle(){await Promise.all([...this.active.values()].map(e=>e.pending));}
}
