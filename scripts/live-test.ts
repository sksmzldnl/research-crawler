// Optional real Naver check. Never prints credentials or source response bodies.
import {Service} from '../core/service.js';
import {Store} from '../core/store.js';
import {MemoryVault} from '../core/vault.js';
import type {Bundle} from '../core/types.js';
const vault=new MemoryVault();for(const [key,env] of Object.entries({naverId:'NAVER_CLIENT_ID',naverSecret:'NAVER_CLIENT_SECRET'}))if(process.env[env])vault.set(key,process.env[env]!);
const store=new Store(':memory:'),service=new Service(store,vault);
try{const b=store.list<Bundle>('bundles')[0];store.put('bundles',{...b,expression:'"제로웨이스트"'});const r=await service.call('search.start',{name:'네이버 실제 연결 확인',naverType:process.env.NAVER_SEARCH_TYPE||'blog',bundleIds:[b.id],target:1,pages:1,removeAds:false}) as {id:string};await service.idle();const saved=store.research(r.id)!;console.log(JSON.stringify({status:saved.status,valid:saved.valid,errors:saved.errors}));if(saved.status!=='completed')process.exitCode=1;}finally{service.close();await service.idle();store.close();}
