import {useEffect,type ReactNode} from 'react';
import {Icon,type IconName} from './icons';
import type {State} from '../core/types';

const navigation:{name:string;icon:IconName}[]=[
  {name:'대시보드',icon:'dashboard'},
  {name:'새 조사',icon:'plus'},
  {name:'쿼리 번들',icon:'bundles'},
  {name:'데이터 검토',icon:'data'},
  {name:'조사 기록',icon:'history'},
  {name:'AI·수집 설정',icon:'settings'},
  {name:'도움말',icon:'help'},
];

export function StudioShell({page,navigate,onSearch,state,contrast,setContrast,reduceGlass,setReduceGlass,children}:{
  page:number;navigate:(n:number)=>void;onSearch:()=>void;state?:State;
  contrast:boolean;setContrast:(v:boolean)=>void;reduceGlass:boolean;setReduceGlass:(v:boolean)=>void;children:ReactNode;
}) {
  const running=state?.researches.filter(r=>r.status==='running').length||0;
  const isMac=/Mac|iPhone|iPad/.test(navigator.platform);
  useEffect(()=>{
    function onKey(event:KeyboardEvent){
      const target=event.target as HTMLElement;
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&!target.closest('input,textarea,select,[contenteditable="true"]')){event.preventDefault();onSearch();}
    }
    document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);
  },[onSearch]);
  return <div className={`app${contrast?' high-contrast':''}${reduceGlass?' reduced-glass':''}`}>
    <a className="skip" href="#content">본문으로 건너뛰기</a>
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><Icon name="leaf" size={26}/></span><div>ZeroWaste<small>LISTENING STUDIO</small></div></div>
      <div className="workspace"><span className="workspace-dot"/>나의 리서치 공간<Icon name="chevron" size={13}/></div>
      <nav aria-label="주 메뉴">{navigation.map((item,i)=><button key={item.name} aria-label={item.name} title={item.name} aria-current={page===i?'page':undefined} className={page===i?'active':''} onClick={()=>navigate(i)}><span className="nav-icon"><Icon name={item.icon}/></span><span className="nav-label">{item.name}</span>{i===4&&state&&<small>{state.researches.length}</small>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><span className="note-orb"><Icon name="spark" size={20}/></span><strong>변화는 듣는 것부터.</strong><p>일상 속 작은 경험을<br/>새로운 가능성으로 연결하세요.</p><button onClick={()=>navigate(6)}>스튜디오 사용 안내<Icon name="arrow" size={14}/></button></div>
        <div className="local-indicator"><span/>내 컴퓨터에 저장</div>
        <div className="appearance-options" aria-label="화면 가독성 설정"><button className="subtle" aria-label="투명도 줄이기" onClick={()=>setReduceGlass(!reduceGlass)} aria-pressed={reduceGlass} title="배경 투명도와 흐림 효과 줄이기"><Icon name="glass" size={15}/><span>투명도 줄이기</span><span className="setting-switch"/></button><button className="subtle" aria-label="고대비" onClick={()=>setContrast(!contrast)} aria-pressed={contrast}><Icon name="contrast" size={15}/><span>고대비 {contrast?'켜짐':'꺼짐'}</span><span className="setting-switch"/></button></div>
        <small className="app-version">ZeroWaste Listening Studio · 0.3</small>
      </div>
    </aside>
    <main id="content" tabIndex={-1}>
      <header className="topbar"><div className="breadcrumb">내 연구실<span>/</span><strong>{navigation[page].name}</strong></div><div className="topbar-actions"><button className="quick-search" onClick={onSearch} aria-label="수집 자료 검색 열기"><Icon name="search" size={17}/><span>수집 자료 검색</span><kbd>{isMac?'⌘':'Ctrl'} K</kbd></button><button className={`icon-button status-button${running?' has-activity':''}`} onClick={()=>navigate(4)} aria-label={`조사 진행 상황 보기${running?` · ${running}건 진행 중`:''}`} title="조사 진행 상황"><Icon name="activity" size={19}/></button><button className="topbar-create" aria-label="새 조사 화면 열기" onClick={()=>navigate(1)}><span>조사 만들기</span><Icon name="plus" size={20}/></button><button className="avatar" onClick={()=>navigate(6)} aria-label="사용 도움말" title="사용 도움말">ZW</button></div></header>
      <div className="storage-status"><Icon name="shield" size={12}/>{state?.secureStorage?'API 키 · OS 보안 저장소 사용':'API 키 · 현재 세션에만 보관'}</div>
      {children}
    </main>
  </div>;
}
