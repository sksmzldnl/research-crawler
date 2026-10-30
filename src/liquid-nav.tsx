import {useLayoutEffect,useRef} from 'react';
import {Icon} from './icons';

export function LiquidNavigation({page,navigate}:{page:number;navigate:(page:number)=>void}){
 const lens=useRef<SVGRectElement>(null),trail=useRef<SVGEllipseElement>(null),seed=useRef<SVGEllipseElement>(null),neck=useRef<SVGPathElement>(null),shine=useRef<SVGRectElement>(null),surface=useRef<SVGSVGElement>(null),position=useRef(page?201:67);
 useLayoutEffect(()=>{
  const from=position.current,to=page?201:67,reduce=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,started:number|undefined;
  const paint=(progress:number)=>{const p=reduce.matches?1:progress,ease=1-Math.pow(1-p,3),cx=from+(to-from)*ease,w=114-40*Math.sin(Math.PI*p),height=46+6*Math.sin(Math.PI*p),oldRadius=23*Math.pow(1-p,.65),direction=to>=from?1:-1;
   position.current=cx;surface.current?.setAttribute('data-moving',p<1?'true':'false');
   for(const rect of [lens.current,shine.current]){rect?.setAttribute('x',String(cx-w/2));rect?.setAttribute('y',String(30-height/2));rect?.setAttribute('width',String(w));rect?.setAttribute('height',String(height));}
   trail.current?.setAttribute('cx',String(from));trail.current?.setAttribute('rx',String(57*Math.pow(1-p,1.1)));trail.current?.setAttribute('ry',String(oldRadius));seed.current?.setAttribute('cx',String(to));seed.current?.setAttribute('rx',String(8*Math.sin(Math.PI*p)));seed.current?.setAttribute('ry',String(12*Math.sin(Math.PI*p)));
   const x1=from+direction*oldRadius*.6,x2=cx-direction*w*.32,mid=(x1+x2)/2,thickness=15*Math.pow(Math.max(0,1-p/.76),.7),connect=p>.01&&p<.76&&Math.abs(cx-from)>3;
   neck.current?.setAttribute('d',connect?`M ${x1} ${30-oldRadius*.8} C ${mid} ${30-thickness} ${mid} ${30-thickness} ${x2} ${30-height*.32} L ${x2} ${30+height*.32} C ${mid} ${30+thickness} ${mid} ${30+thickness} ${x1} ${30+oldRadius*.8} Z`:'');
  };
  if(Math.abs(from-to)<.1||reduce.matches){paint(1);return;}
  paint(0);
  const tick=(time:number)=>{started??=time;const p=Math.min(1,(time-started)/760);paint(p);if(p<1&&!reduce.matches)frame=requestAnimationFrame(tick);else paint(1);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[page]);
 return <nav className="liquid-navigation" aria-label="주 메뉴">
  <svg ref={surface} className="navigation-fluid" viewBox="0 0 268 60" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id="nav-glaze" x2=".7" y2="1"><stop stopColor="#fff" stopOpacity=".85"/><stop offset=".48" stopColor="#fff" stopOpacity=".25"/><stop offset="1" stopColor="#fff" stopOpacity=".5"/></linearGradient><linearGradient id="nav-spectrum" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".25" stopColor="#f9a9ba"/><stop offset=".5" stopColor="#b3abfb"/><stop offset=".74" stopColor="#ffe9a9"/><stop offset="1" stopColor="#fff"/></linearGradient></defs><g filter="url(#liquid-tension)" fill="#ffffff" opacity=".73"><ellipse ref={trail} cy="30" rx="0" ry="0"/><ellipse ref={seed} cy="30" rx="0" ry="0"/><path ref={neck}/><rect ref={lens} x={page?144:10} y="7" width="114" height="46" rx="23"/></g><rect ref={shine} x={page?144:10} y="7" width="114" height="46" rx="23" fill="none" stroke="url(#nav-spectrum)" strokeWidth="1.8" opacity=".9"/></svg>
  {(['작업실','설정'] as const).map((label,index)=><button key={label} aria-current={page===index?'page':undefined} className={page===index?'active':''} onClick={()=>navigate(index)}><span className="nav-icon-lens"><Icon name={index?'settings':'data'} size={18}/></span><span>{label}</span></button>)}
 </nav>;
}
