const image=(svg:string)=>'data:image/svg+xml,'+encodeURIComponent(svg);
// Neutral displacement in the centre, increasingly strong refraction toward the four edges.
const displacement=image(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><linearGradient id="x"><stop stop-color="#ff0000"/><stop offset=".065" stop-color="#a00000"/><stop offset=".18" stop-color="#800000"/><stop offset=".82" stop-color="#800000"/><stop offset=".935" stop-color="#600000"/><stop offset="1" stop-color="#000000"/></linearGradient><linearGradient id="y" x2="0" y2="1"><stop stop-color="#00ff00"/><stop offset=".065" stop-color="#00a000"/><stop offset=".18" stop-color="#008000"/><stop offset=".82" stop-color="#008000"/><stop offset=".935" stop-color="#006000"/><stop offset="1" stop-color="#000000"/></linearGradient></defs><rect width="512" height="512" fill="url(#x)"/><rect width="512" height="512" fill="url(#y)" style="mix-blend-mode:screen"/></svg>`);

export function GlassMaterial(){return <>
 <svg className="glass-definitions" aria-hidden="true" focusable="false"><defs>
  <filter id="liquid-refraction" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB" primitiveUnits="objectBoundingBox">
   <feImage href={displacement} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map"/>
   <feDisplacementMap in="SourceGraphic" in2="map" scale=".04" xChannelSelector="R" yChannelSelector="G" result="red-bend"/>
   <feColorMatrix in="red-bend" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
   <feDisplacementMap in="SourceGraphic" in2="map" scale=".046" xChannelSelector="R" yChannelSelector="G" result="green-bend"/>
   <feColorMatrix in="green-bend" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
   <feDisplacementMap in="SourceGraphic" in2="map" scale=".052" xChannelSelector="R" yChannelSelector="G" result="blue-bend"/>
   <feColorMatrix in="blue-bend" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
   <feComposite in="red" in2="green" operator="arithmetic" k2="1" k3="1" result="red-green"/>
   <feComposite in="red-green" in2="blue" operator="arithmetic" k2="1" k3="1" result="dispersion"/>
   <feGaussianBlur in="dispersion" stdDeviation=".0004"/>
  </filter>
  <filter id="liquid-control" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB" primitiveUnits="objectBoundingBox">
   <feImage href={displacement} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map"/>
   <feDisplacementMap in="SourceGraphic" in2="map" scale=".38" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="liquid-tension" x="-30%" y="-70%" width="160%" height="240%" colorInterpolationFilters="sRGB">
   <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="soft"/>
   <feColorMatrix in="soft" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/>
  </filter>
 </defs></svg>
 <div className="ambient-scene" aria-hidden="true"><div className="ambient-ribbon ribbon-coral"/><div className="ambient-ribbon ribbon-rose"/><div className="ambient-ribbon ribbon-violet"/><div className="ambient-ribbon ribbon-gold"/><div className="ambient-pearl"/></div>
 </>;}
