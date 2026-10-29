import {normalizedDate} from './quality.js';
/** Parse a publication field, preserving Korea's calendar day. Never use a modified field. */
export function articleDate(value:unknown):string|null {
 if(typeof value==='number'||typeof value==='string'&&/^\d{10}(?:\d{3})?$/.test(value.trim())){
  let ms=Number(value);if(ms<1e12)ms*=1000;if(ms<0||ms>Date.now()+86400000)return null;
  return new Date(ms+9*3600000).toISOString().replace('Z','+09:00');
 }
 if(typeof value!=='string')return null;
 const exact=normalizedDate(value);if(exact)return exact;
 const date=value.match(/(?:작성일|등록일|게시일|작성|등록|게시)?\s*(\d{4})\s*[.년/-]\s*(\d{1,2})\s*[.월/-]\s*(\d{1,2})\s*[.일]?(?:\s*(오전|오후)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
 if(!date)return null;const [,y,m,d,ampm,rawHour,minute,second]=date;let hour=rawHour?Number(rawHour):undefined;
 if(ampm&&hour!==undefined){if(hour<1||hour>12)return null;hour=hour%12+(ampm==='오후'?12:0);}
 return normalizedDate(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}${hour!==undefined?' '+String(hour).padStart(2,'0')+':'+minute+':'+(second||'00'):''}`);
}
