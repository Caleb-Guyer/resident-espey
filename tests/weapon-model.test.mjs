import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createViewModel} from '../dist/viewmodel.js';
import {createWeaponMotion,kickWeapon,stepWeaponMotion,reloadPose} from '../dist/weapon-motion.js';
import {beginReload,advanceReload,reloadProgress} from '../dist/reload.js';
import {World} from '../dist/world.js';
import {CombatEffects} from '../dist/combat-effects.js';
const mats=()=>Object.fromEntries(['metal','steel','frame','dark','rubber','skin','sleeve','magazine','nail','sight'].map(k=>[k,new T.MeshStandardMaterial()]));
const player=()=>({yaw:0,pitch:0,ammo:12,reloading:0,aiming:false,moving:false,sprinting:false});
test('Hands have closed continuous surfaces, finite smooth normals and local finger morphs',()=>{
 const model=createViewModel(mats());
 for(const skin of[model.rightSkin,model.leftSkin]){const geo=skin.geometry,p=geo.attributes.position,n=geo.attributes.normal,m=geo.morphAttributes.position[0],edges=new Map();assert.ok(p.count>10000);
  for(let i=0;i<geo.index.count;i+=3){const v=[0,1,2].map(j=>geo.index.getX(i+j));for(let k=0;k<3;k++){const a=v[k],b=v[(k+1)%3],key=a<b?a+','+b:b+','+a;edges.set(key,(edges.get(key)||0)+1);}}
  assert.ok([...edges.values()].every(n=>n===2),'An open seam or detached finger is visible');
  for(let i=0;i<p.count;i++){assert.ok([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite));assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.0001);assert.ok(Math.hypot(m.getX(i)-p.getX(i),m.getY(i)-p.getY(i),m.getZ(i)-p.getZ(i))<.014,'Finger morph changes coordinate space');}
 }
 assert.notEqual(model.rightSkin.geometry,model.leftSkin.geometry);
});
test('Pistol and hand meshes keep realistic dimensions and independently movable mechanics',()=>{
 const m=createViewModel(mats());m.root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(m.gun),size=box.getSize(new T.Vector3());assert.ok(size.x>.035&&size.x<.065);assert.ok(size.y<.23);assert.ok(size.z>.20&&size.z<.28);
 assert.notEqual(m.slide,m.gun);assert.equal(m.slide.parent,m.gun);assert.equal(m.magazine.parent,m.grip);assert.equal(m.leftHand.parent,m.root);assert.equal(m.trigger.parent,m.gun);
 for(const skin of[m.rightSkin,m.leftSkin])assert.equal(skin.morphTargetInfluences.length,1);
});
test('Forearms and sleeves face outward so their rounded surfaces render correctly',()=>{
 const model=createViewModel(mats());let checked=0;model.root.traverse(o=>{if(!o.geometry?.userData.sweptSurface)return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;
  for(const ring of[8,18,28]){const center=new T.Vector3();for(let i=0;i<32;i++)center.add(new T.Vector3().fromBufferAttribute(p,ring*33+i));center.divideScalar(32);for(let i=0;i<32;i++){const at=ring*33+i,v=new T.Vector3().fromBufferAttribute(p,at).sub(center),normal=new T.Vector3().fromBufferAttribute(n,at);assert.ok(v.dot(normal)>0,'Backface culling exposes a flat strip instead of the arm');}}checked++;
 });assert.equal(checked,4);
});
test('Recoil has the same response at 30, 60, 144 and 240 FPS and cannot keep vibrating',()=>{
 const outcomes=[];for(const fps of[30,60,144,240]){const s=createWeaponMotion(),p=player();kickWeapon(s,false);let peak=0,elapsed=0;while(elapsed<.2-1e-12){const dt=Math.min(1/fps,.2-elapsed);stepWeaponMotion(s,dt,p);elapsed+=dt;peak=Math.max(peak,s.kick.x);assert.ok(s.kick.x>=0);}outcomes.push([s.kick.x,s.kick.v]);for(let i=0;i<fps;i++)stepWeaponMotion(s,1/fps,p);assert.ok(peak<.061);assert.equal(s.kick.x,0);assert.equal(s.kick.v,0);}
 for(const o of outcomes)for(let i=0;i<2;i++)assert.ok(Math.abs(o[i]-outcomes[0][i])<1e-9,'The same elapsed time changes recoil with frame rate');
 const s=createWeaponMotion(),p=player();for(let shot=0;shot<50;shot++){kickWeapon(s,true);for(let i=0;i<17;i++){stepWeaponMotion(s,1/60,p);assert.ok(s.kick.x<.045);}}
 for(let i=0;i<90;i++)stepWeaponMotion(s,1/60,p);assert.equal(s.kick.x,0);assert.equal(s.kick.v,0);
});
test('Still iron sights remain exactly centered after walking, turning and repeated shots',()=>{
 const s=createWeaponMotion(),p={...player(),aiming:true,moving:true};for(let i=0;i<120;i++){p.yaw+=.01;stepWeaponMotion(s,1/60,p,{walk:i/60});}
 p.moving=false;for(let i=0;i<240;i++)stepWeaponMotion(s,1/60,p,{walk:2});const pose=stepWeaponMotion(s,1/60,p,{walk:2});assert.equal(pose.ads,1);assert.ok(Math.abs(pose.position[0])<1e-8);assert.ok(Math.abs(pose.position[1]+.08964)<1e-8);assert.ok(pose.rotation.every(x=>Math.abs(x)<1e-8));assert.equal(pose.headBob,0);
 for(let i=0;i<100;i++)assert.deepEqual(stepWeaponMotion(s,1/60,p,{walk:2}),pose);
});
test('The slide cycles independently, locks open on empty and releases after chambering',()=>{
 const s=createWeaponMotion(),p=player();kickWeapon(s,true);assert.equal(stepWeaponMotion(s,.022,p).slide,.028);assert.equal(stepWeaponMotion(s,.10,p).slide,0);
 p.ammo=0;assert.equal(stepWeaponMotion(s,.5,p).slide,.028);p.reloading=.2;p.reloadEmpty=true;assert.equal(stepWeaponMotion(s,.016,p,{progress:.87}).slide,.028);assert.equal(stepWeaponMotion(s,.016,p,{progress:.90}).slide,0);
});
test('Reload removal, offscreen swap, seating and chambering follow a continuous staged path',()=>{
 for(const p of[reloadPose(0),reloadPose(1)])for(const key of['rotation','hand','handRotation','magazine'])assert.ok(p[key].every(v=>Math.abs(v)<1e-10));assert.ok(reloadPose(.30).magazine[1]<-.20);assert.equal(reloadPose(.44).magazineVisible,false);assert.equal(reloadPose(.60).magazineVisible,true);assert.deepEqual(reloadPose(.63).magazine,[0,0,0]);
 assert.ok(reloadPose(.86,true).hand[1]>.1);assert.ok(reloadPose(.86,false).hand[1]<0);
 for(const at of[.10,.16,.30,.42,.50,.60,.63,.72,.80,.88,.96]){const a=reloadPose(at-.00001,true),b=reloadPose(at+.00001,true);for(const key of['rotation','hand','handRotation','magazine'])for(let i=0;i<3;i++)assert.ok(Math.abs(a[key][i]-b[key][i])<.00001,key+' snaps at '+at);}
});
test('The rendered reload returns both hands, magazine and slide to their proper rest pose',()=>{
 const w=Object.create(World.prototype),model=createViewModel(mats());Object.assign(w,model);w.view=new T.Group();w.view.add(model.root);w.camera=new T.PerspectiveCamera(76,1.6);w.settings={motion:true,fov:76};w.muzzle=new T.Object3D();w.viewFlash=new T.PointLight();w.knife=new T.Object3D();w.flashTimer=w.knifeTimer=w.walk=0;
 for(const ammo of[0,5]){const p={...player(),ammo,reserve:40};const total=p.ammo+p.reserve;assert.ok(beginReload(p));for(let i=0;i<140;i++){advanceReload(p,.016);w.updateWeapon(.016,i*.016,p);}assert.equal(p.ammo+p.reserve,total);assert.equal(p.reloading,0);assert.equal(p.ammo,12);assert.equal(w.magazine.position.y,-.06);assert.deepEqual(w.leftHand.position.toArray(),w.leftHand.userData.rest);assert.equal(w.slide.position.z,0);assert.equal(w.leftSkin.morphTargetInfluences[0],0);}
});
test('Shot trails and brass start at the rendered muzzle and ejection port across FOV and stance',()=>{
 const w=Object.create(World.prototype),m=createViewModel(mats());Object.assign(w,m);w.view=new T.Group();w.view.scale.setScalar(1.08);w.view.add(m.root);w.viewCamera=new T.PerspectiveCamera(62,1.6);w.camera=new T.PerspectiveCamera(76,1.6);w.settings={fov:76,motion:true};w.muzzle=new T.Object3D();w.viewFlash=new T.PointLight();w.knife=new T.Object3D();w.flashTimer=w.knifeTimer=w.walk=0;w.combatEffects=new CombatEffects(new T.Group());
 for(const fov of[60,76,95])for(const crouching of[false,true]){const p={...player(),x:14,z:20,yaw:.7,pitch:.12,crouching};w.settings.fov=fov;w.setView(p,p.yaw,p.pitch,0);w.updateWeapon(.1,0,p);w.camera.updateMatrixWorld(true);const point=w.muzzleOrigin(p),world=new T.Vector3(point.x,point.y,point.z).project(w.camera),view=new T.Vector3(0,.054,-.197).applyMatrix4(w.gun.matrixWorld).project(w.viewCamera);assert.ok(Math.abs(world.x-view.x)<1e-7&&Math.abs(world.y-view.y)<1e-7,'Shot trail floats away from muzzle');
  const port=w.weaponPoint(p,[.024,.052,-.024]);w.ejectCasing({x:p.x,y:1.64,z:p.z},p.yaw,p);const brass=w.combatEffects.casingData[w.combatEffects.casingCount-1];assert.deepEqual([brass.x,brass.y,brass.z],[port.x,port.y,port.z]);
 }w.combatEffects.dispose();
});
test('Motion is deterministic, reduced motion suppresses sway, and invalid time stays finite',()=>{
 const original=Math.random;Math.random=()=>{throw Error('Random motion');};try{const a=createWeaponMotion(),b=createWeaponMotion(),p=player();for(let i=0;i<180;i++){p.moving=i<60;p.yaw+=i<60?.003:0;if(i===30){kickWeapon(a,true);kickWeapon(b,true);}assert.deepEqual(stepWeaponMotion(a,.016,p,{walk:i*.016}),stepWeaponMotion(b,.016,p,{walk:i*.016}));}
  const still=stepWeaponMotion(a,NaN,p,{reduced:true,walk:6});assert.ok([...still.position,...still.rotation].every(Number.isFinite));assert.equal(Math.abs(still.headBob),0);
 }finally{Math.random=original;}
});
