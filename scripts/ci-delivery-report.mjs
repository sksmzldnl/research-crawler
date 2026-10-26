import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const [channel,state]=process.argv.slice(2);if(!/^[a-z0-9-]+$/.test(channel||'')||!['success','failure','cancelled'].includes(state))throw Error('Invalid delivery report arguments.');
const run=process.env.GITHUB_RUN_ID,attempt=process.env.GITHUB_RUN_ATTEMPT||'1',sha=process.env.GITHUB_SHA,repo=process.env.GITHUB_REPOSITORY;
if(!/^\d+$/.test(run||'')||!/^\d+$/.test(attempt)||!/^\w[\w.-]*\/\w[\w.-]*$/.test(repo||'')||!/^\w{40}$/.test(sha||''))throw Error('GitHub CI metadata required.');
const report={product:'ZeroWaste Listening Studio',implementation:'Electron',state,channel,source_sha:sha,run_id:run,run_url:`https://github.com/${repo}/actions/runs/${run}`,updated_at:new Date().toISOString(),release_url:channel==='publish'&&state==='success'?`https://github.com/${repo}/releases/tag/listening-studio-electron-${sha.slice(0,12)}`:null,log_tail:existsSync('.local/ci-step.log')?readFileSync('.local/ci-step.log','utf8').split('\n').slice(-180).join('\n').slice(-32000):''};
mkdirSync('.ci-delivery',{recursive:true});const file=`.ci-delivery/${channel}.json`;writeFileSync(file,JSON.stringify(report,null,2)+'\n');
execFileSync('git',['add','--',file],{stdio:'inherit'});execFileSync('git',['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','--only','-m',`Report Electron delivery ${channel}: ${state}`,'--',file],{stdio:'inherit'});
execFileSync('git',['push','origin',`HEAD:refs/heads/codex/studio-delivery-${run}-${attempt}-${channel}`],{stdio:'inherit'});
