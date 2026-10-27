import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),root=dirname(require.resolve('electron/package.json')),version=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;
function ready(){try{const binary=readFileSync(join(root,'path.txt'),'utf8').trim();return readFileSync(join(root,'dist/version'),'utf8').trim().replace(/^v/,'')===version&&existsSync(join(root,'dist',binary));}catch{return false;}}
if(ready()){console.log('Electron runtime ready:',version);process.exit(0);}
const env={...process.env,...process.env.HTTPS_PROXY||process.env.HTTP_PROXY?{ELECTRON_GET_USE_PROXY:'1'}:{}};
for(let attempt=1;attempt<=3;attempt++){
 console.log(`Installing the official checksum-verified Electron runtime (${attempt}/3)...`);
 const result=spawnSync(process.execPath,['--dns-result-order=ipv4first',join(root,'install.js')],{env,stdio:'inherit',timeout:120000});
 if(result.status===0&&ready()){console.log('Electron runtime ready:',version);process.exit(0);}
 if(result.error)console.error(result.error.message);
 if(attempt<3)await new Promise(resolve=>setTimeout(resolve,attempt*2000));
}
throw Error('Electron runtime download failed after three attempts. Check runner network access; checksum and TLS verification remain enabled.');
