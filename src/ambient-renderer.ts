import {motionEnabled,motionPreferenceEvent,readMotionPreference} from './motion-preference';
import {refractionMap,refract,type RefractionMap} from './refraction-map';
const canvas=(width:number,height:number)=>{const el=document.createElement('canvas');el.width=width;el.height=height;return el;};
function glow(colour:string){const el=canvas(256,256),ctx=el.getContext('2d')!,gradient=ctx.createRadialGradient(128,128,0,128,128,126);gradient.addColorStop(0,colour+'e8');gradient.addColorStop(.38,colour+'bd');gradient.addColorStop(.72,colour+'52');gradient.addColorStop(1,colour+'00');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);return el;}
export function startAmbientRenderer(background:HTMLCanvasElement,reflection:HTMLCanvasElement){
 const bg=background.getContext('2d',{alpha:false,willReadFrequently:true})!,edge=reflection.getContext('2d')!;
 const colours=[glow('#ff9d91'),glow('#f4a2cc'),glow('#aa9dea'),glow('#f8da9b')],motion=matchMedia('(prefers-reduced-motion: reduce)'),contrast=matchMedia('(prefers-contrast: more), (forced-colors: active)');
 let width=0,height=0,scale=1,edges:RefractionMap[]=[],base=canvas(1,1),dirty=true,frame=0,lastDraw=0,lastEdge=0,draws=0,edgeDraws=0,closed=false,moving=motionEnabled(motion.matches),sceneTime=8000;
 let pixels:ImageData;const cache=new Map<Element,{key:string;map:RefractionMap}>(),observed=new Set<Element>(),resize=new ResizeObserver(()=>{dirty=true;wake();});
 function layout(){
  const cssWidth=innerWidth,cssHeight=innerHeight,nextScale=Math.min(.5,800/cssWidth,540/cssHeight),w=Math.max(1,Math.round(cssWidth*nextScale)),h=Math.max(1,Math.round(cssHeight*nextScale));scale=nextScale;
  if(w!==width||h!==height){width=w;height=h;background.width=reflection.width=w;background.height=reflection.height=h;pixels=edge.createImageData(w,h);base=canvas(w,h);const ctx=base.getContext('2d')!,gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#fffdf8');gradient.addColorStop(.6,'#fff5f8');gradient.addColorStop(1,'#fffaf0');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);}
  const candidates=[...document.querySelectorAll('.app,.panel,.record-dialog[open]')],next=new Set(candidates);for(const el of observed)if(!next.has(el)){resize.unobserve(el);observed.delete(el);cache.delete(el);}for(const el of candidates)if(!observed.has(el)){observed.add(el);resize.observe(el);}
  edges=[];for(const el of candidates){const bounds=el.getBoundingClientRect(),clip=el.closest('.page')?.getBoundingClientRect(),left=Math.max(0,bounds.left,clip?.left??0),top=Math.max(0,bounds.top,clip?.top??0),right=Math.min(cssWidth,bounds.right,clip?.right??cssWidth),bottom=Math.min(cssHeight,bounds.bottom,clip?.bottom??cssHeight);if(bounds.width<40||bounds.height<30||right<=left||bottom<=top)continue;
   const shape={x:bounds.x*scale,y:bounds.y*scale,width:bounds.width*scale,height:bounds.height*scale},clipRect={x:left*scale,y:top*scale,width:(right-left)*scale,height:(bottom-top)*scale},radius=(parseFloat(getComputedStyle(el).borderTopLeftRadius)||22)*scale,key=JSON.stringify([width,height,radius,scale,shape,clipRect]);
   let material=cache.get(el);if(!material||material.key!==key){material={key,map:refractionMap(width,height,shape,clipRect,radius,scale)};cache.set(el,material);}edges.push(material.map);if(edges.length>=6)break;
  }
  dirty=false;
 }
 function paintScene(time:number){
  const t=time/1000;bg.drawImage(base,0,0);const specs=[
   [.67+.12*Math.sin(t*.22),.27+.12*Math.cos(t*.18),.94,.7,-.7+.17*Math.sin(t*.14)],
   [.23+.16*Math.cos(t*.17),.69+.12*Math.sin(t*.21),1.1,.65,-.62+.15*Math.cos(t*.15)],
   [.49+.13*Math.sin(t*.19+.7),.49+.13*Math.cos(t*.2),.65,.69,-.6],
   [.67+.18*Math.cos(t*.15),.83+.1*Math.sin(t*.23),.95,.49,-.7]
  ];
  bg.globalAlpha=contrast.matches ? .3 : .78;for(let i=0;i<specs.length;i++){const [x,y,w,h,angle]=specs[i];bg.save();bg.translate(width*x,height*y);bg.rotate(angle);bg.scale(width*w/256,height*h/256);bg.drawImage(colours[i],-128,-128);bg.restore();}bg.globalAlpha=1;
  background.dataset.frame=String(++draws);background.dataset.motion=moving?'running':readMotionPreference()==='off'?'paused':'reduced';
 }
 function paintEdges(){
  pixels.data.fill(0);if(!contrast.matches){const scene=bg.getImageData(0,0,width,height).data;for(const map of edges)refract(pixels.data,scene,map);}edge.putImageData(pixels,0,0);reflection.dataset.frame=String(++edgeDraws);reflection.dataset.material='chromatic-refraction';reflection.dataset.samples=String(edges.reduce((sum,map)=>sum+map.destination.length,0));
 }

 function tick(time:number){frame=0;if(closed||document.hidden)return;const changed=dirty;if(dirty)layout();if(changed||!draws||moving&&time-lastDraw>=1000/24){if(moving&&lastDraw)sceneTime+=Math.min(100,time-lastDraw);paintScene(sceneTime);lastDraw=time;if(changed||!edgeDraws||time-lastEdge>=1000/12){paintEdges();lastEdge=time;}}
  if(moving)frame=requestAnimationFrame(tick);
 }
 function wake(){if(!closed&&!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
 const refresh=()=>{dirty=true;wake();},visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{lastDraw=lastEdge=0;refresh();}},motionChange=()=>{moving=motionEnabled(motion.matches);lastDraw=0;refresh();};
 const mutations=new MutationObserver(refresh);mutations.observe(document.body,{childList:true,subtree:true});addEventListener('resize',refresh);document.addEventListener('scroll',refresh,true);document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',motionChange);window.addEventListener(motionPreferenceEvent,motionChange);contrast.addEventListener('change',refresh);wake();
 return ()=>{closed=true;cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();removeEventListener('resize',refresh);document.removeEventListener('scroll',refresh,true);document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',motionChange);window.removeEventListener(motionPreferenceEvent,motionChange);contrast.removeEventListener('change',refresh);};
}
