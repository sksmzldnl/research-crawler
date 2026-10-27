import {it,expect,vi} from 'vitest';
import {Store} from '../core/store.js';
import {Service} from '../core/service.js';
import {MemoryVault} from '../core/vault.js';
import {Network} from '../core/network.js';
import {naverHubPending} from '../core/naver-connection.js';

it('migrates unused 0.5.0 Naver defaults to Hub mode while preserving keys, data and saved legacy connections',async()=>{
 const store=new Store(':memory:'),vault=new MemoryVault();
 const send=vi.fn(async()=>new Response(JSON.stringify({total:0,items:[]})));
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
  await expect(service.call('connection.test','naver')).rejects.toThrow(naverHubPending);
  expect(send).not.toHaveBeenCalled();
  expect(store.records(imported.id)).toEqual(records);

  // Existing working legacy settings remain usable after migration, without
  // changing the user's encrypted credentials or collecting into old records.
  store.saveSettings({...store.settings(),naverUrl:'https://openapi.naver.com/v1/search/{type}.json',naverAuth:'naver'});
  await service.call('connection.test','naver');
  expect(send).toHaveBeenCalledOnce();
  expect(new URL(send.mock.calls[0][0] as unknown as string).pathname).toBe('/v1/search/cafearticle.json');
  expect(store.records(imported.id)).toEqual(records);
 }finally{service.close();store.close();}
});

it('preserves an already configured Hub address when loading saved settings',()=>{
 const store=new Store(':memory:');
 try{
  const settings={...store.settings(),naverUrl:'https://fixture.apigw.ntruss.com/{type}',naverAuth:'gateway' as const};
  store.saveSettings(settings);
  expect(store.settings()).toEqual(settings);
 }finally{store.close();}
});
