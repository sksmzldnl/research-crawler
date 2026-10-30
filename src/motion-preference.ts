export type MotionPreference='system'|'on'|'off';
export const motionPreferenceEvent='studio-background-motion';
let fallback:MotionPreference='system';
export function readMotionPreference():MotionPreference{try{const value=localStorage.getItem('studio.backgroundMotion');return value==='on'||value==='off'?value:fallback;}catch{return fallback;}}
export function setMotionPreference(value:MotionPreference){fallback=value;try{if(value==='system')localStorage.removeItem('studio.backgroundMotion');else localStorage.setItem('studio.backgroundMotion',value);}catch{}window.dispatchEvent(new Event(motionPreferenceEvent));}
export function motionEnabled(reduced:boolean){const preference=readMotionPreference();return preference==='on'||preference==='system'&&!reduced;}
