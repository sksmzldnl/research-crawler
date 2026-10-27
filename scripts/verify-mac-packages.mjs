import {assertPackageIdentity} from './package-identity.mjs';
import {createRequire} from 'node:module';
import {existsSync,readFileSync,readdirSync,writeFileSync,createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
if(process.platform!=='darwin')throw Error('Run the Mac package inspection on macOS.');
const require=createRequire(import.meta.url),asar=require('@electron/asar');
const original=JSON.parse(readFileSync('package.json','utf8'));
if(original.name!=='zerowaste-listening-studio'||original.build.appId!=='org.zerowaste.listeningstudio')throw Error('Unexpected project.');

const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
for(const arch of ['x64','arm64']){
  const app=join('release',arch==='x64'?'mac':'mac-arm64','ZeroWaste Listening Studio.app');
  const binary=join(app,'Contents/MacOS/ZeroWaste Listening Studio');
  const runtimeArch=execFileSync('lipo',['-archs',binary],{encoding:'utf8'}).trim();
  if(runtimeArch!==(arch==='x64'?'x86_64':'arm64'))throw Error(`Wrong executable architecture: ${runtimeArch}`);
  const identifier=execFileSync('/usr/libexec/PlistBuddy',['-c','Print CFBundleIdentifier',join(app,'Contents/Info.plist')],{encoding:'utf8'}).trim();
  if(identifier!==original.build.appId)throw Error('Unexpected bundle identifier.');
  execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
  const archive=join(app,'Contents/Resources/app.asar');
  const pkg=JSON.parse(asar.extractFile(archive,'package.json').toString());
  assertPackageIdentity(pkg,original);
  const files=['build/desktop/main.js','build/desktop/test-api.js','build/core/engine.js','build/core/query.js','build/core/import.js','build/core/workspace.js','build/core/connectors.js','build/core/search.js','build/core/api-types.js','build/core/search-api.js','build/core/search-plan.js','build/core/export.js','build/desktop/preload.cjs','dist/index.html',...readdirSync('dist/assets').filter(n=>/\.(js|css)$/.test(n)).map(n=>'dist/assets/'+n)];
  for(const file of files)if(!asar.extractFile(archive,file).equals(readFileSync(file)))throw Error('Packaged code differs: '+file);
  const filenames=readdirSync('release').filter(n=>n.startsWith(`ZeroWaste-Listening-Studio-${pkg.version}-mac-${arch}.`) && /\.(dmg|zip)$/.test(n));
  if(filenames.length!==2)throw Error('DMG and app ZIP are both required.');
  const artifacts=[];
  for(const filename of filenames){let bytes=0;const hash=createHash('sha256');for await(const part of createReadStream(join('release',filename))){bytes+=part.length;hash.update(part);}const sha256=hash.digest('hex');writeFileSync(join('release',filename+'.sha256'),`${sha256}  ${filename}\n`);artifacts.push({filename,bytes,sha256});}
  const native=arch===process.arch;
  const manifest={product:original.build.productName,app_id:identifier,version:pkg.version,electron:original.devDependencies.electron,interface:'Unified API Workspace · Liquid Glass',implementation:'Electron + React + TypeScript + Node SQLite',source_sha:source,channel:'mac-'+arch,architecture:arch,build_host_architecture:process.arch,packaged_source_verified:true,packaged_local_import_verified:native,packaged_api_workflow_fixture_verified:native,live_search_engine_verified:false,live_verified_engines:[],signature_integrity_verified:true,packaged_demo_verified:false,same_source_api_workflow_verified_on:'darwin-'+process.arch,native_apple_silicon_execution:arch==='arm64'&&!native?'not_verified':'not_applicable',code_signed:'ad-hoc; no Developer ID or notarization',live_api_verified:false,artifacts};
  writeFileSync(join('release',`ZeroWaste-Listening-Studio-mac-${arch}-build.json`),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Verified ${arch} bundle, Liquid Glass UI assets, source identity and signature integrity. Native execution: ${native}.`);
}
