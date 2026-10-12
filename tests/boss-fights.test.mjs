import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../dist/vendor/three.module.js';
import {BOSS_FIGHTS,desiredPhase,encounterDamage,crushBobby,saveBossProgress,restoreBossProgress,encounterPattern} from '../dist/boss-fights.js';
import {stepEnemy,beginAttack,interruptAttack,ATTACKS} from '../dist/enemy-director.js';import {BossArena} from '../dist/boss-arena.js';import {World} from '../dist/world.js';import {Cinematics} from '../dist/cinematics.js';import {EnemyEffects} from '../dist/enemy-effects.js';import {Game} from '../dist/game.js';
const enemy=kind=>({kind,id:99,x:0,z:0,max:BOSS_FIGHTS[kind].health,hp:BOSS_FIGHTS[kind].health,phase:0,stageResolved:1,cool:0,range:1.8,model:new T.Group(),beatsDone:new Set()});
test('Burst damage cannot skip a fresh stage; releasing an attack opens its next transition',()=>{
 for(const kind of ['chris','birdy','zeb']){const e=enemy(kind);e.stageResolved=0;
  for(let phase=0;phase<5;phase++){
   assert.equal(e.phase,phase);e.hp-=encounterDamage(e,100000);assert.equal(desiredPhase(e),phase);assert.ok(e.hp>0);assert.equal(encounterDamage(e,100000),0);
   e.recover=e.cool=e.stagger=0;beginAttack(e,{x:0,z:5});const result=stepEnemy(e,e.windup,{player:{x:0,z:5},visible:true});assert.ok(result.events.some(v=>v.type==='release'));assert.ok(e.stageResolved>0);
   if(phase===4){e.hp-=encounterDamage(e,e.hp);assert.equal(e.hp,0);break;}
   const floor=e.max*BOSS_FIGHTS[kind].phases[phase+1].threshold;e.hp-=encounterDamage(e,e.hp-floor);stepEnemy(e,.016,{player:{x:0,z:5},visible:true});assert.equal(e.stageResolved,0);
  }
 }
});
test('Headshot counters open stages; grounded Birdy requires two hits during the tell',()=>{
 for(const kind of ['jakob','birdy','zeb']){const e=enemy(kind);e.stageResolved=0;e.phase=3;e.bobbyCrushed=kind==='jakob';e.attack=kind==='zeb'?'siphon':kind==='birdy'?'groundRush':'revenge';e.windup=2;e.activeHead=0;
  if(kind==='jakob'){assert.equal(interruptAttack(e,true,1),false);assert.equal(e.stageResolved,0);}
  if(kind==='birdy'){assert.equal(interruptAttack(e,true,0),false);assert.equal(e.stageResolved,0);}
  assert.equal(interruptAttack(e,true,0),true);assert.ok(e.stageResolved>0);assert.equal(e.windup,0);assert.ok(e.exposed>0);assert.equal(encounterDamage(e,10000),10000);
 }
});
test('Steam and purge counters open damage windows without requiring an attack to land',()=>{
 for(const kind of ['chris','zeb']){const e=enemy(kind);e.stageResolved=0;e.x=e.z=5;const arena=Object.create(BossArena.prototype);arena.enemy=()=>e;const g={world:{effect(){},enemyEffects:{clearHazards(){}}},sound:{play(){}},save(){},toast(){}};
  assert.equal(arena.interact(g,{mechanism:kind==='chris'?'steam':'purge',kind,x:5,z:5,active:true,handle:new T.Group()}),true);assert.ok(e.stageResolved>0);assert.ok(e.exposed>3);assert.equal(encounterDamage(e,100000),100000);
 }
});
test('Every boss has five mechanically distinct stages and substantially more health',()=>{
 const old={chris:350,jakob:460,zeb:660,birdy:240};for(const[kind,f]of Object.entries(BOSS_FIGHTS)){assert.equal(f.phases.length,5);assert.ok(f.health>=old[kind]*4);assert.equal(new Set(f.phases.map(p=>JSON.stringify(p.patterns))).size,5);for(let i=1;i<5;i++)assert.ok(f.phases[i].threshold<f.phases[i-1].threshold);for(const p of f.phases)for(const pattern of p.patterns)for(const attack of pattern)assert.ok(ATTACKS[attack]);}
});
test('Health-driven transitions enter every stage in order and never run a stale attack',()=>{
 for(const kind of ['chris','birdy','zeb']){const e=enemy(kind);e.hp=e.max*.1;e.windup=1;e.attack='rush';e.charge=1;const phases=[];for(let i=0;i<4;i++){const result=stepEnemy(e,.016,{player:{x:0,z:4},visible:true});assert.equal(result.mode,'hold');assert.equal(e.windup+e.charge,0);assert.equal(e.attack,null);phases.push(result.events[0].phase);}assert.deepEqual(phases,[1,2,3,4]);e.hp=e.max;assert.equal(desiredPhase(e),4);}
});
test('The twins cannot be killed before the chase; crushing Bobby permanently unlocks enraged Jakob',()=>{
 const e=enemy('jakob');e.hp-=encounterDamage(e,100000);assert.equal(e.hp,e.max*.58);assert.equal(desiredPhase(e),2);assert.equal(crushBobby(e),false);e.phase=2;assert.equal(crushBobby(e),true);assert.equal(crushBobby(e),false);assert.equal(desiredPhase(e),3);assert.equal(e.bobbyCrushed,true);assert.equal(encounterDamage(e,100000),100000);e.phase=3;e.patternCount=0;const tell=beginAttack(e,{x:0,z:5});assert.equal(tell.name,'revenge');assert.equal(e.activeHead,0);
});
test('An empty press can be retried; only a creature under its platen starts the crush sequence',()=>{
 const e=enemy('jakob');e.phase=2;e.alert=true;e.hp=e.max*.58;const a=Object.create(BossArena.prototype);a.press={x:5,z:5};a.enemy=()=>e;a.breakPress=()=>{};let movies=0,toasts=0;const g={toast(){toasts++;},playBossBeat(target,id,done){assert.equal(id,'crusher');assert.equal(target,e);movies++;}};const c={mechanism:'crusher',active:true};assert.equal(a.interact(g,c),false);assert.equal(e.bobbyCrushed,undefined);assert.equal(toasts,1);e.x=5;e.z=5;assert.equal(a.interact(g,c),true);assert.equal(movies,1);assert.equal(a.interact(g,c),false);
});
test('All combinations re-aim only during their next tell; a wall collision cancels a chain',()=>{
 const e=enemy('chris');e.phase=4;const p={x:0,z:6};beginAttack(e,p);const dir=[e.chargeX,e.chargeZ];p.x=8;stepEnemy(e,e.windup,{player:p,visible:true});assert.deepEqual([e.chargeX,e.chargeZ],dir);stepEnemy(e,.1,{player:p,visible:true,wallHit:true});assert.equal(e.comboPattern,null);assert.ok(e.recover>=2.8);assert.ok(e.exposed>=2.8);assert.ok(e.cool>e.recover);
});
test('Boss progress restores health, broken heads, phase movies and vent cooldowns across reloads',()=>{
 const e=enemy('jakob');e.phase=2;crushBobby(e);e.phase=3;e.beatsDone.add('crusher');e.ventCool=11;const state=saveBossProgress(e),next=enemy('jakob');assert.equal(restoreBossProgress(next,JSON.parse(JSON.stringify(state))),true);assert.equal(next.bobbyCrushed,true);assert.equal(next.phase,3);assert.ok(next.beatsDone.has('crusher'));assert.equal(next.ventCool,11);assert.equal(next.hp,e.hp);assert.equal(restoreBossProgress(next,{...state,max:NaN}),false);
});
const modelWorld=()=>{const w=Object.create(World.prototype);w.assets=Object.fromEntries(['boss','skin','face','ethan','survivor'].map(k=>[k,new T.Texture()]));w.characterTemplates=new Map();w.characterResources=new Set();w.procedural=()=>new T.Texture();return w;};
test('Broken wings stay grounded, Bobby loses his head target, and advanced poses remain finite',()=>{
 const w=modelWorld();for(const kind of ['chris','jakob','zeb','birdy']){const g=w.character(kind);for(const mood of [{phase:4,charge:.4,bobbyCrushed:kind==='jakob',attack:kind==='birdy'?'groundRush':kind==='jakob'?'revenge':'rupture'},...['chris-break','birdy-break','zeb-rupture','crusher'].map(id=>({phase:3,bobbyCrushed:kind==='jakob',beat:{id,time:5}}))]){w.animateCharacter(g,5,true,mood);g.updateMatrixWorld(true);g.userData.skin.skeleton.update();const p=g.userData.skin.geometry.attributes.position;for(let i=0;i<p.count;i+=241){const v=g.userData.skin.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(p,i));assert.ok(v.toArray().every(Number.isFinite));assert.ok(v.length()<4);}}if(kind==='birdy'){w.animateCharacter(g,2,true,{phase:3,charge:.4,attack:'groundRush'});assert.equal(g.position.y,0);assert.ok(g.userData.wingWrists[0].scale.y<.7);}if(kind==='jakob'){w.animateCharacter(g,2,false,{phase:3,bobbyCrushed:true});assert.equal(w.headPositions(g).length,1);assert.ok(g.userData.heads[1].scale.y<.2);}w.disposeObject(g);}
});
test('Hit geometry reuses arrays and point objects; moving heads and arms still refresh',()=>{
 const w=modelWorld(),g=w.character('chris');const heads=w.headPositions(g),head=heads[0],parts=w.bossHitParts(g),a=parts[0].a;g.position.x=10;assert.equal(w.headPositions(g),heads);assert.equal(heads[0],head);assert.ok(head.x>9);assert.equal(w.bossHitParts(g),parts);assert.equal(parts[0].a,a);assert.ok(a.x>9);w.disposeObject(g);
});
test('Hazard updates retain their arrays and recycle their records across attacks and purges',()=>{
 const fx=new EnemyEffects(new T.Group()),arrays=[fx.bolts,fx.pools,fx.waves],objects=new Set([...fx.freeBolts,...fx.freePools,...fx.freeWaves]),e={...enemy('zeb'),targetX:15,targetZ:15,chargeX:1,chargeZ:0,damage:20},g={grid:Array.from({length:30},()=>Array(30).fill(0)),player:{x:30,z:30},world:{obstacles:[]},hurt(){},canSee:()=>true};
 for(let i=0;i<300;i++){fx.volley(e,ATTACKS.deluge);fx.wave(e,6,10);fx.pool(1,1,10);fx.update(.02,g);for(const o of [...fx.bolts,...fx.pools,...fx.waves])assert.ok(objects.has(o));fx.clearHazards();}assert.equal(fx.bolts,arrays[0]);assert.equal(fx.pools,arrays[1]);assert.equal(fx.waves,arrays[2]);assert.equal(fx.freeBolts.length,32);assert.equal(fx.freePools.length,12);assert.equal(fx.freeWaves.length,6);fx.dispose();
});
test('Replaying a prepared stage restores prop parenting, visibility, pose and material state',()=>{
 const c=Object.create(Cinematics.prototype);c.id='closet';c.scene=new T.Scene();c.stage=new T.Group();c.scene.add(c.stage);c.vial=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0x123456,emissive:0x112233}));c.stage.add(c.vial);c.vial.position.x=2;c.capturePack();const elsewhere=new T.Group();c.scene.add(elsewhere);elsewhere.add(c.vial);c.vial.position.x=5;c.vial.visible=false;c.vial.material.emissive.setHex(0xff0000);c.restorePack(c.stageCache.get('closet'));assert.equal(c.vial.parent,c.stage);assert.equal(c.vial.position.x,2);assert.equal(c.vial.visible,true);assert.equal(c.vial.material.emissive.getHex(),0x112233);let disposed=0;c.world={disposeObject(){disposed++;}};c.clearPrepared();c.clearPrepared();assert.equal(disposed,1);
});
test('Checkpoint writes coalesce outside combat and the newest progress is immediately readable',()=>{
 const originalStorage=globalThis.localStorage,originalIdle=globalThis.requestIdleCallback,jobs=[],writes=[];globalThis.requestIdleCallback=job=>{jobs.push(job);return jobs.length;};globalThis.localStorage={setItem(key,value){writes.push(JSON.parse(value));}};
 try{const g=Object.create(Game.prototype);g.player={x:1,z:2,hp:100,ammo:12,reserve:60,meds:2};g.chapter=0;g.difficulty='survivor';g.pages=new Set();g.allies=new Set();g.seenScenes=new Set();g.items=[];g.enemies=[enemy('birdy')];g.stats={};g.ui={updateContinue(){}};g.save();g.player.reserve=96;g.enemies[0].phase=3;g.save();assert.equal(writes.length,0);assert.equal(jobs.length,1);assert.equal(g.readSave().reserve,96);jobs[0]();assert.equal(writes.length,1);assert.equal(writes[0].reserve,96);assert.equal(writes[0].bossProgress[0].phase,3);assert.equal(g.pendingSave,null);}finally{globalThis.localStorage=originalStorage;globalThis.requestIdleCallback=originalIdle;}
});
test('A failed browser storage write retains the session checkpoint',()=>{
 const original=globalThis.localStorage;globalThis.localStorage={setItem(){throw Error('quota');}};try{const g=Object.create(Game.prototype);g.pendingSave={version:1,chapter:1};g.flushSave();assert.equal(g.storageFailed,true);assert.equal(g.readSave().chapter,1);}finally{globalThis.localStorage=original;}
});
