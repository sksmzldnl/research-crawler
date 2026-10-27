import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { RecordItem, Research } from './types.js';
import { normalizedDate } from './quality.js';

export function parseCsv(input:string,delimiter=detectDelimiter(input)) {
  if(input.length>5_000_000)throw Error('파일은 5MB 이하로 나눠 주세요.');
  const text=input.replace(/^\uFEFF/,''), rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
  const push=()=>{row.push(cell);cell='';closed=false;};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c===delimiter){push();continue;}
    if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;push();if(row.some(v=>v!==''))rows.push(row);row=[];continue;}
    if(c==='"'){if(cell||closed)throw Error('CSV 따옴표 형식을 확인하세요.');quoted=true;continue;}
    if(closed)throw Error('CSV 닫는 따옴표 뒤에 구분자 또는 줄바꿈이 필요합니다.');
    cell+=c;
  }
  if(quoted)throw Error('CSV에 닫히지 않은 따옴표가 있습니다.');
  if(cell||closed||row.length){push();if(row.some(v=>v!==''))rows.push(row);}
  const header=rows.shift()?.map((h,i)=>h.trim()||`column_${i+1}`)||[];
  if(!header.length)throw Error('CSV 머리글이 없습니다.');
  if(new Set(header).size!==header.length)throw Error('같은 이름의 열이 있습니다. 머리글을 고유하게 바꿔 주세요.');
  if(header.length>150)throw Error('최대 150개 열까지 지원합니다.');
  if(rows.length>1000)throw Error('한 번에 최대 1,000행까지 가져올 수 있습니다.');
  rows.forEach((r,i)=>{if(r.length!==header.length)throw Error(`CSV 데이터 ${i+1}행의 열 개수가 머리글과 다릅니다.`);});
  return {header,rows,delimiter};
}
export function detectDelimiter(text:string){const first=text.replace(/^\uFEFF/,'').split(/\r?\n/)[0];return [',','\t',';'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];}
const field=z.string().max(200);
export const importSchema=z.object({name:z.string().trim().min(1).max(100),kind:z.literal('csv').default('csv'),text:z.string().min(1).max(5_000_000),delimiter:z.enum([',',';','\t']).optional(),mapping:z.object({body:field,title:field,url:field,date:field,language:field}).optional(),deduplicate:z.boolean().default(false)});
export type ImportInput=z.infer<typeof importSchema>;
export function localResearch(name:string,count:number):Research{const now=new Date().toISOString();return {id:randomUUID(),config:{name,mode:'live',bundleIds:[],sources:[],startDate:'',endDate:'',target:Math.max(1,count),removeAds:false,deduplicate:true,semanticDedupe:false,fetchOriginal:false,ai:false,aiProvider:'openai',aiModel:'gpt-4.1-mini',aiInputPrice:0,aiOutputPrice:0},bundles:[],status:'completed',stage:'저장 완료',createdAt:now,updatedAt:now,processed:count,totalTasks:count,valid:count,excluded:0,errors:[],notes:['검색 API·AI를 호출하지 않고 가져온 자료입니다.'],usage:{input:0,output:0,cost:0},cursors:{}};}
export function makeRecord(researchId:string,text:string,title:string,url='',date='',language='und',platform='text'):RecordItem{return {record_id:randomUUID(),research_id:researchId,query_bundle_name:'직접 가져오기',query_expression:'',matched_keywords:[],excluded_keywords:[],source_search_engine:'직접 가져오기',source_platform:platform,source_url:url,title:title||text.slice(0,60),published_at:normalizedDate(date),published_at_confidence:normalizedDate(date)?'user_imported':'unknown',collected_at:new Date().toISOString(),original_language:language||'und',original_full_text:text,korean_full_translation:'',korean_summary:'',ai_insight:'',insight_category:[],pain_point:'',improvement_request:'',user_behavior:'',workaround:'',sentiment:'미확인',relevance_score:null,relevance_reason:'',advertisement_flag:false,duplicate_flag:false,content_status:'full_text',ai_provider:'',ai_model:'',processing_status:'local_imported',review_status:'pending',mode:'live',kind:'post',parent_id:null,native_id:'',discovery_paths:['사용자가 제공한 자료'],exclusion_reasons:[],evidence:[],ai_error:'',ai_chunks:[]};}
export function prepareImport(args:ImportInput){
 const research=localResearch(args.name,1);let records:RecordItem[];
 if(args.kind!=='csv')throw Error('CSV 파일만 가져올 수 있습니다.');
 {const {header,rows}=parseCsv(args.text,args.delimiter);const aliases=(name:string)=>[name,({original_full_text:'원문 본문 또는 스니펫',title:'제목',source_url:'원문 URL',published_at:'게시일',original_language:'원문 언어'} as Record<string,string>)[name]];
  const pick=(names:string[])=>header.find(h=>names.filter(Boolean).some(n=>n.toLowerCase()===h.toLowerCase()))||'';
  const m=args.mapping||{body:pick([...aliases('original_full_text'),'text','body','content','본문','내용']),title:pick([...aliases('title'),'제목']),url:pick([...aliases('source_url'),'url','link','링크']),date:pick([...aliases('published_at'),'date','날짜']),language:pick([...aliases('original_language'),'language','언어'])};
  if(!m.body||!header.includes(m.body))throw Error('본문으로 사용할 CSV 열을 선택하세요.');
  for(const key of Object.values(m))if(key&&!header.includes(key))throw Error('선택한 열이 CSV에 없습니다.');
  records=rows.map((row,i)=>{const get=(key:string)=>key?row[header.indexOf(key)]:'';const r=makeRecord(research.id,get(m.body),get(m.title)||`자료 ${i+1}`,get(m.url),get(m.date),get(m.language),'csv');r.imported_fields=Object.fromEntries(header.map((h,i)=>[h,row[i]]));r.native_id=String(i+1);if(!r.original_full_text.trim()){r.review_status='excluded';r.exclusion_reasons.push('본문이 비어 있음');}return r;});
 }
 if(!records.length)throw Error('가져올 데이터 행이 없습니다.');
 const seen=new Set<string>();for(const r of records){const key=r.original_full_text.normalize('NFKC').replace(/\s+/g,' ').trim();if(args.deduplicate&&key&&seen.has(key)){r.duplicate_flag=true;r.review_status='excluded';r.exclusion_reasons.push('동일 본문 중복 · 원본 행은 보존됨');}seen.add(key);}
 research.config.target=records.length;research.totalTasks=research.processed=records.length;research.valid=records.filter(r=>r.review_status!=='excluded').length;research.excluded=records.length-research.valid;return {research,records};
}
