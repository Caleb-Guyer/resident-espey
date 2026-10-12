import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';import {World} from '../dist/world.js';import {Game} from '../dist/game.js';
import {BOSS_INTROS,BOSS_NAMES,BossIntroduction,displayName} from '../dist/boss-introductions.js';
import {voicedScene} from '../dist/voice-timeline.js';import {voiceKey} from '../dist/dialogue.js';import {VOICE_ASSETS} from '../dist/voice-assets.js';
import {sceneSample} from '../dist/story.js';import {capsuleIntersection,traceShot} from '../dist/fps.js';
const world=()=>{const w=Object.create(World.prototype);w.assets=Object.fromEntries(['boss','skin','face','ethan','survivor'].map(k=>[k,new T.Texture()]));w.characterTemplates=new Map();w.characterResources=new Set();w.procedural=()=>new T.Texture();return w;};
test('Each boss has unique sculpted closed skin, normalized rig weights and real articulated heads',()=>{
 const w=world(),shapes=[];for(const kind of ['chris','jakob','zeb','birdy']){
  const g=w.character(kind),geo=g.userData.skin.geometry,weights=geo.attributes.skinWeight,indices=geo.attributes.skinIndex,edges=new Map();assert.ok(geo.attributes.position.count>15000);assert.equal(g.userData.bossRig,true);assert.equal(g.userData.skin.skeleton.bones.length,kind==='jakob'?21:10);
  for(let i=0;i<weights.count;i++){assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);for(const n of [indices.getX(i),indices.getY(i),indices.getZ(i),indices.getW(i)])assert.ok(n<g.userData.skin.skeleton.bones.length);}
  for(let i=0;i<geo.index.count;i+=3){const v=[geo.index.getX(i),geo.index.getX(i+1),geo.index.getX(i+2)];for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],key=a<b?a+','+b:b+','+a;edges.set(key,(edges.get(key)||0)+1);}}
  assert.ok([...edges.values()].every(n=>n===2),kind+' skin has an open seam');assert.equal(g.userData.heads.length,kind==='jakob'?2:1);assert.equal(g.userData.jaws.length,g.userData.heads.length);assert.ok(g.userData.eyes.flat().every(e=>e.userData.physicalEye&&e.userData.iris.visible&&e.userData.pupil.visible&&e.userData.lid.isMesh));shapes.push(geo.attributes.position.count);w.disposeObject(g);
 }assert.equal(new Set(shapes).size,4);
});
test('Boss locomotion, attacks, recovery, introductions and death keep posed vertices finite',()=>{
 const w=world();for(const kind of ['chris','jakob','zeb','birdy']){const g=w.character(kind);g.userData.phase=0;const states=[{}, {attack:kind==='zeb'?'rupture':kind==='jakob'?'bobby':kind==='birdy'?'swoop':'rush',windup:.2,attackTime:1,activeHead:1},{charge:.4},{recover:1.2},{stagger:.7,hitSide:-1},{intro:{time:7}},{dead:true,deathTime:.9}];
  for(const s of states)for(const t of [0,.2,1,4]){w.animateCharacter(g,t,true,s);g.updateMatrixWorld(true);g.userData.skin.skeleton.update();const a=g.userData.skin.geometry.attributes.position;for(let i=0;i<a.count;i+=379){const v=new T.Vector3().fromBufferAttribute(a,i);g.userData.skin.applyBoneTransform(i,v);assert.ok(v.toArray().every(Number.isFinite));assert.ok(v.length()<4,kind+' pose escaped the rig');}}
  w.animateCharacter(g,8,false,{});const pose=[...g.userData.body.position.toArray(),...g.userData.head.rotation.toArray().slice(0,3)];w.animateCharacter(g,8,false,{});assert.deepEqual([...g.userData.body.position.toArray(),...g.userData.head.rotation.toArray().slice(0,3)],pose);w.disposeObject(g);
 }
});
test('Portrait shaders retain each character’s skin and hair colors across cached rig copies',()=>{
 const w=world(),keys=[];for(const kind of ['chris','jakob','zeb','birdy']){const a=w.character(kind),b=w.character(kind);for(let i=0;i<a.userData.faces.length;i++){const material=a.userData.faces[i].material,copy=b.userData.faces[i].material;assert.equal(material.customProgramCacheKey(),copy.customProgramCacheKey());assert.equal(material.onBeforeCompile,copy.onBeforeCompile);keys.push(material.customProgramCacheKey());}w.disposeObject(a);w.disposeObject(b);}assert.equal(new Set(keys).size,5);
});
test('Raised arms and fused-body lunges cannot stretch small skin triangles into spikes',()=>{
 const w=world();for(const kind of ['chris','jakob','zeb','birdy']){
  const g=w.character(kind);g.userData.phase=0;const skin=g.userData.skin,geo=skin.geometry,p=geo.attributes.position;
  for(const mood of [{intro:{time:7}},{charge:.5},{windup:.3,attackTime:2,attack:kind==='zeb'?'rupture':kind==='jakob'?'bobby':kind==='birdy'?'swoop':'rake'}]){
   w.animateCharacter(g,7,true,mood);g.updateMatrixWorld(true);skin.skeleton.update();const rest=Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i)),posed=rest.map((v,i)=>skin.applyBoneTransform(i,v.clone()));
   for(let j=0;j<geo.index.count;j+=3)for(let k=0;k<3;k++){const a=geo.index.getX(j+k),b=geo.index.getX(j+(k+1)%3);assert.ok(posed[a].distanceTo(posed[b])-rest[a].distanceTo(rest[b])<.13,kind+' stretched a skin edge into a spike');}
  }w.disposeObject(g);
 }
});
test('All four directed introductions use distinct cameras and available packaged dialogue',()=>{
 const paths=[];for(const [kind,raw]of Object.entries(BOSS_INTROS)){const scene=voicedScene(raw);assert.ok(scene.duration>=13);assert.equal(scene.shots.length,4);paths.push(JSON.stringify(scene.shots));for(const line of raw.lines)assert.ok(VOICE_ASSETS[voiceKey(line.speaker,line.text)]?.duration>0);
  for(let t=0;t<=scene.duration;t+=.2){const sample=sceneSample(scene,t);assert.ok([...sample.position,...sample.look,sample.fov].every(Number.isFinite));assert.ok(sample.fov>=40&&sample.fov<=75);}
 }assert.equal(new Set(paths).size,4);
});
test('Fight introductions suspend combat, remember completion and protect the returned player',()=>{
 const g=Object.create(Game.prototype);let done;g.seenScenes=new Set();g.player={inv:0};g.cinema={playEncounter(e,callback){done=callback;g.paused=true;}};g.save=()=>{};g.ui={showGame(){}};g.setHUD=()=>{};g.setPaused=p=>g.paused=p;const e={kind:'chris',cool:0};assert.equal(g.introduceBoss(e),true);assert.equal(g.paused,true);done();assert.equal(g.paused,false);assert.ok(g.player.inv>=2);assert.ok(e.cool>=1.6);assert.ok(g.seenScenes.has('encounter-chris'));assert.equal(g.introduceBoss(e),false);
});
test('A boss audio line cannot replay immediately after its introduction',()=>{
 const g=Object.create(Game.prototype);let done;g.seenScenes=new Set();g.player={inv:0};g.cinema={playEncounter(e,callback){done=callback;}};g.save=g.setHUD=()=>{};g.ui={showGame(){}};g.setPaused=()=>{};g.introduceBoss({kind:'birdy',cool:0});done();assert.equal(g.birdySpoke,true);
});
test('Parallel warmup restores hidden bosses and render targets if shader preparation fails',async()=>{
 const w=world();w.root=new T.Group();const g=w.character('birdy');g.visible=false;w.root.add(g);w.scene=new T.Scene();w.scene.add(w.root);w.viewScene=new T.Scene();w.viewCamera=new T.PerspectiveCamera();w.camera=new T.PerspectiveCamera();let target=null;w.renderer={getRenderTarget:()=>target,setRenderTarget:t=>target=t,async compileAsync(){assert.equal(g.visible,true);throw Error('shader rejected');}};
 await assert.rejects(w.prepareCombatAsync(),/shader rejected/);assert.equal(g.visible,false);assert.equal(target,null);w.disposeObject(w.root);
});
test('Skipping and cancelling an arena sequence cannot complete the fight twice',()=>{
 const a=Object.create(BossIntroduction.prototype);let released=0,completed=0;a.active=true;a.finished=false;a.release=()=>{if(a.active){a.active=false;released++;}};a.complete=()=>completed++;a.finish();a.finish();a.cancel();assert.equal(completed,1);assert.equal(released,1);
 const b=Object.create(BossIntroduction.prototype);b.active=true;b.finished=false;b.release=()=>b.active=false;b.complete=()=>assert.fail('Cancellation started combat');b.cancel();assert.equal(b.active,false);
});
test('Boss names, radio names and objective display omit extra titles',()=>{assert.deepEqual(BOSS_NAMES,{chris:'Chris',jakob:'Jakob & Bobby',zeb:'Zeb',birdy:'Lil Birdy'});for(const n of Object.values(BOSS_NAMES))assert.ok(!n.includes('/'));assert.equal(displayName('Coach Hall'),'Hall');assert.equal(displayName('Earl Britt'),'Earl');});
test('Boss turns take the shortest route without snapping and limb shots hit actual capsules',()=>{
 const w=world(),g=w.character('chris');g.rotation.y=Math.PI-.03;w.faceCharacter(g,-Math.PI+.03,1/60);assert.ok(g.rotation.y>Math.PI-.03&&g.rotation.y<Math.PI+.03);w.animateCharacter(g,1,false,{windup:.4,attackTime:.6,attack:'rush'});g.position.set(20,0,20);const parts=w.bossHitParts(g),arm=parts[2],origin={x:arm.a.x,y:arm.a.y,z:arm.a.z+4};assert.ok(Number.isFinite(capsuleIntersection(origin,{x:0,y:0,z:-1},arm.a,arm.b,arm.r)));
 const grid=Array.from({length:30},()=>Array(30).fill(0)),e={kind:'chris',x:20,z:20,hitHeads:w.headPositions(g),hitParts:parts},hit=traceShot(grid,origin,[e],{x:0,y:0,z:-1});assert.equal(hit.enemy,e);w.disposeObject(g);
});
