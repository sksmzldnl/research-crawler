import {assertPackageIdentity} from './package-identity.mjs';
import {readFileSync,readdirSync,writeFileSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
const channel=process.argv[2];if(!/^[a-z0-9-]+$/.test(channel||''))throw Error('A safe platform channel is required.');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assertPackageIdentity(pkg,pkg);
const files=readdirSync('release').filter(n=>n.startsWith(`ZeroWaste-Listening-Studio-${pkg.version}-${channel}.`) && /\.(dmg|zip|exe)$/.test(n));
if(!files.length)throw Error('No installers for this Electron project were found.');
const artifacts=[];
for(const filename of files){const hash=createHash('sha256');let size=0;for await(const chunk of createReadStream(join('release',filename))){hash.update(chunk);size+=chunk.length;}const sha256=hash.digest('hex');writeFileSync(join('release',filename+'.sha256'),`${sha256}  ${filename}\n`);artifacts.push({filename,bytes:size,sha256});}
const manifest={product:pkg.build.productName,app_id:pkg.build.appId,implementation:'Electron + React + TypeScript + Node SQLite',version:pkg.version,electron:pkg.devDependencies.electron,source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),channel,platform:process.platform,architecture:process.arch,packaged_demo_verified:false,packaged_local_import_verified:false,packaged_api_workflow_fixture_verified:true,live_search_engine_verified:false,code_signed:false,live_api_verified:false,naver_setup:'Client ID + Client Secret; blog/cafe/kin scopes',original_archive:'Full public article + comments/replies; one file per post; MD or JSON; native folder dialog',packaged_original_archive_fixture_verified:true,popup_banner_checkbox_verified:true,hashtag_checkbox_fixture_verified:true,post_comment_archive_fixture_verified:true,naver_comment_pagination_fixture_verified:true,reddit_browser_without_api_fixture_verified:true,liquid_glass_render_fixture_verified:true,liquid_navigation_fixture_verified:true,liquid_switch_fixture_verified:true,mumsnet_browser_fixture_verified:true,mse_browser_fixture_verified:true,live_mumsnet_verified:false,live_mse_verified:false,browser_session_persistence_fixture_verified:true,security_gate_manual_resume_fixture_verified:true,publication_date_fixture_verified:true,dynamic_public_renderer_fixture_verified:true,cafe_public_response_date_fixture_verified:true,knowledge_qa_fixture_verified:true,naver_connection_check_fixture_verified:true,ms949_cafe_fulltext_date_fixture_verified:true,kin_question_publication_fixture_verified:true,live_original_pages_verified:false,naver_hub_connection:'implemented',naver_hub_workflow_fixture_verified:true,artifacts};
writeFileSync(join('release',`ZeroWaste-Listening-Studio-${channel}-build.json`),JSON.stringify(manifest,null,2)+'\n');
console.log('Recorded installer checksums and exact project identity:',channel);
