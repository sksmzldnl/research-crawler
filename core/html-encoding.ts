import iconv from 'iconv-lite';
const koreanLabels=new Set(['ms949','cp949','windows949','xwindows949','euckr','xeuckr','ksc5601','ksc56011987','ksc56011989','cseuckr','korean']);
function encoding(label:string|undefined){
 if(!label)return undefined;const value=label.trim().toLowerCase();
 if(koreanLabels.has(value.replace(/[\s_:-]/g,'')))return 'cp949';
 try{const canonical=new TextDecoder(value).encoding;return canonical==='euc-kr'?'cp949':canonical;}catch{return undefined;}
}
function charset(contentType:string){return contentType.match(/(?:^|;)\s*charset\s*=\s*(?:"([^"]*)"|'([^']*)'|([^;\s]*))/i)?.slice(1).find(v=>v!==undefined);}
function metaEncoding(bytes:Uint8Array){
 const head=Buffer.from(bytes.subarray(0,4096)).toString('latin1').replace(/<!--[\s\S]*?(?:-->|$)/g,'');
 for(const tag of head.match(/<meta\b[^>]*>/gi)||[]){
  const attrs=new Map<string,string>();const attribute=/([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  for(const match of tag.matchAll(attribute))attrs.set(match[1].toLowerCase(),match[2]??match[3]??match[4]);
  const label=attrs.get('charset')||(attrs.get('http-equiv')?.toLowerCase()==='content-type'?charset(attrs.get('content')||''):undefined),value=encoding(label);
  if(value)return value;
 }return undefined;
}
/** Decode web HTML bytes, including legacy Korean encodings absent from Node's TextDecoder labels. */
export function decodeHtml(bytes:Uint8Array,contentType=''){
 const bom=bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf?'utf-8':bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':undefined;
 const selected=bom||encoding(charset(contentType))||metaEncoding(bytes);
 // Korean web labels cover the CP949 extensions, which Node's ICU EUC-KR decoder does not fully handle.
 if(selected==='cp949')return iconv.decode(Buffer.from(bytes),'cp949');
 if(selected)return new TextDecoder(selected).decode(bytes);
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('원문 문자 인코딩을 확인하지 못했습니다.');}
}
