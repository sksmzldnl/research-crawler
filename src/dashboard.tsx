import {useState,useRef,useEffect} from 'react';
import {Icon} from './icons';
import {labels,type State,type Research} from '../core/types';

const zone='Asia/Seoul';
const keyFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:zone});
const dateKey=(date:Date)=>keyFormatter.format(date);
const dayDate=(key:string)=>new Date(key+'T12:00:00Z');
const statusLabels:Record<string,string>={running:'진행 중',paused:'일시정지',stopped:'중지',completed:'완료',failed:'오류'};

function FlowChart({state}:{state:State}){
  const container=useRef<HTMLDivElement>(null);const [width,setWidth]=useState(690);
  useEffect(()=>{const observer=new ResizeObserver(entries=>{setWidth(Math.max(200,Math.round(entries[0].contentRect.width)));});if(container.current)observer.observe(container.current);return()=>observer.disconnect();},[]);
  const right=width-22,step=(right-44)/6;
  const now=dayDate(dateKey(new Date()));
  const days=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setUTCDate(d.getUTCDate()-6+i);const key=dateKey(d);const rows=state.records.filter(r=>dateKey(new Date(r.collected_at))===key);return {key,label:new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:zone}).format(d),valid:rows.filter(r=>r.review_status!=='excluded').length,excluded:rows.filter(r=>r.review_status==='excluded').length};});
  const max=Math.max(4,Math.ceil(Math.max(...days.flatMap(d=>[d.valid,d.excluded]))/4)*4);
  const coordinates=(field:'valid'|'excluded')=>days.map((d,i)=>[44+i*step,164-d[field]/max*136]);
  function path(points:number[][]){return points.reduce((s,[x,y],i)=>i===0?`M${x},${y}`:`${s} C${(points[i-1][0]+x)/2},${points[i-1][1]} ${(points[i-1][0]+x)/2},${y} ${x},${y}`,'');}
  const valid=path(coordinates('valid')),excluded=path(coordinates('excluded'));
  const total=days.reduce((n,d)=>n+d.valid+d.excluded,0);
  return <div ref={container} className={`flow-chart${total?'':' chart-empty'}`}>
    <svg viewBox={`0 0 ${width} 208`} role="img" aria-label={`최근 7일 자료: 유효 ${days.reduce((n,d)=>n+d.valid,0)}건, 제외 ${days.reduce((n,d)=>n+d.excluded,0)}건. 합성 데모 포함.`}>
      <defs><linearGradient id="flow-purple" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a475ed" stopOpacity=".42"/><stop offset="1" stopColor="#b89bfa" stopOpacity=".015"/></linearGradient><linearGradient id="flow-pink" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f0a8d7" stopOpacity=".46"/><stop offset="1" stopColor="#f5c6e3" stopOpacity=".025"/></linearGradient></defs>
      {[0,1,2,3,4].map(i=><g key={i}><line x1="44" x2={right} y1={28+i*34} y2={28+i*34} className="chart-gridline"/><text x="22" y={32+i*34} textAnchor="middle" className="chart-label">{max-i*max/4}</text></g>)}
      {total>0&&<><path d={`${excluded} L${right},164 L44,164 Z`} fill="url(#flow-pink)"/><path d={excluded} fill="none" stroke="#eda0d1" strokeWidth="2"/><path d={`${valid} L${right},164 L44,164 Z`} fill="url(#flow-purple)"/><path d={valid} fill="none" stroke="#9a6de2" strokeWidth="2.3"/>{coordinates('valid').map(([x,y],i)=><circle key={i} cx={x} cy={y} r={days[i].valid?3:0} fill="#fff" stroke="#a47ae5" strokeWidth="2"/>)}</>}
      {days.map((d,i)=><text key={d.key} x={44+i*step} y="194" textAnchor="middle" className="chart-label">{d.label}</text>)}
    </svg>
    {!total&&<div className="chart-empty-caption"><Icon name="chart" size={22}/><strong>경험이 모이면, 흐름이 보입니다.</strong><span>첫 조사를 시작하면 실제 수집 추이를 보여드려요.</span></div>}
  </div>;
}

function ResearchCalendar({researches,navigate}:{researches:Research[];navigate:(n:number)=>void}){
  const today=dateKey(new Date());
  const [selected,setSelected]=useState(today);
  const [month,setMonth]=useState(today.slice(0,7));
  const buttons=useRef<Record<string,HTMLButtonElement|null>>({});
  const [year,number]=month.split('-').map(Number);
  const first=new Date(Date.UTC(year,number-1,1));
  const count=new Date(Date.UTC(year,number,0)).getUTCDate();
  const prefix=Array.from({length:first.getUTCDay()},()=>null);
  const dates=[...prefix,...Array.from({length:count},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`)];
  while(dates.length%7)dates.push(null);
  const selectedResearch=researches.filter(r=>dateKey(new Date(r.createdAt))===selected);
  function changeMonth(offset:number){const d=new Date(Date.UTC(year,number-1+offset,1,12));const key=dateKey(d);setMonth(key.slice(0,7));setSelected(key);}
  function focusDay(key:string){setSelected(key);setMonth(key.slice(0,7));requestAnimationFrame(()=>buttons.current[key]?.focus());}
  function onKey(event:React.KeyboardEvent<HTMLButtonElement>,key:string){const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};const date=dayDate(key);if(event.key in offsets){event.preventDefault();date.setUTCDate(date.getUTCDate()+offsets[event.key]);focusDay(dateKey(date));}else if(event.key==='Home'||event.key==='End'){event.preventDefault();date.setUTCDate(date.getUTCDate()+(event.key==='Home'?-date.getUTCDay():6-date.getUTCDay()));focusDay(dateKey(date));}}
  return <section className="panel calendar-panel"><div className="section-title"><div><h2>조사 캘린더</h2><p className="panel-subtitle">{year}년 {number}월</p></div><div className="calendar-navigation"><button aria-label="이전 달" onClick={()=>changeMonth(-1)}><Icon name="left" size={15}/></button><button aria-label="다음 달" onClick={()=>changeMonth(1)}><Icon name="chevron" size={15}/></button></div></div><div className="calendar-grid" role="grid" aria-label={`${year}년 ${number}월 조사 캘린더`}><div role="row" className="calendar-week">{['일','월','화','수','목','금','토'].map(d=><span role="columnheader" key={d}>{d}</span>)}</div>{Array.from({length:dates.length/7},(_,week)=><div role="row" className="calendar-week" key={week}>{dates.slice(week*7,week*7+7).map((key,i)=>{if(!key)return <span role="gridcell" key={i}/>;const count=researches.filter(r=>dateKey(new Date(r.createdAt))===key).length;return <span role="gridcell" aria-selected={key===selected} key={key}><button ref={el=>{buttons.current[key]=el;}} tabIndex={key===selected?0:-1} className={`${key===selected?'selected-day ':''}${key===today?'today ':''}${count?'has-research':''}`} aria-label={`${key}, 시작한 조사 ${count}건`} aria-current={key===today?'date':undefined} onClick={()=>setSelected(key)} onKeyDown={e=>onKey(e,key)}>{Number(key.slice(-2))}{count>0&&<i/>}</button></span>;})}</div>)}</div><div className="calendar-footer"><span>{Number(selected.slice(5,7))}월 {Number(selected.slice(8))}일 <strong>조사 {selectedResearch.length}건</strong></span><button className="link" onClick={()=>{setMonth(today.slice(0,7));setSelected(today);}}>오늘</button></div><p className="calendar-note">점은 조사 시작일을 표시합니다 · KST</p>{selectedResearch.length>0&&<button className="calendar-research" onClick={()=>navigate(4)}><span>{selectedResearch[0].config.name}</span><Icon name="chevron" size={13}/></button>}</section>;
}

export function Dashboard({state,navigate}:{state:State;navigate:(n:number)=>void}){
  const [statistics,setStatistics]=useState<'flow'|'sources'>('flow');
  const latest=state.researches[0];
  const valid=state.records.filter(r=>r.review_status!=='excluded').length;
  const excluded=state.records.length-valid;
  const progress=latest?Math.min(100,Math.round(latest.valid/latest.config.target*100)):0;
  const running=state.researches.filter(r=>r.status==='running').length;
  const complete=state.researches.filter(r=>r.status==='completed').length;
  const counts=Object.entries(labels).map(([key,label])=>({key,label,count:state.records.filter(r=>r.source_platform===key&&r.review_status!=='excluded').length})).filter(c=>c.count);
  const hasDemo=state.records.some(r=>r.mode==='demo');
  const providers=[{name:'Google Gemini',initial:'G',className:'ai',registered:!!state.credentials.geminiKey,detail:'선택한 행 번역 · CSV 정리'},{name:'OpenAI GPT',initial:'✦',className:'ai',registered:!!state.credentials.openaiKey,detail:'선택한 행 번역 · CSV 정리'}];
  return <div className="dashboard">
    <div className="page-title"><div><div className="eyebrow"><span/>LISTEN. UNDERSTAND. CHANGE.</div><h1>경험을 듣고, 변화를 설계하세요.</h1><p>작은 목소리에서 발견하는, 지속 가능한 일상의 가능성.</p></div><button className="primary dashboard-create" onClick={()=>navigate(1)}><Icon name="plus" size={17}/>새 조사 시작<Icon name="arrow" size={16}/></button></div>
    <div className="dashboard-overview">
      <section className="panel research-overview"><div className="section-title"><h2>나의 리서치</h2><span className="soft-symbol"><Icon name="book" size={17}/></span></div><div className="overview-links">{([{icon:'bundles',label:'저장한 쿼리 번들',value:state.bundles.length,page:2},{icon:'activity',label:'진행 중 조사',value:running,page:4},{icon:'check',label:'완료한 조사',value:complete,page:4}] as const).map(item=><button key={item.label} onClick={()=>navigate(item.page)}><span className="overview-icon"><Icon name={item.icon} size={18}/></span><span>{item.label}</span><strong>{item.value}</strong></button>)}</div><div className="overview-footer"><span className="tiny-dot"/>모든 조사는 내 컴퓨터에 저장됩니다</div></section>
      <section className="panel collection-overview"><div className="section-title"><h2>모아진 경험들</h2><span className={`badge ${hasDemo?'amber':''}`}>{hasDemo?'합성 데모 포함':state.records.length?'실제 수집':'시작 전'}</span></div><div className="collection-tiles"><button className="collection-tile valid-tile" onClick={()=>navigate(3)}><span className="tile-sheen"/><div><span className="tile-label"><i/>유효 자료</span><strong>{valid.toLocaleString()}<small>건</small></strong></div><span className="tile-mark"><Icon name="chart" size={35}/></span></button><button className="collection-tile excluded-tile" onClick={()=>navigate(3)}><span className="tile-sheen"/><div><span className="tile-label"><i/>제외 자료</span><strong>{excluded.toLocaleString()}<small>건</small></strong></div><span className="tile-mark"><Icon name="bundles" size={32}/></span></button></div><p className="tile-footnote">직접 가져온 자료와 합성 데모를 구분해 표시합니다.</p></section>
      <section className="panel progress-panel"><div className="section-title"><h2>목표 달성 현황</h2><span className="badge">최근 조사</span></div><div className="progress-bloom" role="progressbar" aria-label="최근 조사 목표 자료 확보율" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="bloom-petal petal-one"/><div className="bloom-petal petal-two"/><div className="bloom-petal petal-three"/><svg viewBox="0 0 160 160" aria-hidden="true"><defs><linearGradient id="bloom-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#9965e6"/><stop offset="1" stopColor="#e9a2db"/></linearGradient></defs><circle cx="80" cy="80" r="59" className="bloom-track"/><circle cx="80" cy="80" r="59" className="bloom-value" stroke="url(#bloom-gradient)" strokeDasharray={2*Math.PI*59} strokeDashoffset={2*Math.PI*59*(1-progress/100)}/></svg><div className="bloom-caption"><strong>{progress}<span>%</span></strong><small>목표 자료 확보율</small></div></div><div className="progress-caption">{latest?<><strong>{latest.valid}건</strong><span> / 목표 {latest.config.target}건</span></>:<span>첫 번째 조사를 시작해 보세요</span>}</div><button className="link progress-link" onClick={()=>navigate(4)}>진행 상황 보기<Icon name="chevron" size={13}/></button></section>
    </div>
    <div className="dashboard-details"><section className="panel chart-panel"><div className="section-title"><div className="chart-tabs" role="tablist" aria-label="자료 통계 보기"><button role="tab" aria-selected={statistics==='flow'} aria-controls="statistics-panel" onClick={()=>setStatistics('flow')}>수집 흐름</button><button role="tab" aria-selected={statistics==='sources'} aria-controls="statistics-panel" onClick={()=>setStatistics('sources')}>소스별 자료</button></div><span className="date-chip"><Icon name="calendar" size={13}/>최근 7일 · KST</span></div><div role="tabpanel" id="statistics-panel" aria-label={statistics==='flow'?'수집 흐름':'소스별 자료'}>{statistics==='flow'?<><div className="chart-legend"><span><i className="purple-dot"/>유효 자료</span><span><i className="pink-dot"/>제외 자료</span><small>{hasDemo?'합성 데모 포함':'수집된 자료 기준'}</small></div><FlowChart state={state}/></>:<div className="source-distribution">{counts.length?counts.map(c=><div className="source-bar" key={c.key}><div><span>{c.label}</span><strong>{c.count}건</strong></div><progress aria-label={`${c.label} 유효 자료`} max={Math.max(...counts.map(x=>x.count))} value={c.count}/></div>):<div className="empty"><Icon name="data" size={30}/><p>자료가 쌓이면 소스별 분포를 보여드립니다.</p></div>}</div>}</div><div className="chart-footer"><span>AI 비용 추정 <strong>${state.researches.reduce((n,r)=>n+r.usage.cost,0).toFixed(4)}</strong></span><span>단가 미설정 조사는 미산정</span></div></section><ResearchCalendar researches={state.researches} navigate={navigate}/></div>
    <div className="dashboard-details dashboard-bottom"><section className="panel activity-panel"><div className="section-title"><div><h2>최근 조사 활동</h2><p className="panel-subtitle">경험을 발견해 가는 나의 기록</p></div><button className="link" onClick={()=>navigate(4)}>전체 보기<Icon name="arrow" size={13}/></button></div>{state.researches.length?<div className="research-list">{state.researches.slice(0,3).map(r=><button className="research-row" key={r.id} onClick={()=>navigate(4)}><span className="round-icon"><Icon name={r.status==='running'?'activity':'book'} size={19}/></span><span className="research-name"><strong>{r.config.name}</strong><small>{new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',timeZone:zone}).format(new Date(r.createdAt))} · 유효 {r.valid}건</small></span><span className={`badge ${r.config.mode==='demo'?'amber':''}`}>{r.config.mode==='demo'?'합성 데모':'실제 수집'}</span><span className={`research-status ${r.status}`}>{statusLabels[r.status]}</span><Icon name="chevron" size={14}/></button>)}</div>:<div className="activity-empty"><span className="empty-orb"><Icon name="spark" size={22}/></span><div><strong>아직 조사 기록이 없어요.</strong><p>CSV·텍스트를 가져오거나 공개 RSS·URL을 입력하세요.</p></div><button className="link" onClick={()=>navigate(1)}>첫 조사 만들기<Icon name="arrow" size={14}/></button></div>}</section><section className="panel connections-panel"><div className="section-title"><h2>선택 사항 · AI 연결</h2><button className="link" onClick={()=>navigate(5)} aria-label="AI 연결 설정 열기"><Icon name="settings" size={16}/></button></div>{providers.map(p=><button className="provider-row" key={p.name} onClick={()=>navigate(5)}><span className={`provider-avatar ${p.className}`}>{p.initial}</span><span><strong>{p.name}</strong><small>{p.detail}</small></span><span className={`provider-state ${p.registered?'registered':''}`}>{p.registered?'키 등록됨':'설정 필요'}</span></button>)}<p className="connections-note">자료 가져오기에는 AI 키가 필요 없습니다.</p></section></div>

  </div>;
}
