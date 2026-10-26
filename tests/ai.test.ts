import {it,expect,vi} from 'vitest';
import {AI} from '../core/ai.js';
import {Network} from '../core/network.js';
import {MemoryVault} from '../core/vault.js';
const value={translation:'재사용 경험',summary:'용기가 불편함',categories:['페인 포인트'],pain_point:'',improvement_request:'',user_behavior:'',workaround:'',sentiment:'중립',relevance_score:.8,relevance_reason:'원문',evidence:['불편'],advertisement:false};
function setup(result:unknown,finish='stop'){const send=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)},finish_reason:finish}],usage:{prompt_tokens:15,completion_tokens:20}})));const v=new MemoryVault();v.set('openaiKey','fake-secret');return {ai:new AI(new Network(send),v),send};}
it('uses strict structured output and validates source evidence',async()=>{const {ai,send}=setup(value);const r=await ai.analyze('재사용 불편 경험','openai','gpt-example');expect(r.results).toHaveLength(1);expect(r.input).toBe(15);expect(JSON.parse((send.mock.calls[0] as any)[1].body).response_format.json_schema.strict).toBe(true);});
it('rejects invented evidence and invalid schema',async()=>{await expect(setup({...value,evidence:['없는 말']}).ai.analyze('재사용 불편','openai','x')).rejects.toThrow(/인용/);await expect(setup({...value,relevance_score:50}).ai.analyze('불편','openai','x')).rejects.toThrow();});
it('rejects truncated or refused output',async()=>{await expect(setup(value,'length').ai.analyze('불편','openai','x')).rejects.toThrow(/길이/);});
it('retains complete chunk text for reconstruction',async()=>{const text='불편'.repeat(4000);const r=await setup(value).ai.analyze(text,'openai','x');expect(r.chunks.join('')).toBe(text);expect(r.results).toHaveLength(2);expect(r.output).toBe(40);});
it('accepts semantic duplicates only with valid IDs and verbatim evidence from both records',async()=>{const value={duplicate_id:'r1',reason:'같은 경험',current_evidence:'불편',previous_evidence:'어렵다'};const r=await setup(value).ai.semanticDuplicate('사용이 불편',[{id:'r1',text:'같은 제품이 어렵다'}],'openai','x');expect(r.duplicate_id).toBe('r1');await expect(setup({...value,duplicate_id:'unknown'}).ai.semanticDuplicate('불편',[{id:'r1',text:'어렵다'}],'openai','x')).rejects.toThrow(/근거/);});
