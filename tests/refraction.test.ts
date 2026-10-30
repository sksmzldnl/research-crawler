import {it,expect} from 'vitest';
import {refractionMap,refract} from '../src/refraction-map';
it('bends and separates colour channels only in a wide rounded edge, leaving central text clear',()=>{
 const width=160,height=120,map=refractionMap(width,height,{x:20,y:10,width:120,height:100},{x:20,y:10,width:120,height:100},20,1),source=new Uint8ClampedArray(width*height*4),result=new Uint8ClampedArray(source.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=4*(y*width+x);source[p]=x;source[p+1]=x;source[p+2]=x;source[p+3]=255;}
 refract(result,source,map);const side=4*(60*width+30),centre=4*(60*width+80);
 expect(result[side+3]).toBeGreaterThan(100);expect(result[side]).toBeGreaterThan(result[side+1]+3);expect(result[side+1]).toBeGreaterThan(result[side+2]+3);expect(result[side+1]).toBeGreaterThan(source[side+1]+10);expect(result[centre+3]).toBe(0);expect(result[4*(10*width+20)+3]).toBe(0);
 expect(Array.from({length:30},(_,x)=>result[4*(60*width+20+x)+3]).filter(a=>a>5).length).toBeGreaterThan(20);
});
it('refracts new backdrop colours through the same cached lens, with no fixed rainbow paint',()=>{
 const map=refractionMap(80,80,{x:0,y:0,width:80,height:80},{x:0,y:0,width:80,height:80},20,1),red=new Uint8ClampedArray(80*80*4),blue=new Uint8ClampedArray(red.length),result=new Uint8ClampedArray(red.length);
 for(let p=0;p<red.length;p+=4){red[p]=180;red[p+3]=blue[p+3]=255;blue[p+2]=180;}
 refract(result,red,map);expect(result[4*(40*80+10)]).toBeGreaterThan(100);expect(result[4*(40*80+10)+2]).toBe(0);result.fill(0);refract(result,blue,map);expect(result[4*(40*80+10)]).toBe(0);expect(result[4*(40*80+10)+2]).toBeGreaterThan(100);
});
it('clips a tall offscreen panel without inventing an edge across its visible middle',()=>{
 const map=refractionMap(100,80,{x:10,y:-300,width:80,height:800},{x:10,y:0,width:80,height:80},20,.5),pixels=new Set(map.destination);
 expect(pixels.has(4*(40*100+12))).toBe(true);expect(pixels.has(4*(40*100+50))).toBe(false);expect(map.destination.every(p=>p>=0&&p<100*80*4)).toBe(true);
});
