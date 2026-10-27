import { EnvHttpProxyAgent, fetch as proxyFetch } from 'undici';
const dispatcher=new EnvHttpProxyAgent();
export type Transport=(url:string,init?:RequestInit)=>Promise<Response>;
const transport:Transport=async(url,init)=>await proxyFetch(url,{...init,dispatcher} as Parameters<typeof proxyFetch>[1]) as unknown as Response;
export class ApiError extends Error{
 constructor(public status:number,public provider:string){
  const message=provider==='OpenAI'&&status===401?'Secret Key 전체값과 키의 활성 상태를 확인하세요. Tracking ID는 인증에 사용할 수 없습니다.':provider==='OpenAI'&&status===429?'API 계정의 사용 한도·잔액을 확인한 뒤 다시 실행하세요.':provider==='Gemini'&&status===404?'요청한 Gemini 모델을 찾을 수 없습니다. 설정의 AI 모델을 gemini-flash-latest로 변경하세요. 무료 한도 초과를 뜻하는 오류는 아닙니다.':status===400?'요청 형식 또는 모델 설정을 확인하세요.':status===404?'요청한 모델이나 API 경로를 찾을 수 없습니다.':status===401?'등록한 인증정보를 확인하세요.':status===403?'해당 상품·모델의 사용 권한을 확인하세요.':status===429?'요청 한도에 도달했습니다. 잠시 후 다시 실행하세요.':status>=500?'제공자 일시 오류입니다. 잠시 후 다시 실행하세요.':'요청 조건을 확인하세요.';
  super(`${provider} (${status}): ${message}`);
 }
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
export interface RequestPolicy {timeoutMs?:number;}
export class Network {
 private last=new Map<string,number>();
 constructor(private send:Transport=transport,private sleep=wait,private deadline=(ms:number)=>AbortSignal.timeout(ms)){}
 private async timed<T>(provider:string,signal:AbortSignal|undefined,policy:RequestPolicy,action:(signal:AbortSignal)=>Promise<T>):Promise<T>{
  const ms=policy.timeoutMs??25000,timer=this.deadline(ms),combined=signal?AbortSignal.any([signal,timer]):timer;
  try{combined.throwIfAborted();return await action(combined);}catch(error){if(signal?.aborted)throw signal.reason;if(timer.aborted)throw new NetworkFailure('timeout',provider,'',ms);throw error;}
 }
 async request(url:string,init:RequestInit={},provider='API',signal?:AbortSignal,policy:RequestPolicy={}):Promise<Response>{return this.timed(provider,signal,policy,s=>this.perform(url,init,provider,s,policy.timeoutMs??25000));}
 private async perform(url:string,init:RequestInit,provider:string,signal:AbortSignal,ms:number):Promise<Response>{
  for(let attempt=0;attempt<4;attempt++){
   signal.throwIfAborted();let response:Response;const host=new URL(url).hostname;
   if(this.send===transport){const delay=Math.max(0,650-(Date.now()-(this.last.get(host)||0)));if(delay)await this.sleep(delay,signal);this.last.set(host,Date.now());}
   try{response=await this.send(url,{...init,redirect:'manual',signal});}catch(error){signal.throwIfAborted();throw connectionFailure(error,provider,ms);}
   if(((response.status===429&&!['OpenAI','Gemini'].includes(provider))||response.status>=500)&&attempt<3){const retry=response.headers.get('retry-after');const seconds=retry?(Number.isFinite(Number(retry))?Number(retry):Math.max(0,(Date.parse(retry)-Date.now())/1000)):2**attempt;
    if(seconds>60)throw new ApiError(response.status,provider);await response.body?.cancel();await this.sleep(Math.max(0,seconds)*1000,signal);continue;}
   if(!response.ok){await response.body?.cancel();throw new ApiError(response.status,provider);}return response;
  }throw Error('재시도 한도');
 }
 async json(url:string,init:RequestInit={},provider='API',signal?:AbortSignal,policy:RequestPolicy={}):Promise<any>{return this.timed(provider,signal,policy,async s=>{
  const response=await this.perform(url,init,provider,s,policy.timeoutMs??25000);let text:string;
  try{text=await limitedText(response,8_000_000);}catch(error){s.throwIfAborted();if((error as Error).message==='응답 크기 제한 초과')throw Error(`${provider}: 응답 크기 제한을 넘었습니다.`);throw connectionFailure(error,provider,policy.timeoutMs??25000);}
  s.throwIfAborted();try{return JSON.parse(text);}catch{throw Error(`${provider}: 유효한 JSON 응답이 아닙니다.`);}
 });}
}
export async function limitedText(response:Response,max=2_000_000){const reader=response.body?.getReader();if(!reader)return '';let total=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw Error('응답 크기 제한 초과');}chunks.push(value);}return Buffer.concat(chunks).toString('utf8');}
