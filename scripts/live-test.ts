import {mkdir,writeFile} from 'node:fs/promises';
import {Store} from '../core/store.js';
import {MemoryVault} from '../core/vault.js';
import {Service} from '../core/service.js';
import {exportData} from '../core/export.js';
import type {Bundle,ResearchConfig} from '../core/types.js';
const names=['NAVER_CLIENT_ID','NAVER_CLIENT_SECRET','STUDIO_OPENAI_KEY','STUDIO_AI_MODEL'];
const missing=names.filter(n=>!process.env[n]);
if(missing.length){console.log('미검증 / SKIPPED: 개발자용 실제 API 통합 검사에 필요한 변수 없음: '+missing.join(', '));console.log('일반 사용자는 앱의 API 설정에서 키를 입력하고 실제 조사를 실행하세요.');process.exit(2);}
const store=new Store(':memory:'),vault=new MemoryVault();vault.set('naverId',process.env.NAVER_CLIENT_ID!);vault.set('naverSecret',process.env.NAVER_CLIENT_SECRET!);vault.set('openaiKey',process.env.STUDIO_OPENAI_KEY!);store.saveSettings({...store.settings(),consentAi:true});
const service=new Service(store,vault);const bundle=store.list<Bundle>('bundles')[0];store.put('bundles',{...bundle,expression:'제로웨이스트',exclusions:''});
const config:ResearchConfig={name:'실제 API 통합 검사',mode:'live',bundleIds:[bundle.id],sources:['naver_blog'],startDate:'',endDate:'',target:1,removeAds:true,deduplicate:true,semanticDedupe:false,fetchOriginal:false,ai:true,aiProvider:'openai',aiModel:process.env.STUDIO_AI_MODEL!,aiInputPrice:0,aiOutputPrice:0};
try{const r=service.engine.start(config);await service.engine.idle();const rows=store.records(r.id);const analyzed=rows.filter(x=>x.processing_status==='analyzed'&&x.mode==='live'&&x.ai_provider==='openai');if(store.research(r.id)?.status!=='completed'||!analyzed.length)throw Error('검색 → 필터 → AI 번역·요약 완료 자료가 없습니다. 키·모델·오류 상태를 앱에서 확인하세요.');await mkdir('.local/live-integration',{recursive:true});await writeFile('.local/live-integration/result.csv',await exportData(rows,{researchId:r.id,scope:'valid',format:'csv',korean:false,bom:true}),{mode:0o600});console.log(`PASS: 네이버 검색 → 로컬 정제 → OpenAI 구조화 번역 → CSV (${analyzed.length}건), .local/live-integration/result.csv`);}catch(e){console.error('FAIL:',(e as Error).message);process.exitCode=1;}finally{service.close();store.close();}
