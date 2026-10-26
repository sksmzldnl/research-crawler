import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
if(Number(process.versions.node.split('.')[0])<24)throw Error('Node.js 24 이상이 필요합니다. https://nodejs.org/에서 LTS 버전을 설치해 주세요.');
mkdirSync('.local',{recursive:true});
for(const args of [['ci'],['run','build'],['test']]){const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:'inherit',shell:process.platform==='win32',env:process.env});if(result.status!==0)process.exit(result.status||1);}
console.log('설치·빌드·테스트 완료. 개발용: npm run dev / 설치형 앱 실행: npm run desktop');
