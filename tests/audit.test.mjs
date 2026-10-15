import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {Game} from '../dist/game.js';
import {World} from '../dist/world.js';
import {Cinematics} from '../dist/cinematics.js';
import {Voice} from '../dist/voice.js';
import {Sound} from '../dist/audio.js';
import {normalizeSettings} from '../dist/settings.js';
import {CHAPTERS,DIFFICULTIES,normalizeSave,validSave} from '../dist/data.js';
import {ATTACKS,enemyRadius,navigationGoal} from '../dist/enemy-director.js';
import {traceShot,capsuleIntersection,propsOcclude} from '../dist/fps.js';
import {saveBossProgress,restoreBossProgress} from '../dist/boss-fights.js';
import {RADIO} from '../dist/dialogue.js';

class Node extends EventTarget{
 constructor(action){super();this.tagName='CANVAS';this.dataset={action};this.style={setProperty(){}};this.classList={toggle(){}};this.children=new Map();}
 querySelector(s){if(!this.children.has(s))this.children.set(s,new Node());return this.children.get(s);}
 setAttribute(){}setPointerCapture(){}hasPointerCapture(){return false;}
 getBoundingClientRect(){return{x:0,y:0,width:70,height:70};}
}
function environment(fn){
 const original=Object.fromEntries(['document','addEventListener','requestAnimationFrame','cancelAnimationFrame','matchMedia'].map(k=>[k,globalThis[k]])),win=new Node(),doc=new Node(),nodes=new Map(),fire=new Node('fire'),aim=new Node('aim');
 doc.querySelector=s=>{if(!nodes.has(s))nodes.set(s,new Node());return nodes.get(s);};doc.querySelectorAll=()=>[fire,aim];doc.body={classList:{toggle(){}}};doc.hidden=false;
 globalThis.document=doc;globalThis.addEventListener=win.addEventListener.bind(win);globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};globalThis.matchMedia=()=>({matches:false});
 const restore=()=>Object.assign(globalThis,original);try{const out=fn({win,doc,nodes,fire,aim});if(out?.then)return out.finally(restore);restore();return out;}catch(e){restore();throw e;}
}
const send=(target,type,values={})=>{const e=new Event(type,{cancelable:true});for(const[k,v]of Object.entries(values))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);};
const creature=(kind='walker')=>({id:0,kind,x:6,z:6,hp:100,max:100,phase:0,range:1.5,speed:2.9,damage:20,alert:true,cool:999,path:[],pathTimer:0,model:new T.Group(),stageResolved:1});
function game(){
 const g=Object.create(Game.prototype);Object.assign(g,{running:true,paused:false,loading:false,time:7,last:1000,chapter:0,difficulty:'survivor',config:CHAPTERS[0],level:CHAPTERS[0].level,objectives:0,beats:new Set(),pages:new Set(),allies:new Set(),seenScenes:new Set(),items:[],enemies:[],stats:{kills:0,hits:0,shots:0,deaths:0,seconds:0},keys:new Set(),mouse:{down:false,aiming:false},touch:{x:0,z:0},settings:{motion:true,subtitles:true,sensitivity:1},diff:DIFFICULTIES.survivor,aim:{x:6,z:0},bossDead:false,chapterStart:7,toastUntil:0,nextRadio:99});
 g.player={x:6,z:6,yaw:0,pitch:0,hp:100,stamina:100,ammo:12,reserve:24,meds:1,inv:0,cooldown:0,melee:0,dash:0,reloading:0};g.grid=Array.from({length:24},()=>Array(30).fill(0));g.world={root:new T.Group(),ready:Promise.resolve(),character:()=>new T.Group(),disposeObject(){},setView(){},update(){},prepareCombatAsync:async()=>{},blocked:()=>false,clearWalkPath:()=>true,clearSight:()=>true,animateCharacter(){},faceCharacter(){},effect(){},tracer(){}};g.sound={init(){},pause(){},play(){}};g.cinema={active:false,cancel(){},clearPrepared(){},prewarm:async()=>{}};g.ui={isOpen:()=>false,pause(){g.setPaused(true);},death(){},showGame(){},updateContinue(){}};g.capturePointer=()=>{};g.save=()=>{};g.toast=()=>{};g.radio=()=>{};return g;
}

test('Birdy folds his full wingspan when either wing tip reaches a wall',()=>environment(()=>{
 for(const column of [4,7]){const g=game(),e=creature('birdy');e.x=14.3;e.z=13.2;e.introduced=true;e.recover=1;e.model.userData.wingspan=6.8;g.player.x=e.x;g.player.z=e.z;g.enemies=[e];g.grid[5][column]=1;g.updateEnemies(0);assert.equal(e.wingSpace,false);g.grid[5][column]=0;g.updateEnemies(0);assert.equal(e.wingSpace,true);}
}));
test('A rejected render leaves simulation untouched and the next accepted frame includes elapsed time',()=>environment(()=>{const g=game();g.player.cooldown=.5;g.proximity=g.directRoute=()=>{};let rendered=0,ended=0;g.world.update=()=>rendered++;g.renderBudget={begin:()=>false,end:()=>ended++};g.frame(1004);assert.equal(g.last,1000);assert.equal(g.time,7);assert.equal(g.player.cooldown,.5);assert.equal(rendered,0);g.renderBudget.begin=()=>true;g.frame(1016);assert.ok(Math.abs(g.time-7.016)<1e-9);assert.equal(g.player.cooldown,.484);assert.equal(rendered,1);assert.equal(ended,1);}));
test('A lost graphics context freezes simulation and prevents resume until recovery',()=>environment(()=>{const g=game();g.graphicsUnavailable=true;let voices=0;g.voice={update(){voices++;},pause(){}};g.world.update=()=>assert.fail('Rendered into a lost context');g.setPaused(false);assert.equal(g.paused,true);g.frame(2000);assert.equal(g.last,2000);assert.equal(g.time,7);assert.equal(g.player.ammo,12);assert.equal(voices,1);}));

test('Invalid saved options keep the camera and volume finite while retaining valid preferences',()=>{
 const s=normalizeSettings({fov:'broken',dialogueVolume:'broken',sensitivity:null,volume:0,motion:'false',subtitles:false,quality:'unknown'},true);assert.equal(s.fov,76);assert.equal(s.dialogueVolume,1);assert.equal(s.sensitivity,1);assert.equal(s.volume,0);assert.equal(s.motion,true);assert.equal(s.subtitles,false);assert.equal(s.quality,'high');assert.equal(normalizeSettings({fov:900,volume:3}).fov,95);assert.equal(normalizeSettings({fov:60}).fov,60);
});
test('Malformed optional checkpoint fields cannot crash Continue or turn statistics into strings',()=>{
 const raw={version:1,chapter:1,difficulty:'survivor',pages:[0,0,1],allies:[0],ammo:12,reserve:24,meds:1,collected:42,killed:{},beats:'x',bossProgress:'x',stats:{seconds:'bad',shots:Infinity,hits:-3},position:[NaN,6],hp:NaN};assert.equal(validSave(raw),true);const s=normalizeSave(raw);assert.deepEqual(s.collected,[]);assert.deepEqual(s.killed,[]);assert.deepEqual(s.pages,[0,1]);assert.equal(s.position,null);assert.equal(s.hp,100);assert.deepEqual(s.stats,{kills:0,shots:0,hits:0,deaths:0,seconds:0});assert.equal(validSave({...raw,ammo:1.5}),false);
});
test('Point-blank head and capsule hits work when the muzzle ray starts inside the target',()=>{
 const grid=Array.from({length:20},()=>Array(20).fill(0)),origin={x:6,y:1.64,z:6},d={x:0,y:0,z:-1};assert.equal(capsuleIntersection(origin,d,{x:6,y:.5,z:6},{x:6,y:2,z:6},.3),0);
 const e={kind:'chris',x:6,z:6,hitHeads:[{x:6,y:1.64,z:6}],hitParts:[{a:{x:6,y:.5,z:6},b:{x:6,y:2,z:6},r:.3}]},hit=traceShot(grid,origin,[e],d);assert.equal(hit.enemy,e);assert.equal(hit.headshot,true);assert.equal(hit.distance,0);
});
test('Low furniture blocks walking but does not hide a standing player from an enemy',()=>{
 const a={x:6,z:6},b={x:12,z:6},desk={x:9,z:6,w:2,d:2,h:1.2};assert.equal(propsOcclude([desk],a,b,1.6,1.64),false);assert.equal(propsOcclude([desk],a,b,.6,1.14),true);assert.equal(propsOcclude([{...desk,h:2.4}],a,b),true);assert.equal(propsOcclude([{...desk,h:2.4,active:false}],a,b),false);
});
test('Pathfinding can approach a player standing at the safe edge of a furniture-marked cell',()=>{
 const grid=Array.from({length:6},()=>Array(6).fill(0));grid[2][2]=1;const target={x:6.7,z:6};const p=navigationGoal(grid,target,a=>a.x>target.x);assert.ok(p.x>target.x);assert.equal(grid[Math.floor(p.z/2.4)][Math.floor(p.x/2.4)],0);assert.equal(navigationGoal(grid,target,()=>false),null);const open={x:1,z:1};assert.equal(navigationGoal(grid,open),open);
});
test('Late boss charge lanes and wave warnings match the actual attacks',()=>{
 const w=Object.create(World.prototype);w.root=new T.Group();const warning=w.attackMarker();for(const name of ['groundRush','revenge','pursue','skydive']){w.updateAttackMarker({attack:name,attackTime:.1,x:0,z:0,chargeX:1,chargeZ:0,targetX:5,targetZ:0,warning});assert.equal(warning.userData.line.visible,true);assert.equal(warning.userData.line.scale.z,ATTACKS[name].dash*ATTACKS[name].duration);}for(const name of ['groundtear','rupture','scream','siphon']){w.updateAttackMarker({attack:name,attackTime:0,x:0,z:0,targetX:5,targetZ:0,warning});assert.equal(warning.userData.line.visible,false);assert.equal(warning.userData.ring.scale.x,ATTACKS[name].wave);}
});
test('Every direction uses the same late-phase movement multiplier and boss footprint',()=>environment(()=>{
 for(const kind of ['chris','zeb']){const distances=[];for(const axis of ['x','z']){const g=game(),e=creature(kind);e.phase=4;e.hp=10;g.enemies=[e];g.player[axis]=14;const move=g.move.bind(g),radii=[];g.move=(o,dx,dz,r)=>{radii.push(r);move(o,dx,dz,r);};g.updateEnemies(.1);distances.push(Math.hypot(e.x-6,e.z-6));assert.ok(radii.every(r=>r===enemyRadius(e)));}assert.ok(Math.abs(distances[0]-distances[1])<1e-8);}
}));
test('Pause and cinematics freeze the gameplay clock and preserve starting movement hints',()=>environment(()=>{
 const g=game();g.paused=true;let renderedDt;g.world.update=dt=>renderedDt=dt;g.frame(1040);assert.equal(g.time,7);assert.equal(g.stats.seconds,0);assert.equal(renderedDt,0);g.paused=false;g.cinema={active:true,update(){}};g.frame(1080);assert.equal(g.time,7);g.cinema.active=false;g.proximity=()=>{};g.directRoute=()=>{};g.frame(1120);assert.ok(g.time>7);assert.ok(g.time-g.chapterStart<.1);
}));
test('A fatal attack cannot trigger a route event or boss cutscene after the death menu opens',()=>environment(()=>{
 const g=game();let routes=0;g.proximity=()=>routes++;g.directRoute=()=>routes++;g.updateEnemies=()=>g.hurt(1000);g.frame(1040);assert.equal(g.player.hp,0);assert.equal(g.paused,true);assert.equal(routes,0);
}));
test('Enemy updates stop immediately when a released attack kills Ethan',()=>environment(()=>{
 const g=game(),a=creature(),b=creature();a.x=b.x=7;a.attack=b.attack='bite';a.windup=b.windup=.001;g.player.hp=10;g.enemies=[a,b];g.updateEnemies(.02);assert.equal(g.player.hp,0);assert.equal(b.windup,.001);
}));
test('Blur plus tab hiding cannot unpause a boss cutscene or alter a manually paused scene',()=>environment(({win,doc})=>{
 const g=game(),c=Object.create(Cinematics.prototype);c.active=true;c.paused=false;c.arena={active:true,paused:false,togglePause(){this.paused=!this.paused;}};g.cinema=c;g.paused=true;g.setupInput();send(win,'blur');doc.hidden=true;send(doc,'visibilitychange');assert.equal(c.arena.paused,true);send(win,'blur');assert.equal(c.arena.paused,true);c.pause(false);assert.equal(c.arena.paused,false);
}));
test('Escape works while an options slider has keyboard focus',()=>environment(({win})=>{
 const g=game();g.paused=true;let closed=0;g.ui.isOpen=()=>true;g.ui.close=()=>closed++;g.setupInput();const input=new Node();input.tagName='INPUT';send(win,'keydown',{code:'Escape',target:input});assert.equal(closed,1);
}));
test('Lost touch capture releases fire and paused/loading controls cannot queue combat actions',()=>environment(({fire,aim,win,doc})=>{
 const g=game();g.setupInput();send(fire,'pointerdown',{pointerId:1});send(fire,'pointerdown',{pointerId:2});assert.equal(g.touch.fire,true);send(fire,'pointerup',{pointerId:1});assert.equal(g.touch.fire,true);send(fire,'lostpointercapture',{pointerId:2});assert.equal(g.touch.fire,false);g.setPaused(true);send(aim,'pointerdown',{pointerId:3});send(fire,'pointerdown',{pointerId:4});assert.equal(g.touch.aiming,false);assert.equal(g.touch.fire,false);g.setPaused(false);g.loading=true;const ammo=g.player.ammo;send(fire,'pointerdown',{pointerId:5});send(doc.querySelector('#world'),'mousedown',{button:0,buttons:1});send(win,'keydown',{code:'KeyF'});assert.equal(g.touch.fire,false);assert.equal(g.player.ammo,ammo);assert.equal(g.player.melee,0);
}));
test('Lil Birdy guards the last fragment and rewards ammunition without completing Jakob’s fight',()=>environment(()=>{
 const g=game(),e=creature('birdy');g.chapter=1;g.config=CHAPTERS[1];g.level=g.config.level;g.objectives=2;e.phase=4;e.hp=1;g.enemies=[e];const item={kind:'seal',stage:2,used:false};g.nearest=item;let saves=0;g.save=()=>saves++;g.interact();assert.equal(item.used,false);assert.equal(g.spawnBoss(),false);g.hurtEnemy(e,10);assert.equal(e.dead,true);assert.equal(g.player.reserve,54);assert.equal(g.bossDead,false);assert.equal(saves,1);g.items=[{id:0,used:true},{id:1,used:true},{...item,id:2}];g.nearest=g.items[2];g.interact();assert.equal(g.objectives,3);
}));
test('A headshot counter retains its stagger and exposure through the damage reaction',()=>environment(()=>{
 const g=game(),e=creature('birdy');e.phase=3;e.hp=1000;e.max=1500;e.windup=2;e.attack='groundRush';g.enemies=[e];g.hurtEnemy(e,1,0,0,true);g.hurtEnemy(e,1,0,0,true);assert.equal(e.windup,0);assert.ok(e.stagger>=.8);assert.ok(e.exposed>=1.8);
}));
test('Boss reloads retain valid positions and alertness, while blocked positions fall back safely',()=>{
 const e={...creature('jakob'),max:2200,hp:1000,phase:3,bobbyCrushed:true,alert:true,x:15,z:12,beatsDone:new Set(['crusher'])},s=saveBossProgress(e),next={...creature('jakob'),max:2200};assert.equal(restoreBossProgress(next,s),true);assert.deepEqual([next.x,next.z],[15,12]);assert.equal(next.alert,true);const blocked={...creature('jakob'),max:2200};restoreBossProgress(blocked,s,()=>false);assert.deepEqual([blocked.x,blocked.z],[6,6]);
});
test('An unavailable audio device still allows failed radio captions to finish and the queue to advance',()=>{
 let now=0;const v=new Voice({context:null,init(){},duck(){}},{volume:0},{clock:()=>now});v.pause(false);v.say(...RADIO.retry);v.say(...RADIO.continue);assert.equal(v.current.error,true);const duration=v.current.entry.duration;now=duration+2;v.update();assert.equal(v.current.entry.text,RADIO.continue[1]);v.pause(true);const held=v.radioTime;now+=90;assert.equal(v.radioTime,held);v.pause(false);assert.equal(v.radioTime,held);now+=v.current.entry.duration+2;v.update();assert.equal(v.current,null);
});
test('Chapter preparation succeeds without Web Audio and overlapping loads do not mutate the level',()=>environment(async()=>{
 globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;const g=game();g.voice={pause(){},init(){throw Error('Audio unavailable');}};let runs=0;await g.prepareRun(0,()=>runs++);assert.equal(runs,1);assert.equal(g.audioPreparationFailed,true);assert.equal(g.loading,false);g.loading=true;assert.equal(await g.prepareRun(0,()=>runs++),false);assert.equal(runs,1);
}));
test('Resuming after a background audio suspension requests audio playback again',()=>{
 const s=new Sound();let resumes=0;s.context={state:'suspended',resume(){resumes++;return Promise.resolve();}};s.pause(true);assert.equal(resumes,0);s.pause(false);assert.equal(resumes,1);
});
test('Changed boss instructions become visible again after the quiet HUD has faded them',()=>environment(()=>{
 const g=game(),e=creature('birdy');g.chapter=1;g.config=CHAPTERS[1];g.level=g.config.level;g.objectives=2;g.enemies=[e];g.world.bossArena={objective:()=> 'Dodge the charge. Strike when he falls.'};g.paused=true;g.objectiveUntil=6;g.objectiveKey='1:2:false:Defeat Lil Birdy.';g.setHUD();g.frame(1040);assert.equal(g.objectiveUntil,15);
}));
test('Settled corpses stop rebuilding their skeletal poses every frame',()=>environment(()=>{
 const g=game(),e=creature();e.dead=true;e.deathTime=2.98;g.enemies=[e];let poses=0;g.world.animateCharacter=()=>poses++;g.updateEnemies(.1);g.updateEnemies(1);assert.equal(e.deathTime,3);assert.equal(poses,1);assert.equal(e.model.visible,true);
}));
test('Retries persist the increased death count immediately',()=>environment(()=>{
 const g=game(),old=globalThis.requestIdleCallback;globalThis.requestIdleCallback=()=>1;g.checkpoint={version:1,chapter:0,difficulty:'survivor',pages:[],allies:[],ammo:12,reserve:24,meds:1,stats:{deaths:0}};g.restore=v=>g.stats={...g.stats,...v.stats};g.save=Game.prototype.save;
 try{g.retry();assert.equal(g.pendingSave.stats.deaths,1);g.retry();assert.equal(g.pendingSave.stats.deaths,2);}finally{globalThis.requestIdleCallback=old;}
}));
test('A glancing charge impact cancels the rush and exposes the boss instead of sliding along a wall',()=>environment(()=>{
 const g=game(),e=creature('chris');e.max=e.hp=1800;e.attack='rush';e.charge=.4;e.chargeX=.02;e.chargeZ=Math.sqrt(1-.02**2);g.player.z=14;g.enemies=[e];g.move=(o,dx,dz)=>o.z+=dz;g.updateEnemies(.1);assert.equal(e.wallHit,true);g.updateEnemies(.016);assert.equal(e.charge,0);assert.ok(e.exposed>=2.8);assert.equal(e.comboPattern,null);
}));
test('Older checkpoints with Jakob already active still restore him and require Birdy before the seal',()=>environment(()=>{
 const g=game(),e=creature('birdy');g.chapter=1;g.config=CHAPTERS[1];g.level=g.config.level;g.enemies=[e];g.objectives=3;g.bossSpawned=true;g.spawnBoss(false);assert.equal(g.boss.kind,'jakob');assert.equal(g.boss.dead,false);g.boss.dead=g.bossDead=true;g.nearest={kind:'exit'};let seals=0;g.ui.puzzle=()=>seals++;g.interact();assert.equal(seals,0);e.dead=true;g.interact();assert.equal(seals,1);
}));

test('A resized paused cutscene redraws exactly once without advancing its story clock',()=>environment(()=>{
 const g=game();let draws=0;g.paused=true;g.cinema={active:true,isPaused:true,update(){draws++;}};g.frame(1040);g.frame(1080);assert.equal(draws,1);g.world.needsPausedRender=true;g.frame(1120);assert.equal(draws,2);assert.equal(g.world.needsPausedRender,false);g.frame(1160);assert.equal(draws,2);assert.equal(g.time,7);
}));
test('Navigation refreshes once when a moving shutter becomes passable',()=>environment(()=>{
 const g=game();let rebuilds=0;g.rebuildNavigation=()=>{rebuilds++;g.world.navigationDirty=false;};g.proximity=g.directRoute=()=>{};g.world.navigationDirty=true;g.frame(1040);g.frame(1080);assert.equal(rebuilds,1);g.world.navigationDirty=true;g.frame(1120);assert.equal(rebuilds,2);
}));

test('Paused cutscenes reveal audio readiness and failure actions without advancing or redrawing the scene',()=>environment(({doc})=>{
 const g=game(),c=Object.create(Cinematics.prototype);c.game=g;c.active=true;c.paused=true;c.arena={active:false};c.leadIn=0;c.returnTime=null;c.captionFallback=false;let draws=0;c.update=()=>draws++;g.cinema=c;g.paused=true;g.voice={scene:{ready:false,error:false},update(){}};g.frame(1040);assert.equal(doc.querySelector('#scene-loading').hidden,false);g.voice.scene.error=true;g.frame(1080);assert.equal(doc.querySelector('#scene-audio-actions').hidden,false);assert.equal(doc.querySelector('#scene-loading-message').textContent,'Dialogue could not load.');g.voice.scene={ready:true,error:false};g.frame(1120);assert.equal(doc.querySelector('#scene-loading').hidden,true);assert.equal(draws,1);assert.equal(g.time,7);
}));

test('Shots originate at the current interpolated crouch height',()=>environment(()=>{
 const g=game();g.player.eyeHeight=1.38;g.player.crouching=true;let y;g.world.tracer=from=>y=from.y;g.shoot();assert.equal(y,1.38);assert.equal(g.player.ammo,11);
}));
test('A grazing boss charge applies damage along its swept path and records its direction',()=>environment(()=>{
 const g=game(),e=creature('chris');e.hp=e.max=1800;e.attack='rush';e.charge=.5;e.chargeX=1;e.chargeZ=0;g.player.x=6.29;g.player.z=7.83;g.enemies=[e];g.updateEnemies(.045);assert.equal(g.player.hp,72);assert.equal(e.hitCharge,true);assert.ok(g.hurtDirection.y<50);
}));
test('Decorative zero-damage waves cannot trigger injury feedback or consume invulnerability',()=>environment(()=>{
 const g=game();assert.equal(g.hurt(0),false);assert.equal(g.hurt(NaN),false);assert.equal(g.player.hp,100);assert.equal(g.player.inv,0);assert.equal(g.flash,undefined);
}));
test('Defeating a boss clears its leftover hazards before opening the route',()=>environment(()=>{
 const g=game(),e=creature('birdy');e.hp=1;e.max=1500;e.phase=4;e.stageResolved=1;g.enemies=[e];let cleared=0;g.world.enemyEffects={clearHazards(){cleared++;}};g.hurtEnemy(e,100);assert.equal(e.dead,true);assert.equal(cleared,1);
}));
test('Applying graphics suspends gameplay and rendering while hidden warmup variants are exposed',()=>environment(()=>{
 const g=game();let draws=0;g.world.update=()=>draws++;g.proximity=g.directRoute=()=>{};g.applyingGraphics=true;g.world.needsPausedRender=true;g.mouse.down=true;g.frame(1040);assert.equal(draws,0);assert.equal(g.time,7);assert.equal(g.stats.shots,0);g.mouse.down=false;g.applyingGraphics=false;g.frame(1080);assert.equal(draws,1);assert.ok(g.time>7);
}));
