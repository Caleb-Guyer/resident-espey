import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {ATTACKS,chooseAttack,beginAttack,stepEnemy,interruptAttack,damageScale} from '../dist/enemy-director.js';
import {EnemyEffects} from '../dist/enemy-effects.js';import {World} from '../dist/world.js';
import {CHARACTER_DESIGNS,cloneCharacter} from '../dist/creature-design.js';
import {LEVELS,makeLevelGrid} from '../dist/levels.js';import {CHAPTERS,ENEMY_STATS,TILE,solid} from '../dist/data.js';
import {traceShot} from '../dist/fps.js';import {prepareTasks} from '../dist/loading.js';
import {Game} from '../dist/game.js';
const creature=(kind='walker')=>({kind,...ENEMY_STATS[kind],x:8,z:8,max:ENEMY_STATS[kind].hp,hp:ENEMY_STATS[kind].hp,cool:0,phase:0,stagger:0});
const p={x:8,z:14};
test('Campaign expands encounters, stages all types, and preserves existing enemy IDs',()=>{
 assert.equal(CHAPTERS.reduce((n,c)=>n+c.enemies.length,0),42);
 for(const c of CHAPTERS){assert.equal(c.enemies.length,14);for(const [kind,x,z,stage]of c.enemies){assert.ok(ENEMY_STATS[kind]);assert.equal(solid(makeLevelGrid(c.theme,stage),(x+.5)*TILE,(z+.5)*TILE),false);assert.ok(Math.hypot(x-c.start[0],z-c.start[1])>4,'A safe start has a hostile spawn');}}
 assert.deepEqual(LEVELS.school.enemies.slice(0,5).map(e=>e[0]),['walker','walker','runner','walker','walker']);
 assert.deepEqual(LEVELS.backrooms.enemies.slice(0,5).map(e=>e[0]),['walker','zsiga','walker','birdy','zsiga']);
 assert.equal(new Set(CHAPTERS.flatMap(c=>c.enemies.map(e=>e[0]))).size,8);
});
test('Each boss has a distinct pair of attacks and phase two changes its pressure',()=>{
 const patterns=[];for(const kind of ['chris','jakob','zeb','birdy']){
  const e=creature(kind),names=new Set();for(const dist of [2,7])for(let n=0;n<5;n++){e.attackCount=n;names.add(chooseAttack(e,dist));}
  assert.equal(names.size,2,kind);patterns.push([...names].sort().join());e.hp=e.max*.4;
  const result=stepEnemy(e,.016,{player:p,visible:true});assert.ok(result.events.some(a=>a.type==='phase'));assert.equal(e.phase,1);
 }assert.equal(new Set(patterns).size,4);
});
test('Boss charges commit direction, stop on walls and expose a long recovery',()=>{
 const e=creature('chris');beginAttack(e,p);const dx=e.chargeX,dz=e.chargeZ;
 assert.ok(e.windup>=1);for(let i=0;i<90;i++)stepEnemy(e,.016,{player:{x:40,z:30},visible:true});
 assert.equal(e.chargeX,dx);assert.equal(e.chargeZ,dz);assert.ok(e.charge>0);
 const wall=stepEnemy(e,.016,{player:p,visible:true,wallHit:true});assert.equal(wall.mode,'hold');assert.equal(e.charge,0);assert.equal(e.recover,ATTACKS.rush.wallRecover);assert.ok(damageScale(e,true)>1);
});
test('A walker must finish a visible tell before releasing contact damage',()=>{
 const e=creature(),context={player:{x:8,z:9},visible:true};let r=stepEnemy(e,.016,context);assert.equal(r.events[0].type,'tell');
 for(let t=0;t<.5;t+=.016){r=stepEnemy(e,.016,context);assert.ok(!r.events.some(x=>x.type==='release'));}
 let releases=0;for(let i=0;i<15;i++)releases+=stepEnemy(e,.016,context).events.filter(x=>x.type==='release').length;assert.equal(releases,1);assert.ok(e.recover>0);
});
test('Specific headshot counters interrupt tells; Jakob only responds to the speaking head',()=>{
 const e=creature('jakob');beginAttack(e,p);assert.equal(e.activeHead,0);assert.equal(interruptAttack(e,true,1),false);assert.ok(e.windup>0);assert.equal(interruptAttack(e,true,0),true);assert.equal(e.windup,0);assert.ok(e.recover>1);
 for(const kind of ['birdy','spitter']){const x=creature(kind);beginAttack(x,p);assert.equal(interruptAttack(x,false),false);assert.equal(interruptAttack(x,true),true);}
 const b=creature('brute');beginAttack(b,p);assert.equal(interruptAttack(b,true),false);assert.equal(interruptAttack(b,true),true);
 const c=creature('chris');beginAttack(c,p);assert.equal(interruptAttack(c,true),false);
});
test('Ranged attackers retreat at close range and strafe rather than pile into the player',()=>{
 const e=creature('spitter');e.cool=10;assert.equal(stepEnemy(e,.016,{player:{x:8,z:10},visible:true}).mode,'retreat');assert.equal(stepEnemy(e,.016,{player:p,visible:true}).mode,'strafe');assert.equal(stepEnemy(e,.016,{player:{x:8,z:20},visible:true}).mode,'chase');
});
function effectsFixture(){
 const fx=new EnemyEffects(new T.Group()),grid=Array.from({length:20},()=>Array(20).fill(0)),hits=[];
 const game={grid,player:{x:30,z:30},world:{obstacles:[],effect(){}},hurt:d=>hits.push(d),canSee:()=>true};return {fx,game,hits};
}
test('Volleys, pools and shockwaves use fixed storage and all expire',()=>{
 const {fx,game}=effectsFixture(),e={...creature('zeb'),targetX:30,targetZ:30,chargeX:1,chargeZ:0},geometry=fx.projectiles.geometry,buffer=fx.projectiles.instanceMatrix.array;
 for(let i=0;i<100;i++){fx.volley(e,ATTACKS.bile);fx.pool(20,20,12);fx.wave(e,6,20);}fx.sync();
 assert.equal(fx.bolts.length,32);assert.equal(fx.pools.length,12);assert.equal(fx.waves.length,6);assert.equal(fx.projectiles.geometry,geometry);assert.equal(fx.projectiles.instanceMatrix.array,buffer);
 for(let i=0;i<720;i++)fx.update(1/60,game);assert.equal(fx.bolts.length+fx.pools.length+fx.waves.length,0);assert.equal(fx.projectiles.count+fx.stains.count+fx.rings.count,0);assert.ok([...buffer].every(Number.isFinite));fx.dispose();
});
test('Projectile movement cannot tunnel through a wall or furniture',()=>{
 for(const furniture of [false,true]){const {fx,game,hits}=effectsFixture();game.player={x:15,z:8};if(furniture)game.world.obstacles=[{x:12,z:8,w:.4,d:3,h:2}];else for(const z of [2,3,4])game.grid[z][5]=1;
  fx.bolts.push({x:8,z:8,y:1.2,vy:0,vx:40,vz:0,life:3,damage:12,kind:'acid',color:0xaabb66});fx.update(.25,game);assert.equal(hits.length,0);assert.equal(fx.bolts.length,0);assert.ok(fx.pools[0].x<12);fx.dispose();}
});
function modelWorld(){const w=Object.create(World.prototype);w.assets=Object.fromEntries(['skin','face','ethan','survivor'].map(k=>[k,new T.Texture()]));w.characterTemplates=new Map();w.characterResources=new Set();w.procedural=()=>new T.Texture();return w;}
test('Birdy has thin brown hair, massive articulated wings, and independent rig copies',()=>{
 const w=modelWorld(),a=w.character('birdy',0x51483a),b=w.character('birdy',0x51483a);
 assert.equal(a.userData.design.style,'thin');assert.equal(a.userData.design.hair,CHARACTER_DESIGNS.birdy.hair);assert.equal(a.userData.wingspan,6.8);assert.equal(a.userData.wings.length,2);assert.notEqual(a.userData.wings[0],b.userData.wings[0]);
 assert.equal(a.userData.skin.geometry,b.userData.skin.geometry);assert.notEqual(a.userData.skin.skeleton,b.userData.skin.skeleton);assert.notEqual(a.userData.skin.material[0],b.userData.skin.material[0]);
 a.userData.wings[0].rotation.y=1;assert.equal(b.userData.wings[0].rotation.y,0);w.disposeObject(a);assert.ok(b.userData.skin.skeleton.bones.length);w.disposeObject(b);
});
test('Birdy folds its wing span inside a single-cell passage',()=>{
 const w=modelWorld(),g=w.character('birdy',0x51483a);w.animateCharacter(g,2,false,{wingSpace:false});g.updateMatrixWorld(true);const box=new T.Box3().setFromObject(g);assert.ok(box.max.x-box.min.x<TILE,'Wings cut through hallway walls');w.disposeObject(g);
});
test('Jakob and Bobby are two fused animated people with distinct brown hair and four arms',()=>{
 const w=modelWorld(),g=w.character('jakob',0x6b7761);assert.deepEqual(g.userData.identities,['jakob','bobby']);assert.equal(g.userData.heads.length,2);assert.equal(g.userData.arms.length,4);
 assert.equal(g.userData.twins[0].userData.design.style,'straight');assert.equal(g.userData.twins[1].userData.design.style,'curly');
 w.animateCharacter(g,2,true,{activeHead:1,windup:.8});const heads=w.headPositions(g);assert.ok(heads.every(h=>Object.values(h).every(Number.isFinite)));assert.ok(Math.abs(heads[0].x-heads[1].x)>.3);
 const e={kind:'jakob',x:0,z:0,hitHeads:heads},grid=Array.from({length:20},()=>Array(20).fill(0));e.x=20;e.z=20;e.hitHeads=heads.map(h=>({...h,x:h.x+20,z:h.z+20}));
 for(const [i,h]of e.hitHeads.entries()){const hit=traceShot(grid,{x:h.x,y:h.y,z:25},[e],{x:0,y:0,z:-1});assert.equal(hit.enemy,e);assert.equal(hit.headshot,true);assert.equal(hit.headIndex,i);}
 w.disposeObject(g);
});
test('Earl and Zeb use consistent Black skin tones in character and face materials',()=>{
 const w=modelWorld();for(const [kind,id]of [['npc','earl'],['zeb','zeb']]){const g=w.character(kind,0x433d32,id);assert.equal(g.userData.design.ethnicity,'Black');assert.equal(g.userData.skin.material[0].color.getHex(),CHARACTER_DESIGNS[id].skin);assert.equal(g.userData.face.material.color.getHex(),CHARACTER_DESIGNS[id].face);assert.ok(g.userData.face.material.onBeforeCompile.toString().includes('frontBlend'));w.disposeObject(g);}
});
test('Preparation yields between tasks and advances progress only after each task completes',async()=>{
 const events=[];await prepareTasks([()=>events.push('first'),async()=>events.push('second')],p=>events.push(p),async()=>events.push('paint'));
 assert.deepEqual(events,['paint','first',.5,'paint','second',1]);
 await assert.rejects(prepareTasks([()=>{throw Error('asset failed');}],()=>assert.fail(),async()=>{}),/asset failed/);
});
test('A boss reinforcement reuses its uploaded model and warning without building in combat',()=>{
 const g=Object.create(Game.prototype),model=new T.Group(),warning=new T.Group();g.reinforcements=new Map([[101,{kind:'crawler',model,warning}]]);g.enemies=[];g.difficulty='survivor';g.diff={enemySpeed:1,damage:1};g.world={root:new T.Group(),character(){assert.fail('Built a character during a boss phase');},attackMarker(){assert.fail('Allocated a warning during a boss phase');}};
 const e=g.spawn('crawler',14,5,false,101);assert.equal(e.model,model);assert.equal(e.warning,warning);assert.equal(model.visible,true);assert.equal(warning.visible,false);assert.equal(g.reinforcements.size,0);assert.equal(g.enemies.length,1);
});
