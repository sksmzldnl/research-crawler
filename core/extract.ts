import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
const robotsParser=createRequire(import.meta.url)('robots-parser') as (url:string,text:string)=>{isAllowed(url:string,ua:string):boolean|undefined;getCrawlDelay(ua:string):number|undefined};
import { Network, safeUrl, limitedText, wait } from './network.js';
import { anonymize } from './connectors.js';
import { normalizedDate } from './quality.js';
export async function extract(raw:string,allowedHosts:string[],net:Network,signal?:AbortSignal){
  const u=await safeUrl(raw);if(!allowedHosts.includes(u.hostname))throw Error('원문 저장 허용 목록에 없는 도메인 · 스니펫 유지');
  // Redirects are never followed automatically: prevents private-network redirects and login bypass.
  const robotsUrl=new URL('/robots.txt',u.origin).href;const rules=await limitedText(await net.request(robotsUrl,{},'robots.txt',signal),500_000);
  const robots=robotsParser(robotsUrl,rules);if(robots.isAllowed(u.href,'ZeroWasteListeningStudio')===false)throw Error('robots.txt에서 원문 수집 금지');
  const delay=robots.getCrawlDelay('ZeroWasteListeningStudio')||0;if(delay>60)throw Error('사이트의 긴 Crawl-delay · 이번에는 스니펫만 보존');if(delay>0)await wait(delay*1000,signal);
  const response=await net.request(u.href,{headers:{'User-Agent':'ZeroWasteListeningStudio/0.1 (user research)'}},'원문',signal);if(!response.headers.get('content-type')?.includes('text/html'))throw Error('HTML 원문이 아님');
  const doc=new JSDOM(await limitedText(response),{url:u.href}).window.document;
  if(doc.querySelector('input[type="password"]')||doc.querySelector('meta[name="robots"][content*="noarchive"]'))throw Error('로그인 또는 저장 제한 문서');
  const date=normalizedDate(doc.querySelector('meta[property="article:published_time"],meta[name="datePublished"]')?.getAttribute('content'));
  const parsed=new Readability(doc).parse();if(!parsed?.textContent||parsed.textContent.trim().length<100)throw Error('공개 본문을 확인할 수 없음');return {title:anonymize(parsed.title||doc.title||u.hostname),text:anonymize(parsed.textContent.trim()),date};
}
