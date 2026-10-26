export type Expr = {op:'term';value:string}|{op:'not';child:Expr}|{op:'and'|'or';left:Expr;right:Expr};
export function tokenize(input:string):string[] {
  const tokens:string[]=[]; let i=0;
  while(i<input.length){ if(/\s/.test(input[i])){i++;continue;} if('()'.includes(input[i])){tokens.push(input[i++]);continue;} if(input[i]==='"'){let end=input.indexOf('"',i+1);if(end<0)throw Error('따옴표를 닫아 주세요.');const v=input.slice(i,end+1);if(v==='""')throw Error('빈 검색어는 사용할 수 없습니다.');tokens.push(v);i=end+1;continue;}
    let j=i;while(j<input.length&&!/[\s()"]/.test(input[j]))j++;if(j===i)throw Error('검색식을 확인해 주세요.');tokens.push(input.slice(i,j));i=j;
  }return tokens;
}
export function parse(input:string):Expr {
  const t=tokenize(input);let p=0;if(t.length>160)throw Error('검색식은 160개 토큰 이하로 나눠 주세요.');
  function primary():Expr{const v=t[p++];if(!v)throw Error('검색어가 빠졌습니다.');if(v==='NOT')return {op:'not',child:primary()};if(v==='('){const e=or();if(t[p++]!==')')throw Error('괄호를 닫아 주세요.');return e;}if(['AND','OR',')'].includes(v))throw Error(`검색어 위치에 ${v}가 있습니다.`);return {op:'term',value:v.replace(/^"|"$/g,'')};}
  function and():Expr{let e=primary();while(p<t.length&&t[p]!==')'&&t[p]!=='OR'){if(t[p]==='AND')p++;e={op:'and',left:e,right:primary()};}return e;}
  function or():Expr{let e=and();while(t[p]==='OR'){p++;e={op:'or',left:e,right:and()};}return e;}
  if(!t.length)throw Error('검색식을 입력해 주세요.');const e=or();if(p!==t.length)throw Error('괄호와 연산자 위치를 확인해 주세요.');return e;
}
export function matches(e:Expr,text:string):boolean{const s=text.normalize('NFKC').toLocaleLowerCase();if(e.op==='term')return s.includes(e.value.normalize('NFKC').toLocaleLowerCase());if(e.op==='not')return !matches(e.child,s);if(e.op==='and')return matches(e.left,s)&&matches(e.right,s);return matches(e.left,s)||matches(e.right,s);}
export function terms(e:Expr,negative=false):string[]{if(e.op==='term')return negative?[]:[e.value];if(e.op==='not')return terms(e.child,!negative);return [...new Set([...terms(e.left,negative),...terms(e.right,negative)])];}
// Searching each positive term is a safe superset even for nested OR/NOT. Always apply the full AST locally.
export function plan(input:string):{queries:string[];expression:Expr;notice:string}{const expression=parse(input);const queries=terms(expression);
  function anchored(e:Expr,neg=false):boolean{if(e.op==='term')return !neg;if(e.op==='not')return anchored(e.child,!neg);const a=anchored(e.left,neg),b=anchored(e.right,neg);return (e.op==='and')!==neg?a||b:a&&b;}
  if(!queries.length||!anchored(expression))throw Error('각 OR 분기에는 긍정 검색어가 필요합니다. 예: A OR NOT B 대신 A AND NOT B를 사용하세요.');return {queries,expression,notice:'제공자별 Boolean 차이를 피하기 위해 긍정 검색어를 각각 검색하고, 전체 논리식을 로컬에서 다시 적용합니다. 결과 한도 때문에 모든 일치 자료가 보장되지는 않습니다.'};}
