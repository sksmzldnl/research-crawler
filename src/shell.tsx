import type {ReactNode} from 'react';
import {Icon} from './icons';
export function StudioShell({page,navigate,children}:{page:number;navigate:(page:number)=>void;children:ReactNode}){
 return <div className="app compact-app focused-app"><a className="skip" href="#content">본문으로 건너뛰기</a><header className="workspace-header"><div className="brand"><span className="brand-icon"><Icon name="leaf" size={24}/></span><div>ZeroWaste<small>LISTENING STUDIO</small></div></div><nav aria-label="주 메뉴"><button aria-current={page===0?'page':undefined} className={page===0?'active':''} onClick={()=>navigate(0)}>작업실</button><button aria-current={page===1?'page':undefined} className={page===1?'active':''} onClick={()=>navigate(1)}>설정</button></nav><span className="app-version">0.9.1</span></header><main id="content" tabIndex={-1}>{children}</main></div>;
}
