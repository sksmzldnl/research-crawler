import {SearchBrowser} from './search-browser.js';
import {Network} from '../core/network.js';
import { app,BrowserWindow,ipcMain,safeStorage,shell,dialog,net,protocol } from 'electron';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { dirname,join,resolve,relative,isAbsolute } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { Store } from '../core/store.js';
import { EncryptedVault,MemoryVault } from '../core/vault.js';
import { Service } from '../core/service.js';
protocol.registerSchemesAsPrivileged([{scheme:'studio',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
if(process.env.STUDIO_TEST_DATA_DIR){app.setPath('userData',process.env.STUDIO_TEST_DATA_DIR);app.setPath('sessionData',process.env.STUDIO_TEST_DATA_DIR);}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');let service:Service;
void app.whenReady().then(async()=>{
protocol.handle('studio',request=>{const u=new URL(request.url);const path=resolve(root,'dist','.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));const rel=relative(join(root,'dist'),path);if(rel.startsWith('..')||isAbsolute(rel)||u.hostname!=='app')return new Response('Forbidden',{status:403});return net.fetch(pathToFileURL(path).href);});
const data=process.env.STUDIO_TEST_DATA_DIR||app.getPath('userData');let secure=safeStorage.isEncryptionAvailable();if(process.platform==='linux'&&safeStorage.getSelectedStorageBackend()==='basic_text')secure=false;
service=new Service(new Store(join(data,'studio.sqlite')),secure?new EncryptedVault(join(data,'credentials.enc'),safeStorage):new MemoryVault(),new Network(),new SearchBrowser());
const window=new BrowserWindow({width:1440,height:960,minWidth:860,minHeight:600,title:'ZeroWaste Listening Studio',backgroundColor:'#f5f7f3',webPreferences:{preload:join(root,'build/desktop/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
window.webContents.setWindowOpenHandler(({url})=>{void open(url);return {action:'deny'};});window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('studio://app/')){event.preventDefault();void open(url);}});
async function open(raw:string){try{const u=new URL(raw);if(u.protocol==='https:'&&!u.username&&!u.password)await shell.openExternal(u.href);}catch{}}
ipcMain.handle('studio:call',async(event,method:string,args:unknown)=>{if(event.sender!==window.webContents||event.senderFrame?.url?.startsWith('studio://app/')!==true)throw Error('허용되지 않은 창');
  if(method==='backup'){const {filePath}=await dialog.showSaveDialog(window,{defaultPath:'studio-backup.sqlite',filters:[{name:'SQLite',extensions:['sqlite']}]});if(filePath)await service.store.backup(filePath);return {saved:!!filePath};}
  if(method==='export'){const result=await service.call(method,args) as {filename:string;data:string};const {filePath}=await dialog.showSaveDialog(window,{defaultPath:result.filename});if(filePath)await writeFile(filePath,Buffer.from(result.data,'base64'),{mode:0o600});return {saved:!!filePath};}
  return service.call(method,args);
});
await window.loadURL('studio://app/');window.on('closed',()=>app.quit());
let closing=false;app.on('before-quit',event=>{if(closing)return;event.preventDefault();closing=true;service.close();void service.idle().then(()=>{service.store.close();app.quit();});});app.on('window-all-closed',()=>app.quit());

}).catch((error:Error)=>{console.error("Studio startup failed:",error.message);app.exit(1);});
