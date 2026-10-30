import type {ReactNode} from 'react';
export function StudioShell({page,navigate,children}:{page:number;navigate:(page:number)=>void;children:ReactNode}){
 return <div className="app compact-app focused-app"><a className="skip" href="#content">본문으로 건너뛰기</a><header className="workspace-header"><span className="brand">ZeroWaste</span><nav aria-label="주 메뉴">{['작업실','설정'].map((label,index)=><button key={label} aria-current={page===index?'page':undefined} className={page===index?'active':''} onClick={()=>navigate(index)}>{label}</button>)}</nav><span className="app-version">0.12.5</span></header><main id="content" tabIndex={-1}>{children}</main></div>;
}
