import {publicNaverUrl,articleIdentity} from './original-url.js';
import {randomUUID} from 'node:crypto';
import {naverTypes} from './api-types.js';
import type {SearchApi} from './search-api.js';
import type {OriginalSource} from './original.js';
import type {ConnectionReport} from './types.js';
export class ConnectionCheck {
 report?:ConnectionReport;private controller?:AbortController;private pending=Promise.resolve();
 constructor(private api:SearchApi,private original:OriginalSource,private secrets:()=>string[]){}
 get busy(){return !!this.controller;}
 start(url?:string){if(this.busy)throw Error('연결 확인 중입니다.');if(url)url=publicNaverUrl(url);else this.api.validate();const controller=new AbortController(),report:ConnectionReport={id:randomUUID(),status:'running',scopes:url?[{type:articleIdentity(url).kind==='cafe'?'cafearticle':articleIdentity(url).kind==='kin'?'kin':'blog',manual:true,url,search:'skipped',original:'pending',date:null}]:naverTypes.map(type=>({type,search:'pending',original:'pending',date:null}))};this.report=report;this.controller=controller;
  this.pending=this.run(report,controller.signal).finally(()=>{if(report.status==='running')report.status=controller.signal.aborted?'cancelled':'completed';this.controller=undefined;});return report;
 }
 private safe(error:unknown){let text=error instanceof Error?error.message:String(error);for(const key of this.secrets())if(key)for(const value of [key,encodeURIComponent(key)])text=text.split(value).join('[키 숨김]');return text.slice(0,1200);}
 private async run(report:ConnectionReport,signal:AbortSignal){
  for(const scope of report.scopes){if(signal.aborted)return;let first;if(!scope.manual){scope.search='running';
   try{first=(await this.api.search(scope.type,'네이버',1,signal,1)).items[0];if(signal.aborted)return;scope.search='passed';}catch(error){if(signal.aborted)return;scope.search='failed';scope.error=this.safe(error);continue;}
   if(!first){scope.original='empty';continue;}scope.url=first.url;}scope.original='running';
   try{const result=await this.original.read(scope.url!,true,signal);if(signal.aborted)return;scope.original='passed';scope.date=result.date||first?.date||null;}catch(error){if(signal.aborted)return;scope.original='failed';scope.error=this.safe(error);}
  }
 }
 cancel(){this.controller?.abort(Error('중지'));if(this.report?.status==='running'){this.report.status='cancelled';for(const scope of this.report.scopes){if(scope.search==='running')scope.search='cancelled';if(scope.original==='running')scope.original='cancelled';}}return true;}
 invalidate(){this.cancel();this.report=undefined;}
 async idle(){await this.pending;}
}
