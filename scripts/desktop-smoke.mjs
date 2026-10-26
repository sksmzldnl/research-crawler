import {_electron as electron} from 'playwright';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const data=await mkdtemp(join(tmpdir(),'studio-desktop-'));
const args=process.env.STUDIO_EXECUTABLE_PATH?[]:['.'];if(process.env.STUDIO_DESKTOP_HEADLESS==='1')args.unshift('--no-sandbox','--ozone-platform=headless','--disable-gpu');
let app;
try{
 app=await electron.launch({executablePath:process.env.STUDIO_EXECUTABLE_PATH||undefined,args,timeout:20000,env:{...process.env,STUDIO_TEST_DATA_DIR:data}});const win=await app.firstWindow();await win.getByRole('heading',{name:'경험을 듣고, 변화를 설계하세요.'}).waitFor();assert.equal(await win.evaluate(()=>typeof window.studio?.call),'function');
 await win.getByRole('button',{name:'새 조사 시작',exact:false}).click();await win.getByRole('button',{name:'데모 조사 시작 →',exact:true}).click();await win.getByText('저장 완료',{exact:true}).waitFor({timeout:15000});
 const result=await win.evaluate(async()=>{const s=await window.studio.call('state');return {valid:s.researches[0].valid,excluded:s.researches[0].excluded,records:s.records.length};});assert.deepEqual(result,{valid:7,excluded:5,records:12});
 await mkdir('test-results',{recursive:true});await win.evaluate(()=>{window.scrollTo(0,0);document.activeElement?.blur();});await win.screenshot({path:'test-results/desktop.png'});console.log('PASS: Electron window + sandboxed preload + IPC + SQLite demo (12 records, 7 valid, 5 excluded).');
}finally{if(app)await app.close();await rm(data,{recursive:true,force:true,maxRetries:10,retryDelay:200});}
