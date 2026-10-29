import {it,expect,vi} from 'vitest';
import {SearchApi} from '../core/search-api.js';
import {Network} from '../core/network.js';
import {MemoryVault} from '../core/vault.js';
import {naverEndpoint} from '../core/naver-connection.js';
const vault=()=>{const v=new MemoryVault();v.set('naverId','id');v.set('naverSecret','secret');return v;};
it.each(['blog','cafearticle'] as const)('uses fixed Hub endpoint, two headers and real start cursor for %s',async type=>{
 const send=vi.fn(async()=>new Response(JSON.stringify({total:150,items:Array.from({length:100},(_,i)=>({link:'https://example.com/'+i,title:'<b>사용</b> 후기',description:'<script>bad()</script>세척 불편',postdate:'20261001'}))})));
 const api=new SearchApi(new Network(send),vault()),page=await api.search(type,'재사용 AND 후기',1,new AbortController().signal);
 const [url,init]=send.mock.calls[0] as unknown as [string,RequestInit];const u=new URL(url);expect(u.origin+u.pathname).toBe('https://naverapihub.apigw.ntruss.com/search/v1/'+type);expect(Object.fromEntries(u.searchParams)).toEqual({query:'재사용 AND 후기',display:'100',start:'1',sort:'date',format:'json'});expect(new Headers(init.headers).get('x-ncp-apigw-api-key-id')).toBe('id');expect(new Headers(init.headers).get('x-ncp-apigw-api-key')).toBe('secret');expect(page.next).toBe(101);expect(page.items[0]).toMatchObject({title:'사용 후기',text:'세척 불편',date:'2026-10-01T00:00:00+09:00'});
});
it('rejects removed scope, missing keys and invalid cursor without a request',async()=>{const send=vi.fn();const api=new SearchApi(new Network(send),vault());expect(()=>naverEndpoint('webkr' as any)).toThrow();await expect(api.search('blog','x',1001,new AbortController().signal)).rejects.toThrow();expect(()=>new SearchApi(new Network(send),new MemoryVault()).validate()).toThrow(/Client ID/);expect(send).not.toHaveBeenCalled();});
it('handles short pages, malformed responses and authentication errors explicitly',async()=>{
 const send=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({total:2,items:[{link:'http://example.com',title:'x'}]}))).mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response('{}',{status:401}));const api=new SearchApi(new Network(send),vault());expect((await api.search('blog','x',1,new AbortController().signal)).next).toBeNull();await expect(api.search('blog','x',1,new AbortController().signal)).rejects.toThrow(/응답 형식/);await expect(api.search('blog','x',1,new AbortController().signal)).rejects.toThrow(/401/);
});
