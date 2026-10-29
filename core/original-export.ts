import {writeFile,stat,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {RecordItem} from './types.js';
export async function checkDirectory(directory:string){if(!isAbsolute(directory)||!(await stat(directory)).isDirectory())throw Error('저장할 폴더를 다시 선택하세요.');await access(directory,constants.W_OK);}
export function originalFile(row:RecordItem,format:'md'|'json'){
 if(row.content_status!=='full_text'||!row.original_markdown)throw Error('전문 수집에 성공한 자료만 저장할 수 있습니다.');
 const data={title:row.title,url:row.source_url,published_at:row.published_at,published_at_confidence:row.published_at_confidence,collected_at:row.collected_at,platform:row.source_platform,query_bundle:row.query_bundle_name,body:row.original_full_text,body_markdown:row.original_markdown,content_status:'full_text'};
 return format==='json'?JSON.stringify(data,null,2)+'\n':`# ${row.title.replace(/[\r\n]/g,' ')}\n\n- 원문: ${row.source_url}\n- 게시일: ${row.published_at||'미확인'}\n- 수집일: ${row.collected_at}\n- 쿼리 번들: ${row.query_bundle_name.replace(/[\r\n]/g,' ')}\n\n---\n\n${row.original_markdown}\n`;
}
export async function saveOriginal(row:RecordItem,directory:string,format:'md'|'json'){
 await checkDirectory(directory);const title=(row.title.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/g,'').trim()||'게시글').slice(0,60),base=title+'-'+row.record_id.slice(0,16);
 const data=originalFile(row,format);for(let n=0;n<3;n++){const path=join(directory,base+(n?'-'+randomUUID().slice(0,8):'')+'.'+format);try{await writeFile(path,data,{flag:'wx',mode:0o600});return path;}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}}throw Error('파일 이름 충돌로 저장하지 못했습니다.');
}
