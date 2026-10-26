import { EnvHttpProxyAgent, fetch as proxyFetch } from 'undici';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
const dispatcher=new EnvHttpProxyAgent();
export type Transport=(url:string,init?:RequestInit)=>Promise<Response>;
const transport:Transport=async(url,init)=>await proxyFetch(url,{...init,dispatcher} as Parameters<typeof proxyFetch>[1]) as unknown as Response;
export class ApiError extends Error{constructor(public status:number,public provider:string){super(`${provider}: HTTP ${status} · ${status===401?'API 키 또는 인증 만료':status===403?'권한·승인 또는 네트워크 정책 확인':status===429?'요청 한도 초과':status>=500?'제공자 일시 오류':'요청 조건 확인'}`);}}
export const wait=(ms:number,signal?:AbortSignal)=>new Promise<void>((resolve,reject)=>{if(signal?.aborted)return reject(signal.reason);const timer=setTimeout(done,ms);function done(){signal?.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timer);reject(signal?.reason);}signal?.addEventListener('abort',abort,{once:true});});
export class Network {
  private last=new Map<string,number>();
  constructor(private send:Transport=transport,private sleep=wait){}
  async request(url:string,init:RequestInit={},provider='API',signal?:AbortSignal):Promise<Response>{
    for(let attempt=0;attempt<4;attempt++){
      signal?.throwIfAborted();let response:Response;
      const host=new URL(url).hostname;if(this.send===transport){const delay=Math.max(0,650-(Date.now()-(this.last.get(host)||0)));if(delay)await this.sleep(delay,signal);this.last.set(host,Date.now());}
      try{response=await this.send(url,{...init,redirect:'manual',signal:AbortSignal.any([AbortSignal.timeout(25000),...signal?[signal]:[]])});}catch(e){if(signal?.aborted)throw e;throw Error(`${provider}: 연결 실패 또는 25초 시간 초과. 네트워크 정책·인터넷 연결을 확인해 주세요.`);}
      if((response.status===429||response.status>=500)&&attempt<3){const retry=response.headers.get('retry-after');const seconds=retry?(Number.isFinite(Number(retry))?Number(retry):Math.max(0,(Date.parse(retry)-Date.now())/1000)):2**attempt;
        // Do not retry earlier than Retry-After. Long waits are resumable failures.
        if(seconds>60)throw Error(`${provider}: ${Math.ceil(seconds)}초 뒤 재시도할 수 있습니다. 잠시 후 재개하세요.`);await response.body?.cancel();await this.sleep(Math.max(0,seconds)*1000,signal);continue;}
      if(!response.ok){await response.body?.cancel();throw new ApiError(response.status,provider);}return response;
    }throw Error('재시도 한도');
  }
  async json(url:string,init:RequestInit={},provider='API',signal?:AbortSignal):Promise<any>{const response=await this.request(url,init,provider,signal);try{return JSON.parse(await limitedText(response,8_000_000));}catch{throw Error(`${provider}: 유효한 JSON 응답이 아니거나 응답 크기 제한을 넘었습니다.`);}}
}
export function publicAddress(ip:string):boolean {if(isIP(ip)===4){const p=ip.split('.').map(Number);return !(p[0]===0||p[0]===10||p[0]===127||p[0]>=224||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&(p[1]===168||p[1]===0))||(p[0]===100&&p[1]>=64&&p[1]<=127)||(p[0]===198&&(p[1]===18||p[1]===19)));}if(isIP(ip)===6){const s=ip.toLowerCase();return !s.startsWith('::')&&!/^(fc|fd|fe[89ab]|ff)/.test(s);}return false;}
export async function safeUrl(raw:string){let u:URL;try{u=new URL(raw);}catch{throw Error('올바른 HTTPS URL을 입력해 주세요.');}if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443'))throw Error('인증정보 없는 HTTPS 주소(443)만 허용합니다.');const host=u.hostname.replace(/^\[|\]$/g,'');if(/(^|\.)(localhost|local|internal)$/i.test(host))throw Error('내부 주소는 허용하지 않습니다.');const addresses=isIP(host)?[{address:host}]:await lookup(host,{all:true});if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('사설·로컬·메타데이터 주소는 접근할 수 없습니다.');return u;}
export async function limitedText(response:Response,max=2_000_000){const reader=response.body?.getReader();if(!reader)return '';let total=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw Error('문서 크기 제한 2 MB 초과');}chunks.push(value);}return Buffer.concat(chunks).toString('utf8');}
