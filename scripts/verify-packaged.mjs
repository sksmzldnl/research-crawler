import {readdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const directory=resolve('release');
let executable;
if(process.platform==='darwin'){
 for(const folder of readdirSync(directory,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name.startsWith('mac'))){
  const apps=readdirSync(join(directory,folder.name)).filter(n=>n==='ZeroWaste Listening Studio.app');
  if(apps.length)executable=join(directory,folder.name,apps[0],'Contents','MacOS','ZeroWaste Listening Studio');
 }
}else if(process.platform==='win32')executable=join(directory,'win-unpacked','ZeroWaste Listening Studio.exe');
else executable=join(directory,'linux-unpacked','zerowaste-listening-studio');
if(!executable||!existsSync(executable))throw Error('Packaged ZeroWaste Listening Studio executable was not found.');
const result=spawnSync(process.execPath,['scripts/desktop-smoke.mjs'],{stdio:'inherit',env:{...process.env,STUDIO_EXECUTABLE_PATH:executable}});
if(result.status!==0)process.exit(result.status||1);
