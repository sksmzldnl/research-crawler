import {browserQueries} from './search-plan.js';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {Store} from './store.js';
import {plan,matches,terms} from './query.js';
import {adReasons,canonicalUrl,hashText,normalizedDate,matchedContext,dateReason} from './quality.js';
import {extract} from './extract.js';
import {Network,wait} from './network.js';
import {makeRecord,localResearch} from './import.js';
import {apiEngines,apiLabels as engineLabels,apiOptions,type ApiEngine,type ApiOptions} from './api-types.js';
import type {SearchProvider,ApiCursor} from './search-api.js';
import type {Bundle,Research,Candidate,SearchConfig} from './types.js';
const date=z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).refine(s=>!s||(!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s),'날짜를 확인하세요.');
export const searchSchema=z.object({name:z.string().trim().min(1).max(100),engines:z.array(z.enum(apiEngines)).min(1).max(5),bundleIds:z.array(z.string()).min(1).max(30),sites:z.array(z.string().regex(/^(?!-)[a-z0-9.-]+\.[a-z]{2,}$/i)).max(20),target:z.number().int().min(1).max(1000),pages:z.number().int().min(1).max(10),startDate:date,endDate:date,includeUnknownDate:z.boolean(),removeAds:z.boolean(),fetchOriginal:z.boolean()}).refine(s=>!s.startDate||!s.endDate||s.startDate<=s.endDate,'시작일과 종료일을 확인하세요.');
export class SearchCollector {
 active=new Map<string,{r:Research;controller:AbortController;pending:Promise<void>}>();
 constructor(private store:Store,private provider:SearchProvider,private net:Network,private settings:()=>ApiOptions,private sleep=wait){}
 start(args:unknown){if(this.active.size)throw Error('현재 수집을 중지한 뒤 시작하세요.');const config:SearchConfig={...searchSchema.parse(args),apiOptions:apiOptions(this.settings())};this.provider.validate(config.engines,config.apiOptions!);const bundles=this.store.list<Bundle>('bundles').filter(b=>config.bundleIds.includes(b.id)).sort((a,b)=>a.priority-b.priority);if(bundles.length!==new Set(config.bundleIds).size)throw Error('쿼리 번들을 다시 선택하세요.');for(const b of bundles)plan(b.expression);const r=localResearch(config.name,config.target);r.id=randomUUID();r.bundles=bundles;r.apiSearch=config;r.config={...r.config,bundleIds:config.bundleIds,target:config.target,startDate:config.startDate,endDate:config.endDate,fetchOriginal:config.fetchOriginal,removeAds:config.removeAds};r.totalTasks=bundles.reduce((n,b)=>n+browserQueries(b.expression).length,0)*config.engines.length*Math.max(1,config.sites.length)*config.pages;r.processed=0;r.valid=0;r.status='running';r.stage='검색 준비';r.notes=['공식 검색 API를 사용합니다. 수집 중에는 GPT·Gemini를 호출하지 않습니다. 제공자 응답 한도와 필터에 따라 목표 수량에 못 미칠 수 있습니다.'];this.store.put('researches',r);this.launch(r);return r;}
 private launch(r:Research){if(this.active.size)throw Error('다른 수집이 진행 중입니다.');const controller=new AbortController();r.status='running';const entry={r,controller,pending:Promise.resolve()};this.active.set(r.id,entry);entry.pending=this.run(r,controller.signal).catch(e=>{if(controller.signal.aborted)return;r.status='paused';r.stage='확인 후 재개';r.errors=[...r.errors,(e as Error).message].slice(-100);}).finally(()=>{this.save(r);this.active.delete(r.id);});}
 private save(r:Research){const rows=this.store.records(r.id);r.valid=rows.filter(row=>row.review_status!=='excluded').length;r.excluded=rows.length-r.valid;r.updatedAt=new Date().toISOString();this.store.put('researches',r);}
 private async run(r:Research,signal:AbortSignal){const config=r.apiSearch!;let first=true;
  outer:for(const engine of config.engines)for(const bundle of r.bundles)for(const term of browserQueries(bundle.expression))for(const site of config.sites.length?config.sites:['']){
   const query=site&&engine!=='reddit'?`${term} site:${site}`:term,key=JSON.stringify([engine,bundle.id,query,site]);if(r.cursors[key]==='done')continue;let page=Number(r.cursors[key]||1);
   for(;page<=config.pages;page++){signal.throwIfAborted();this.save(r);if(r.valid>=config.target)break outer;if(this.store.records(r.id).length>=5000){r.notes.push('원자료 5,000건 보존 한도에 도달해 수집을 종료했습니다.');break outer;}
    if(!first)await this.sleep(2500,signal);first=false;r.stage=`${engineLabels[engine]} · ${bundle.name} · ${query} · ${page}페이지`;this.save(r);
    const cursor=r.cursors[key+':cursor']??null;const found=await this.provider.search(engine,query,page,signal,cursor,config.apiOptions!);if(found.note&&!r.notes.includes(found.note))r.notes.push(found.note);for(const item of found.items){signal.throwIfAborted();await this.consume(r,bundle,engine,query,page,site,item,signal);this.save(r);if(r.valid>=config.target||this.store.records(r.id).length>=5000)break;}
    r.processed++;r.cursors[key]=found.next===null||page===config.pages?'done':page+1;if(found.next!==null)r.cursors[key+':cursor']=found.next;this.save(r);if(found.next===null)break;
   }
  }
  r.status='completed';r.stage='수집 완료';this.save(r);if(r.valid<config.target)r.notes.push(`목표 ${config.target}건 중 유효 ${r.valid}건. 페이지 한도·검색 결과·로컬 조건에 따라 부족할 수 있습니다.`);
 }
 private async consume(r:Research,b:Bundle,engine:ApiEngine,query:string,page:number,site:string,item:Candidate,signal:AbortSignal){
  const url=canonicalUrl(item.url);let parsed:URL;try{parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)return;}catch{return;}if(site&&parsed.hostname!==site&&!parsed.hostname.endsWith('.'+site))return;
  const path=`${engineLabels[engine]} / ${b.name} / ${query} / ${page}페이지`,id=createHash('sha256').update(JSON.stringify([r.id,engine,b.id,url])).digest('hex');const existing=this.store.records(r.id).find(x=>x.record_id===id);if(existing){existing.discovery_paths=[...new Set([...existing.discovery_paths,path])];this.store.record(existing);return;}
  let text=item.text,date=normalizedDate(item.date),full=!!item.full,note='';if(r.apiSearch!.fetchOriginal&&!full){try{const original=await extract(url,this.store.settings().originalAllowedHosts,this.net,signal);text=original.text;date=date||original.date;full=true;}catch(e){if(signal.aborted)throw e;note=(e as Error).message;}}
  const platform=engine==='naver'?'naver_'+r.apiSearch!.apiOptions!.naverType:engine==='daum'?'daum_'+r.apiSearch!.apiOptions!.daumType:'api_'+engine;const row=makeRecord(r.id,text,item.title,url,date||'',item.language||'und',platform);row.record_id=id;row.native_id=item.id;row.kind=item.kind||'post';row.parent_id=item.parent||null;row.source_search_engine=engineLabels[engine];row.content_status=full?'full_text':'snippet_only';row.query_bundle_name=b.name;row.query_expression=b.expression;row.discovery_paths=[path];row.ai_error=note;row.processing_status='api_collected';row.published_at_confidence=date?'provider_reported':'unknown';const combined=row.title+' '+text,ast=plan(b.expression).expression;row.matched_keywords=terms(ast).filter(t=>combined.toLowerCase().includes(t.toLowerCase()));row.evidence=matchedContext(combined,row.matched_keywords);
  if(!matches(ast,combined))row.exclusion_reasons.push('번들 논리식 불일치');const excluded=b.exclusions.split(/[,\n]/).map(s=>s.trim()).filter(Boolean).filter(t=>combined.toLowerCase().includes(t.toLowerCase()));row.excluded_keywords=excluded;if(excluded.length)row.exclusion_reasons.push('제외 키워드: '+excluded.join(', '));if(date||!r.apiSearch!.includeUnknownDate){const reason=dateReason(date,r.config.startDate,r.config.endDate);if(reason)row.exclusion_reasons.push(reason);}const ads=adReasons(combined);row.advertisement_flag=!!ads.length;if(r.config.removeAds)row.exclusion_reasons.push(...ads);
  const duplicate=this.store.records(r.id).find(p=>canonicalUrl(p.source_url)===url||(text.length>40&&hashText(p.original_full_text)===hashText(text)));if(duplicate){row.duplicate_flag=true;row.exclusion_reasons.push('동일 URL·본문 중복');duplicate.discovery_paths=[...new Set([...duplicate.discovery_paths,path])];this.store.record(duplicate);}row.review_status=row.exclusion_reasons.length?'excluded':'pending';this.store.record(row);
 }
 pause(id:string,stop=false){const entry=this.active.get(id),r=entry?.r||this.store.research(id);if(!r?.apiSearch)throw Error('API 수집 기록이 아닙니다.');r.status=stop?'stopped':'paused';r.stage=stop?'수집 중지':'일시정지 · 현재 위치 저장';entry?.controller.abort();this.save(r);return r;}
 resume(id:string){if(this.active.size)throw Error('진행 중인 요청 정리가 끝난 뒤 재개하세요.');const r=this.store.research(id);if(!r?.apiSearch||!['paused','failed','stopped'].includes(r.status))throw Error('재개할 수 없는 수집입니다.');this.provider.validate(r.apiSearch.engines,r.apiSearch.apiOptions!);this.launch(r);return r;}
 close(){for(const id of this.active.keys())this.pause(id);}
 async idle(){await Promise.all([...this.active.values()].map(e=>e.pending));}
}
