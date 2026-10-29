import {articleDate} from './article-date.js';
const otherContent='.end_answer,._answerItem,.answer_area,.answerArea,.answer-content,.answer_wrap,.answer-list,.answer_list,.answer-item,.answerItem,.answerDetail,._answerContentsArea,._answerContents,#answerArea,#answerList,[data-answer-id],.CommentBox,.CommentItem,.comment,#commentList,aside,.related-question,.relatedQuestion';
const questionBody='.c-heading__content,._questionContentsArea,.questionDetail,.question-content__body';
const label=/(?:작성\s*일|질문\s*(?:등록\s*)?일|등록\s*일|게시\s*일)\s*[:：]?\s*/;
function publicationText(value:string|null){
 if(!value)return null;const match=label.exec(value);if(!match)return null;
 const tail=value.slice(match.index+match[0].length).split(/수정\s*일|최종\s*수정|조회\s*수?|답변\s*수?|채택/)[0].trim();
 return articleDate(tail);
}
function eligible(el:Element){return !el.closest(otherContent);}
function field(el:Element,typed=false){
 const text=el.textContent||'',explicit=publicationText(text);if(explicit)return explicit;
 for(const attr of ['content','datetime','data-date','data-datetime','data-timestamp','title','aria-label']){const explicitAttribute=publicationText(el.getAttribute(attr));if(explicitAttribute)return explicitAttribute;}
 if(/수정|updated|modified|가입일|생일|채택일/i.test(text))return null;
 for(const attr of ['content','datetime','data-date','data-datetime','data-timestamp','title','aria-label']){
  const value=el.getAttribute(attr);if(['title','aria-label'].includes(attr)&&!typed&&!label.test(text)&&!label.test(value||''))continue;if(!value||/수정|updated|modified|가입일|생일/i.test(value))continue;
  const date=publicationText(value)||articleDate(value);if(date)return date;
 }
 return typed?articleDate(text):null;
}
/** Question publication only: never take an answer's date, profile date, or modified timestamp. */
export function kinPublishedDate(doc:Document){
 const currentId=new URL(doc.URL).searchParams.get('docId');
 const current=(value:any)=>{if(!currentId||!value||typeof value!=='object')return true;for(const raw of [value.url,value['@id']]){if(typeof raw!=='string')continue;try{const id=new URL(raw,doc.URL).searchParams.get('docId');if(id&&id!==currentId)return false;}catch{}}return true;};
 for(const selector of ['meta[property="article:published_time"]','meta[property="og:article:published_time"]','meta[itemprop="datePublished"]','meta[itemprop="dateCreated"]','[itemtype*="Question"] [itemprop="datePublished"]','[itemtype*="Question"] [itemprop="dateCreated"]']){
  for(const el of doc.querySelectorAll(selector))if(eligible(el)){const date=field(el,true);if(date)return date;}
 }
 // These metadata rows are siblings of the question body in desktop and mobile layouts.
 for(const selector of ['.c-userinfo__info','.user-info__info','.userInfo__info','.question-date','.question_date','.questionDate','.question-info__date','.questionInfo .date','.end_question .date','#questionArea .date','.question-content .date','.question-content .info','.question-content time[datetime]']){
  for(const el of doc.querySelectorAll(selector))if(eligible(el)&&!el.closest(questionBody)){const date=field(el,!['.c-userinfo__info','.user-info__info','.userInfo__info'].includes(selector));if(date)return date;}
 }
 // Labels can have no stable class, or a dt/dd pair. Limit this to short, explicit metadata outside the body.
 for(const el of doc.querySelectorAll('span,p,li,dt,th,div,time')){
  if(!eligible(el)||el.closest(questionBody)||el.querySelector(questionBody)||el.querySelector(otherContent)||el.closest('script,style,noscript'))continue;
  const text=el.textContent||'';if(text.length>200||!label.test(text))continue;
  const date=field(el);if(date)return date;
  if(label.test(text.trim())&&['DT','TH'].includes(el.tagName)&&el.nextElementSibling&&eligible(el.nextElementSibling)){
   const paired=field(el.nextElementSibling,true);if(paired)return paired;
  }
 }
 // Structured metadata must describe the question, not an answer or a recommendation.
 for(const script of doc.querySelectorAll('script[type="application/ld+json"]')){
  try{
   const walk=(value:any):string|null=>{
    if(!value||typeof value!=='object')return null;if(Array.isArray(value)){for(const item of value){const date=walk(item);if(date)return date;}return null;}
    const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
    if(types.includes('QAPage')){if(!current(value)||!current(value.mainEntity))return null;const question=value.mainEntity;if(question&&typeof question==='object')return articleDate(question.dateCreated??question.datePublished)||articleDate(value.dateCreated??value.datePublished);return articleDate(value.dateCreated??value.datePublished);}
    if(types.includes('Question')&&current(value))return articleDate(value.dateCreated??value.datePublished);
    return walk(value['@graph']);
   };
   const date=walk(JSON.parse(script.textContent||''));if(date)return date;
  }catch{}
 }
 return null;
}
