import {useEffect,useState} from 'react';
import {GlassToggle} from './glass-toggle';
import {motionEnabled,motionPreferenceEvent,setMotionPreference} from './motion-preference';
export function MotionControl(){
 const [enabled,setEnabled]=useState(()=>motionEnabled(matchMedia('(prefers-reduced-motion: reduce)').matches));
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),refresh=()=>setEnabled(motionEnabled(media.matches));media.addEventListener('change',refresh);window.addEventListener(motionPreferenceEvent,refresh);return()=>{media.removeEventListener('change',refresh);window.removeEventListener(motionPreferenceEvent,refresh);};},[]);
 return <section className="panel appearance-settings"><h2>화면</h2><GlassToggle checked={enabled} onChange={value=>setMotionPreference(value?'on':'off')}>배경 움직임</GlassToggle></section>;
}
