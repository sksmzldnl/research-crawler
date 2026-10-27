import { EnvHttpProxyAgent, fetch as proxyFetch } from 'undici';
const dispatcher=new EnvHttpProxyAgent();
export type Transport=(url:string,init?:RequestInit)=>Promise<Response>;
const transport:Transport=async(url,init)=>await proxyFetch(url,{...init,dispatcher} as Parameters<typeof proxyFetch>[1]) as unknown as Response;
export class ApiError extends Error{
 constructor(public status:number,public provider:string){
  const message=provider==='OpenAI'&&status===401?'Secret Key 전체값과 키의 활성 상태를 확인하세요. Tracking ID는 인증에 사용할 수 없습니다.':provider==='OpenAI'&&status===429?'API 계정의 사용 한도·잔액을 확인한 뒤 다시 실행하세요.':status===401?'등록한 인증정보를 확인하세요.':status===403?'해당 상품·모델의 사용 권한을 확인하세요.':status===429?'요청 한도에 도달했습니다. 잠시 후 다시 실행하세요.':status>=500?'제공자 일시 오류입니다. 잠시 후 다시 실행하세요.':'요청 조건을 확인하세요.';
  super(`${provider} (${status}): ${message}`);
 }
}
export const wait=(ms:number,signal?:AbortSignal)=>new Promise<void>((resolve,reject)=>{if(signal?.aborted)return reject(signal.reason);const timer=setTimeout(done,ms);function done(){signal?.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timer);reject(signal?.reason);}signal?.addEventListener('abort',abort,{once:true});});
export class Network {
  private last=new Map<string,number>();
  constructor(private send:Transport=transport,private sleep=wait){}
  async request(url:string,init:RequestInit={},provider='API',signal?:AbortSignal):Promise<Response>{
    for(let attempt=0;attempt<4;attempt++){
      signal?.throwIfAborted();let response:Response;
      const host=new URL(url).hostname;if(this.send===transport){const delay=Math.max(0,650-(Date.now()-(this.last.get(host)||0)));if(delay)await this.sleep(delay,signal);this.last.set(host,Date.now());}
      try{response=await this.send(url,{...init,redirect:'manual',signal:AbortSignal.any([AbortSignal.timeout(25000),...signal?[signal]:[]])});}catch(e){if(signal?.aborted)throw e;throw Error(`${provider}: 연결 실패 또는 25초 시간 초과. 네트워크 정책·인터넷 연결을 확인해 주세요.`);}
      if(((response.status===429&&!['OpenAI','Gemini'].includes(provider))||response.status>=500)&&attempt<3){const retry=response.headers.get('retry-after');const seconds=retry?(Number.isFinite(Number(retry))?Number(retry):Math.max(0,(Date.parse(retry)-Date.now())/1000)):2**attempt;
        // Do not retry earlier than Retry-After. Long waits are resumable failures.
        if(seconds>60)throw Error(`${provider}: ${Math.ceil(seconds)}초 뒤 재시도할 수 있습니다. 잠시 후 재개하세요.`);await response.body?.cancel();await this.sleep(Math.max(0,seconds)*1000,signal);continue;}
      if(!response.ok){await response.body?.cancel();throw new ApiError(response.status,provider);}return response;
    }throw Error('재시도 한도');
  }
  async json(url:string,init:RequestInit={},provider='API',signal?:AbortSignal):Promise<any>{const response=await this.request(url,init,provider,signal);try{return JSON.parse(await limitedText(response,8_000_000));}catch{throw Error(`${provider}: 유효한 JSON 응답이 아니거나 응답 크기 제한을 넘었습니다.`);}}
}
export async function limitedText(response:Response,max=2_000_000){const reader=response.body?.getReader();if(!reader)return '';let total=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw Error('응답 크기 제한 초과');}chunks.push(value);}return Buffer.concat(chunks).toString('utf8');}
