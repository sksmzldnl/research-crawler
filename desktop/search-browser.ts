import {BrowserWindow,session} from 'electron';
import {searchUrl,readSearchDocument,type BrowserSearch,type SearchEngine,type SearchPage} from '../core/search-page.js';
import {wait} from '../core/network.js';
export class SearchBrowser implements BrowserSearch {
 private window?:BrowserWindow;private last='';private configured=false;
 async search(engine:SearchEngine,query:string,page:number,signal:AbortSignal):Promise<SearchPage>{
  signal.throwIfAborted();const url=searchUrl(engine,query,page);
  if(!this.window||this.window.isDestroyed()){
   const browserSession=session.fromPartition('studio-search');
   if(!this.configured){browserSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));browserSession.setPermissionCheckHandler(()=>false);browserSession.on('will-download',event=>event.preventDefault());const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;if(proxy)await browserSession.setProxy({proxyRules:proxy});this.configured=true;}
   this.window=new BrowserWindow({width:1100,height:780,title:'ZeroWaste · 검색 수집 창',webPreferences:{session:browserSession,nodeIntegration:false,contextIsolation:true,sandbox:true}});
   this.window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
   const allowed=(raw:string)=>{try{const u=new URL(raw);return u.protocol==='https:'&&['search.naver.com','search.daum.net','www.bing.com','www.google.com','consent.google.com'].includes(u.hostname)&&!u.username&&!u.password;}catch{return false;}};
   this.window.webContents.on('will-navigate',(event,to)=>{if(!allowed(to))event.preventDefault();});
   this.window.webContents.on('will-redirect',(event,to)=>{if(!allowed(to))event.preventDefault();});
   this.window.on('closed',()=>{this.window=undefined;this.last='';});this.last='';
  }
  const window=this.window;const abort=()=>{if(!window.isDestroyed())window.webContents.stop();};signal.addEventListener('abort',abort,{once:true});
  try{
   if(this.last!==url){let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([window.loadURL(url),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(Error('검색 페이지 로딩 시간 초과 · 재개할 수 있습니다.'));if(!window.isDestroyed())window.webContents.stop();},30000);timer.unref();})]);this.last=url;}finally{if(timer)clearTimeout(timer);}}
   for(let i=0;i<16;i++){signal.throwIfAborted();if(window.isDestroyed())throw Error('검색 창이 닫혔습니다. 재개하면 다시 엽니다.');const result=await window.webContents.executeJavaScript(`(${readSearchDocument.toString()})(document,${JSON.stringify(engine)},location.href)`);
    if(result.items.length||!result.blocked||!result.blocked.includes('구조'))return result;await wait(500,signal);
   }
   return {items:[],next:false,blocked:'검색 결과를 읽지 못했습니다. 검색 창에서 오류·접근 제한·페이지 구조를 확인한 뒤 재개하세요.'};
  }finally{signal.removeEventListener('abort',abort);}
 }
 show(){if(this.window&&!this.window.isDestroyed())this.window.show();}
 close(){this.window?.destroy();this.window=undefined;this.last='';}
}
