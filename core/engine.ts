import { createHash, randomUUID } from 'node:crypto';
import { Store } from './store.js';
import { Connectors } from './connectors.js';
import { AI } from './ai.js';
import { parse,plan,matches,terms } from './query.js';
import { adReasons,canonicalUrl,dateReason,findDuplicate,matchedContext,normalizedDate,similarity } from './quality.js';
import { anonymize } from './connectors.js';
import { extract } from './extract.js';
import { wait } from './network.js';
import { demo } from './demo.js';
import type {Research,ResearchConfig,Bundle,RecordItem,Candidate,Source} from './types.js';
export class Engine {
  active=new Map<string,{r:Research;controller:AbortController}>();
  constructor(public store:Store,public connectors:Connectors,public ai:AI){}
  start(config:ResearchConfig){if(config.mode==='live')throw Error('검색 API 수집은 사용하지 않습니다. CSV·텍스트 또는 공개 RSS·URL을 가져오세요.');const bundles=this.store.list<Bundle>('bundles').filter(b=>config.bundleIds.includes(b.id)).sort((a,b)=>a.priority-b.priority);if(!bundles.length)throw Error('쿼리 번들을 선택하세요.');for(const b of bundles)plan(b.expression);
    const r:Research={id:randomUUID(),config,bundles,status:'running',stage:'검색',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),processed:0,totalTasks:config.mode==='demo'?bundles.length:bundles.reduce((n,b)=>n+plan(b.expression).queries.length*config.sources.length,0),valid:0,excluded:0,errors:[],notes:config.mode==='demo'?['모든 자료는 교육용 합성 예시입니다. 실제 사용자 경험·수집 결과가 아닙니다.']:[],usage:{input:0,output:0,cost:0},cursors:{}};
    this.store.put('researches',r);this.launch(r);return r;
  }
  pause(id:string,stop=false){const a=this.active.get(id);const r=a?.r||this.store.research(id);if(!r)throw Error('조사를 찾지 못했습니다.');if(r.status!=='running'&&r.status!=='paused')throw Error('실행 중이거나 일시정지된 조사만 변경할 수 있습니다.');r.status=stop?'stopped':'paused';r.stage=stop?'중지됨':'일시정지 · 현재 위치 저장';this.save(r);a?.controller.abort();return r;}
  resume(id:string){if(this.store.research(id)?.config.mode==='live')throw Error('기존 API 조사는 재개하지 않습니다. 자료 가져오기를 사용하세요.');if(this.active.has(id))throw Error('이전 요청을 정리하고 있습니다. 잠시 후 다시 시도하세요.');const r=this.store.research(id);if(!r||!['paused','failed'].includes(r.status))throw Error('재개 가능한 조사가 아닙니다.');r.status='running';r.errors=[];this.launch(r);return r;}
  private launch(r:Research){const controller=new AbortController();this.active.set(r.id,{r,controller});void this.run(r,controller.signal).catch(e=>{if(controller.signal.aborted)return;r.status='failed';r.stage='오류 · 설정 확인 후 재개';this.error(r,e);}).finally(()=>{this.active.delete(r.id);this.save(r);});}
  private save(r:Research){r.updatedAt=new Date().toISOString();const all=this.store.records(r.id);r.valid=all.filter(x=>x.review_status!=='excluded').length;r.excluded=all.length-r.valid;this.store.put('researches',r);}
  private error(r:Research,e:unknown){r.errors=[...r.errors,String((e as Error).message).slice(0,500)].slice(-100);this.save(r);}
  private async run(r:Research,signal:AbortSignal){
    for(const bundle of r.bundles){const queries=r.config.mode==='demo'?['demo']:plan(bundle.expression).queries;const sources:Source[]=r.config.mode==='demo'?['naver_blog']:r.config.sources;
      for(const source of sources)for(const query of queries){const key=JSON.stringify([bundle.id,source,query]);if(r.cursors[key]==='done')continue;let cursor=r.cursors[key]||1;let pages=0;
        do{signal.throwIfAborted();if(r.valid>=r.config.target)break;r.stage=`검색 · ${source} · ${query}`;this.save(r);
          let page;try{page=r.config.mode==='demo'?{items:demo,next:null,note:''}:await this.connectors.search(source,query,cursor,signal);}catch(e){if(signal.aborted)throw e;throw Error(`${source} / ${query}: ${(e as Error).message}`);}
          if(page.note&&!r.notes.includes(page.note))r.notes.push(page.note);
          for(const c of page.items){signal.throwIfAborted();if(r.valid>=r.config.target)break;await this.consume(r,bundle,source,c,signal,query);if(r.config.mode==='demo')await wait(40,signal);}
          cursor=page.next??'done';pages++;r.cursors[key]=cursor;this.save(r);
          if(cursor==='done')break;if(pages>=10){r.notes.push(`${source}: 이번 실행에서 검색어당 10페이지 한도에 도달했습니다.`);r.cursors[key]='done';break;}if(r.config.mode==='live')await wait(1000,signal);
        }while(r.valid<r.config.target);
        r.processed++;this.save(r);
      }
    }
    r.status='completed';r.stage='저장 완료';if(r.valid<r.config.target)r.notes.push(`목표 ${r.config.target}건 중 유효 ${r.valid}건 확보. 검색 한도·게시일 미확인·기간·논리식·광고·중복 제외가 원인일 수 있습니다. 가짜 자료를 보충하지 않았습니다.`);this.save(r);
  }
  private async consume(r:Research,b:Bundle,source:Source,c:Candidate,signal:AbortSignal,query:string){
    const id=createHash('sha256').update(JSON.stringify([r.id,source,b.id,c.id])).digest('hex');const discovery=`${source} / ${b.name} / 실행 검색어: ${query} / 논리식: ${b.expression}`;const existing=this.store.records(r.id).find(x=>x.record_id===id);if(existing){existing.discovery_paths=[...new Set([...existing.discovery_paths,discovery])];this.store.record(existing);return;}
    let text=anonymize(c.text),date=normalizedDate(c.date),full=!!c.full,originalNote='';r.stage='원문 확보';this.save(r);
    if(r.config.mode==='live'&&r.config.fetchOriginal&&!full){try{const original=await extract(c.url,this.store.settings().originalAllowedHosts,this.connectors.net,signal);text=original.text;date=date||original.date;full=true;}catch(e){if(signal.aborted)throw e;originalNote=(e as Error).message;}}
    const combined=c.title+' '+text,positive=terms(parse(b.expression)),excluded=b.exclusions.split(/[,\n]/).map(s=>s.trim()).filter(Boolean),ads=adReasons(combined),reasons:string[]=[];
    r.stage='날짜·품질 필터';if(!matches(parse(b.expression),combined))reasons.push('논리식 불일치');const dr=dateReason(date,r.config.startDate,r.config.endDate);if(dr)reasons.push(dr);const hits=excluded.filter(e=>combined.toLowerCase().includes(e.toLowerCase()));if(hits.length)reasons.push('제외 키워드: '+hits.join(', '));if(r.config.removeAds&&ads.length)reasons.push(...ads);
    const record:RecordItem={record_id:id,research_id:r.id,query_bundle_name:b.name,query_expression:b.expression,matched_keywords:positive.filter(p=>combined.toLowerCase().includes(p.toLowerCase())),excluded_keywords:hits,source_search_engine:r.config.mode==='demo'?'DEMO':source.split('_')[0],source_platform:source,source_url:canonicalUrl(c.url),title:anonymize(c.title),published_at:date,published_at_confidence:date?'provider_reported':'unknown',collected_at:new Date().toISOString(),original_language:c.language||'und',original_full_text:text,korean_full_translation:'',korean_summary:'',insight_category:[],pain_point:'',improvement_request:'',user_behavior:'',workaround:'',sentiment:'미확인',relevance_score:null,relevance_reason:'',advertisement_flag:!!ads.length,duplicate_flag:false,content_status:full?'full_text':'snippet_only',ai_provider:'',ai_model:'',processing_status:'local_filtered',review_status:reasons.length?'excluded':'pending',mode:r.config.mode,kind:c.kind||'post',parent_id:c.parent||null,native_id:c.id,discovery_paths:[discovery],exclusion_reasons:reasons,evidence:matchedContext(combined,positive),ai_error:originalNote,ai_chunks:[]};
    r.stage='중복 제거';let duplicate=findDuplicate(record,this.store.records(r.id),false);let semanticReason='';
    if(!duplicate&&r.config.semanticDedupe&&record.review_status!=='excluded'&&r.config.mode==='live'){const previous=this.store.records(r.id).filter(p=>p.review_status!=='excluded').sort((a,b)=>similarity(b.original_full_text,text)-similarity(a.original_full_text,text)).slice(0,5);if(previous.length){try{const result=await this.ai.semanticDuplicate(text.slice(0,5000),previous.map(p=>({id:p.record_id,text:p.original_full_text.slice(0,5000)})),r.config.aiProvider,r.config.aiModel,signal);duplicate=previous.find(p=>p.record_id===result.duplicate_id);semanticReason=result.reason;r.usage.input+=result.input;r.usage.output+=result.output;r.usage.cost+=(result.input*r.config.aiInputPrice+result.output*r.config.aiOutputPrice)/1_000_000;}catch(e){if(signal.aborted)throw e;record.ai_error='의미 중복 검사 실패: '+(e as Error).message;this.error(r,e);}}}
    if(duplicate&&(r.config.deduplicate||r.config.semanticDedupe)){record.duplicate_flag=true;record.exclusion_reasons.push(`중복 자료: ${duplicate.record_id} · URL/게시물 ID/본문 해시${semanticReason?' / AI 의미 비교: '+semanticReason:''}`);record.review_status='excluded';duplicate.discovery_paths=[...new Set([...duplicate.discovery_paths,...record.discovery_paths])];this.store.record(duplicate);}
    if(record.review_status!=='excluded'&&r.config.ai){r.stage='AI 처리';if(r.config.mode==='demo'){record.korean_full_translation=text;record.korean_summary='[합성 데모 · AI 미호출] '+text.slice(0,100);record.insight_category=['제품 사용 경험'];record.ai_provider='DEMO';record.ai_model='prewritten-example';record.processing_status='demo_analysis';}else{try{await this.analyzeRecord(record,r,signal);if(r.config.removeAds&&record.advertisement_flag){record.review_status='excluded';record.exclusion_reasons.push('AI 광고 의심 · 사람 검토 필요');}}catch(e){if(signal.aborted)throw e;record.ai_error=(e as Error).message;record.processing_status='ai_failed';this.error(r,e);}}}
    r.stage='저장';this.store.record(record);this.save(r);
  }
  async analyzeRecord(record:RecordItem,r:Research,signal?:AbortSignal){if(r.config.mode==='demo')throw Error('데모는 유료 AI 재처리를 호출하지 않습니다.');if(!this.store.settings().consentAi)throw Error('원문 외부 전송 동의가 필요합니다.');const a=await this.ai.analyze(record.original_full_text,r.config.aiProvider,r.config.aiModel,signal);record.ai_chunks=a.chunks;record.korean_full_translation=a.results.map(x=>x.translation).join('\n');record.korean_summary=a.results.map(x=>x.summary).join('\n');record.insight_category=[...new Set(a.results.flatMap(x=>x.categories))];for(const key of ['pain_point','improvement_request','user_behavior','workaround','relevance_reason'] as const)record[key]=a.results.map(x=>x[key]).filter(Boolean).join('\n');record.sentiment=[...new Set(a.results.map(x=>x.sentiment))].join(', ');record.relevance_score=Math.min(...a.results.map(x=>x.relevance_score));record.evidence=a.results.flatMap(x=>x.evidence);record.advertisement_flag=record.advertisement_flag||a.results.some(x=>x.advertisement);record.ai_provider=r.config.aiProvider;record.ai_model=r.config.aiModel;record.processing_status='analyzed';record.ai_error='';r.usage.input+=a.input;r.usage.output+=a.output;r.usage.cost+=(a.input*r.config.aiInputPrice+a.output*r.config.aiOutputPrice)/1_000_000;this.store.record(record);this.save(r);}
  async idle(){while(this.active.size)await wait(10);}
  shutdown(){for(const id of this.active.keys())this.pause(id);}
}
