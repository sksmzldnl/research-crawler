import {decodeHtml} from './html-encoding.js';
import {publicNaverUrl} from './original-url.js';
import { EnvHttpProxyAgent, fetch as proxyFetch } from 'undici';
const dispatcher=new EnvHttpProxyAgent();
export type Transport=(url:string,init?:RequestInit)=>Promise<Response>;
const transport:Transport=async(url,init)=>await proxyFetch(url,{...init,dispatcher} as Parameters<typeof proxyFetch>[1]) as unknown as Response;
export class ApiError extends Error{
 constructor(public status:number,public provider:string,public detail?:{code:string;reason:string;message:string}){
  const message=provider==='OpenAI'&&status===401?'Secret Key 전체값과 키의 활성 상태를 확인하세요. Tracking ID는 인증에 사용할 수 없습니다.':provider==='OpenAI'&&status===429?'API 계정의 사용 한도·잔액을 확인한 뒤 다시 실행하세요.':provider==='Gemini'&&status===404?'요청한 Gemini 모델을 찾을 수 없습니다. 설정에서 모델 이름과 생성 지원 여부를 확인하세요. 무료 한도 초과를 뜻하는 오류는 아닙니다.':status===400?'요청 형식 또는 모델 설정을 확인하세요.':status===404?'요청한 모델이나 API 경로를 찾을 수 없습니다.':status===401?'등록한 인증정보를 확인하세요.':status===403?'해당 상품·모델의 사용 권한을 확인하세요.':status===429?'요청 한도에 도달했습니다. 잠시 후 다시 실행하세요.':status>=500?'제공자 일시 오류입니다. 잠시 후 다시 실행하세요.':'요청 조건을 확인하세요.';
  super(`${provider} (${status}): ${googleAdvice(status,detail)||message}${detail?.code?' ['+detail.code+']':''}${detail?.reason?' ['+detail.reason+']':''}${detail?.message?' · Google: '+detail.message:''}`);
 }
}
function googleAdvice(status:number,detail?:{code:string;reason:string;message:string}){
 if(!detail)return '';const text=(detail.code+' '+detail.reason+' '+detail.message).toLowerCase();
 if(/free.?tier.*(not available|unavailable|restricted)|project.*denied access/.test(text))return '해당 프로젝트의 무료 등급 또는 생성 접근이 제한됐습니다. AI Studio의 프로젝트 상태를 확인하세요. 같은 프로젝트의 키만 교체해도 해결되지 않습니다.';
 if(/leaked|compromised/.test(text))return '노출된 것으로 차단된 키입니다. AI Studio에서 새 키를 발급하세요.';
 if(/api_key_invalid|api key not valid|invalid api key/.test(text))return 'API 키 전체값과 활성 상태를 확인하세요.';
 if(/referrer|ip_address_blocked|ip address/.test(text))return '키의 애플리케이션 제한이 현재 앱의 요청을 차단합니다. 허용된 IP·웹사이트 제한을 확인하세요.';
 if(/service_disabled|api_key_service_blocked|has not been used.*disabled/.test(text))return '키가 속한 프로젝트의 Generative Language API 활성화와 API 제한을 확인하세요.';
 if(/unrestricted/.test(text))return '제한 없는 Standard 키는 거부될 수 있습니다. AI Studio의 Auth 키 또는 Gemini API로 제한한 키를 사용하세요.';
 if(status===402)return '연결된 유료 프로젝트의 선불 잔액이 부족합니다. 무료 이용 자격과 현재 프로젝트를 확인하세요.';
 if(status===429&&/daily|per.?day|requestsperday/.test(text))return '프로젝트의 일일 요청 한도에 도달했습니다. AI Studio의 초기화 시점과 한도를 확인하세요.';
 return '';
}
async function googleDetail(response:Response,init:RequestInit){
 try{const body=JSON.parse(await limitedText(response,65536)),error=body.error;if(!error||typeof error!=='object')return;
  const headers=new Headers(init.headers),secretValues=[headers.get('x-goog-api-key'),headers.get('Authorization')].filter((s):s is string=>!!s);const clean=(value:unknown)=>typeof value==='string'&&/^([A-Z][A-Z0-9_]{0,79}|[a-z][a-z0-9_]{0,79})$/.test(value)&&!secretValues.some(secret=>value.includes(secret))?value:'';
  let message=typeof error.message==='string'?error.message:'';
  for(const value of [headers.get('x-goog-api-key'),headers.get('Authorization')])if(value){for(const secret of [value,value.replace(/^Bearer\s+/i,'')])if(secret)message=message.split(secret).join('[키 숨김]').split(encodeURIComponent(secret)).join('[키 숨김]');}
  message=message.replace(/AIza[A-Za-z0-9_-]{15,}/g,'[키 숨김]').replace(/([?&]key=)[^&\s]+/gi,'$1[키 숨김]').replace(/Bearer\s+[^\s"']+/gi,'Bearer [키 숨김]').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,800);
  return {code:clean(error.status)||clean(error.code),reason:clean(Array.isArray(error.details)?error.details.find((d:unknown)=>d&&typeof d==='object'&&'reason' in d)?.reason:undefined),message};
 }catch{return undefined;}
}
export const wait=(ms:number,signal?:AbortSignal)=>new Promise<void>((resolve,reject)=>{if(signal?.aborted)return reject(signal.reason);const timer=setTimeout(done,ms);function done(){signal?.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timer);reject(signal?.reason);}signal?.addEventListener('abort',abort,{once:true});});
export class NetworkFailure extends Error {
 constructor(public kind:'timeout'|'dns'|'tls'|'proxy'|'refused'|'reset'|'unknown',provider:string,public code='',timeoutMs=25000){
  const messages={timeout:code?'네트워크 연결 또는 응답 대기 중 시간 초과가 발생했습니다. 연결 상태를 확인한 뒤 다시 실행하세요.':`${timeoutMs/1000}초 안에 응답을 받지 못했습니다. 서버 지연 또는 연결 상태를 확인한 뒤 다시 실행하세요.`,dns:'서버 주소를 찾지 못했습니다. DNS·인터넷 연결을 확인하세요.',tls:'보안 연결 인증서 확인에 실패했습니다. 기기 시간·VPN·보안 프록시 설정을 확인하세요.',proxy:'프록시 연결에 실패했습니다. 시스템 프록시·VPN 설정을 확인하세요.',refused:'서버 연결이 거부되었습니다. 방화벽·프록시 설정을 확인하세요.',reset:'응답을 받는 중 연결이 끊겼습니다. 연결 상태를 확인한 뒤 다시 실행하세요.',unknown:'서버에 연결하지 못했습니다. 인터넷·시스템 프록시·VPN 상태를 확인하세요.'};
  super(`${provider}: ${kind==='timeout'?'응답 시간 초과':'연결 실패'} · ${messages[kind]}${code?' ('+code+')':''}`);
 }
}
const codes={ENOTFOUND:'dns',EAI_AGAIN:'dns',ERR_NAME_NOT_RESOLVED:'dns',CERT_HAS_EXPIRED:'tls',CERT_NOT_YET_VALID:'tls',UNABLE_TO_VERIFY_LEAF_SIGNATURE:'tls',UNABLE_TO_GET_ISSUER_CERT_LOCALLY:'tls',DEPTH_ZERO_SELF_SIGNED_CERT:'tls',SELF_SIGNED_CERT_IN_CHAIN:'tls',ERR_CERT_AUTHORITY_INVALID:'tls',ERR_CERT_DATE_INVALID:'tls',ERR_CERT_COMMON_NAME_INVALID:'tls',ERR_PROXY_CONNECTION_FAILED:'proxy',ERR_TUNNEL_CONNECTION_FAILED:'proxy',ECONNREFUSED:'refused',ERR_CONNECTION_REFUSED:'refused',ECONNRESET:'reset',EPIPE:'reset',UND_ERR_SOCKET:'reset',ERR_CONNECTION_RESET:'reset',ERR_CONNECTION_CLOSED:'reset',ETIMEDOUT:'timeout',UND_ERR_CONNECT_TIMEOUT:'timeout',UND_ERR_HEADERS_TIMEOUT:'timeout',UND_ERR_BODY_TIMEOUT:'timeout',ERR_TIMED_OUT:'timeout',ERR_CONNECTION_TIMED_OUT:'timeout'} as const;
function connectionFailure(error:unknown,provider:string,ms:number):NetworkFailure{
 const pending:unknown[]=[error];for(let n=0;pending.length&&n<12;n++){
  const e=pending.shift() as {code?:string;message?:string;cause?:unknown;errors?:unknown[]};if(!e||typeof e!=='object')continue;
  for(const [code,kind] of Object.entries(codes))if(e.code===code||typeof e.message==='string'&&new RegExp('\\b'+code+'\\b').test(e.message))return new NetworkFailure(kind,provider,code,ms);
  if(e.cause)pending.push(e.cause);if(Array.isArray(e.errors))pending.push(...e.errors);
 }return new NetworkFailure('unknown',provider);
}
export interface RequestPolicy {timeoutMs?:number;maxAttempts?:number;}
export class Network {
 private last=new Map<string,number>();
 constructor(private send:Transport=transport,private sleep=wait,private deadline=(ms:number)=>AbortSignal.timeout(ms)){}
 private async timed<T>(provider:string,signal:AbortSignal|undefined,policy:RequestPolicy,action:(signal:AbortSignal)=>Promise<T>):Promise<T>{
  const ms=policy.timeoutMs??25000,timer=this.deadline(ms),combined=signal?AbortSignal.any([signal,timer]):timer;
  try{combined.throwIfAborted();return await action(combined);}catch(error){if(signal?.aborted)throw signal.reason;if(timer.aborted)throw new NetworkFailure('timeout',provider,'',ms);throw error;}
 }
 async page(raw:string,signal:AbortSignal):Promise<{html:string;url:string}>{return this.timed('원문 수집',signal,{timeoutMs:45000},async combined=>{
  let url=publicNaverUrl(raw);
  for(let n=0;n<6;n++){
   combined.throwIfAborted();let response:Response;try{response=await this.send(url,{redirect:'manual',signal:combined,headers:{Accept:'text/html,application/xhtml+xml'}});}catch(e){combined.throwIfAborted();throw connectionFailure(e,'원문 수집',45000);}
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw Error('원문 이동 주소가 없습니다.');url=publicNaverUrl(new URL(location,url).href);continue;}
   if(!response.ok){await response.body?.cancel();throw new ApiError(response.status,'원문 수집');}
   const type=response.headers.get('content-type')||'';if(type&&!/html|text/i.test(type)){await response.body?.cancel();throw Error('원문이 HTML 페이지가 아닙니다.');}
   const reader=response.body?.getReader(),chunks:Uint8Array[]=[];let size=0;if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8_000_000){await reader.cancel();throw Error('원문 HTML이 8MB 제한을 초과했습니다.');}chunks.push(value);}combined.throwIfAborted();
   return {html:decodeHtml(Buffer.concat(chunks),type),url};
  }throw Error('원문 주소 이동이 너무 많습니다.');
 });}
 async request(url:string,init:RequestInit={},provider='API',signal?:AbortSignal,policy:RequestPolicy={}):Promise<Response>{return this.timed(provider,signal,policy,s=>this.perform(url,init,provider,s,policy.timeoutMs??25000,policy.maxAttempts??4));}
 private async perform(url:string,init:RequestInit,provider:string,signal:AbortSignal,ms:number,maxAttempts=4):Promise<Response>{
  for(let attempt=0;attempt<maxAttempts;attempt++){
   signal.throwIfAborted();let response:Response;const host=new URL(url).hostname;
   if(this.send===transport){const delay=Math.max(0,650-(Date.now()-(this.last.get(host)||0)));if(delay)await this.sleep(delay,signal);this.last.set(host,Date.now());}
   try{response=await this.send(url,{...init,redirect:'manual',signal});}catch(error){signal.throwIfAborted();throw connectionFailure(error,provider,ms);}
   if(((response.status===429&&!['OpenAI','Gemini'].includes(provider))||response.status>=500)&&attempt<maxAttempts-1){const retry=response.headers.get('retry-after');const seconds=retry?(Number.isFinite(Number(retry))?Number(retry):Math.max(0,(Date.parse(retry)-Date.now())/1000)):2**attempt;
    if(seconds>60)throw new ApiError(response.status,provider);await response.body?.cancel();await this.sleep(Math.max(0,seconds)*1000,signal);continue;}
   if(!response.ok){const detail=provider==='Gemini'?await googleDetail(response,init):undefined;await response.body?.cancel().catch(()=>{});throw new ApiError(response.status,provider,detail);}return response;
  }throw Error('재시도 한도');
 }
 async json(url:string,init:RequestInit={},provider='API',signal?:AbortSignal,policy:RequestPolicy={}):Promise<any>{return this.timed(provider,signal,policy,async s=>{
  const response=await this.perform(url,init,provider,s,policy.timeoutMs??25000,policy.maxAttempts??4);let text:string;
  try{text=await limitedText(response,8_000_000);}catch(error){s.throwIfAborted();if((error as Error).message==='응답 크기 제한 초과')throw Error(`${provider}: 응답 크기 제한을 넘었습니다.`);throw connectionFailure(error,provider,policy.timeoutMs??25000);}
  s.throwIfAborted();try{return JSON.parse(text);}catch{throw Error(`${provider}: 유효한 JSON 응답이 아닙니다.`);}
 });}
}
export async function limitedText(response:Response,max=2_000_000){const reader=response.body?.getReader();if(!reader)return '';let total=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw Error('응답 크기 제한 초과');}chunks.push(value);}return Buffer.concat(chunks).toString('utf8');}
