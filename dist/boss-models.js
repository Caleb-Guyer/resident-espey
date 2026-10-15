import {scannedMaterial,microTexture} from './surface-materials.js?v=5.1.2';
import {surfaceMaterial} from './material-surfaces.js?v=5.1.2';
import {artistHead} from './licensed-art.js?v=5.1.2';
import * as T from './vendor/three.module.js?v=5.1.2';
import {sculptSurface,mergeRigid} from './sculpt-surface.js?v=5.1.2';
import {CHARACTER_DESIGNS} from './creature-design.js?v=5.1.2';
const cache=new Map(),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mesh=(parent,geo,mat,at=[0,0,0],scale=[1,1,1])=>{const m=new T.Mesh(geo,mat);m.position.set(...at);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
const tube=(parent,mat,points,r=.006)=>mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(12,points.length*5),r,6,false),mat);
export const BOSS_PROFILES=Object.freeze({
 chris:{height:2.15,spine:1.25,head:1.94,shoulder:1.65,width:.37,hip:.86,step:.027,skin:0xb5a48d},
 jakob:{height:2.6,spine:1.45,head:2.32,shoulder:1.83,width:.31,hip:1.02,step:.026,skin:0xb3a18e},
 zeb:{height:2.7,spine:1.40,head:2.33,shoulder:1.85,width:.56,hip:1.00,step:.027,skin:0x644739},
 birdy:{height:2.5,spine:1.38,head:2.16,shoulder:1.76,width:.28,hip:.96,step:.027,skin:0xb0a291}
});
function materials(world,kind){
 const p=BOSS_PROFILES[kind],skin=world.assets.surfaces?surfaceMaterial(world.assets.surfaces,kind==='zeb'?'infected':'pale',{color:kind==='zeb'?0xe1d5c5:0xc8baaa,roughness:.72}):world.assets.scans?scannedMaterial(world.assets.scans,kind==='zeb'?'dark':'pale',{color:0xf4eee4,roughness:.73,clearcoat:.035,clearcoatRoughness:.7,sheen:.13,sheenColor:0x8b6551}):new T.MeshPhysicalMaterial({color:p.skin,map:world.assets.skin,roughness:.79});
 if(typeof document!=='undefined'){skin.normalMap=microTexture('skin');skin.normalScale.set(.38,.38);}
 const cloth=new T.MeshStandardMaterial({color:kind==='chris'?0x42473d:0x37352e,map:world.procedural('infectedcloth'),roughness:.94}),dark=new T.MeshStandardMaterial({color:0x646457,map:world.procedural('infectedcloth'),roughness:.92});
 return [skin,cloth,dark];
}
function makeRig(kind){
 const p=BOSS_PROFILES[kind],g=new T.Group(),bones=[],segments=[],bone=(parent,pos,segment)=>{const b=new T.Bone();b.position.set(...pos);parent.add(b);bones.push(b);segments.push(segment);return b;};
 const body=bone(g,[0,p.spine,0],[[0,p.hip,0],[0,p.shoulder,0]]),heads=[],arms=[],legs=[],spines=[];
 const fused=kind==='jakob',count=fused?2:1;
 for(let i=0;i<count;i++){
  const cx=fused?(i? .28:-.28):0,spine=fused?bone(body,[cx,.08,0],[[cx,p.hip,0],[cx,p.shoulder,0]]):body;spines.push(spine);
  const sy=fused?p.spine+.08:p.spine,head=bone(spine,[0,p.head-sy,.035],[[cx,p.shoulder,.015],[cx,p.head,.035]]);heads.push(head);
  for(const side of [-1,1]){
   const ax=cx+side*p.width,az=fused&&Math.abs(ax)<.1?.29:0,elbow=[ax+side*(kind==='zeb'?.055:.055),p.shoulder-(kind==='birdy'?.40:.43),.035+az];
   const arm=bone(spine,[side*p.width,p.shoulder-sy,az],[[ax,p.shoulder,az],elbow]);
   const wrist=[elbow[0]+side*(kind==='chris'&&side>0?.1:.025),elbow[1]-(kind==='chris'&&side>0?.53:kind==='birdy'?.55:.42),elbow[2]+.06];
   const fore=bone(arm,[elbow[0]-ax,elbow[1]-p.shoulder,elbow[2]-az],[elbow,wrist]);arm.userData={base:0,forearm:fore,side,restX:ax};fore.userData={base:0,wrist:wrist.map((v,j)=>v-elbow[j])};arms.push(arm);
   const lx=cx+side*(fused?.13:kind==='zeb'?.23:.16),knee=[lx+side*.025,p.hip*.52,.055],ankle=[lx,p.hip*.09,.035];
   const leg=bone(g,[lx,p.hip,0],[[lx,p.hip,0],knee]),calf=bone(leg,[knee[0]-lx,knee[1]-p.hip,knee[2]],[knee,ankle]);leg.userData={calf,side};calf.userData.ankle=ankle.map((v,j)=>v-knee[j]);legs.push(leg);
  }
 }
 return {g,bones,segments,body,heads,arms,legs,spines};
}
function bodyGeometry(kind,rig){
 if(cache.has(kind))return cache.get(kind);const p=BOSS_PROFILES[kind],shapes=[],fused=kind==='jakob';
 const smooth=(a,b,v)=>{const u=clamp((v-a)/(b-a),0,1);return u*u*(3-2*u);},id=b=>rig.bones.indexOf(b),volumes=[{shapes:[],weights:()=>[[id(rig.body),1]]}];let group=0;
 const ell=(...s)=>{shapes.push(s);volumes[group].shapes.push(s);},region=weights=>{volumes.push({shapes:[],weights});group=volumes.length-1;};
 const centers=fused?[-.28,.28]:[0];for(const [i,cx]of centers.entries()){
  region((x,y,z)=>{const neck=smooth(p.head-.43,p.head-.24,y);return [[id(rig.body),1-neck],[id(rig.heads[i]),neck]];});
  const w=kind==='zeb'?.39:kind==='birdy'?.163:.25;
  ell(cx,p.shoulder-.16,-.035,w,.30,kind==='zeb'?.27:.17);ell(cx,p.spine-.13,-.025,w*.76,.34,.14);ell(cx,p.hip,0,w*.79,.17,.155);
  ell(cx,p.head-.23,.023,kind==='zeb'?.115:.07,.17,.07);
  for(const side of [-1,1]){
   // Pectoral, latissimus, deltoid and upper back remain anatomical volumes.
   ell(cx+side*w*.51,p.shoulder-.12,.10,w*.52,.15,.10);ell(cx+side*w*.58,p.shoulder-.26,-.09,w*.5,.19,.14);
   for(let i=0;i<6;i++)ell(cx+side*w*.72,p.shoulder-.24-i*.06,.054,w*.25,.020,.074);for(let i=0;i<3;i++)ell(cx+side*.052,p.spine-.05-i*.079,.111,.048,.050,.039);
  }
 }
 group=0;if(fused){ell(0,1.48,-.055,.24,.38,.19);ell(0,1.91,-.05,.23,.13,.12);ell(0,1.07,-.015,.21,.21,.16);}
 for(const [i,arm]of rig.arms.entries()){
  region((x,y)=>{const elbow=rig.segments[id(arm.userData.forearm)][0][1],fore=1-smooth(elbow-.10,elbow+.10,y);return [[id(arm),1-fore],[id(arm.userData.forearm),fore]];});
  const a=rig.segments[rig.bones.indexOf(arm)][0],b=rig.segments[rig.bones.indexOf(arm)][1],c=rig.segments[rig.bones.indexOf(arm.userData.forearm)][1],heavy=kind==='chris'&&i===1,f=kind==='zeb'?1.5:heavy?1.55:kind==='birdy'?.75:1;
  ell(...a,(kind==='birdy'?.095:.11)*f,kind==='birdy'?.12:.155,.115*f);ell((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,.083*f,(a[1]-b[1])*.64,.085*f);ell(...b,.072*f,.09,.07*f);
  ell((b[0]+c[0])/2,(b[1]+c[1])/2,(b[2]+c[2])/2,.067*f,(b[1]-c[1])*.63,.070*f);ell(...c,.051*f,.075,.042*f);ell(c[0],c[1]-.045,c[2]+.02,.065*f,.09,.038*f);
  if(heavy)for(let j=0;j<4;j++)ell(b[0]+.025*Math.sin(j*2),b[1]-.08-j*.07,b[2]+.05,.11,.095,.075);
 }
 for(const leg of rig.legs){region((x,y)=>{const knee=rig.segments[id(leg.userData.calf)][0][1],calf=1-smooth(knee-.10,knee+.10,y);return [[id(leg),1-calf],[id(leg.userData.calf),calf]];});const a=rig.segments[rig.bones.indexOf(leg)][0],b=rig.segments[rig.bones.indexOf(leg)][1],c=rig.segments[rig.bones.indexOf(leg.userData.calf)][1],f=kind==='zeb'?1.4:kind==='birdy'?.78:1;
  ell((a[0]+b[0])/2,(a[1]+b[1])/2,.015,.12*f,(a[1]-b[1])*.65,.115*f);ell(...b,.078*f,.095,.075*f);ell(c[0],(b[1]+c[1])/2,.035,.082*f,(b[1]-c[1])*.62,.085*f);ell(c[0],.08,.10,.09*f,.065,.18);
 }
 group=0;if(kind==='zeb'){
  ell(-.06,1.64,-.18,.30,.34,.18);ell(.1,1.75,-.17,.34,.24,.18);
  for(let i=0;i<9;i++){const a=i*2.39;ell(Math.cos(a)*.35,1.43+Math.sin(a)*.21,Math.sin(a)*.16,.075,.1,.065);}
 }
 const cloth=(x,y,z)=>kind==='chris'?(y<.91&&Math.abs(x)<.29?2:y>.93&&y<1.68&&Math.abs(x)<.28?1:0):y<(kind==='birdy'?.65:.88)&&Math.abs(x)<(fused?.58:.35)?2:0;
 // Weight the authored muscle volumes, then blend only along each volume's
 // anatomical chain. A wrist or knee passing beside the chest cannot pull it.
 const bindWeights=([x,y,z])=>{
  const fields=volumes.map(v=>{let d=10;for(const [cx,cy,cz,rx,ry,rz]of v.shapes){const e=(Math.hypot((x-cx)/rx,(y-cy)/ry,(z-cz)/rz)-1)*Math.min(rx,ry,rz),h=clamp(.5+.5*(e-d)/.045,0,1);d=e*(1-h)+d*h-.045*h*(1-h);}return d;}),best=Math.min(...fields),weights=new Map();
  volumes.forEach((v,i)=>{const influence=Math.exp(-(fields[i]-best)/.012);if(influence<.0001)return;for(const [bone,w]of v.weights(x,y,z))weights.set(bone,(weights.get(bone)||0)+w*influence);});return [...weights];
 };
 const geo=sculptSurface(shapes,rig.segments,{min:[-1.08,-.06,-.65],max:[1.08,p.head+.02,.58],step:p.step,cloth,bindWeights,smoothWeights:60,scar:kind==='zeb'?.0010:.0006});cache.set(kind,geo);return geo;
}
function bossHair(parent,design,scale){
 const g=new T.Group();parent.add(g);const mat=new T.MeshStandardMaterial({color:design.hair,roughness:.97}),thin=design.style==='thin',curly=design.style==='curly',close=design.style==='close',count=thin?32:curly?150:close?36:110;
 for(let i=0;i<count;i++){
  const phi=.06+(i%23)/23*1.45,theta=i*2.399963,points=[];
  for(let k=0;k<10;k++){const u=k/9,angle=phi+u*(thin?.55:close?.05:.20)+(curly?Math.sin(u*17+i)*.023:0),az=theta+(curly?Math.cos(u*17+i)*.035:u*.07);points.push([(scale[0]+.003)*Math.sin(angle)*Math.cos(az),(scale[1]+.003)*Math.cos(angle),(scale[2]+.003)*Math.sin(angle)*Math.sin(az)]);}
  tube(g,mat,points,thin?.00065:close?.0007:.0010);
 }g.userData={hair:design.style,color:design.hair};mergeRigid(g);return g;
}
function head(world,parent,id,skin){
 const scale=id==='zeb'?[.204,.25,.185]:id==='bobby'?[.181,.235,.165]:id==='birdy'?[.148,.235,.153]:[.165,.23,.155],geo=new T.SphereGeometry(1,56,48),p=geo.attributes.position,uv=geo.attributes.uv;
 const col={chris:0,jakob:1,bobby:2,zeb:0,birdy:1}[id],row=['zeb','birdy'].includes(id)?0:.5;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)*scale[0],y=p.getY(i)*scale[1];let z=p.getZ(i)*scale[2];
  if(z>0){z+=.044*Math.exp(-((x/.025)**2)-((y+.014)/.07)**2);z+=.012*Math.exp(-(((Math.abs(x)-.08)/.045)**2)-((y+.045)/.055)**2);z-=.023*Math.exp(-(((Math.abs(x)-.062)/.034)**2)-((y-.048)/.034)**2);}
  if(z>0){z+=.012*Math.exp(-(((Math.abs(x)-.052)/.040)**2)-((y-.084)/.017)**2);z+=.015*Math.exp(-((x/.028)**2)-((y+.038)/.018)**2);z+=.013*Math.exp(-(((Math.abs(x)-.073)/.039)**2)-((y+.11)/.024)**2);}
  p.setXYZ(i,x*(y<-.11?1-clamp((-y-.11)*2,0,.2):1),y,z);uv.setXY(i,col/3+clamp(x/(scale[0]*3.5)+.5,.02,.98)/3,row+clamp(y/(scale[1]*2.6)+.51,.02,.98)*.5);
 }
 // Remove the front mouth patch; the oral cavity, jaws and teeth have depth.
 const indices=[],mouthIndices=[];for(let i=0;i<geo.index.count;i+=3){const ids=[0,1,2].map(j=>geo.index.getX(i+j)),cx=ids.reduce((n,j)=>n+p.getX(j),0)/3,cy=ids.reduce((n,j)=>n+p.getY(j),0)/3,cz=ids.reduce((n,j)=>n+p.getZ(j),0)/3;
  if(cz>.08&&(cx/.085)**2+((cy+.11)/.022)**2<1){mouthIndices.push(...ids);continue;}
  const eyeX=id==='zeb'?.061:.052;if(cz>.08&&((Math.abs(cx)-eyeX)/.018)**2+((cy-.048)/.011)**2<1)continue;indices.push(...ids);
 }geo.setIndex(indices);geo.computeVertexNormals();
 const design=CHARACTER_DESIGNS[id]||{skin:0xb5a48d,hair:0x211d17,style:'straight'},base=new T.Color(design.skin).toArray();
 const faceMat=new T.MeshPhysicalMaterial({color:0xffffff,map:world.assets.boss||world.assets.face,bumpMap:world.assets.boss||world.assets.face,bumpScale:.0013,roughness:.78,clearcoat:.025,sheen:.12});
 if(typeof document!=='undefined'){faceMat.normalMap=microTexture('skin');faceMat.normalScale.set(.24,.24);}
 const scan=world.assets.scans;
 const hairColor=new T.Color(design.hair).toArray();faceMat.onBeforeCompile=s=>{if(scan)s.uniforms.faceScan={value:scan};s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 bossHeadPos;').replace('#include <begin_vertex>','#include <begin_vertex>\nbossHeadPos=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 bossHeadPos;'+(scan?'\nuniform sampler2D faceScan;':'')).replace('#include <map_fragment>',`vec4 portrait=texture2D(map,vMapUv);float front=smoothstep(.050,.125,bossHeadPos.z);vec3 sideSkin=${scan?`texture2D(faceScan,vec2(${id==='zeb'?'.5':'0.'},.5)+(.02+fract(bossHeadPos.xy*2.2)*.96)*.5).rgb*.93`:`vec3(${base.join(',')})`};diffuseColor.rgb*=mix(sideSkin,portrait.rgb,front);`);};
 faceMat.customProgramCacheKey=()=>`boss-portrait-v2-${id}`;
 const face=mesh(parent,geo,faceMat),coverGeo=geo.clone();coverGeo.setIndex(mouthIndices);coverGeo.computeVertexNormals();const mouthCover=mesh(parent,coverGeo,faceMat);const jaw=new T.Group();jaw.position.set(0,-.09,.035);parent.add(jaw);
 const dark=new T.MeshStandardMaterial({color:0x1d1110,roughness:.43}),lip=new T.MeshStandardMaterial({color:id==='zeb'?0x503326:0x786055,roughness:.55});
 mesh(parent,new T.SphereGeometry(1,24,16),dark,[0,-.113,.085],[.069,.027,.027]);
 const teeth=[0x9a8c6b,0x7d7257,0xa69b80,0x645b48].map(color=>new T.MeshStandardMaterial({color,roughness:.61})),toothGeo=()=>{const g=new T.SphereGeometry(1,16,12),a=g.attributes.position;for(let i=0;i<a.count;i++)a.setX(i,a.getX(i)*(1-.3*Math.max(0,a.getY(i))));g.computeVertexNormals();return g;};
 for(let i=0;i<11;i++){const x=(i-5)*.0126,z=.125-.38*x*x,v=.82+.18*Math.sin(i*2.13+id.length),canine=i===2||i===8,broken=i===(id==='birdy'?7:id==='zeb'?3:9);const upper=mesh(parent,toothGeo(),teeth[i%4],[x,-.1+Math.sin(i*1.8)*.0025,z],[.0051*v,(canine?.014:.010)*v*(broken?.48:1),.006]);upper.rotation.z=Math.sin(i*2.1)*.12;const lower=mesh(jaw,toothGeo(),teeth[(i+2)%4],[x,-.034+Math.cos(i*2.4)*.0015,z-.035],[.0047*v,.0085*v,.0055]);lower.rotation.z=-Math.sin(i*1.4)*.13;}
 tube(parent,lip,[[-.076,-.11,.112],[-.046,-.095,.127],[0,-.095,.139],[.046,-.095,.127],[.076,-.11,.112]],.005);
 tube(jaw,lip,[[-.077,-.025,.102],[-.043,-.040,.120],[0,-.044,.120],[.045,-.040,.12],[.077,-.025,.10]],.005);
 const inside=new T.Group();for(const o of [...parent.children])if(o!==face&&o!==mouthCover&&o!==jaw)inside.add(o);parent.add(inside);mergeRigid(inside);const oralParts=[inside];
 const eyes=[];for(const side of [-1,1]){
  const eye=new T.Group();eye.position.set(side*(id==='zeb'?.061:.052),.048,.125);parent.add(eye);eyes.push(eye);
  const sclera=new T.MeshPhysicalMaterial({color:id==='zeb'?0x756a55:0x8a8777,roughness:.29,clearcoat:.3});mesh(eye,new T.SphereGeometry(.015,32,24),sclera);
  const irisMaterial=new T.MeshPhysicalMaterial({color:id==='birdy'?0x55492f:id==='zeb'?0x53482f:0x51625d,roughness:.26,clearcoat:.35});const iris=mesh(eye,new T.SphereGeometry(1,28,20),irisMaterial,[0,0,.0145],[.0075,.0075,.0025]),pupil=mesh(eye,new T.SphereGeometry(1,24,16),dark,[0,0,.017],[.0033,.004,.001]);
  const cornea=new T.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:id==='chris'&&side>0?.12:.035,roughness:.12,clearcoat:.65,depthWrite:false});mesh(eye,new T.SphereGeometry(.0158,28,20),cornea);
  for(const sign of[-1,1])tube(eye,skin,[[-.018,0,.004],[-.012,sign*.007,.010],[0,sign*.010,.011],[.013,sign*.007,.009],[.018,0,.004]],.002);
  const lid=mesh(eye,new T.SphereGeometry(1,32,22),skin,[0,.016,.017],[.020,.006,.0035]);eye.userData={iris,pupil,lid,physicalEye:true};
  const ear=mesh(parent,new T.SphereGeometry(1,20,14),skin,[side*.164,-.015,.018],[.023,.043,.027]);ear.userData.legacyEar=true;
 }
 const hair=bossHair(parent,design,scale);
 for(let i=0;i<4;i++)tube(parent,lip,[[-.12+i*.028,-.045,.131],[-.115+i*.024,-.08,.144],[-.10+i*.02,-.13,.13]],.0017);
 const closed=p.array.slice(),open=closed.slice();for(let i=0;i<p.count;i++){const y=p.getY(i),x=p.getX(i),z=p.getZ(i),w=Math.exp(-((x/.095)**2))*clamp((-y-.08)/.10,0,1)*clamp(z/.1,0,1);open[i*3+1]-=.10*w;}geo.morphAttributes.position=[new T.Float32BufferAttribute(open,3)];face.updateMorphTargets();
 mergeRigid(jaw);mergeRigid(hair);
 if(world.licensed){const replacement=artistHead(world.licensed,id);parent.add(replacement);face.visible=mouthCover.visible=false;jaw.visible=false;inside.visible=false;eyes.forEach(e=>e.visible=false);parent.traverse(o=>{if(o.userData.legacyEar)o.visible=false;});return {face:replacement,jaw,eyes,hair,design,mouthCover,oralParts:[inside],artistHead:true};}
 return {face,jaw,eyes,hair,design,mouthCover,oralParts};
}
function featherGeometry(length,width,curve){
 const positions=[],uv=[];const point=(t,side)=>{const w=width*Math.sin(Math.PI*(.06+.94*t))*(1-.6*t)*(1+.05*Math.sin(t*72));return [side*w,-t*length,Math.sin(t*Math.PI)*curve+side*side*.009];};
 for(let i=0;i<18;i++){const a=i/18,b=(i+1)/18;for(const [t,s]of [[a,-1],[a,1],[b,1],[a,-1],[b,1],[b,-1]]){positions.push(...point(t,s));uv.push((s+1)/2,t);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
function wings(g,skin,world){
 const d=g.userData,feather=world.assets.scans?scannedMaterial(world.assets.scans,'feather',{color:0xf1ebdd,roughness:.72,side:T.DoubleSide,sheen:.42,sheenColor:0xa4937b}):new T.MeshPhysicalMaterial({color:0x585048,roughness:.68,side:T.DoubleSide,sheen:.28});d.wings=[];d.wingWrists=[];d.wingspan=6.8;d.wingStumps=[];d.detachedWings=[];
 for(const side of [-1,1]){
  const pivot=new T.Group();pivot.position.set(side*.22,.35,-.08);d.body.add(pivot);d.wings.push(pivot);const wrist=new T.Group();wrist.position.set(side*1.23,.20,-.06);pivot.add(wrist);d.wingWrists.push(wrist);
  tube(pivot,skin,[[0,0,0],[side*.32,.23,-.02],[side*.76,.31,-.06],[side*1.25,.20,-.06]],.036);tube(wrist,skin,[[0,0,0],[side*.57,-.02,-.025],[side*1.22,-.18,0],[side*1.95,-.45,.04]],.019);
  for(let i=0;i<17;i++){
   const f=mesh(wrist,featherGeometry(.74+Math.sin(i/16*Math.PI)*.37,.104,.14),feather,[side*(i/16)*1.8,-.04-(i/16)*.22-(i/16)**2*.20,.035]);f.rotation.z=side*(-.10+i/16*.52);
   tube(wrist,feather,[[side*i/16*1.8,-.10-i/16*.18,.035],[side*(i/16*1.8+.09),-.55-i/16*.39,.1],[side*(i/16*1.8+.1),-.72-i/16*.6,.06]],.0025);
  }
  for(let row=0;row<3;row++)for(let i=0;i<15;i++){const f=mesh(pivot,featherGeometry(.43+row*.16,.077,.07),feather,[side*(.15+i/14*1.16),.12+Math.sin(i/14*Math.PI)*.15-row*.11-i/14*.15,.055+row*.009]);f.rotation.z=side*(.02+i/14*.18);}
  mergeRigid(wrist);mergeRigid(pivot);
  const wound=new T.MeshPhysicalMaterial({color:0x74392e,roughness:.36,clearcoat:.22});const stump=new T.Group();stump.position.copy(pivot.position);d.body.add(stump);mesh(stump,new T.SphereGeometry(1,36,24),wound,[side*.04,0,0],[.065,.071,.04]);tube(stump,skin,[[0,0,0],[side*.16,.025,-.02],[side*.21,-.035,-.01]],.025);stump.visible=false;d.wingStumps.push(stump);
  const detached=pivot.clone(true);detached.position.set(side*1.45,.045,side*.3);detached.rotation.set(-Math.PI/2,side*.15,side*.11);detached.visible=false;detached.scale.setScalar(0);g.add(detached);d.detachedWings.push(detached);

 }
}
export function createBossModel(world,kind){
 const rig=makeRig(kind),{g,body,heads,arms,legs,spines}=rig,mats=materials(world,kind);
 const skin=new T.SkinnedMesh(bodyGeometry(kind,rig),mats);skin.castShadow=skin.receiveShadow=true;skin.frustumCulled=false;g.add(skin);g.updateMatrixWorld(true);skin.bind(new T.Skeleton(rig.bones));
 g.userData={kind,human:false,bossRig:true,body,head:heads[0],heads,arms,legs,skin,spines,phase:0,restSpine:BOSS_PROFILES[kind].spine,design:CHARACTER_DESIGNS[kind]||{skin:BOSS_PROFILES[kind].skin},identity:kind,detail:'sculpted muscle and scar tissue',jaws:[],eyes:[],faces:[],mouthCovers:[],oralParts:[]};
 const ids=kind==='jakob'?['jakob','bobby']:[kind];heads.forEach((h,i)=>{const detail=head(world,h,ids[i],mats[0]);g.userData.oralParts.push(detail.oralParts);g.userData.faces.push(detail.face);g.userData.jaws.push(detail.jaw);g.userData.eyes.push(detail.eyes);g.userData.mouthCovers.push(detail.mouthCover);h.userData.identity=ids[i];h.userData.restHeadY=h.position.y;});g.userData.face=g.userData.faces[0];g.userData.jaw=g.userData.jaws[0];
 if(kind==='jakob'){g.userData.identities=ids;g.userData.twins=spines;spines.forEach((s,i)=>s.userData={...s.userData,design:CHARACTER_DESIGNS[ids[i]],identity:ids[i],head:heads[i]});}
 const tendon=new T.MeshStandardMaterial({color:kind==='zeb'?0x51392d:0x816d57,roughness:.76}),bone=new T.MeshStandardMaterial({color:0xb6aa8e,roughness:.61});
 arms.forEach((arm,i)=>{const fore=arm.userData.forearm,[wx,wy,wz]=fore.userData.wrist;for(let f=0;f<4;f++){const x=wx+(f-1.5)*.027,len=kind==='chris'&&i===1?.23:kind==='birdy'?.19:.13;tube(fore,mats[0],[[x,wy-.03,wz+.025],[x+(f-1.5)*.006,wy-len*.55,wz+.04],[x+(f-1.5)*.012,wy-len,wz+.07]],.010);tube(fore,bone,[[x+(f-1.5)*.012,wy-len,wz+.07],[x+(f-1.5)*.016,wy-len-.055,wz+.095]],.0045);}
  const side=arm.userData.side;tube(fore,mats[0],[[wx+side*.05,wy+.025,wz+.02],[wx+side*.09,wy-.055,wz+.075],[wx+side*.075,wy-.11,wz+.1]],.012);
  for(let f=0;f<3;f++)tube(fore,tendon,[[(f-1)*.025,-.11,.083],[(f-1)*.019,wy+.035,wz+.03]],.0025);mergeRigid(fore);
 });
 // Scars, stretched tendons and folds follow the rig, including the fused seam.
 const wet=new T.MeshPhysicalMaterial({color:kind==='zeb'?0x34231d:0x734b3d,roughness:.42,clearcoat:.13}),scar=new T.MeshStandardMaterial({color:kind==='zeb'?0x836951:0xc0a593,roughness:.86});
 for(const side of[-1,1]){
  for(let i=0;i<6;i++)tube(body,scar,[[side*(.08+i*.016),.21-i*.02,.155],[side*(.15+i*.008),.15-i*.024,.174],[side*.19,.06-i*.017,.151]],.0018);
  for(let i=0;i<4;i++)tube(body,wet,[[side*.12,.37-i*.105,.123],[side*.20,.31-i*.105,.165],[side*.22,.27-i*.105,.135]],.003);
 }
 if(kind==='chris'){const fore=arms[1].userData.forearm;for(let i=0;i<5;i++){mesh(fore,new T.SphereGeometry(1,32,20),wet,[.065,-.10-i*.061,.075],[.044,.034,.028]);tube(fore,bone,[[.05,-.09-i*.065,.098],[.08,-.105-i*.065,.130],[.093,-.14-i*.065,.09]],.009);}}
 if(kind==='jakob'){for(let i=0;i<7;i++){const y=.34-i*.094;mesh(body,new T.SphereGeometry(1,24,20),wet,[0,y,.198],[.03,.038,.027]);tube(body,scar,[[-.054,y+.016,.187],[0,y-.015,.228],[.060,y+.010,.18]],.003);}}
 if(kind==='birdy'){wings(g,mats[0],world);g.userData.hair='thin brown';}
 if(kind==='jakob')for(let i=0;i<15;i++){const y=i*.038-.27;tube(body,tendon,[[-.15,y,.17],[0,y+.009,.209],[.15,y-.006,.17]],.0038);}
 if(kind==='zeb'){
  g.userData.bileSacs=[];const bile=new T.MeshPhysicalMaterial({color:0x73734f,roughness:.29,clearcoat:.5});for(const side of [-1,1]){const sac=mesh(body,new T.SphereGeometry(1,36,24),bile,[side*.24,.2,.255],[.075,.13,.055]);g.userData.bileSacs.push(sac);for(let j=0;j<4;j++)tube(body,tendon,[[side*.15,.42,.22],[side*(.18+j*.019),.22,.3],[side*.2,.03,.24]],.003);}
  for(let i=0;i<8;i++)tube(body,tendon,[[.18*Math.sin(i),.44-i*.08,-.24],[.28*Math.sin(i+.2),.40-i*.08,-.28]],.014);
 }
 for(const s of spines)mergeRigid(s);for(const h of heads)mergeRigid(h);g.updateMatrixWorld(true);return g;
}

