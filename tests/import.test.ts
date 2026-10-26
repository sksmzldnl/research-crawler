import {it,expect,vi} from 'vitest';
import {parseCsv,prepareImport} from '../core/import.js';
import {Store} from '../core/store.js';
import {MemoryVault} from '../core/vault.js';
import {Network} from '../core/network.js';
import {Service} from '../core/service.js';
it('parses BOM, commas, quotes, multiline cells, semicolon and TSV; rejects malformed files',()=>{
 expect(parseCsv('\uFEFFtitle,text\r\na,"Hello, ""world""\nnext"\r\n').rows).toEqual([['a','Hello, "world"\nnext']]);
 expect(parseCsv('a;b\nx;y').rows).toEqual([['x','y']]);expect(parseCsv('a\tb\nx\ty').delimiter).toBe('\t');
 for(const bad of ['a,a\nx,y','a,b\nx','a,b\nx,"oops','a,b\nx,"a"oops'])expect(()=>parseCsv(bad)).toThrow();
});
it('imports and exports arbitrary CSV columns, flags duplicates, preserves unknown dates with zero network',async()=>{
 const send=vi.fn(async()=>{throw Error('No external calls');}),s=new Store(':memory:'),service=new Service(s,new MemoryVault(),new Network(send));
 const r=await service.call('import.save',{name:'오프라인',kind:'csv',text:'title,text,custom\nA,"hello, world",=1+1\nB,"hello, world",keep\nC,,empty'}) as {id:string};
 const rows=s.records(r.id);expect(rows).toHaveLength(3);expect(rows[1].duplicate_flag).toBe(true);expect(rows[2].review_status).toBe('excluded');expect(rows[0].published_at).toBeNull();expect(rows[0].imported_fields?.custom).toBe('=1+1');
 const file=await service.call('export',{researchId:r.id,scope:'all',format:'csv',korean:false,bom:true}) as {data:string};const exported=parseCsv(Buffer.from(file.data,'base64').toString());expect(exported.header).toContain('original_column:custom');expect(exported.rows[0][exported.header.indexOf('original_column:custom')]).toBe("'=1+1");expect(send).not.toHaveBeenCalled();service.close();s.close();
});
it('AI requires consent; processes only selected rows; translation never changes source or unselected rows',async()=>{
 const send=vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({translation:'안녕하세요'})}}],usage:{prompt_tokens:2,completion_tokens:3}})));
 const s=new Store(':memory:'),v=new MemoryVault();v.set('openaiKey','fixture');const service=new Service(s,v,new Network(send));const r=await service.call('import.save',{name:'선택 번역',kind:'csv',text:'text\nhello\nbye'}) as {id:string};const rows=s.records(r.id),args={researchId:r.id,ids:[rows[0].record_id],task:'translate',provider:'openai',model:'fixture'};
 await expect(service.call('ai.process',args)).rejects.toThrow(/동의/);s.saveSettings({...s.settings(),consentAi:true});await service.call('ai.process',args);await service.idle();expect(send).toHaveBeenCalledTimes(1);expect(s.records(r.id)[0].korean_full_translation).toBe('안녕하세요');expect(s.records(r.id)[0].original_full_text).toBe('hello');expect(s.records(r.id)[1].korean_full_translation).toBe('');expect(service.state().localJob?.processed).toBe(1);service.close();s.close();
});
it('Gemini CSV organization validates evidence; preserves source; continues past failed rows',async()=>{
 const analysis={translation:'unused',summary:'용기 세척 문제',categories:['페인 포인트'],pain_point:'세척 불편',improvement_request:'',user_behavior:'',workaround:'',sentiment:'부정',relevance_score:.9,relevance_reason:'본문',evidence:['hard to wash'],advertisement:false};
 const send=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(analysis)}]}}],usageMetadata:{promptTokenCount:2,candidatesTokenCount:3}}))).mockResolvedValueOnce(new Response('{}',{status:401}));
 const s=new Store(':memory:'),v=new MemoryVault();v.set('geminiKey','fixture');const service=new Service(s,v,new Network(send));s.saveSettings({...s.settings(),consentAi:true});const r=await service.call('import.save',{name:'정리',kind:'csv',text:'text\nhard to wash\nsecond'}) as {id:string};await service.call('ai.process',{researchId:r.id,ids:s.records(r.id).map(r=>r.record_id),task:'organize',provider:'gemini',model:'fixture'});await service.idle();const rows=s.records(r.id);expect(rows[0].korean_summary).toBe(analysis.summary);expect(rows[0].korean_full_translation).toBe('');expect(rows[1].ai_error).toContain('401');expect(service.state().localJob?.failed).toBe(1);expect(String(send.mock.calls[0][0])).toContain('generativelanguage.googleapis.com');service.close();s.close();
});
it('URL and RSS collection never calls search or AI; RSS remains snippet-only',async()=>{
 const send=vi.fn(async()=>new Response('<rss><channel><item><title>후기</title><link>https://8.8.8.8/post</link><description>재사용 불편</description></item></channel></rss>'));
 const s=new Store(':memory:'),service=new Service(s,new MemoryVault(),new Network(send));await service.call('collect.start',{name:'피드',kind:'rss',urls:['https://8.8.8.8/feed']});await service.idle();expect(send).toHaveBeenCalledTimes(1);expect(s.list<any>('records')[0].content_status).toBe('snippet_only');expect(s.list<any>('records')[0].ai_provider).toBe('');
 await service.call('collect.start',{name:'내부 주소',kind:'url',urls:['https://127.0.0.1/x']});await service.idle();expect(send).toHaveBeenCalledTimes(1);expect(service.state().localJob?.failed).toBe(1);service.close();s.close();
});
it('extracts only allowed public HTML after robots check and reports blocked sites',async()=>{
 const send=vi.fn(async(url:string)=>url.endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):new Response('<html><head><title>Public experience</title></head><body><article><h1>Public experience</h1><p>'+('A reusable cup can be hard to wash. '.repeat(12))+'</p></article></body></html>',{headers:{'Content-Type':'text/html'}}));
 const s=new Store(':memory:'),service=new Service(s,new MemoryVault(),new Network(send));s.saveSettings({...s.settings(),originalAllowedHosts:['8.8.8.8']});await service.call('collect.start',{name:'공개 URL',kind:'url',urls:['https://8.8.8.8/post']});await service.idle();expect(send).toHaveBeenCalledTimes(2);expect(String(send.mock.calls[0][0])).toContain('/robots.txt');expect(s.list<any>('records')[0].original_full_text).toContain('hard to wash');expect(s.list<any>('records')[0].source_platform).toBe('url');service.close();s.close();
});
it('cancellation keeps finished AI rows and does not start remaining requests',async()=>{
 let service:Service;const send=vi.fn(async()=>{queueMicrotask(()=>service.workspace.cancel());return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"translation":"번역"}'}}]}));});const s=new Store(':memory:'),v=new MemoryVault();v.set('openaiKey','fixture');service=new Service(s,v,new Network(send));s.saveSettings({...s.settings(),consentAi:true});const r=await service.call('import.save',{name:'중지',kind:'csv',text:'text\nfirst\nsecond'}) as {id:string};await service.call('ai.process',{researchId:r.id,ids:s.records(r.id).map(r=>r.record_id),provider:'openai',task:'translate',model:'fixture'});await service.idle();expect(send).toHaveBeenCalledTimes(1);expect(service.state().localJob?.status).toBe('cancelled');expect(s.records(r.id)[1].korean_full_translation).toBe('');service.close();s.close();
});
