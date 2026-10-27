import {readFileSync,readdirSync,writeFileSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
const channel=process.argv[2];if(!/^[a-z0-9-]+$/.test(channel||''))throw Error('A safe platform channel is required.');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
if(pkg.name!=='zerowaste-listening-studio'||pkg.build.appId!=='org.zerowaste.listeningstudio'||pkg.main!=='build/desktop/main.js')throw Error('Unexpected project identity.');
const files=readdirSync('release').filter(n=>n.startsWith(`ZeroWaste-Listening-Studio-${pkg.version}-${channel}.`) && /\.(dmg|zip|exe)$/.test(n));
if(!files.length)throw Error('No installers for this Electron project were found.');
const artifacts=[];
for(const filename of files){const hash=createHash('sha256');let size=0;for await(const chunk of createReadStream(join('release',filename))){hash.update(chunk);size+=chunk.length;}const sha256=hash.digest('hex');writeFileSync(join('release',filename+'.sha256'),`${sha256}  ${filename}\n`);artifacts.push({filename,bytes:size,sha256});}
const manifest={product:pkg.build.productName,app_id:pkg.build.appId,implementation:'Electron + React + TypeScript + Node SQLite',version:pkg.version,electron:pkg.devDependencies.electron,source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),channel,platform:process.platform,architecture:process.arch,packaged_demo_verified:false,packaged_local_import_verified:true,packaged_api_workflow_fixture_verified:true,live_search_engine_verified:false,code_signed:false,live_api_verified:false,artifacts};
writeFileSync(join('release',`ZeroWaste-Listening-Studio-${channel}-build.json`),JSON.stringify(manifest,null,2)+'\n');
console.log('Recorded installer checksums and exact project identity:',channel);
