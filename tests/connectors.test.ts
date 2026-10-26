import {describe,it,expect,vi} from 'vitest';
import {Network,ApiError,publicAddress,safeUrl} from '../core/network.js';
import {Connectors} from '../core/connectors.js';
import {MemoryVault} from '../core/vault.js';
import {defaultSettings} from '../core/store.js';
const json=(body:unknown,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json',...headers}});
describe('provider contracts (fixtures, no live claims)',()=>{
 it('blocks all search API providers without a request',async()=>{const send=vi.fn();const c=new Connectors(new Network(send),new MemoryVault(),()=>defaultSettings);for(const source of ['naver_blog','daum_blog','reddit'] as const)await expect(c.search(source,'test')).rejects.toThrow(/검색 API/);expect(send).not.toHaveBeenCalled();});
 it('reports 401 without leaking response contents or secrets',async()=>{const n=new Network(async()=>json({secret:'sensitive provider body'},401));await expect(n.json('https://api.example.com',{},'test')).rejects.toThrow('HTTP 401');});
 it('honors Retry-After and retries transient failures',async()=>{const send=vi.fn().mockResolvedValueOnce(json({},429,{'retry-after':'2'})).mockResolvedValueOnce(json({ok:true}));const sleep=vi.fn(async()=>{});const n=new Network(send,sleep);expect(await n.json('https://api.example.com')).toEqual({ok:true});expect(sleep).toHaveBeenCalledWith(2000,undefined);expect(send).toHaveBeenCalledTimes(2);});
 it('does not retry earlier than a long Retry-After',async()=>{const send=vi.fn(async()=>json({},429,{'retry-after':'120'}));await expect(new Network(send).json('https://api.example.com')).rejects.toThrow('120초');expect(send).toHaveBeenCalledTimes(1);});
 it('blocks redirects and internal address fetching',async()=>{await expect(new Network(async()=>new Response('',{status:302,headers:{Location:'http://127.0.0.1'}})).request('https://api.example.com')).rejects.toBeInstanceOf(ApiError);for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','::1','::ffff:127.0.0.1','fc00::1'])expect(publicAddress(ip)).toBe(false);expect(publicAddress('8.8.8.8')).toBe(true);await expect(safeUrl('https://127.0.0.1/')).rejects.toThrow();await expect(safeUrl('https://user:pass@example.com')).rejects.toThrow();await expect(safeUrl('file:///etc/passwd')).rejects.toThrow();});
});
