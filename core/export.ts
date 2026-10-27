import type {RecordItem,ExportRequest} from './types.js';
export function safeCell(value:unknown){const text=Array.isArray(value)?value.join(' | '):value==null?'':String(value);return /^[\s\u0000-\u001f]*[=+@-]/u.test(text)?"'"+text:text;}
export function selectRecords(records:RecordItem[],request:ExportRequest){const ids=request.ids?new Set(request.ids):undefined;const result=records.filter(r=>r.research_id===request.researchId&&(!ids||ids.has(r.record_id)));if(ids&&result.length!==ids.size)throw Error('저장할 행을 찾을 수 없습니다.');return result;}
export async function exportData(records:RecordItem[],request:ExportRequest){
 const selected=selectRecords(records,request);if(!selected.length)throw Error('저장할 자료가 없습니다.');
 const originalKeys=[...new Set(selected.flatMap(row=>Object.keys(row.imported_fields||{})))];
 const base=originalKeys.length?originalKeys:['제목','원문 URL','게시일','본문','본문 상태','검색 종류','쿼리 번들','제외 사유'];
 const additions=['AI_요약','AI_인사이트','AI_분류','AI_불편사항','AI_개선제안','AI_사용자행동','AI_대안','AI_감정','AI_근거','AI_처리상태','AI_오류'];
 const used=new Set(base);const headers=[...base,...additions.map(name=>{let value=name;for(let i=2;used.has(value);i++)value=name+'_'+i;used.add(value);return value;})];
 const rows=selected.map(row=>[...(originalKeys.length?originalKeys.map(key=>row.imported_fields?.[key]||''):[row.title,row.source_url,row.published_at||'',row.original_full_text,row.content_status==='snippet_only'?'검색 요약':'CSV 본문',row.source_search_engine,row.query_bundle_name,row.exclusion_reasons]),row.korean_summary,row.ai_insight||'',row.insight_category,row.pain_point,row.improvement_request,row.user_behavior,row.workaround,row.sentiment,row.evidence,row.processing_status==='insights_ready'?'정리 완료':row.ai_error?'오류':'미정리',row.ai_error]);
 const quote=(value:unknown)=>'"'+safeCell(value).replace(/"/g,'""')+'"';return Buffer.from('\uFEFF'+[headers,...rows].map(row=>row.map(quote).join(',')).join('\r\n'),'utf8');
}
