import {createHash,randomUUID} from 'node:crypto';
import {AI,geminiModel} from './ai.js';
import type {GeminiCheckReport} from './types.js';
const signature=(key:string,model:string)=>createHash('sha256').update(JSON.stringify([key,model.trim().replace(/^models\//,'')])).digest('hex');
export class GeminiCheck {
 private report?:GeminiCheckReport;private verified='';private controller?:AbortController;private pending?:Promise<void>;
 constructor(private ai:AI){}
 get busy(){return this.report?.status==='running';}
 state(key:string,model:string){return this.verified===signature(key,model)?this.report:undefined;}
 passed(key:string,model:string){return this.state(key,model)?.status==='passed';}
 start(model:string){
  if(this.busy)throw Error('Gemini 연결 확인이 진행 중입니다.');const key=this.ai.key('gemini'),name=geminiModel(model);this.verified=signature(key,name);
  this.controller=new AbortController();const signal=this.controller.signal;
  const report:GeminiCheckReport={id:randomUUID(),model:name,status:'running',startedAt:new Date().toISOString(),steps:[{id:'catalog',title:'키·모델 조회',status:'pending',message:''},{id:'text',title:'짧은 문장 생성',status:'pending',message:''},{id:'json',title:'JSON·인사이트 생성',status:'pending',message:''}]};this.report=report;
  const step=async(index:number,action:()=>Promise<void>,message:string)=>{signal.throwIfAborted();const s=report.steps[index],start=Date.now();s.status='running';try{await action();signal.throwIfAborted();s.status='passed';s.message=message;}catch(error){s.status=signal.aborted?'cancelled':'failed';s.message=signal.aborted?'확인을 중지했습니다.':(error as Error).message;throw error;}finally{s.elapsedMs=Date.now()-start;}};
  this.pending=(async()=>{
   await step(0,async()=>{await this.ai.geminiModels(name,signal);},'키를 인식했고 선택한 모델이 목록에 있습니다. 생성 권한은 다음 단계에서 확인합니다.');
   await step(1,async()=>{await this.ai.geminiGenerate(name,'Reply only OK.',signal,undefined,'This is a connection check using synthetic text. Reply briefly.');},'실제 텍스트 생성 요청에 성공했습니다.');
   await step(2,async()=>{await this.ai.insights('My cup is hard to wash.','gemini',name,'연결 확인용 합성 자료: 짧은 요약과 인사이트',signal);},'실제 JSON 생성과 인사이트 형식·원문 근거 검사를 통과했습니다.');
   report.status='passed';
  })().catch(()=>{report.status=signal.aborted?'cancelled':'failed';}).finally(()=>{report.finishedAt=new Date().toISOString();});return report;
 }
 cancel(){this.controller?.abort();return true;}
 invalidate(){this.cancel();this.verified='';this.report=undefined;}
 async idle(){await this.pending;}
}
