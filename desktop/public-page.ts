import {BrowserWindow,session} from 'electron';
import {OriginalReader,extractOriginal,type OriginalSource} from '../core/original.js';
import {publicNaverUrl} from '../core/original-url.js';
import {Network,wait} from '../core/network.js';
// Ephemeral, isolated renderer for public posts that render their body with JavaScript.
// It never shares the user's browser login or asks for credentials.
export class DesktopOriginalReader implements OriginalSource{
 constructor(private net:Network){}
 async read(url:string,removeAds:boolean,signal:AbortSignal){
  try{return await new OriginalReader(this.net).read(url,removeAds,signal);}catch(error){signal.throwIfAborted();if(!String((error as Error).message).includes('공개 본문을 찾지'))throw error;}
  const safe=publicNaverUrl(url),partition='public-original-reader',isolated=session.fromPartition(partition);isolated.setPermissionRequestHandler((_w,_p,callback)=>callback(false));isolated.setPermissionCheckHandler(()=>false);
  const win=new BrowserWindow({show:false,webPreferences:{partition,sandbox:true,nodeIntegration:false,contextIsolation:true,webSecurity:true}});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,raw)=>{try{publicNaverUrl(raw);}catch{e.preventDefault();}});
  const onDownload=(event:Electron.Event)=>event.preventDefault();isolated.on('will-download',onDownload);
  const abort=()=>{if(!win.isDestroyed())win.destroy();};signal.addEventListener('abort',abort,{once:true});const timeout=setTimeout(abort,45000);
  try{await win.loadURL(safe);const until=Date.now()+30000;
   while(Date.now()<until&&!win.isDestroyed()){
    signal.throwIfAborted();for(const frame of win.webContents.mainFrame.framesInSubtree){try{const frameUrl=publicNaverUrl(frame.url);const html=await frame.executeJavaScript(`document.querySelector('.se-main-container, #postViewArea, .post-view, .se_doc_viewer, .ContentRenderer, .article_viewer, .NHN_Writeform_Main, #tbody') ? document.documentElement.outerHTML : ''`);if(typeof html==='string'&&html)return extractOriginal(html,frameUrl,removeAds);}catch(error){signal.throwIfAborted();}}
    await wait(500,signal);
   }throw Error('공개 본문을 읽지 못했습니다. 로그인·카페 가입이 필요한 글 또는 페이지 로딩 제한을 확인하세요.');
  }finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);isolated.removeListener('will-download',onDownload);if(!win.isDestroyed())win.destroy();await isolated.clearStorageData();}
 }
}
