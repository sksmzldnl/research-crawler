import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import type {Vault} from './vault.js';
import { Network } from './network.js';
export class RedditOAuth {
  private server?:Server;private timer?:NodeJS.Timeout;
  constructor(private net:Network,private vault:Vault){}
  async begin(clientId:string){if(!/^[A-Za-z0-9_-]{5,100}$/.test(clientId))throw Error('Reddit installed app의 Client ID를 입력해 주세요.');this.close();const state=randomBytes(32).toString('hex'),redirect='http://127.0.0.1:48732/callback';
    this.server=createServer(async(req,res)=>{const u=new URL(req.url||'/',redirect);if(u.pathname!=='/callback'||u.searchParams.get('state')!==state){res.writeHead(400);res.end('Invalid OAuth state');return;}try{const code=u.searchParams.get('code');if(!code)throw Error('OAuth 승인이 취소되었습니다.');const data=await this.net.json('https://www.reddit.com/api/v1/access_token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(clientId+':').toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:redirect}).toString()},'Reddit OAuth');if(!data.access_token)throw Error('토큰이 없습니다.');this.vault.set('redditAccess',data.access_token);if(data.refresh_token)this.vault.set('redditRefresh',data.refresh_token);res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Content-Security-Policy':"default-src 'none'"});res.end('인증되었습니다. Studio로 돌아가 주세요.');}catch{res.writeHead(400);res.end('OAuth failed. Check application settings and API approval.');}finally{this.close();}});
    await new Promise<void>((resolve,reject)=>{this.server!.once('error',reject);this.server!.listen(48732,'127.0.0.1',()=>resolve());});this.timer=setTimeout(()=>this.close(),300000);this.timer.unref();return 'https://www.reddit.com/api/v1/authorize?'+new URLSearchParams({client_id:clientId,response_type:'code',state,redirect_uri:redirect,duration:'permanent',scope:'read identity'}).toString();
  }
  close(){if(this.timer)clearTimeout(this.timer);this.server?.close();this.server=undefined;}
}
