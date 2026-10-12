import {crushBobby} from '../dist/boss-fights.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTERS,TILE,makeGrid,findPath,solid,sight,validSave,endingFor,DIFFICULTIES} from '../dist/data.js';
import {Game} from '../dist/game.js';
import {viewDirection,relativeMove,traceShot,EYE_HEIGHT,propsBlock} from '../dist/fps.js';
const at=a=>({x:(a[0]+.5)*TILE,z:(a[1]+.5)*TILE});
for(const c of CHAPTERS)test(c.name+': every objective, page, ally and exit is reachable',()=>{const grid=makeGrid(c.theme),start=at(c.start);for(const location of [...c.items.map(i=>i.at),c.npc.at,c.exit,c.boss.at,...c.enemies.map(e=>e.slice(1))]){const target=at(location);assert.equal(solid(grid,target.x,target.z),false,'Spawn is inside a wall: '+location);assert.ok(findPath(grid,start,target).length||location.join()===c.start.join(),'Unreachable: '+location);}assert.equal(c.items.filter(i=>['fuse','seal','anchor'].includes(i.kind)).length,3);assert.equal(c.items.filter(i=>i.kind==='page').length,2);});
test('All three endings follow notebook, ally and final choice conditions',()=>{assert.equal(endingFor([0,1,2,3],[0,1,2],'remember'),'home');assert.equal(endingFor([0,1,2],[0,1,2],'remember'),'echoes');assert.equal(endingFor([0,1,2,3,4,5],[0,1],'remember'),'echoes');assert.equal(endingFor([0,1,2,3],[0,1,2],'seal'),'alone');assert.equal(endingFor([0,0,0,0],[0,1,2],'remember'),'echoes');});
test('Corrupt saves cannot load invalid chapters, difficulties, resources or pages',()=>{const s={version:1,chapter:1,pages:[0,1],allies:[0],difficulty:'survivor',ammo:12,reserve:48,meds:2};assert.equal(validSave(s),true);for(const change of [{chapter:3},{chapter:-1},{ammo:Infinity},{ammo:-1},{reserve:NaN},{meds:1000},{pages:[99]},{allies:[5]},{difficulty:'invalid'},{version:0}])assert.equal(validSave({...s,...change}),false,JSON.stringify(change));assert.equal(validSave(null),false);});
const nodes=new Map();globalThis.document={querySelector(s){if(!nodes.has(s))nodes.set(s,{style:{setProperty(){}},dataset:{},hidden:false,textContent:'',querySelector(){return {textContent:''};}});return nodes.get(s);}};
function fixture(){const g=Object.create(Game.prototype);g.grid=Array.from({length:10},(_,z)=>Array.from({length:10},(_,x)=>x===0||z===0||x===9||z===9?1:0));g.player={x:6,z:6,hp:100,stamina:100,ammo:12,reserve:24,meds:1,inv:0,dash:0,cooldown:0,melee:0,reloading:0};g.aim={x:20,z:6};g.stats={kills:0,shots:0,hits:0};g.diff=DIFFICULTIES.survivor;g.sound={play(){}};g.world={effect(){},tracer(){},root:{remove(){}}};g.enemies=[];g.toast=()=>{};g.save=()=>{};g.radio=()=>{};g.ui={page(){},puzzle(){},finale(){}};g.config=CHAPTERS[0];g.chapter=0;g.pages=new Set();g.allies=new Set();g.npc={name:'Joel',line:0};g.items=[];return g;}
function enemy(x,z,hp=88){return{x,z,hp,max:hp,range:1.5,boss:false,dead:false,model:{traverse(){},rotation:{},position:{},scale:{multiplyScalar(){}}}};}
test('Movement uses small collision steps and cannot tunnel through walls during a dodge',()=>{const g=fixture();g.grid[2][4]=1;g.move(g.player,12,0,.32);assert.ok(g.player.x<4*TILE-.3);assert.ok(!solid(g.grid,g.player.x,g.player.z));});
test('A body shot hits the nearest enemy and consumes ammunition once',()=>{const g=fixture(),a=enemy(9,6),b=enemy(13,6);g.player.yaw=-Math.PI/2;g.player.pitch=-.18;g.enemies=[b,a];g.shoot();assert.equal(a.hp,54);assert.equal(b.hp,88);assert.equal(g.player.ammo,11);assert.equal(g.stats.hits,1);g.shoot();assert.equal(g.player.ammo,11,'Cooldown prevents repeated shots in the same frame');});
test('Walls stop bullets and knife attacks',()=>{const g=fixture();g.grid[2][4]=1;const e=enemy(13,6);g.enemies=[e];assert.equal(sight(g.grid,g.player,e),false);g.shoot();assert.equal(e.hp,88);g.player.x=9.1;e.x=10.5;g.aim={x:13,z:6};g.melee();assert.equal(e.hp,88);});
test('Empty magazine starts reload, while an empty reserve never fabricates rounds',()=>{const g=fixture();g.player.ammo=0;g.shoot();assert.equal(g.player.reloading,1.9);g.player.reloading=0;g.player.cooldown=0;g.player.reserve=0;g.shoot();assert.equal(g.player.reloading,0);assert.equal(g.player.ammo,0);});
test('First aid, invulnerability and the infinite knife keep combat viable without ammunition',()=>{const g=fixture();g.player.hp=20;g.heal();assert.equal(g.player.hp,85);assert.equal(g.player.meds,0);g.paused=false;g.hurt(20);assert.equal(g.player.hp,85,'Healing grants brief protection');g.player.inv=0;g.hurt(20);assert.equal(g.player.hp,65);g.enemies=[enemy(7.2,6)];g.player.ammo=g.player.reserve=0;g.melee();assert.equal(g.enemies[0].hp,48);});
test('A pickup cannot be collected twice through a stale interaction target',()=>{const g=fixture();g.nearest={kind:'ammo',used:false};g.interact();assert.equal(g.player.reserve,48);g.interact();assert.equal(g.player.reserve,48);});
test('Chapter exits are locked by objectives and bosses before the seal puzzle or finale',()=>{const g=fixture();g.nearest={kind:'exit'};let advance=0,bosses=0;g.nextChapter=()=>advance++;g.spawnBoss=()=>bosses++;g.objectives=2;g.interact();assert.equal(advance,0);assert.equal(bosses,0);g.objectives=3;g.bossDead=false;g.interact();assert.equal(bosses,1);assert.equal(advance,0);g.bossDead=true;g.interact();assert.equal(advance,1);});

test('Movement and dodges follow the first-person heading',()=>{
 const west=relativeMove(0,-1,Math.PI/2);assert.ok(Math.abs(west.x+1)<1e-9);assert.ok(Math.abs(west.z)<1e-9);
 const southStrafe=relativeMove(1,0,-Math.PI/2);assert.ok(Math.abs(southStrafe.x)<1e-9);assert.ok(Math.abs(southStrafe.z-1)<1e-9);
 const g=fixture();g.keys=new Set(['KeyW']);g.touch={x:0,z:0};g.player.yaw=Math.PI/2;g.dash();assert.ok(g.player.dashX<-.99);assert.ok(Math.abs(g.player.dashZ)<1e-9);
});
test('Pitch is ballistic: headshots do double damage and looking above enemies misses',()=>{
 const g=fixture();g.player.yaw=-Math.PI/2;g.player.pitch=0;const e=enemy(9,6);g.enemies=[e];g.shoot();assert.equal(e.hp,20);
 const origin={x:6,y:EYE_HEIGHT,z:6};const miss=traceShot(g.grid,origin,[e],viewDirection(-Math.PI/2,.7));assert.equal(miss.enemy,null);assert.ok(miss.end.y>3.2,'The ceiling stops the round');
 const down=traceShot(g.grid,origin,[e],viewDirection(-Math.PI/2,-.9));assert.equal(down.enemy,null);assert.ok(down.end.y<.04,'The floor stops the round');
});
test('Furniture blocks movement and low shots while a high shot clears a desk',()=>{
 const g=fixture(),e=enemy(11,6),props=[{x:8,z:6,w:1,d:1,h:1.2}],origin={x:6,y:EYE_HEIGHT,z:6};
 const low=traceShot(g.grid,origin,[e],viewDirection(-Math.PI/2,-.3),props);assert.equal(low.enemy,null);assert.ok(low.distance<2);
 const high=traceShot(g.grid,origin,[e],viewDirection(-Math.PI/2,0),props);assert.equal(high.enemy,e);assert.equal(high.headshot,true);
 assert.equal(propsBlock(props,7.25,6,.32),true);assert.equal(propsBlock(props,7,6,.32),false);
 g.world.blocked=(x,z,r)=>propsBlock(props,x,z,r);g.move(g.player,5,0,.32);assert.ok(g.player.x<7.2);
});

test('The complete campaign still reaches the best ending through real progression actions',()=>{
 const g=fixture(),model=()=>({position:{set(){}},rotation:{},scale:{multiplyScalar(){}},traverse(){},visible:true});
 g.world={load(){},character:model,object:model,memoryObject:model,setView(){},blocked(){return false;},root:{add(){},remove(){}},effect(){},tracer(){}};
 g.settings={subtitles:true};g.keys=new Set();g.mouse={};g.touch={};g.time=0;g.sound.pause=()=>{};g.capturePointer=()=>{};
 g.ui.showGame=()=>{};g.ui.intro=()=>{};g.ui.updateContinue=()=>{};g.save=()=>{};let ending=null,puzzles=0,finales=0;
 g.ui.puzzle=()=>puzzles++;g.ui.finale=()=>finales++;g.ui.ending=e=>ending=e;
 g.newGame('survivor');g.paused=false;
 for(let chapter=0;chapter<3;chapter++){
  assert.equal(g.chapter,chapter);g.nearest=g.npc;g.interact();
  for(const item of g.items.filter(i=>i.kind==='page')){g.nearest=item;g.interact();}
  for(const item of g.items.filter(i=>['fuse','seal','anchor'].includes(i.kind))){g.nearest=item;g.interact();}
  assert.equal(g.objectives,3);assert.equal(g.bossSpawned,false,'Boss waits for the arena entrance');const beat=g.level.beats.find(b=>b.boss);g.player.x=(beat.at[0]+.5)*TILE;g.player.z=(beat.at[1]+.5)*TILE;g.directRoute();assert.ok(g.bossSpawned);assert.equal(g.bossDead,false);
  g.boss.stageResolved=1;g.hurtEnemy(g.boss,10000);if(g.boss.kind==='jakob'){assert.equal(g.bossDead,false,'The chase cannot be skipped by damage');g.boss.phase=2;assert.equal(crushBobby(g.boss),true);g.boss.stageResolved=1;g.hurtEnemy(g.boss,10000);}assert.equal(g.bossDead,true);g.nearest={kind:'exit'};g.interact();
  if(chapter===1){assert.equal(puzzles,1);g.puzzleSolved=true;g.nextChapter();}
 }
 assert.equal(finales,1);assert.equal(g.pages.size,6);assert.equal(g.allies.size,3);g.finish('remember');assert.equal(ending,'home');assert.equal(g.running,false);
});

test('Same-chapter retries retain prepared story stages; chapter changes release them',()=>{
 const g=fixture(),model=()=>({position:{set(){}},rotation:{},traverse(){},visible:true});let releases=0;
 g.world={load(){},character:model,object:model,memoryObject:model,setView(){},blocked(){return false;},root:{add(){},remove(){}}};g.cinema={clearPrepared(){releases++;}};g.difficulty='survivor';g.time=0;g.ui.showGame=()=>{};
 g.loadChapter(0);assert.equal(releases,0);g.loadChapter(0);assert.equal(releases,0);g.loadChapter(1);assert.equal(releases,1);g.loadChapter(1);assert.equal(releases,1);
});
