import * as T from './vendor/three.module.js?v=5.4.2';
// Rounded cross-sections lofted through a silhouette; receiver shoulders and
// stocks taper continuously instead of ending in bevelled rectangular blocks.
export function profileGeometry(sections,round=.25){
 const pos=[],uv=[],index=[],ring=40;for(let j=0;j<sections.length;j++){const[z,w,h,cy=0]=sections[j],rx=w/2,ry=h/2,r=Math.min(rx,ry)*round;
  for(let k=0;k<ring;k++){const corner=Math.floor(k/10),a=(k%10)/9*Math.PI/2+corner*Math.PI/2,cx=corner===0||corner===3?rx-r:-rx+r,cyCorner=corner<2?ry-r:-ry+r;pos.push(cx+Math.cos(a)*r,cy+cyCorner+Math.sin(a)*r,z);uv.push(k/ring,j/(sections.length-1));if(j<sections.length-1){const next=(k+1)%ring,a0=j*ring+k,b=j*ring+next,c=(j+1)*ring+k,d=(j+1)*ring+next;index.push(a0,b,c,b,d,c);}}
 }
 for(const j of[0,sections.length-1]){const center=pos.length/3,[z,,,cy=0]=sections[j];pos.push(0,cy,z);uv.push(.5,.5);for(let k=0;k<ring;k++){const a=j*ring+k,b=j*ring+(k+1)%ring;index.push(...(j===0?[center,b,a]:[center,a,b]));}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();g.computeBoundingSphere();g.userData.profileSurface=true;return g;
}
