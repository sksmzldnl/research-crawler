import type {NaverType} from './api-types.js';
const hosts=new Set(['blog.naver.com','m.blog.naver.com','cafe.naver.com','m.cafe.naver.com','kin.naver.com','m.kin.naver.com']);
export function publicNaverUrl(raw:string){const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||!hosts.has(u.hostname)||u.username||u.password||u.port)throw Error('네이버 게시글 주소를 확인하세요.');u.protocol='https:';u.hash='';return u.href;}
export function articleIdentity(raw:string){const u=new URL(publicNaverUrl(raw));return {kind:u.hostname.includes('cafe.')?'cafe':u.hostname.includes('kin.')?'kin':'blog',id:u.searchParams.get('articleid')||u.searchParams.get('articleId')||u.searchParams.get('docId')||u.searchParams.get('logNo')||u.searchParams.get('logno')||u.pathname.match(/\/(\d+)\/?$/)?.[1]||'',club:u.searchParams.get('clubid')||u.pathname.match(/\/cafes\/(\d+)\//)?.[1]||''};}
/** Blog search can include other providers. Only this app's matching Naver reader is eligible. */
export function naverResultUrl(raw:string,type:NaverType){try{const url=publicNaverUrl(raw);return articleIdentity(url).kind===(type==='cafearticle'?'cafe':type)?url:undefined;}catch{return undefined;}}
/** Identity for de-duplication only; the first discovered public URL remains the saved source URL. */
export function naverArticleKey(raw:string){
 const u=new URL(publicNaverUrl(raw)),identity=articleIdentity(u.href);u.hostname=u.hostname.replace(/^m\./,'');
 if(identity.kind==='kin'&&identity.id)return 'kin:'+identity.id;
 if(identity.kind==='blog'&&identity.id){const owner=u.searchParams.get('blogId')||u.searchParams.get('blogid')||(!/\.n(?:aver|hn)$/i.test(u.pathname)?u.pathname.split('/').filter(Boolean)[0]:'');if(owner)return 'blog:'+owner.toLowerCase()+':'+identity.id;}
 if(identity.kind==='cafe'&&identity.id){const owner=identity.club||u.pathname.match(/^\/([^/]+)\/\d+\/?$/)?.[1];if(owner)return 'cafe:'+owner+':'+identity.id;}
 u.hash='';for(const key of [...u.searchParams.keys()])if(/^(utm_|fbclid|gclid|ref$|referrer$)/i.test(key))u.searchParams.delete(key);u.searchParams.sort();u.pathname=u.pathname.replace(/\/$/,'')||'/';return u.href;
}
