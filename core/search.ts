import {browserQueries} from './search-plan.js';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {Store} from './store.js';
import {plan,matches,terms} from './query.js';
import {adReasons,canonicalUrl,hashText,normalizedDate,matchedContext,dateReason} from './quality.js';
import {wait} from './network.js';
import {makeRecord,localResearch} from './import.js';
import {naverTypes,naverLabels} from './api-types.js';
import type {SearchProvider} from './search-api.js';
import type {Bundle,Research,Candidate,SearchConfig} from './types.js';
const date=z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).refine(s=>!s||(!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s),'날짜를 확인하세요.');
export const searchSchema=z.object({version:z.literal('naver-csv-v1').default('naver-csv-v1'),name:z.string().trim().min(1).max(100),naverType:z.enum(naverTypes),bundleIds:z.array(z.string()).min(1).max(30),target:z.number().int().min(1).max(1000),pages:z.number().int().min(1).max(10),startDate:date.default(''),endDate:date.default(''),includeUnknownDate:z.boolean().default(true),removeAds:z.boolean().default(true)}).strict().refine(s=>!s.startDate||!s.endDate||s.startDate<=s.endDate,'시작일과 종료일을 확인하세요.');
export function resumable(r:Research){return r.apiSearch?.version==='naver-csv-v1'&&naverTypes.includes(r.apiSearch.naverType);}
export class SearchCollector {
 active=new Map<string,{r:Research;controller:AbortController;pending:Promise<void>}>();
 constructor(private store:Store,private provider:SearchProvider,private sleep=wait){}
 start(args:unknown){
  if(this.active.size)throw Error('현재 수집을 중지한 뒤 시작하세요.');const config:SearchConfig=searchSchema.parse(args);this.provider.validate();
  const bundles=this.store.list<Bundle>('bundles').filter(b=>config.bundleIds.includes(b.id)).sort((a,b)=>a.priority-b.priority);if(bundles.length!==new Set(config.bundleIds).size)throw Error('쿼리 번들을 다시 선택하세요.');for(const b of bundles)plan(b.expression);
  const r=localResearch(config.name,config.target);r.id=randomUUID();r.bundles=bundles;r.apiSearch=config;r.config={...r.config,bundleIds:config.bundleIds,sources:[config.naverType==='blog'?'naver_blog':'naver_cafearticle'],target:config.target,startDate:config.startDate,endDate:config.endDate,removeAds:config.removeAds};
  r.totalTasks=bundles.reduce((n,b)=>n+browserQueries(b.expression).length,0)*config.pages;r.processed=0;r.valid=0;r.status='running';r.stage='검색 준비';r.notes=['네이버 검색 API가 반환한 제목·URL·검색 요약을 저장합니다. 검색 요약은 게시글 전문이 아닙니다. 수집 중에는 AI를 호출하지 않습니다.'];this.store.put('researches',r);this.launch(r);return r;
 }
 private launch(r:Research){if(this.active.size)throw Error('다른 수집이 진행 중입니다.');const controller=new AbortController();r.status='running';const entry={r,controller,pending:Promise.resolve()};this.active.set(r.id,entry);entry.pending=this.run(r,controller.signal).catch(e=>{if(controller.signal.aborted)return;r.status='paused';r.stage='수집 일시정지';r.errors=[...r.errors,(e as Error).message].slice(-100);}).finally(()=>{this.save(r);this.active.delete(r.id);});}
 private save(r:Research){const rows=this.store.records(r.id);r.valid=rows.filter(row=>row.review_status!=='excluded').length;r.excluded=rows.length-r.valid;r.updatedAt=new Date().toISOString();this.store.put('researches',r);}
 private async run(r:Research,signal:AbortSignal){const config=r.apiSearch!;let first=true;
  outer:for(const bundle of r.bundles)for(const query of browserQueries(bundle.expression)){
   const key=JSON.stringify([config.naverType,bundle.id,query]);if(r.cursors[key]==='done')continue;let page=Number(r.cursors[key]||1);
   for(;page<=config.pages;page++){
    signal.throwIfAborted();this.save(r);if(r.valid>=config.target)break outer;if(this.store.records(r.id).length>=5000){r.notes.push('자료 5,000건 보존 한도에 도달했습니다.');break outer;}
    if(!first)await this.sleep(2500,signal);first=false;r.stage=`${naverLabels[config.naverType]} · ${bundle.name} · ${page}페이지`;this.save(r);
    const found=await this.provider.search(config.naverType,query,Number(r.cursors[key+':start']||1),signal);
    for(const item of found.items){signal.throwIfAborted();this.consume(r,bundle,query,page,item);this.save(r);if(r.valid>=config.target||this.store.records(r.id).length>=5000)break;}
    r.processed++;r.cursors[key]=found.next===null||page===config.pages?'done':page+1;if(found.next!==null)r.cursors[key+':start']=found.next;this.save(r);if(found.next===null)break;
   }
  }
  r.status='completed';r.stage='수집 완료';this.save(r);if(r.valid<config.target){r.notes.push(`목표 ${config.target}건 중 ${r.valid}건을 확보했습니다. 검색 결과·필터·페이지 한도에 따라 수량이 달라집니다.`);this.save(r);}
 }
 private consume(r:Research,b:Bundle,query:string,page:number,item:Candidate){
  const url=canonicalUrl(item.url);try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return;}catch{return;}
  const type=r.apiSearch!.naverType,path=`${naverLabels[type]} / ${b.name} / ${query} / ${page}페이지`,id=createHash('sha256').update(JSON.stringify([r.id,b.id,url])).digest('hex');
  const existing=this.store.records(r.id).find(x=>x.record_id===id);if(existing){existing.discovery_paths=[...new Set([...existing.discovery_paths,path])];this.store.record(existing);return;}
  const date=normalizedDate(item.date),row=makeRecord(r.id,item.text,item.title,url,date||'','ko','naver_'+type);row.record_id=id;row.native_id=item.id;row.source_search_engine=naverLabels[type];row.content_status='snippet_only';row.query_bundle_name=b.name;row.query_expression=b.expression;row.discovery_paths=[path];row.processing_status='api_collected';row.published_at_confidence=date?'provider_reported':'unknown';
  const combined=row.title+' '+item.text,ast=plan(b.expression).expression;row.matched_keywords=terms(ast).filter(t=>combined.toLowerCase().includes(t.toLowerCase()));row.evidence=matchedContext(combined,row.matched_keywords);
  if(!matches(ast,combined))row.exclusion_reasons.push('번들 논리식 불일치');row.excluded_keywords=b.exclusions.split(/[,\n]/).map(s=>s.trim()).filter(Boolean).filter(t=>combined.toLowerCase().includes(t.toLowerCase()));if(row.excluded_keywords.length)row.exclusion_reasons.push('제외어: '+row.excluded_keywords.join(', '));
  if(date||!r.apiSearch!.includeUnknownDate){const reason=dateReason(date,r.config.startDate,r.config.endDate);if(reason)row.exclusion_reasons.push(reason);}const ads=adReasons(combined);row.advertisement_flag=!!ads.length;if(r.apiSearch!.removeAds)row.exclusion_reasons.push(...ads);
  const duplicate=this.store.records(r.id).find(p=>canonicalUrl(p.source_url)===url||(item.text.length>40&&hashText(p.original_full_text)===hashText(item.text)));if(duplicate){row.duplicate_flag=true;row.exclusion_reasons.push('동일 URL·본문 중복');duplicate.discovery_paths=[...new Set([...duplicate.discovery_paths,path])];this.store.record(duplicate);}row.review_status=row.exclusion_reasons.length?'excluded':'pending';this.store.record(row);
 }
 pause(id:string,stop=false){const entry=this.active.get(id),r=entry?.r||this.store.research(id);if(!r||!resumable(r))throw Error('현재 버전의 네이버 수집 기록이 아닙니다.');r.status=stop?'stopped':'paused';r.stage=stop?'수집 중지':'일시정지';entry?.controller.abort();this.save(r);return r;}
 resume(id:string){if(this.active.size)throw Error('진행 중인 요청 정리가 끝난 뒤 재개하세요.');const r=this.store.research(id);if(!r||!resumable(r)||!['paused','failed','stopped'].includes(r.status))throw Error('이전 자료는 보존됩니다. 네이버 검색을 새로 시작하세요.');this.provider.validate();this.launch(r);return r;}
 close(){for(const id of this.active.keys())this.pause(id);}
 async idle(){await Promise.all([...this.active.values()].map(e=>e.pending));}
}
