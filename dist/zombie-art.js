import * as T from './vendor/three.module.js?v=5.2.0';
import {REGIONS} from './zombie-damage.js?v=5.2.0';
const V=new T.Vector3(),M=new T.Matrix4(),Q=new T.Quaternion();
const ik={hip:new T.Vector3(),knee:new T.Vector3(),end:new T.Vector3(),target:new T.Vector3(),dir:new T.Vector3(),bend:new T.Vector3(),from:new T.Vector3(),to:new T.Vector3(),q:new T.Quaternion(),parent:new T.Quaternion(),world:new T.Quaternion()};
function aimBone(joint,child,target){
 const s=ik;joint.getWorldPosition(s.from);child.getWorldPosition(s.to);s.to.sub(s.from).normalize();s.from.copy(target).sub(joint.getWorldPosition(V)).normalize();s.q.setFromUnitVectors(s.to,s.from);joint.getWorldQuaternion(s.world);joint.parent.getWorldQuaternion(s.parent).invert();joint.quaternion.copy(s.parent.multiply(s.q.multiply(s.world)));joint.updateMatrixWorld(true);
}
function groundLimb(root,start,middle,end,x,y,z){
 const s=ik;start.getWorldPosition(s.hip);middle.getWorldPosition(s.knee);end.getWorldPosition(s.end);const upper=s.hip.distanceTo(s.knee),lower=s.knee.distanceTo(s.end);s.target.set(x,y,z).applyMatrix4(root.matrixWorld);s.dir.copy(s.target).sub(s.hip);const distance=Math.min(upper+lower-.001,Math.max(.01,s.dir.length()));s.dir.normalize();s.target.copy(s.hip).addScaledVector(s.dir,distance);const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));s.bend.set(0,1,0).addScaledVector(s.dir,-s.dir.y).normalize();s.knee.copy(s.hip).addScaledVector(s.dir,along).addScaledVector(s.bend,height);aimBone(start,middle,s.knee);aimBone(middle,end,s.target);
}
// Triangles, rather than individual vertices, own a region. This preserves the
// imported UVs and weights and makes the same cut in colour and shadow passes.
export function prepareZombieGeometry(scene,resources=new Set()){
 scene.traverse(o=>{
  if(!o.isSkinnedMesh||o.geometry.userData.zombieRegions)return;
  const source=o.geometry,p=source.attributes.position,g=new T.BufferGeometry(),attributes=Object.fromEntries(Object.keys(source.attributes).map(k=>[k,[]])),region=[],indices=[],lookup=new Map(),lists=Array.from({length:6},()=>[]),count=source.index?.count||p.count;
  for(let i=0;i<count;i+=3){const ids=[0,1,2].map(n=>source.index?source.index.getX(i+n):i+n);let x=0,y=0;for(const id of ids){x+=p.getX(id)/3;y+=p.getY(id)/3;}
   const r=y>=1.495?1:y<.87?(x>0?4:5):Math.abs(x)>.265?(x>0?2:3):0;
   // Reuse vertices within a region. Only vertices on a cut boundary need a
   // duplicate, avoiding repeated skinning of every corner of every triangle.
   for(const id of ids){const key=id*6+r;let vertex=lookup.get(key);if(vertex===undefined){vertex=region.length;lookup.set(key,vertex);region.push(r);for(const [name,a]of Object.entries(source.attributes))for(let c=0;c<a.itemSize;c++)attributes[name].push(c===0?a.getX(id):c===1?a.getY(id):c===2?a.getZ(id):a.getW(id));}indices.push(vertex);lists[r].push(vertex);}
  }
  for(const [name,values]of Object.entries(attributes))g.setAttribute(name,new T.Float32BufferAttribute(values,source.attributes[name].itemSize));g.setIndex(indices);g.computeBoundingSphere();
  g.setAttribute('zombieRegion',new T.Float32BufferAttribute(region,1));g.userData.zombieRegions=true;
  g.userData.pieces=lists.map(ids=>{if(!ids.length)return null;const piece=new T.BufferGeometry();for(const [name,a]of Object.entries(g.attributes))piece.setAttribute(name,a);piece.setIndex(ids);piece.computeBoundingSphere();resources.add(piece);return piece;});
  resources.add(g);o.geometry=g;
 });
}
export function regionMaterial(material,mask){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=s=>{
  previous?.(s);s.uniforms.zombieMask={value:mask};
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float zombieRegion;varying float woundRegion;').replace('#include <begin_vertex>','#include <begin_vertex>\nwoundRegion=zombieRegion;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float woundRegion;uniform float zombieMask[6];');
  s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat regionVisible=zombieMask[0];if(woundRegion>.5)regionVisible=zombieMask[1];if(woundRegion>1.5)regionVisible=zombieMask[2];if(woundRegion>2.5)regionVisible=zombieMask[3];if(woundRegion>3.5)regionVisible=zombieMask[4];if(woundRegion>4.5)regionVisible=zombieMask[5];if(regionVisible<.5)discard;');
 };
 material.customProgramCacheKey=()=> 'infected-regional-cut-v1';return material;
}
const bone=(visual,name)=>{let found;visual.traverse(o=>{if(o.isBone&&o.name.endsWith(name))found=o;});return found;};
function woundKit(library){
 if(library.woundKit)return library.woundKit;
 const flesh=new T.SphereGeometry(1,18,12),rim=new T.TorusGeometry(1,.22,8,24),core=new T.CylinderGeometry(1,.8,1,12),raw=new T.MeshStandardMaterial({color:0x501313,roughness:.38}),boneMat=new T.MeshStandardMaterial({color:0xb3a27e,roughness:.64});
 for(const o of [flesh,rim,core,raw,boneMat])library.resources?.add(o);
 return library.woundKit={flesh,rim,core,raw,boneMat};
}
export function createZombieAnatomy(root,library){
 const d=root.userData.licensedActor,visual=d.visual,kit=woundKit(library),mask=new Float32Array([1,1,1,1,1,1]),sources=[];
 visual.traverse(o=>{if(o.isSkinnedMesh)sources.push(o);});
 // The imported body, clothing and eyes use the same joints and bind poses.
 // One skeleton updates/uploads that pose once per frame for all skin sections.
 const shared=sources[0]?.skeleton;for(const mesh of sources.slice(1)){const s=mesh.skeleton;if(s.bones.length===shared.bones.length&&s.bones.every((b,i)=>b===shared.bones[i]&&s.boneInverses[i].equals(shared.boneInverses[i])))mesh.skeleton=shared;}
 const bones=Object.fromEntries(['Head','Neck','Hips','Spine','Spine1','Spine2','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'].map(n=>[n,bone(visual,n)]));
 for(const mesh of sources){regionMaterial(mesh.material,mask);mesh.customDepthMaterial=regionMaterial(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}),mask);mesh.customDistanceMaterial=regionMaterial(new T.MeshDistanceMaterial(),mask);}
 const caps=[],chunks=[];
 root.updateMatrixWorld(true);
 for(let i=1;i<6;i++){
  const joint=bones[i===1?'Neck':i===2?'LeftArm':i===3?'RightArm':i===4?'LeftUpLeg':'RightUpLeg'],cap=new T.Group();cap.visible=false;
  const radius=i===1?.08:i<4?.067:.09,cut=new T.Mesh(kit.flesh,kit.raw);cut.scale.set(radius,.022,radius);cap.add(cut);
  const marrow=new T.Mesh(kit.core,kit.boneMat);marrow.scale.set(.022,.039,.025);marrow.position.y=.014;cap.add(marrow);
  const edge=new T.Mesh(kit.rim,kit.raw);edge.rotation.x=Math.PI/2;edge.scale.setScalar(radius*.83);cap.add(edge);
  if(i===2||i===3)cap.rotation.z=i===2?-Math.PI/2:Math.PI/2;
  if(i>3)cap.rotation.x=Math.PI;
  if(i===1)cap.position.y=.018;
  joint.add(cap);caps[i]=cap;
  const group=new T.Group();group.visible=false;group.userData.gorePiece=true;group.userData.region=REGIONS[i];group.userData.sources=[];
  const frozenSkeletons=new Map();for(const source of sources){const geometry=source.geometry.userData.pieces[i];if(!geometry)continue;
   const only=new Float32Array(6);only[i]=1;
   const mesh=new T.SkinnedMesh(geometry,regionMaterial(source.material.clone(),only));let frozen=frozenSkeletons.get(source.skeleton);if(!frozen){frozen=new T.Skeleton(source.skeleton.bones,source.skeleton.boneInverses);frozenSkeletons.set(source.skeleton,frozen);}
   // Snapshot matrices into an existing skeleton: no geometry, texture or
   // shader is allocated in response to a shot.
   source.skeleton.update();frozen.boneMatrices.set(source.skeleton.boneMatrices);frozen.update=()=>{};
   mesh.bind(frozen,source.bindMatrix);mesh.bindMode='detached';
   // Keep the inverse at the moment of severing. SkinnedMesh's usual detached
   // update would replace it with inverse(bindMatrix), moving a world snapshot.
   mesh.updateMatrixWorld=T.Object3D.prototype.updateMatrixWorld;
   mesh.boundingSphere=new T.Sphere(new T.Vector3(0,.9,0),2.4);mesh.frustumCulled=true;mesh.castShadow=mesh.receiveShadow=true;mesh.customDepthMaterial=regionMaterial(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}),only);mesh.customDistanceMaterial=regionMaterial(new T.MeshDistanceMaterial(),only);
   group.add(mesh);group.userData.sources.push({mesh,source});
  }
  root.add(group);chunks[i]=group;
 }
 d.anatomy={mask,bones,caps,chunks,sources,parts:[],headless:false};return d.anatomy;
}
export function syncZombieInjuries(root,enemy){const a=root.userData?.licensedActor?.anatomy;if(!a||!enemy.zombie)return;for(let i=1;i<6;i++){a.mask[i]=enemy.zombie.severed[i]?0:1;a.caps[i].visible=enemy.zombie.severed[i];}a.headless=enemy.zombie.severed[1];}
export function configureZombieLook(root,e){
 const d=root.userData?.licensedActor;if(!d||!e.zombie)return;
 const palettes=[0x9faba0,0xaca28b,0x8d9da7,0x7e818d,0xa69791],tint=palettes[e.zombie.seed%palettes.length];
 d.baseScale??=root.scale.clone();root.scale.copy(d.baseScale);if(e.zombie.variant==='wasted'){root.scale.x*=.9;root.scale.z*=.94;}else if(e.zombie.variant==='resilient'){root.scale.x*=1.06;root.scale.z*=1.04;}
 d.visual.traverse(o=>{if(!o.isMesh)return;if(o.material.name.includes('Outfit'))o.material.color.setHex(e.kind==='bulwark'?0x657684:tint);else if(o.material.name.includes('Body'))o.material.color.setHex(e.zombie.variant==='wasted'?0xa4b2a6:0xd0c2ad);});
 if(d.dressed)return;d.dressed=true;const a=d.anatomy;
 if(e.kind==='bulwark'){
  const armor=new T.MeshStandardMaterial({color:0x2b333c,roughness:.83}),vest=new T.Mesh(new T.SphereGeometry(1,20,14),armor);vest.scale.set(.19,.26,.117);vest.position.set(0,-.09,.045);(a.bones.Spine2||a.bones.Spine1).add(vest);
  for(const side of [-1,1]){const pad=new T.Mesh(new T.CapsuleGeometry(.047,.21,6,12),armor);pad.position.set(side*.086,-.055,.144);pad.scale.z=.38;vest.parent.add(pad);}
 }else if(e.kind==='spitter'||e.kind==='screamer'){
  const tissue=new T.MeshStandardMaterial({color:e.kind==='spitter'?0x69734c:0x603932,roughness:.52});for(let i=0;i<3;i++){const sac=new T.Mesh(new T.SphereGeometry(1,18,12),tissue);sac.scale.set(.041+i*.007,.035+i*.01,.035);sac.position.set((i-1)*.052,-.09,.067);a.bones.Neck.add(sac);}
 }
}
export function detachZombieRegion(root,region){
 const a=root.userData?.licensedActor?.anatomy,i=REGIONS.indexOf(region);if(!a||i<1)return null;
 root.updateMatrixWorld(true);const group=a.chunks[i],joint=a.bones[i===1?'Neck':i===2?'LeftArm':i===3?'RightArm':i===4?'LeftUpLeg':'RightUpLeg'];
 M.copy(root.matrixWorld).invert();const pivot=V.setFromMatrixPosition(joint.matrixWorld).applyMatrix4(M).clone();
 group.position.copy(pivot);group.quaternion.identity();group.scale.setScalar(1);
 for(const {mesh,source}of group.userData.sources){source.skeleton.update();mesh.skeleton.boneMatrices.set(source.skeleton.boneMatrices);if(mesh.skeleton.boneTexture)mesh.skeleton.boneTexture.needsUpdate=true;mesh.material.color.copy(source.material.color);mesh.material.roughness=source.material.roughness;mesh.material.normalScale.copy(source.material.normalScale);mesh.bindMatrix.copy(source.bindMatrix);mesh.bindMatrixInverse.copy(source.matrixWorld).invert();mesh.matrix.copy(M).multiply(source.matrixWorld);mesh.matrix.elements[12]-=pivot.x;mesh.matrix.elements[13]-=pivot.y;mesh.matrix.elements[14]-=pivot.z;mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);}
 group.visible=true;a.mask[i]=0;a.caps[i].visible=true;if(i===1)a.headless=true;
 return group;
}
export function zombieHitParts(root,refresh=true){
 if(refresh)root.updateMatrixWorld(true);const a=root.userData.licensedActor.anatomy,b=a.bones,parts=a.parts;let count=0;
 const add=(name,start,end,r)=>{const p=parts[count]||=( {a:{},b:{}} );p.name=name;p.r=r*Math.max(root.scale.x,root.scale.z);const x=V.setFromMatrixPosition(start.matrixWorld);p.a.x=x.x;p.a.y=x.y;p.a.z=x.z;const y=V.setFromMatrixPosition(end.matrixWorld);p.b.x=y.x;p.b.y=y.y;p.b.z=y.z;count++;};
 add('torso',b.Hips,b.Spine2||b.Neck,.19);
 for(const [i,prefix]of [[2,'Left'],[3,'Right'],[4,'Left'],[5,'Right']])if(a.mask[i]){const arm=i<4;add(REGIONS[i],b[prefix+(arm?'Arm':'UpLeg')],b[prefix+(arm?'ForeArm':'Leg')],arm?.072:.086);add(REGIONS[i],b[prefix+(arm?'ForeArm':'Leg')],b[prefix+(arm?'Hand':'Foot')],arm?.063:.073);}
 parts.length=count;return parts;
}
export function poseZombieInjuries(root,t,moving,enemy){
 const d=root.userData.licensedActor,a=d.anatomy,b=a.bones,s=enemy.zombie?.severed||[],kind=root.userData.kind,crawling=kind==='crawler'||s[4]&&s[5];
 // Apply injury offsets after evaluating the artist-authored motion clip.
 if(!enemy.dead){
  const hit=enemy.impact;if(hit){b.Spine.rotation.x+=hit[0];b.Spine.rotation.z+=hit[1];if(!s[1])b.Head.rotation.x+=hit[2];if(!s[2]){b.LeftArm.rotation.x-=hit[3];b.LeftForeArm.rotation.x-=hit[3]*.6;}if(!s[3]){b.RightArm.rotation.x-=hit[4];b.RightForeArm.rotation.x-=hit[4]*.6;}if(!crawling){const side=enemy.impactLeg?'Right':'Left';b[side+'UpLeg'].rotation.x+=hit[5];b[side+'Leg'].rotation.x+=hit[5]*1.3;}}
  if(crawling){b.Hips.position.y-=.62;b.Spine.quaternion.multiply(Q.setFromAxisAngle(V.set(1,0,0),1.12));for(const side of ['Left','Right']){b[side+'Arm'].rotation.z+=(side==='Left'?-1:1)*.8;b[side+'ForeArm'].rotation.x-=.7;}}
  else if(s[4]||s[5]){b.Hips.position.y-=.13;b.Hips.rotation.z+=Math.sin(t*3)*.085;b.Spine.rotation.z+=(s[4]?1:-1)*.1;}
  else if(['spitter','stalker','feral','zsiga'].includes(kind))b.Spine.rotation.x+=kind==='spitter'?.32:.18;
  if(s[1])b.Spine.rotation.x+=.13+Math.sin(t*2.2)*.05;
  if(s[2]&&s[3]&&enemy.windup>0)b.Spine.rotation.x+=.35*(1-enemy.windup/(enemy.tellDuration||.58));
 }
 syncZombieInjuries(root,enemy);root.updateMatrixWorld(true);
 if(crawling&&!enemy.dead){for(const [side,i]of [['Left',0],['Right',1]]){const sign=i?-1:1;if(!s[4+i])groundLimb(root,b[side+'UpLeg'],b[side+'Leg'],b[side+'Foot'],sign*.15,.08,-.7);if(!s[2+i])groundLimb(root,b[side+'Arm'],b[side+'ForeArm'],b[side+'Hand'],sign*.26,.13,.59+(moving?Math.sin(t*3+i*Math.PI)*.055:0));}root.updateMatrixWorld(true);}
}
