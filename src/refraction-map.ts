export type Rect={x:number;y:number;width:number;height:number};
export type RefractionMap={destination:Uint32Array;red:Uint32Array;green:Uint32Array;blue:Uint32Array;alpha:Uint8Array;gain:Float32Array;spectral:Float32Array};
/** Rounded lens geometry is cached. Each colour samples a different point of the real backdrop. */
export function refractionMap(width:number,height:number,shape:Rect,clip:Rect,radius:number,scale:number):RefractionMap{
 const destination:number[]=[],red:number[]=[],green:number[]=[],blue:number[]=[],alpha:number[]=[],gain:number[]=[],spectral:number[]=[],band=Math.min(30*scale,shape.width*.3,shape.height*.3),r=Math.min(radius,shape.width/2,shape.height/2),cx=shape.x+shape.width/2,cy=shape.y+shape.height/2;
 const sample=(x:number,y:number)=>4*(Math.min(height-1,Math.max(0,Math.round(y)))*width+Math.min(width-1,Math.max(0,Math.round(x))));
 for(let y=Math.max(0,Math.floor(clip.y));y<Math.min(height,Math.ceil(clip.y+clip.height));y++)for(let x=Math.max(0,Math.floor(clip.x));x<Math.min(width,Math.ceil(clip.x+clip.width));x++){
  const px=x+.5,py=y+.5,qx=Math.abs(px-cx)-(shape.width/2-r),qy=Math.abs(py-cy)-(shape.height/2-r),ox=Math.max(qx,0),oy=Math.max(qy,0),length=Math.hypot(ox,oy),depth=-(length+Math.min(Math.max(qx,qy),0)-r);
  if(depth<=0||depth>=band)continue;
  const nx=(px<cx?-1:1)*(length?ox/length:qx>qy?1:0),ny=(py<cy?-1:1)*(length?oy/length:qy>=qx?1:0),t=depth/band,bend=38*scale*Math.sin(Math.PI*t),dispersion=(10+40*(1-t))*scale;
  destination.push(4*(y*width+x));red.push(sample(px-nx*(bend+dispersion),py-ny*(bend+dispersion)));green.push(sample(px-nx*bend,py-ny*bend)+1);blue.push(sample(px-nx*(bend-dispersion),py-ny*(bend-dispersion))+2);
  alpha.push(Math.round(200*Math.pow(Math.sin(Math.PI*t),.65)));gain.push(.96+.04*(-nx*.6-ny*.8));spectral.push(.11*Math.sin(2*Math.PI*t));
 }
 return {destination:Uint32Array.from(destination),red:Uint32Array.from(red),green:Uint32Array.from(green),blue:Uint32Array.from(blue),alpha:Uint8Array.from(alpha),gain:Float32Array.from(gain),spectral:Float32Array.from(spectral)};
}
export function refract(destination:Uint8ClampedArray,backdrop:Uint8ClampedArray,map:RefractionMap){
 for(let i=0;i<map.destination.length;i++){
  const d=map.destination[i],a=map.alpha[i]/255,old=destination[d+3]/255,combined=a+old*(1-a),g=map.gain[i],tail=old*(1-a),spectral=map.spectral[i];if(!a)continue;
  destination[d]=(backdrop[map.red[i]]*g*(1+spectral)*a+destination[d]*tail)/combined;
  destination[d+1]=(backdrop[map.green[i]]*g*a+destination[d+1]*tail)/combined;
  destination[d+2]=(backdrop[map.blue[i]]*g*(1-spectral)*a+destination[d+2]*tail)/combined;destination[d+3]=combined*255;
 }
}
