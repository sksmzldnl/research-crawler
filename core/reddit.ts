import {JSDOM} from 'jsdom';
import {Network,wait} from './network.js';
import {attachComments,type CollectedComment} from './comments.js';
import {htmlContent} from './html-content.js';
import type {Original} from './original.js';
import type {Vault} from './vault.js';

const agent='desktop:org.zerowaste.listeningstudio:0.10.0 (read-only; github.com/sksmzldnl/research-crawler)';
export function redditArticle(raw:string){const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||u.port||u.username||u.password||!['reddit.com','www.reddit.com','old.reddit.com','new.reddit.com','m.reddit.com','redd.it'].includes(u.hostname))throw Error('Reddit 게시글 주소를 확인하세요.');const id=u.hostname==='redd.it'?u.pathname.match(/^\/([a-z0-9]+)\/?$/i)?.[1]:u.pathname.match(/^(?:\/r\/[A-Za-z0-9_]+)?\/comments\/([a-z0-9]+)(?:\/|$)/i)?.[1];if(!id)throw Error('Reddit 게시글 주소를 확인하세요.');return {id:id.toLowerCase(),url:'https://www.reddit.com/comments/'+id.toLowerCase()+'/'};}
export function isReddit(raw:string){try{return /(^|\.)reddit\.com$|^redd\.it$/.test(new URL(raw).hostname);}catch{return false;}}
function epoch(value:unknown){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>Date.now()/1000+86400)return null;return new Date(value*1000).toISOString();}
function cleanMarkdown(value:string,removeHashtags:boolean){if(!removeHashtags)return value;return value.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g).map((part,i)=>i%2?part:part.split(/(https?:\/\/[^\s<>]+|www\.[^\s<>]+)/gi).map((chunk,j)=>j%2?chunk:chunk.replace(/(?<![\p{L}\p{M}\p{N}_/\\?=&%#＃])(?:[#＃][\p{L}\p{M}\p{N}_]+)+/gu,'')).join('')).join('');}
function redditBody(data:any,base:string,removeHashtags:boolean){const raw=typeof data.body==='string'?data.body:typeof data.selftext==='string'?data.selftext:'';const markdown=cleanMarkdown(raw,removeHashtags);let text=markdown;
 const html=data.body_html||data.selftext_html;if(typeof html==='string'&&html){const dom=new JSDOM('<textarea></textarea>');try{const area=dom.window.document.querySelector('textarea')!;area.innerHTML=html;const decoded=area.value;try{text=htmlContent(decoded,base,true,removeHashtags).text;}catch{}}finally{dom.window.close();}}
 return {text,markdown};}
export class RedditApi {
 private token?:{value:string;until:number;credentials:string};
 constructor(private net:Network,private vault:Vault,private sleep=wait){}
 validate(){if(!this.vault.get('redditClientId')||!this.vault.get('redditClientSecret'))throw Error('설정에서 승인된 Reddit 앱의 Client ID와 Client Secret을 등록하세요.');}
 invalidate(){this.token=undefined;}
 private safe(message:string){for(const name of ['redditClientId','redditClientSecret']){const value=this.vault.get(name);if(value)message=message.split(value).join('[키 숨김]').split(encodeURIComponent(value)).join('[키 숨김]');}if(this.token)message=message.split(this.token.value).join('[토큰 숨김]');return message.slice(0,1000);}
 private async access(signal:AbortSignal){this.validate();const id=this.vault.get('redditClientId'),secret=this.vault.get('redditClientSecret'),credentials=id+'\n'+secret;if(this.token?.credentials===credentials&&this.token.until>Date.now())return this.token.value;
  const data=await this.net.json('https://www.reddit.com/api/v1/access_token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded','User-Agent':agent},body:new URLSearchParams({grant_type:'client_credentials'}).toString()},'Reddit 인증',signal,{maxAttempts:1});
  if(typeof data.access_token!=='string'||!data.access_token||String(data.token_type).toLowerCase()!=='bearer'||typeof data.expires_in!=='number'||data.expires_in<=0)throw Error('Reddit 인증 토큰을 받지 못했습니다. 앱 승인 상태와 앱 유형을 확인하세요.');this.token={value:data.access_token,until:Date.now()+Math.max(0,data.expires_in-60)*1000,credentials};return data.access_token;
 }
 private async get(path:string,params:Record<string,string>,signal:AbortSignal){const url=new URL(path,'https://oauth.reddit.com');if(url.origin!=='https://oauth.reddit.com')throw Error('허용되지 않은 Reddit 요청입니다.');url.search=new URLSearchParams(params).toString();const token=await this.access(signal);try{return await this.net.json(url.href,{headers:{Authorization:'Bearer '+token,'User-Agent':agent}},'Reddit',signal);}catch(error){throw Error(this.safe((error as Error).message));}}
 async read(raw:string,_removeAds:boolean,signal:AbortSignal,removeHashtags=false,includeComments=true):Promise<Original>{const {id,url}=redditArticle(raw),response=await this.get('/comments/'+id,{raw_json:'1',limit:'500',sort:'old'},signal);
  const post=response?.[0]?.data?.children?.find((v:any)=>v.kind==='t3'&&v.data?.id===id)?.data;if(!post)throw Error('Reddit 응답에서 해당 게시글을 찾지 못했습니다.');if(post.removed_by_category||['[deleted]','[removed]'].includes(post.selftext))throw Error('삭제되거나 접근이 제한된 Reddit 원문입니다.');
  let body=redditBody(post,url,removeHashtags);if(!body.markdown.trim()){const media=typeof post.url==='string'&&/^https?:\/\//.test(post.url)?post.url:'';if(post.is_self!==false&&!media)throw Error('Reddit 본문을 읽지 못했습니다.');body={text:[String(post.title||''),media].filter(Boolean).join('\n'),markdown:[String(post.title||''),media?'[원문 미디어·링크]('+media.replaceAll(')','%29')+')':''].filter(Boolean).join('\n\n')};}
  const original:Original={url,date:epoch(post.created_utc),...body};if(!includeComments)return original;
  const comments=new Map<string,CollectedComment>(),pending=new Set<string>(),attempted=new Set<string>();let unresolved=!Array.isArray(response?.[1]?.data?.children),reason='';
  const ingest=(nodes:any[])=>{const queue=[...(Array.isArray(nodes)?nodes:[])];for(let n=0;queue.length&&n<20000;n++){const node=queue.shift(),data=node?.data;if(!data)continue;if(node.kind==='more'){if(!Array.isArray(data.children)||!data.children.length){unresolved=true;continue;}for(const child of data.children)if(typeof child==='string'&&/^[a-z0-9]+$/i.test(child)&&!comments.has(child)&&!attempted.has(child))pending.add(child);continue;}
    if(comments.size>=5000){unresolved=true;break;}if(node.kind!=='t1'||data.link_id&&data.link_id!=='t3_'+id||typeof data.id!=='string')continue;pending.delete(data.id);const parsed=redditBody(data,url,removeHashtags);if(!parsed.markdown.trim()&&!parsed.text.trim()&&!['[deleted]','[removed]'].includes(data.body))continue;
    comments.set(data.id,{id:data.id,parentId:typeof data.parent_id==='string'&&data.parent_id.startsWith('t1_')?data.parent_id.slice(3):null,author:typeof data.author==='string'?data.author:'[deleted]',date:epoch(data.created_utc),...parsed});if(data.replies?.data?.children)queue.push(...data.replies.data.children);
   }if(queue.length)unresolved=true;};
  ingest(response?.[1]?.data?.children||[]);let requests=0;
  while(pending.size&&comments.size<5000&&requests<100){signal.throwIfAborted();const batch=[...pending].slice(0,100);for(const child of batch){pending.delete(child);attempted.add(child);}try{await this.sleep(650,signal);const extra=await this.get('/api/morechildren',{api_type:'json',link_id:'t3_'+id,children:batch.join(','),sort:'old',raw_json:'1'},signal);if(extra?.json?.errors?.length||!Array.isArray(extra?.json?.data?.things))throw Error('댓글 추가 응답을 읽지 못했습니다.');ingest(extra.json.data.things);if(batch.some(child=>!comments.has(child)))unresolved=true;requests++;}catch(error){signal.throwIfAborted();unresolved=true;reason=this.safe((error as Error).message);break;}}
  if(pending.size||comments.size>=5000||requests>=100){unresolved=true;reason=reason||'댓글 수집 한도에 도달했습니다.';}
  const expected=typeof post.num_comments==='number'&&post.num_comments>=0?post.num_comments:undefined;
  if(expected!==undefined&&comments.size<expected){unresolved=true;reason=reason||'표시된 댓글 수보다 적게 받았습니다. 삭제·접근 제한 또는 추가 댓글 누락이 있을 수 있습니다.';}
  return attachComments(original,{items:[...comments.values()],expected,status:unresolved?'partial':'complete',...(unresolved?{reason:reason||'추가 댓글 일부를 읽지 못했습니다.'}:{})});
 }
}
