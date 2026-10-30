import {useEffect,useRef} from 'react';
import {startAmbientRenderer} from './ambient-renderer';
export function GlassMaterial(){
 const background=useRef<HTMLCanvasElement>(null),reflection=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(background.current&&reflection.current)return startAmbientRenderer(background.current,reflection.current);},[]);
 return <><svg className="glass-definitions" aria-hidden="true" focusable="false"><defs><filter id="liquid-tension" x="-30%" y="-70%" width="160%" height="240%" colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="soft"/><feColorMatrix in="soft" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter><filter id="liquid-control" x="-25%" y="-40%" width="150%" height="180%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".035 .07" numOctaves="1" seed="8" result="lens"/><feDisplacementMap in="SourceGraphic" in2="lens" scale="18" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg><div className="ambient-scene" aria-hidden="true"><canvas ref={background} className="ambient-colours"/><canvas ref={reflection} className="ambient-reflections"/></div></>;
}
