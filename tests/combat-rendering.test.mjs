import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {CombatEffects} from '../dist/combat-effects.js';
import {World} from '../dist/world.js';

test('Hundreds of combat bursts reuse their batches and release every expired effect',()=>{
 const root=new T.Group(),fx=new CombatEffects(root);
 const resources=[fx.particles.geometry,fx.particles.material,fx.particles.instanceMatrix.array,fx.particles.instanceColor.array,fx.tracers.geometry,fx.tracers.material,fx.tracers.geometry.attributes.position.array];
 let disposed=0;for(const r of resources.filter(r=>r.addEventListener))r.addEventListener('dispose',()=>disposed++);
 for(let i=0;i<500;i++){
  fx.burst(6,9,i%2?0x81392b:0xc2b59c,i%3?8:24,1.4);fx.tracer({x:6,y:1.64,z:9},{x:6,y:1.4,z:5});fx.update(.016);
  assert.ok(fx.particles.count>0);assert.equal(fx.tracers.geometry.drawRange.count,2);
  fx.update(.65);assert.equal(fx.active,0);assert.equal(fx.particles.count,0);assert.equal(fx.tracers.geometry.drawRange.count,0);
 }
 assert.deepEqual([fx.particles.geometry,fx.particles.material,fx.particles.instanceMatrix.array,fx.particles.instanceColor.array,fx.tracers.geometry,fx.tracers.material,fx.tracers.geometry.attributes.position.array],resources);
 assert.equal(root.children.length,3);assert.equal(disposed,0,'No shader, geometry or material disposal during combat');
 fx.dispose();assert.equal(root.children.length,0);assert.equal(disposed,4);
});

test('Overlapping bursts stay bounded, keep finite transforms, and compact live effects',()=>{
 const fx=new CombatEffects(new T.Group(),32,4);
 for(let i=0;i<100;i++){fx.burst(6,9,0xffd6a3,20);fx.tracer({x:6,z:9},{x:9,z:9});}
 assert.equal(fx.particleCount,32);assert.equal(fx.tracerCount,4);
 fx.burst(NaN,0,0xffffff,20);fx.tracer({x:NaN,z:9},{x:9,z:9});
 fx.particleData[3].life=.01;fx.particleData[8].life=.01;fx.tracerData[1].life=.01;
 fx.update(.016);assert.equal(fx.particles.count,30);assert.equal(fx.tracers.geometry.drawRange.count,6);
 assert.ok([...fx.particles.instanceMatrix.array].every(Number.isFinite));assert.ok([...fx.tracers.geometry.attributes.position.array].every(Number.isFinite));
 assert.ok(Math.abs(fx.tracers.geometry.attributes.position.getY(0)-1.64)<1e-6);
 fx.update(.7);assert.equal(fx.active,0);fx.dispose();
});

function weaponWorld(){
 const w=Object.create(World.prototype);w.settings={fov:76,motion:true};w.camera=new T.PerspectiveCamera(76,1.5);w.viewCamera=new T.PerspectiveCamera(62,1.5);
 w.scene=new T.Scene();w.viewScene=new T.Scene();w.view=new T.Group();w.viewScene.add(w.view);w.knife=new T.Group();w.viewScene.add(w.knife);
 w.magazine=new T.Object3D();w.view.add(w.magazine);w.muzzle=new T.Object3D();w.view.add(w.muzzle);w.slide=new T.Object3D();w.view.add(w.slide);w.viewFlash=new T.PointLight(0xffc879,0);w.viewScene.add(w.viewFlash);
 w.ads=w.walk=w.recoil=w.flashTimer=w.knifeTimer=0;w.knife.visible=w.muzzle.visible=false;
 return w;
}

test('Knife animation keeps the weapon light count stable so shaders are not invalidated',()=>{
 const w=weaponWorld(),p={reloading:0};
 const lights=()=>{let n=0;w.viewScene.traverseVisible(o=>{if(o.isLight)n++;});return n;};
 w.updateWeapon(.016,1,p);const idle=lights();assert.equal(idle,1);
 w.swingKnife();w.updateWeapon(.016,1,p);assert.equal(w.view.visible,false);assert.equal(w.knife.visible,true);assert.equal(lights(),idle);
 w.updateWeapon(.6,1.6,p);assert.equal(w.view.visible,true);assert.equal(lights(),idle);
 w.fireWeapon();w.updateWeapon(.016,2,p);assert.equal(w.muzzle.visible,true);assert.equal(w.viewFlash.intensity,6);assert.equal(lights(),idle);
});

test('Weapon and effect warmup restores render targets and visibility even if rendering fails',()=>{
 for(const fail of [false,true]){
  const w=weaponWorld();w.combatEffects=new CombatEffects(w.scene);const target={original:true};let selected=target,renders=0;
  const magazine=new T.Group(),hand=new T.Mesh(new T.SphereGeometry(.1),new T.MeshStandardMaterial());magazine.visible=false;magazine.add(hand);w.view.add(magazine);
  w.root=new T.Group();w.scene.add(w.root);const farRoom=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());farRoom.position.set(60,0,50);w.root.add(farRoom);
  w.renderer={autoClear:false,getRenderTarget:()=>selected,setRenderTarget:t=>selected=t,render(){renders++;assert.notEqual(selected,target);assert.equal(w.combatEffects.particles.count,1);assert.equal(farRoom.frustumCulled,false);if(renders===2){assert.ok(w.view.visible&&w.knife.visible&&w.muzzle.visible);assert.equal(magazine.visible,true);assert.equal(hand.frustumCulled,false);if(fail)throw Error('GPU test failure');}}};
  if(fail)assert.throws(()=>w.prepareCombat(),/GPU test failure/);else w.prepareCombat();
  assert.equal(renders,2);assert.equal(selected,target);assert.equal(w.renderer.autoClear,false);assert.equal(w.view.visible,true);assert.equal(w.knife.visible,false);assert.equal(w.muzzle.visible,false);assert.equal(magazine.visible,false);assert.equal(hand.frustumCulled,true);assert.equal(farRoom.frustumCulled,true);assert.equal(w.combatEffects.particles.count,0);assert.equal(w.combatEffects.tracers.geometry.drawRange.count,0);w.combatEffects.dispose();
 }
});
test('Chapter warmup compiles output and tone-mapping shaders on the actual framebuffer',()=>{
 const w=weaponWorld();w.combatEffects=new CombatEffects(w.scene);let target=null;const calls=[];
 w.renderer={autoClear:true,getRenderTarget:()=>target,setRenderTarget:t=>target=t,render(scene){calls.push({scene,target});}};
 w.prepareCombat();assert.equal(calls.length,4);assert.ok(calls[0].target?.isWebGLRenderTarget);assert.ok(calls[1].target?.isWebGLRenderTarget);assert.equal(calls[2].target,null);assert.equal(calls[3].target,null);assert.equal(calls[2].scene,w.scene);assert.equal(calls[3].scene,w.viewScene);assert.equal(target,null);w.combatEffects.dispose();
});
