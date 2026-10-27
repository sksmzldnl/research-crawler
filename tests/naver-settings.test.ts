import {it,expect,vi} from 'vitest';
import {Store} from '../core/store.js';
import {Service} from '../core/service.js';
import {MemoryVault} from '../core/vault.js';
import {Network} from '../core/network.js';
import {naverHubUrl,naverLegacyUrl} from '../core/naver-connection.js';
import type {Bundle,Research} from '../core/types.js';

it('upgrades blank 0.5.0 defaults to functional Hub settings without losing credentials or collected data',async()=>{
 const store=new Store(':memory:'),vault=new MemoryVault();
 const send=vi.fn(async(_url:string,_init?:RequestInit)=>new Response(JSON.stringify({total:0,items:[]})));
 const service=new Service(store,vault,new Network(send));
 try{
  vault.set('naverId','fixture-id');vault.set('naverSecret','fixture-secret');
  store.saveSettings({...store.settings(),naverUrl:'',naverAuth:'naver'});
  const imported=await service.call('import.save',{name:'기존 자료',kind:'csv',text:'title,text,custom\n제목,본문,keep'}) as {id:string};
  const records=store.records(imported.id);
  expect(service.state().settings.naverAuth).toBe('gateway');
  await service.call('settings.save',{...service.state().settings,naverType:'cafearticle'});
  expect(service.state().settings).toMatchObject({naverAuth:'gateway',naverUrl:'',naverType:'cafearticle'});
  expect(service.state().credentials).toMatchObject({naverId:true,naverSecret:true});
  expect(JSON.stringify(service.state())).not.toContain('fixture-secret');
  await service.call('connection.test','naver');
  const [address,request]=send.mock.calls[0];
  expect(new URL(address).pathname).toBe('/search/v1/cafearticle');
  expect(new URL(address).hostname).toBe('naverapihub.apigw.ntruss.com');
  expect(request?.headers).toMatchObject({'x-ncp-apigw-api-key-id':'fixture-id','x-ncp-apigw-api-key':'fixture-secret'});
  expect(store.records(imported.id)).toEqual(records);

  store.saveSettings({...store.settings(),naverUrl:naverLegacyUrl,naverAuth:'naver'});
  await service.call('connection.test','naver');
  expect(send).toHaveBeenCalledTimes(2);
  expect(new URL(send.mock.calls[1][0]).hostname).toBe('openapi.naver.com');
  expect(new URL(send.mock.calls[1][0]).pathname).toBe('/v1/search/cafearticle.json');
  expect(store.records(imported.id)).toEqual(records);
 }finally{service.close();store.close();}
});

it('replaces old editable Hub addresses with the automatic preset, including on settings save',async()=>{
 const store=new Store(':memory:'),service=new Service(store,new MemoryVault());
 try{
  store.saveSettings({...store.settings(),naverUrl:'https://old.apigw.ntruss.com/blog',naverAuth:'gateway',naverType:'webkr'});
  expect(store.settings()).toMatchObject({naverUrl:'',naverAuth:'gateway',naverType:'webkr'});
  await service.call('settings.save',{...store.settings(),naverUrl:'https://console.ncloud.com/old-setting'});
  expect(service.state().settings).toMatchObject({naverUrl:'',naverAuth:'gateway',naverType:'webkr'});
 }finally{service.close();store.close();}
});

it('runs a Hub bundle across two pages, filters ads, resumes its cursor after key rotation, and exports without secrets or AI',async()=>{
 const store=new Store(':memory:'),vault=new MemoryVault();vault.set('naverId','fixture-id');vault.set('naverSecret','fixture-old-secret');
 const first={link:'https://example.com/first',title:'<b>A</b> B first',description:'A B first experience',postdate:'20261001'};
 const ad={link:'https://example.com/ad',title:'A B 협찬',description:'A B 제공받음',postdate:'20261001'};
 const send=vi.fn(async(url:string,init?:RequestInit)=>{
  const parsed=new URL(url),headers=new Headers(init?.headers);
  expect(parsed.hostname).toBe('naverapihub.apigw.ntruss.com');expect(parsed.pathname).toBe('/search/v1/blog');expect(parsed.searchParams.get('query')).toBe('"A" "B"');
  if(parsed.searchParams.get('start')==='1')return new Response(JSON.stringify({total:101,items:[first,...Array.from({length:99},()=>ad)]}));
  if(headers.get('x-ncp-apigw-api-key')==='fixture-old-secret')return new Response('{}',{status:401});
  return new Response(JSON.stringify({total:101,items:[{link:'https://example.com/second',title:'A B second',description:'A B second experience',postdate:'20261002'}]}));
 });
 const service=new Service(store,vault,new Network(send));
 try{
  const b=store.list<Bundle>('bundles')[0];store.put('bundles',{...b,expression:'A AND B'});
  const r=await service.call('search.start',{name:'네이버 자동 검색',engines:['naver'],bundleIds:[b.id],sites:[],target:2,pages:2,startDate:'',endDate:'',includeUnknownDate:true,removeAds:true,fetchOriginal:false}) as Research;
  await service.idle();
  expect(store.research(r.id)?.status).toBe('paused');expect(store.records(r.id)).toHaveLength(2);expect(store.research(r.id)?.valid).toBe(1);
  expect(store.research(r.id)?.apiSearch?.apiOptions).toMatchObject({naverUrl:naverHubUrl,naverAuth:'gateway'});
  await service.call('credential.set',{name:'naverSecret',value:'fixture-new-secret'});
  await service.call('search.resume',r.id);await service.idle();
  expect(store.research(r.id)).toMatchObject({status:'completed',valid:2,excluded:1,processed:2});
  expect(send.mock.calls.map(([url])=>new URL(url).searchParams.get('start'))).toEqual(['1','101','101']);
  expect(store.records(r.id).every(row=>row.source_platform==='naver_blog'&&!row.ai_provider)).toBe(true);
  const exported=await service.call('export',{researchId:r.id,scope:'all',format:'csv',korean:false,bom:true}) as {data:string};
  const csv=Buffer.from(exported.data,'base64').toString();expect(csv).toContain('A B first experience');expect(csv).toContain('A B second experience');expect(csv).toContain('협찬');
  for(const secret of ['fixture-id','fixture-old-secret','fixture-new-secret']){expect(csv).not.toContain(secret);expect(JSON.stringify(service.state())).not.toContain(secret);}
 }finally{service.close();await service.idle();store.close();}
});
