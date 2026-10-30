/** Publication fields from UK forums. Date-only fields remain dates; no Korean-time assumption. */
export function forumDate(raw:unknown):string|null {
 if(typeof raw!=='string')return null;const s=raw.replace(/\u00a0/g,' ').trim();
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)){
  if(!Number.isFinite(Date.parse(s)))return null;const day=s.slice(0,10);return validDay(day)?s:null;
 }
 let y:string|undefined,m:string|undefined,d:string|undefined,h:string|undefined,mi:string|undefined,sec:string|undefined,amp:string|undefined;
 const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/),uk=s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?\.?$/i);
 if(iso)[,y,m,d,h,mi,sec]=iso;
 else if(uk)[,d,m,y,h,mi,sec,amp]=uk;
 else {const english=s.match(/^(?:\w+,?\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})(?:\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i);if(!english)return null;[,d,m,y,h,mi,sec,amp]=english;m=String(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m!.slice(0,3).toLowerCase())+1);}
 const day=`${y}-${m!.padStart(2,'0')}-${d!.padStart(2,'0')}`;if(!validDay(day))return null;if(h===undefined)return day;
 let hour=Number(h);if(amp){if(hour<1||hour>12)return null;hour=hour%12+(amp.toLowerCase()==='pm'?12:0);}if(hour>23||Number(mi)>59||Number(sec||0)>59)return null;
 const local=`${day}T${String(hour).padStart(2,'0')}:${mi}:${sec||'00'}`,wall=Date.parse(local+'Z');
 const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const parts=(ms:number)=>Object.fromEntries(formatter.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
 let candidate=wall,offset=0;for(let i=0;i<3;i++){const p=parts(candidate),shown=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);offset=shown-candidate;candidate=wall-offset;}
 const p=parts(candidate);if(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`!==local)return null;
 // The repeated autumn hour is ambiguous without an explicit offset. Keep its day, not a guessed instant.
 if([candidate-3600000,candidate+3600000].some(ms=>{const q=parts(ms);return `${q.year}-${q.month}-${q.day}T${q.hour}:${q.minute}:${q.second}`===local;}))return day;
 return local+(offset===3600000?'+01:00':'+00:00');
}
function validDay(day:string){const ms=Date.parse(day+'T00:00:00Z');return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===day;}
