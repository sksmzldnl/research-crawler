import {describe,it,expect} from 'vitest';
import {parse,matches,plan,terms} from '../core/query.js';
describe('Boolean queries',()=>{
 it('respects precedence, quoted phrases, Korean, exclusions and nested negation',()=>{const q=parse('(제로웨이스트 OR "zero waste") AND (불편 OR 후기) NOT 광고');expect(matches(q,'zero waste 사용 후기')).toBe(true);expect(matches(q,'제로웨이스트 후기 광고')).toBe(false);expect(matches(q,'제로웨이스트')).toBe(false);expect(matches(parse('A OR B AND C'),'a')).toBe(true);expect(matches(parse('NOT NOT A'),'a')).toBe(true);});
 it.each(['','A AND','(A OR B','A )','"unfinished','A OR OR B'])('rejects invalid expression %s',q=>expect(()=>parse(q)).toThrow());
 it('requires a positive anchor in every OR branch',()=>{expect(()=>plan('A OR NOT B')).toThrow(/분기/);expect(()=>plan('NOT (A AND B)')).toThrow();expect(plan('A AND NOT (B OR C)').queries).toEqual(['A']);expect(plan('NOT NOT A').queries).toEqual(['A']);});
 it('compiles a superset and checks full logic locally',()=>{expect(plan('(A OR B) AND C NOT D').queries).toEqual(['A','B','C']);expect(terms(parse('A AND NOT B'))).toEqual(['A']);});
});
