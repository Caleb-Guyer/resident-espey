import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createAnatomy,animateCollapse} from '../dist/anatomy.js';
import {settleWeapon,shotDirection,applyRecoil} from '../dist/gunplay.js';
import {CombatEffects} from '../dist/combat-effects.js';
import {dialogueFrame,speechMotion,speakingActor} from '../dist/cinematic-direction.js';
import {SCENES,sceneSample} from '../dist/story.js';import {voicedScene} from '../dist/voice-timeline.js';import {Game} from '../dist/game.js';
import {World} from '../dist/world.js';
const mats=()=>[0x999988,0x344439,0x262e29].map(color=>new T.MeshStandardMaterial({color}));
test('Every continuous body is closed, has normalized bone weights, and stays finite when posed',()=>{
 for(const kind of ['player','walker','zsiga','jakob','zeb']){
  const g=createAnatomy(kind,mats()),skin=g.userData.skin,geo=skin.geometry,a=geo.attributes,w=a.skinWeight,j=a.skinIndex,edges=new Map();
  assert.ok(a.position.count>10000);assert.equal(skin.skeleton.bones.length,10);
  for(let i=0;i<w.count;i++){assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);for(const k of [j.getX(i),j.getY(i),j.getZ(i),j.getW(i)])assert.ok(k<10);}
  for(let i=0;i<geo.index.count;i+=3){const v=[geo.index.getX(i),geo.index.getX(i+1),geo.index.getX(i+2)];for(let e=0;e<3;e++){const x=v[e],y=v[(e+1)%3],key=x<y?x+','+y:y+','+x;edges.set(key,(edges.get(key)||0)+1);}}
  assert.ok([...edges.values()].every(n=>n===2),kind+' has open seams');
  g.userData.arms[0].rotation.x=-1.1;g.userData.arms[0].userData.forearm.rotation.x=-.8;g.userData.legs[1].rotation.x=.4;g.updateMatrixWorld(true);skin.skeleton.update();
  for(let i=0;i<a.position.count;i+=193){const v=new T.Vector3().fromBufferAttribute(a.position,i);skin.applyBoneTransform(i,v);assert.ok(v.toArray().every(Number.isFinite));assert.ok(v.length()<3);}
 }
});
test('Character instances own geometry and falling enemies keep original scale',()=>{
 const a=createAnatomy('walker',mats()),b=createAnatomy('walker',mats());assert.notEqual(a.userData.skin.geometry,b.userData.skin.geometry);let disposed=0;b.userData.skin.geometry.addEventListener('dispose',()=>disposed++);a.userData.skin.geometry.dispose();assert.equal(disposed,0);
 a.scale.set(1.2,1.15,1.2);for(let t=0;t<1;t+=.016)animateCollapse(a,t);assert.deepEqual(a.scale.toArray(),[1.2,1.15,1.2]);assert.ok(animateCollapse(a,1));assert.ok(a.rotation.x<-1.4);
});
test('Releasing cinematic actors disposes bone textures as well as geometry',()=>{const w=Object.create(World.prototype);w.assets={};const root=new T.Group(),g=createAnatomy('player',mats());root.add(g);const s=g.userData.skin.skeleton;s.computeBoneTexture();let disposed=0;s.boneTexture.addEventListener('dispose',()=>disposed++);w.disposeObject(root);assert.equal(disposed,1);assert.equal(s.boneTexture,null);assert.equal(root.children.length,0);});
test('Settled iron sights are exact; movement and rapid fire widen spread and recover',()=>{
 const p={aiming:true,focus:1,bloom:0,yaw:.4,pitch:.1};const exact=shotDirection(p,.4,.1,()=>.7),base={x:-Math.sin(.4)*Math.cos(.1),y:Math.sin(.1),z:-Math.cos(.4)*Math.cos(.1)};assert.deepEqual(exact,base);
 applyRecoil(p);assert.ok(p.pitch>.1&&p.bloom>0);p.moving=true;for(let i=0;i<60;i++)settleWeapon(p,1/60);assert.ok(p.focus<.6);assert.notDeepEqual(shotDirection(p,.4,.1,()=>.7),base);
 p.moving=false;for(let i=0;i<180;i++)settleWeapon(p,1/60);assert.ok(p.focus>.999);assert.equal(p.bloom,0);settleWeapon(p,NaN);assert.ok(Number.isFinite(p.focus));
});
test('A gunshot during a knife swing cannot consume ammunition',()=>{const g=Object.create(Game.prototype);g.player={ammo:9,cooldown:0,reloading:0,dash:0,melee:.2};g.shoot();assert.equal(g.player.ammo,9);});
test('Hundreds of ejected casings reuse bounded GPU storage, bounce, and expire',()=>{
 const fx=new CombatEffects(new T.Group()),geo=fx.casings.geometry,mat=fx.casings.material,buffer=fx.casings.instanceMatrix.array;let disposed=0;geo.addEventListener('dispose',()=>disposed++);mat.addEventListener('dispose',()=>disposed++);
 for(let i=0;i<500;i++){fx.eject({x:10,y:1.64,z:20},.3);fx.update(.016);assert.ok(fx.casingCount<=48);assert.ok(fx.casingData.slice(0,fx.casingCount).every(c=>c.y>=.023));}
 assert.ok([...buffer].every(Number.isFinite));assert.equal(fx.casings.geometry,geo);assert.equal(fx.casings.material,mat);assert.equal(fx.casings.instanceMatrix.array,buffer);assert.equal(disposed,0);
 for(let i=0;i<220;i++)fx.update(.016);assert.equal(fx.active,0);assert.equal(fx.casings.count,0);fx.dispose();assert.equal(disposed,2);
});
test('Every voiced shot retains finite framing; dialogue closeups preserve action shots',()=>{
 let closeups=0;for(const raw of Object.values(SCENES)){const scene=voicedScene(raw);for(let t=0;t<=scene.duration;t+=.2){const sample=sceneSample(scene,t),frame=dialogueFrame(scene,sample,t);assert.ok([...frame.position,...frame.look,frame.fov].every(Number.isFinite));assert.ok(frame.fov>=40);if(frame.subject){closeups++;assert.ok(scene.actors.some(a=>a.id===frame.subject));if(scene.directed)assert.equal(frame.subject,sample.coverage.subject);else assert.equal(frame.subject,speakingActor(scene,sample.line));}if(scene.stage==='road'||scene.stage==='seal')assert.equal(frame.subject,null);const mouth=speechMotion(sample.line,t);assert.ok(mouth>=0&&mouth<=1);}}
 assert.ok(closeups>100);assert.equal(speechMotion({at:1,to:2},3),0);
});
