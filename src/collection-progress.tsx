import type {Research} from '../core/types';
const names={search:'검색 결과',loading:'본문 연결',body:'본문 확인',comments:'댓글 수집',verification:'사용자 확인',saving:'파일 저장'};
export function CollectionProgressView({research}:{research:Research}){
 const progress=research.progress;if(!progress||!progress.queryTotal)return null;const active=progress.active,oldest=active.slice().sort((a,b)=>Date.parse(a.updatedAt)-Date.parse(b.updatedAt))[0],age=(date:string)=>Math.max(0,Math.floor((Date.now()-Date.parse(date))/1000));
 return <details className="collection-progress"><summary>진행 상황 · 검색어 {progress.queryIndex}/{progress.queryTotal} · {progress.page}/{progress.pageLimit}페이지{oldest&&research.status==='running'?` · ${names[oldest.phase]} ${age(oldest.updatedAt)}초${oldest.phase==='verification'?' 확인 대기':' 응답 대기'}`:''}</summary><p className="hint">현재 검색어: {progress.query}<br/>처리한 검색 페이지: {research.processed}/{research.totalTasks}</p>{active.map(task=><p className="hint" key={task.id}><strong>{names[task.phase]}</strong> · {task.message} · {age(task.startedAt)}초 경과{task.comments!==undefined?` · 댓글 ${task.comments}개`:''}{task.url&&<small className="folder-path">{task.url}</small>}</p>)}</details>;
}
