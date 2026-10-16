import * as T from './vendor/three.module.js?v=5.5.2';
import {preparedGeometry} from './prepared-geometry.js?v=5.5.2';

// A continuous isosurface replaces the visible ball/cylinder joints. Generate
// each archetype once at loading time; instances own their disposable geometry.
const cache=new Map(),tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function segmentDistance(x,y,z,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],u=clamp(((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/(dx*dx+dy*dy+dz*dz||1),0,1);return (x-a[0]-dx*u)**2+(y-a[1]-dy*u)**2+(z-a[2]-dz*u)**2;}
function profile(kind){
 const human=['player','npc','gentleman'].includes(kind),bare=['zsiga','jakob','jakobHalf','zeb','crawler','stalker'].includes(kind),long=kind==='jakob'?1.28:['zsiga','stalker','jakobHalf'].includes(kind)?1.12:1;
 return {human,bare,long,torso:kind==='zeb'?1.48:kind==='brute'?1.32:kind==='zsiga'||kind==='stalker'?.8:1};
}
function geometryFor(kind){
 const p=profile(kind),key=JSON.stringify(p);if(cache.has(key))return cache.get(key).clone();
 const prepared=p.human&&preparedGeometry('human');if(prepared)return prepared.clone();
 const shapes=[],ell=(x,y,z,rx,ry,rz)=>shapes.push([x,y,z,rx,ry,rz]);
 const f=p.torso;
 ell(0,1.22,0,.235*f,.22,.143*f);ell(0,1.04,0,.172*f,.24,.13*f);ell(0,.79,0,.183*f,.135,.145*f);ell(0,1.48,.018,.065,.115,.061);
 const segments=[[[0,.73,0],[0,1.43,0]],[[0,1.43,.018],[0,1.6,.025]]];
 for(const side of[-1,1]){
  ell(side*.22,1.345,0,.105,.12,.104);ell(side*.29,1.19,.012,.075,.185,.079);ell(side*.316,1.047,.03,.061,.07,.061);
  ell(side*.323,.92-(p.long-1)*.1,.045,.06,.16*p.long,.055);ell(side*.325,.75-(p.long-1)*.3,.062,.037,.073,.036);ell(side*.326,.686-(p.long-1)*.3,.066,.051,.081,.03);
  ell(side*.126,.6,.008,.096,.218,.10);ell(side*.14,.406,.03,.067,.081,.07);ell(side*.138,.26,.018,.069,.18,.073);ell(side*.135,.095,.008,.045,.082,.051);ell(side*.135,.054,.065,.08,.052,.141);
  segments.push([[side*.265,1.35,0],[side*.315,1.045,.025]]);
 }
 for(const side of[-1,1])segments.push([[side*.315,1.045,.025],[side*.325,.73-(p.long-1)*.3,.062]]);
 for(const side of[-1,1])segments.push([[side*.13,.75,0],[side*.14,.4,.03]]);
 for(const side of[-1,1])segments.push([[side*.14,.4,.03],[side*.135,.07,.045]]);
 const field=(x,y,z)=>{
  let d=10;for(const [cx,cy,cz,rx,ry,rz]of shapes){const q=Math.sqrt(((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2),e=(q-1)*Math.min(rx,ry,rz),k=.045,h=clamp(.5+.5*(e-d)/k,0,1);d=e*(1-h)+d*h-k*h*(1-h);}
  // Small asymmetric folds and scar tissue affect silhouette as well as shading.
  return d+(p.bare?.0022:.0032)*Math.sin(y*83+x*21)*Math.sin(z*49+x*19);
 };
 const step=.027,nx=43,ny=64,nz=27,origin=[-.567,-.027,-.324],values=new Float32Array(nx*ny*nz),id=(x,y,z)=>(z*ny+y)*nx+x;
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)values[id(x,y,z)]=field(origin[0]+x*step,origin[1]+y*step,origin[2]+z*step);
 const positions=[],uvs=[],indices=[[],[],[]],lookup=new Map();
 const vertex=(a,b,pa,pb)=>{
  const key=a<b?a+','+b:b+','+a;if(lookup.has(key))return lookup.get(key);
  const u=values[a]/(values[a]-values[b]),v=positions.length/3,x=pa[0]+(pb[0]-pa[0])*u,y=pa[1]+(pb[1]-pa[1])*u,z=pa[2]+(pb[2]-pa[2])*u;
  positions.push(x,y,z);uvs.push(Math.atan2(x,z)/(Math.PI*2)+.5,y*1.8);lookup.set(key,v);return v;
 };
 const emit=(ids,away)=>{
  const a=ids[0]*3,b=ids[1]*3,c=ids[2]*3,ab=[positions[b]-positions[a],positions[b+1]-positions[a+1],positions[b+2]-positions[a+2]],ac=[positions[c]-positions[a],positions[c+1]-positions[a+1],positions[c+2]-positions[a+2]];
  const dot=(ab[1]*ac[2]-ab[2]*ac[1])*away[0]+(ab[2]*ac[0]-ab[0]*ac[2])*away[1]+(ab[0]*ac[1]-ab[1]*ac[0])*away[2];if(dot<0)[ids[1],ids[2]]=[ids[2],ids[1]];
  const x=(positions[a]+positions[b]+positions[c])/3,y=(positions[a+1]+positions[b+1]+positions[c+1])/3;
  const slot=p.bare?0:y<.82&&Math.abs(x)<.25?2:y>1.46&&Math.abs(x)<.10||Math.abs(x)>.245&&y<1.04?0:1;indices[slot].push(...ids);
 };
 for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
  const ci=corners.map(([dx,dy,dz])=>id(x+dx,y+dy,z+dz));if(ci.every(i=>values[i]>=0)||ci.every(i=>values[i]<0))continue;
  const cp=corners.map(([dx,dy,dz])=>[origin[0]+(x+dx)*step,origin[1]+(y+dy)*step,origin[2]+(z+dz)*step]);
  for(const t of tetra){const inside=t.filter(i=>values[ci[i]]<0),outside=t.filter(i=>values[ci[i]]>=0);if(!inside.length||!outside.length)continue;
   const center=list=>list.reduce((a,i)=>a.map((v,j)=>v+cp[i][j]/list.length),[0,0,0]),ic=center(inside),oc=center(outside),away=oc.map((v,i)=>v-ic[i]);
   const v=(i,j)=>vertex(ci[i],ci[j],cp[i],cp[j]);
   if(inside.length===1)emit(outside.map(j=>v(inside[0],j)),away);
   else if(outside.length===1)emit(inside.map(j=>v(outside[0],j)),away);
   else{const[a,b]=inside,[c,d]=outside,q=[v(a,c),v(a,d),v(b,d),v(b,c)];emit([q[0],q[1],q[2]],away);emit([q[0],q[2],q[3]],away);}
  }
 }
 const skinIndex=[],skinWeight=[];
 for(let i=0;i<positions.length;i+=3){const [x,y,z]=positions.slice(i,i+3),weights=segments.map((s,j)=>[j,Math.exp(-segmentDistance(x,y,z,...s)/.0038)]).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=weights.reduce((n,w)=>n+w[1],0)||1;for(const[j,w]of weights){skinIndex.push(j);skinWeight.push(w/sum);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeight,4));
 geo.setIndex(indices.flat());let offset=0;indices.forEach((a,i)=>{if(a.length)geo.addGroup(offset,a.length,i);offset+=a.length;});geo.computeVertexNormals();geo.computeBoundingSphere();cache.set(key,geo);return geo.clone();
}
export function createAnatomy(kind,materials){
 const g=new T.Group(),p=profile(kind),bones=[];
 const bone=(parent,x,y,z)=>{const b=new T.Bone();b.position.set(x,y,z);parent.add(b);return b;};
 const body=bone(g,0,1.02,0),head=bone(body,0,.6,.025);bones.push(body,head);
 const arms=[-1,1].map(side=>bone(body,side*.265,.33,0));bones.push(...arms);
 const forearms=arms.map((a,i)=>bone(a,[-1,1][i]*.05,-.305,.025));bones.push(...forearms);
 const legs=[-1,1].map(side=>bone(g,side*.13,.75,0));bones.push(...legs);
 const calves=legs.map((l,i)=>bone(l,[-1,1][i]*.01,-.35,.03));bones.push(...calves);
 arms.forEach((a,i)=>{a.userData.base=p.human?-.08:-.22;a.userData.forearm=forearms[i];forearms[i].userData.base=p.human?-.1:-.15;});legs.forEach((l,i)=>l.userData.calf=calves[i]);
 g.updateMatrixWorld(true);const skin=new T.SkinnedMesh(geometryFor(kind),materials);skin.castShadow=skin.receiveShadow=true;skin.frustumCulled=false;g.add(skin);skin.bind(new T.Skeleton(bones));
 g.userData={kind,human:p.human,body,head,arms,legs,skin,phase:Math.random()*8,jaw:new T.Group()};head.add(g.userData.jaw);g.userData.jaw.position.set(0,-.14,.02);return g;
}
export function animateCollapse(g,elapsed){
 const u=clamp(elapsed/.72,0,1),ease=1-(1-u)**3;
 g.rotation.x=-Math.PI*.48*ease;g.position.y=.11*ease;g.userData.body.rotation.x=.22*Math.sin(u*Math.PI);g.userData.arms.forEach((a,i)=>{a.rotation.x=-.35+ease*.7;a.rotation.z=(i?1:-1)*ease*.43;});g.userData.legs.forEach((l,i)=>{l.rotation.x=-(i?.16:.31)*ease;l.userData.calf.rotation.x=.5*ease;});g.userData.head.rotation.x=.26*ease;return u===1;
}
