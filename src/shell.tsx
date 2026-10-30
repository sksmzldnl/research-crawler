import type {ReactNode} from 'react';
import {Icon} from './icons';
import {GlassMaterial} from './glass-material';
import {LiquidNavigation} from './liquid-nav';
export function StudioShell({page,navigate,children}:{page:number;navigate:(page:number)=>void;children:ReactNode}){
 return <><GlassMaterial/><div className="app compact-app focused-app"><a className="skip" href="#content">본문으로 건너뛰기</a><header className="workspace-header"><div className="brand"><span className="brand-icon"><Icon name="leaf" size={24}/></span><div>ZeroWaste<small>LISTENING STUDIO</small></div></div><LiquidNavigation page={page} navigate={navigate}/><span className="app-version">0.12.3</span></header><main id="content" tabIndex={-1}>{children}</main></div></>;
}
