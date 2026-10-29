export interface BrowserPageSnapshot {address:string;gate:string;html:string;acted:boolean;branches:string[];pending:boolean;bottom:boolean;}
export function redditPageScript(mode:'google'|'reddit',act=false){return `(${readBrowserPage.toString()})(${JSON.stringify(mode)},${act})`;}
/** Read rendered content only. Never reads credentials or clicks login/consent/security controls. */
function readBrowserPage(mode:'google'|'reddit',act:boolean):BrowserPageSnapshot {
 const address=location.href,body=document.body?.innerText||'',visible=(el:Element)=>{const style=getComputedStyle(el),rect=el.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;};
 const all=(selector:string,root:Document|Element|ShadowRoot=document):Element[]=>{const result=Array.from(root.querySelectorAll(selector));if(root instanceof Element&&root.shadowRoot)result.push(...all(selector,root.shadowRoot));for(const el of root.querySelectorAll('*'))if(el.shadowRoot)result.push(...all(selector,el.shadowRoot));return result;};
 const posts=all('shreddit-post,article[data-post-id],.thing.link,[data-testid="post-container"]'),hasContent=mode==='google'?!!document.querySelector('#search h3,#rso h3'):posts.length>0;
 let gate='';
 if(location.hostname==='consent.google.com'||/Before you continue to Google|Google을 사용하기 전에/.test(body)&&!hasContent)gate='Google 동의 화면을 브라우저에서 확인하세요.';
 else if(/accounts\.google\.com|accounts\.reddit\.com/.test(location.hostname)||/^\/(?:login|register)(?:\/|$)/.test(location.pathname))gate='브라우저에서 로그인을 완료하세요.';
 else if(all('form[action*="sorry"],#captcha,#captcha-form,.g-recaptcha,iframe[src*="recaptcha"],iframe[src*="hcaptcha"],iframe[src*="challenges.cloudflare"],input[name="captcha"]').some(visible)||!hasContent&&body.length<7000&&/unusual traffic|verify (?:that )?you are human|blocked by network security|비정상적인 트래픽|사람인지 확인|자동입력 방지|보안 확인/i.test(body))gate='브라우저의 보안 확인을 직접 완료하세요.';
 else if(all('[role="dialog"],dialog[open]').some(el=>visible(el)&&(/log in to continue|sign in to continue|로그인.*계속|are you over 18|confirm your age|연령 확인/i.test(el.textContent||'')||!!el.querySelector('input[type="password"]'))))gate='브라우저에 표시된 로그인·확인 절차를 직접 완료하세요.';
 if(gate)return {address,gate,html:'',acted:false,branches:[],pending:true,bottom:false};
 const clone=(node:Node):Node=>{if(node.nodeType!==1)return node.cloneNode(false);const el=node as Element;if(el.matches('script,style,noscript,input,textarea,form,[contenteditable="true"],shreddit-composer,faceplate-textarea-input'))return document.createTextNode('');const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden')return document.createTextNode('');const copy=el.cloneNode(false) as Element;for(const child of el.childNodes)copy.append(clone(child));if(el.shadowRoot){const shadow=document.createElement('div');shadow.setAttribute('data-open-shadow','');for(const child of el.shadowRoot.childNodes)shadow.append(clone(child));copy.append(shadow);}return copy;};
 const selected=mode==='google'?Array.from(document.querySelectorAll('#search,#rso,a#pnnext,a[rel="next"],a[aria-label="Next"],a[aria-label="다음"]')):[...posts,...all('shreddit-comment-tree,.commentarea,[data-comment-tree]')];
 const roots=selected.filter((el,i)=>!selected.some((parent,j)=>j!==i&&parent.contains(el))),holder=document.createElement('div');for(const root of roots)holder.append(clone(root));
 if(mode==='google'&&!roots.length&&/did not match any documents|No results found|검색결과를 찾을 수 없|검색 결과가 없습니다/.test(body))holder.textContent=body.slice(0,4000);
 const html='<html><body>'+holder.innerHTML+'</body></html>';
 const trees=all('shreddit-comment-tree,.commentarea,[data-comment-tree]'),branches:string[]=[],buttons:Element[]=[];
 if(mode==='reddit'){
  const scopes=[...trees,...posts];for(const root of scopes)for(const el of all('button,a,summary',root)){if(!visible(el)||el.hasAttribute('disabled')||el.getAttribute('aria-disabled')==='true')continue;const label=(el.textContent||'').replace(/\s+/g,' ').trim(),aria=el.getAttribute('aria-label')||'',text=(label+' '+aria).trim();
   if(/log.?in|sign.?in|register|sign.?up|verify|captcha|accept|agree|consent|confirm|nsfw|mature|age.?restricted|over 18|성인|연령|가입|로그인|인증|동의|확인|신고|삭제|등록|쓰기/i.test(text))continue;
   if(el.tagName==='A'&&/continue this thread|view (?:the )?(?:full|entire) discussion|more comments|이 스레드 계속/i.test(text)){try{const u=new URL(el.getAttribute('href')||'',address);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['www.reddit.com','reddit.com','old.reddit.com','new.reddit.com'].includes(u.hostname)&&/\/comments\//.test(u.pathname))branches.push(u.href);}catch{}continue;}
   const closedSummary=el.tagName==='SUMMARY'&&!el.closest('details')?.hasAttribute('open');
   if(el.getAttribute('aria-expanded')==='true'||/collapse|show less|접기/i.test(text))continue;
   const readMore=/^(?:read more|show more(?: comments| replies)?|load more(?: comments| replies)?|more comments|view more comments|show more comments|more replies|view replies|show replies|view [\d,]+ (?:more )?repl(?:y|ies)|show [\d,]+ (?:more )?repl(?:y|ies)|\d+ more repl(?:y|ies)|\d+ more comments|continue thread|더 보기|댓글 더보기|답글 더보기)$/i.test(label)||/expand comment|expand thread|show more replies|load more comments/i.test(aria)||el.matches('a.expand')&&label==='[+]'||closedSummary;
   if(readMore)buttons.push(el);
  }
 }
 let acted=false;if(act&&buttons.length){for(const el of buttons){const key=body.slice(-1200)+'|'+(el.textContent||'');if(el.getAttribute('data-studio-expanded')===key)continue;el.setAttribute('data-studio-expanded',key);(el as HTMLElement).scrollIntoView({block:'center'});(el as HTMLElement).click();acted=true;break;}}
 const bottom=innerHeight+scrollY>=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-20;if(mode==='reddit'&&act&&!acted&&!bottom)scrollBy(0,Math.min(innerHeight,1000));
 return {address,gate:'',html,acted,branches:[...new Set(branches)],pending:buttons.length>0,bottom};
}
