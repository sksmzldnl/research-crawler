import ExcelJS from 'exceljs';
import { csvColumns } from './types.js';
import type {RecordItem,ExportRequest} from './types.js';
export const koreanHeaders=['자료 ID','조사 ID','쿼리 번들명','쿼리 논리식','일치 키워드','제외 키워드','검색 엔진','소스 플랫폼','원문 URL','제목','게시일','게시일 신뢰도','수집일','원문 언어','원문 본문 또는 스니펫','한국어 전체 번역','한국어 요약','경험 유형','페인 포인트','개선 요구','사용자 행동','임시방편','감정','관련성 점수','관련성 근거','광고 여부','중복 여부','본문 확보 상태','AI 제공자','AI 모델','처리 상태','검토 상태'];
const extra=['mode','kind','parent_id','discovery_paths','exclusion_reasons','evidence','ai_error'] as const;
export function safeCell(value:unknown){const s=Array.isArray(value)?value.join(' | '):value==null?'':String(value);return /^[\s\u0000-\u001f]*[=+@-]/u.test(s)?"'"+s:s;}
export function selectRecords(records:RecordItem[],request:ExportRequest){return records.filter(r=>r.research_id===request.researchId&&(request.scope==='all'||request.scope==='valid'&&r.review_status!=='excluded'||request.scope==='excluded'&&r.review_status==='excluded'||request.scope==='bundle'&&r.query_bundle_name===request.bundle));}
export async function exportData(records:RecordItem[],request:ExportRequest){const selected=selectRecords(records,request);const originalKeys=[...new Set(selected.flatMap(r=>Object.keys(r.imported_fields||{})))];const columns=[...csvColumns,...extra];const headers=[...request.korean?koreanHeaders:csvColumns,...request.korean?['데이터 모드','자료 유형','상위 게시물 ID','발견 경로','제외 근거','근거 문맥','처리 오류']:extra,...originalKeys.map(k=>'original_column:'+k)];const rows=selected.map(r=>[...columns.map(c=>safeCell(r[c])),...originalKeys.map(k=>safeCell(r.imported_fields?.[k]))]);
  if(request.format==='xlsx'){const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('조사 결과');sheet.addRow(headers);for(const row of rows)sheet.addRow(row);sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:headers.length}};return Buffer.from(await book.xlsx.writeBuffer());}
  function quote(s:unknown){return '"'+String(s).replace(/"/g,'""')+'"';}return Buffer.from((request.bom?'\ufeff':'')+[headers,...rows].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n','utf8');
}
