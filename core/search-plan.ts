import {plan,type Expr} from './query.js';
export function browserQueries(expression:string){const parsed=plan(expression);let overflow=false;
 function clauses(e:Expr,neg=false):string[][]{if(e.op==='term')return neg?[[]]:[[e.value]];if(e.op==='not')return clauses(e.child,!neg);const a=clauses(e.left,neg),b=clauses(e.right,neg);if((e.op==='and')!==neg){if(a.length*b.length>32){overflow=true;return [[]];}return a.flatMap(x=>b.map(y=>[...new Set([...x,...y])]))}if(a.length+b.length>32){overflow=true;return [[]];}return [...a,...b];}
 const combinations=clauses(parsed.expression);const queries=overflow||combinations.some(c=>!c.length)?parsed.queries:combinations.map(c=>c.map(t=>'"'+t.replaceAll('"','')+'"').join(' '));return [...new Set(queries)];}
