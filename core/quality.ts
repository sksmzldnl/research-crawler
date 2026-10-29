import { createHash } from 'node:crypto';
import type {RecordItem} from './types.js';
export function canonicalUrl(raw:string){try{const u=new URL(raw);u.hash='';for(const k of [...u.searchParams.keys()])if(/^(utm_|fbclid|gclid|ref$|referrer$)/i.test(k))u.searchParams.delete(k);u.searchParams.sort();u.hostname=u.hostname.toLowerCase();u.pathname=u.pathname.replace(/\/$/,'')||'/';return u.href;}catch{return raw;}}
export function hashText(s:string){return createHash('sha256').update(s.normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase()).digest('hex');}
export function adReasons(s:string){return [/협찬|제공받|소정의\s*원고료|유료\s*광고|sponsored|affiliate/i.test(s)?'광고·협찬 문구':'',/구매\s*링크|할인\s*코드|공동\s*구매|buy now|promo code/i.test(s)?'판매 유도 문구':''].filter(Boolean);}
export function similarity(a:string,b:string){function grams(s:string){const n=s.toLowerCase().replace(/\s+/g,'');return new Set(Array.from({length:Math.max(0,n.length-2)},(_,i)=>n.slice(i,i+3)));}const x=grams(a),y=grams(b);if(!x.size||!y.size)return 0;return [...x].filter(v=>y.has(v)).length/new Set([...x,...y]).size;}
export function findDuplicate(r:RecordItem,previous:RecordItem[],approximate:boolean){return previous.find(p=>p.record_id!==r.record_id&&(canonicalUrl(p.source_url)===canonicalUrl(r.source_url)||(p.native_id&&p.native_id===r.native_id&&p.source_platform===r.source_platform)||(r.original_full_text.length>40&&hashText(p.original_full_text)===hashText(r.original_full_text))||(approximate&&r.original_full_text.length>100&&similarity(p.original_full_text,r.original_full_text)>.88)));}
export function normalizedDate(value:string|undefined|null):string|null{
 if(!value)return null;let s=value.trim();
 const local=s.match(/^(\d{4})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})\.?(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)||s.match(/^(\d{4})(\d{2})(\d{2})$/);
 if(local){const [,y,m,d,h,mi,sec]=local,day=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;if((h&&Number(h)>23)||(mi&&Number(mi)>59)||(sec&&Number(sec)>59)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)return null;return h?`${day}T${h.padStart(2,'0')}:${mi}:`+(sec||'00')+'+09:00':day+'T00:00:00+09:00';}
 // Reject relative dates and arbitrary surrounding prose, so modified dates are never guessed as publication dates.
 if(!/^\d{4}-\d{2}-\d{2}T/.test(s)&&!/^\w{3},?\s+\d/.test(s))return null;return Number.isFinite(Date.parse(s))?s:null;
}
export function dateReason(date:string|null,start:string,end:string){if(!date)return '게시일 미확인';const d=date.slice(0,10);return (start&&d<start)||(end&&d>end)?'선택 기간 밖':'';}
export function matchedContext(text:string,keywords:string[]){return keywords.flatMap(k=>{const i=text.toLowerCase().indexOf(k.toLowerCase());return i<0?[]:[text.slice(Math.max(0,i-50),i+k.length+80)];});}
