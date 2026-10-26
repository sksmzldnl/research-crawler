import type {CSSProperties} from 'react';

const paths = {
  dashboard: ['M3.5 3.5h6.5V10H3.5z', 'M14 3.5h6.5V10H14z', 'M3.5 14H10v6.5H3.5z', 'M14 14h6.5v6.5H14z'],
  plus: ['M12 5v14', 'M5 12h14'],
  bundles: ['M9 4H5a1 1 0 0 0-1 1v4', 'M15 4h4a1 1 0 0 1 1 1v4', 'M4 15v4a1 1 0 0 0 1 1h4', 'M20 15v4a1 1 0 0 1-1 1h-4', 'M8 12h8', 'M12 8v8'],
  data: ['M4 4h16v16H4z', 'M4 9h16', 'M9 9v11', 'M13 13h3', 'M13 16h3'],
  history: ['M3.5 10A8.5 8.5 0 1 1 5 17', 'M3 4v6h6', 'M12 7v5l3 2'],
  settings: ['m9 3-.7 2.2-2 .9-2.1-.5-1.5 2.6 1.5 1.7-.2 2.2L2.5 14 4 16.6l2.2-.3 1.7 1.3.5 2.2h3l.9-2 2.1-.7 2 .8 2-2.3-.9-2 .5-2.1 1.8-1.4-1-2.8-2.2-.2-1.5-1.6.1-2.3-2.9-.6-1.2 1.8-2.2.2Z', 'M14.7 11.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  help: ['M9.1 8.6a3 3 0 0 1 5.7 1.3c0 2-2.8 2.2-2.8 4', 'M12 17h.01', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
  search: ['M20 20l-4.3-4.3', 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0'],
  activity: ['M3 12h4l3-7 4 14 3-7h4'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  chevron: ['m9 5 7 7-7 7'],
  left: ['m15 5-7 7 7 7'],
  spark: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'],
  leaf: ['M20 4C9 2 3 8 6 15c3 6 12 4 14-11Z', 'M5 21 16 9'],
  check: ['m5 12 4 4L19 6'],
  shield: ['M12 3 4 6v6c0 4 5 7.5 8 9 3-1.5 8-5 8-9V6Z', 'm8.5 12 2.5 2.5 4.5-5'],
  chart: ['M5 17v-5', 'M10 17V5', 'M15 17V9', 'M20 17V3'],
  calendar: ['M4 5h16v15H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4', 'M8 14h.01', 'M12 14h.01', 'M16 14h.01'],
  book: ['M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z', 'M12 5v15'],
  contrast: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z', 'M12 3v18', 'M12 3a9 9 0 0 1 0 18Z'],
  glass: ['M4 5h16l-4 6v5l-4 4-4-4v-5Z', 'M7 5 12 12l5-7', 'M8 11h8'],
} as const;

export type IconName = keyof typeof paths;
export function Icon({name,size=20,style,className=''}:{name:IconName;size?:number;style?:CSSProperties;className?:string}) {
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={style}>{paths[name].map((d,i)=><path key={i} d={d}/>)}</svg>;
}
