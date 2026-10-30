import {forumIdentity,isForumType,type ForumType} from './forum.js';
import {isReddit,redditArticle} from './reddit.js';
import {publicNaverUrl,articleIdentity} from './original-url.js';
import {randomUUID} from 'node:crypto';
import {naverTypes} from './api-types.js';
import type {SearchApi} from './search-api.js';
import type {OriginalSource} from './original.js';
import type {ConnectionReport} from './types.js';
import type {Candidate} from './types.js';
import {BrowserAttentionError} from './reddit-browser.js';
export class ConnectionCheck {
 report?:ConnectionReport;private controller?:AbortController;private pending=Promise.resolve();
 constructor(private api:SearchApi,private original:OriginalSource,private secrets:()=>string[]){}
 get busy(){return !!this.controller;}
 start(url?:string,provider:'naver'|'reddit'|ForumType|boolean='naver'){if(this.busy)throw Error('연결 확인 중입니다.');const selected=provider===true?'reddit':provider===false?'naver':provider,forum=url?forumIdentity(url):undefined;if(url)url=forum?.url||(isReddit(url)?redditArticle(url).url:publicNaverUrl(url));else this.api.validate(selected==='naver'?undefined:selected);const controller=new AbortController(),report:ConnectionReport={id:randomUUID(),status:'running',scopes:url?[{type:forum?.type||(isReddit(url)?'reddit':articleIdentity(url).kind==='cafe'?'cafearticle':articleIdentity(url).kind==='kin'?'kin':'blog'),manual:true,url,search:'skipped',original:'pending',date:null}]:selected!=='naver'?[{type:selected,search:'pending',original:'pending',date:null}]:naverTypes.map(type=>({type,search:'pending',original:'pending',date:null}))};this.report=report;this.controller=controller;
  this.pending=this.run(report,controller.signal).finally(()=>{if(report.status==='running')report.status=controller.signal.aborted?'cancelled':'completed';this.controller=undefined;});return report;
 }
 private safe(error:unknown){let text=error instanceof Error?error.message:String(error);for(const key of this.secrets())if(key)for(const value of [key,encodeURIComponent(key)])text=text.split(value).join('[키 숨김]');return text.slice(0,1200);}
 private async run(report:ConnectionReport,signal:AbortSignal){
  for(const scope of report.scopes){if(signal.aborted)return;let candidates:Candidate[]=[];if(!scope.manual){scope.search='running';
   const forum=isForumType(scope.type),queries=forum?['reusable','cleaning','saving money']:scope.type==='reddit'?['reusable']:['네이버'];let notice='';
   try{for(const query of queries){scope.query=query;const page=await this.api.search(scope.type,query,1,signal,forum?10:1);if(signal.aborted)return;candidates=page.items.slice(0,forum?3:1);notice=page.notice||notice;if(candidates.length)break;}scope.search=candidates.length?'passed':'empty';}catch(error){if(signal.aborted)return;scope.search='failed';scope.original='skipped';scope.error=this.safe(error);continue;}
   if(!candidates.length){scope.original='skipped';scope.error=notice||'확인용 검색어에서 글을 찾지 못해 원문 읽기는 실행하지 않았습니다. 원문 주소 확인에 글 URL을 넣어 별도로 확인할 수 있습니다.';continue;}
  }
   const targets=scope.manual?[{url:scope.url!,date:null}]:candidates;scope.original='running';
   for(const target of targets){scope.url=target.url;
    try{const result=await this.original.read(target.url,true,signal,false,true);if(signal.aborted)return;scope.original='passed';scope.error=undefined;scope.date=result.date||target.date||null;if(result.comments)scope.comments={status:result.comments.status,count:result.comments.items.length};break;}catch(error){if(signal.aborted)return;scope.original='failed';scope.error=this.safe(error);if(error instanceof BrowserAttentionError)break;}
   }
  }
 }
 cancel(){this.controller?.abort(Error('중지'));if(this.report?.status==='running'){this.report.status='cancelled';for(const scope of this.report.scopes){if(scope.search==='running')scope.search='cancelled';if(scope.original==='running')scope.original='cancelled';}}return true;}
 invalidate(){this.cancel();this.report=undefined;}
 async idle(){await this.pending;}
}
