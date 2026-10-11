import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {LEVELS,makeLevelGrid,stageFor,roomAt} from '../dist/levels.js';
import {TILE,findPath} from '../dist/data.js';
import {World} from '../dist/world.js';
import {propsBlock,traceShot,viewDirection} from '../dist/fps.js';
import {beginReload,advanceReload,cancelReload,reloadProgress} from '../dist/reload.js';
import {SCENE_CONTEXT,sceneContext,MEMORY_LEAD_IN} from '../dist/scene-context.js';
import {MEMORY_IDS} from '../dist/story.js';
import {Cinematics} from '../dist/cinematics.js';
import {Game} from '../dist/game.js';
const at=a=>({x:(a[0]+.5)*TILE,z:(a[1]+.5)*TILE});
for(const [theme,l]of Object.entries(LEVELS))test(theme+': shutters enforce a complete ordered route with optional discoveries',()=>{
 for(let stage=0;stage<=3;stage++){
  const grid=makeLevelGrid(theme,stage),start=at(l.start);
  for(let i=0;i<3;i++)assert.equal(findPath(grid,start,at(l.objectives[i])).length>0,i<=stage,`${theme} objective ${i}, stage ${stage}`);
  assert.equal(findPath(grid,start,at(l.exit)).length>0,stage===3);
  for(const r of l.rooms)assert.equal(findPath(grid,start,at([r.bounds[0],r.bounds[1]])).length>0,r.stage<=stage,r.name);
  for(const e of l.enemies)assert.equal(findPath(grid,start,at(e.slice(1))).length>0,e[3]<=stage,'Encounter escaped its stage');
 }
 const all=makeLevelGrid(theme);for(const cell of [...l.pages,...l.ammo,...l.meds,...l.save])assert.ok(findPath(all,at(l.start),at(cell)).length,'Unreachable supply '+cell);
 assert.equal(roomAt(l,...Object.values(at(l.start))).stage,0);
});
test('Chapters use distinct topologies rather than reskinning the same maze',()=>{
 assert.equal(new Set(Object.keys(LEVELS).map(t=>JSON.stringify(makeLevelGrid(t)))).size,3);
 assert.equal(stageFor([2,0]),1);assert.equal(stageFor([2,1,0,4]),3);assert.equal(stageFor([4,6]),0);
});
test('Shutters physically block footsteps and bullets, then open without changing wall geometry',()=>{
 const w=Object.create(World.prototype);w.root=new T.Group();w.gates=[];w.obstacles=[];w.level=LEVELS.school;w.palette={metal:new T.MeshStandardMaterial(),black:new T.MeshStandardMaterial()};w.sign=()=>{};w.createGates();
 const door=w.gates[0],grid=makeLevelGrid('school');w.syncGates(0,true);assert.equal(propsBlock(w.obstacles,door.obstacle.x,door.obstacle.z),true);
 const origin={x:door.obstacle.x-2,y:1.64,z:door.obstacle.z},enemy={kind:'walker',x:door.obstacle.x+2,z:door.obstacle.z};
 assert.equal(traceShot(grid,origin,[enemy],viewDirection(-Math.PI/2),w.obstacles).enemy,null);
 w.syncGates(1,true);assert.equal(propsBlock(w.obstacles,door.obstacle.x,door.obstacle.z),false);assert.equal(traceShot(grid,origin,[enemy],viewDirection(-Math.PI/2),w.obstacles).enemy,enemy);assert.equal(door.shutter.position.y,3.18);assert.equal(w.gates.filter(g=>g.obstacle.active).length,2);
});
test('Repeated empty and tactical reloads complete at zero and conserve every round',()=>{
 const p={ammo:0,reserve:100,reloading:-.008};let total=p.ammo+p.reserve;
 for(let cycle=0;cycle<5;cycle++){
  const cues=[];assert.equal(beginReload(p),true);const duration=p.reloadDuration;assert.equal(beginReload(p),false,'R cannot restart the animation');
  assert.equal(advanceReload(p,duration/2,s=>cues.push(s)),false);assert.ok(reloadProgress(p)>.49);assert.equal(p.ammo+p.reserve,total);
  assert.equal(advanceReload(p,duration,s=>cues.push(s)),true);assert.equal(p.reloading,0);assert.equal(p.ammo,12);assert.equal(p.ammo+p.reserve,total);assert.deepEqual(cues,['magOut','magIn','chamber']);assert.equal(advanceReload(p,10),false);
  p.ammo-=cycle+1;total-=cycle+1;
 }
});
test('Reload interruption, partial reserves, pauses and empty reserves cannot lose or create rounds',()=>{
 const p={ammo:3,reserve:4,reloading:0};assert.equal(beginReload(p),true);advanceReload(p,.9);const progress=p.reloading;advanceReload(p,0);assert.equal(p.reloading,progress);advanceReload(p,NaN);assert.equal(p.reloading,progress);
 assert.equal(cancelReload(p),true);assert.equal(p.ammo,3);assert.equal(p.reserve,4);assert.equal(beginReload(p),true);advanceReload(p,10);assert.equal(p.ammo,7);assert.equal(p.reserve,0);assert.equal(beginReload(p),false);assert.equal(p.reloading,0);
});
test('Every discovered memory has a period title and an explicit return to the present',()=>{
 assert.ok(MEMORY_LEAD_IN>=2);for(const id of MEMORY_IDS){const c=sceneContext(id);assert.ok(c.title&&c.place&&c.object&&c.return,id);assert.equal(c.kind,id==='promise'?'premonition':'flashback');}
 assert.equal(SCENE_CONTEXT.opening.title,'THREE NIGHTS EARLIER');assert.equal(SCENE_CONTEXT.opening.return,'THREE NIGHTS LATER');assert.equal(sceneContext('choice').kind,'present');
});
test('Flashback lead-in holds dialogue and scene time; the return card delays gameplay restoration',()=>{
 const nodes=new Map(),prior=globalThis.document;globalThis.document={querySelector(s){if(!nodes.has(s))nodes.set(s,{hidden:false,textContent:'',style:{},dataset:{}});return nodes.get(s);}};
 try{
  const c=Object.create(Cinematics.prototype),pauses=[],voice={scene:{ready:true,error:false},sceneTime:0,pause(v){pauses.push(v);}};
  c.active=true;c.paused=false;c.leadIn=MEMORY_LEAD_IN;c.returnTime=null;c.context=sceneContext('closet');c.id='closet';c.actors=new Map();c.materials=[];c.scene=new T.Scene();c.key={intensity:180};c.faceLight=new T.SpotLight();c.story={sourceTime:t=>t,duration:2,stage:'closet',actors:[]};
  c.clock={time:0,tick(dt){this.time=Math.min(2,this.time+dt);return{events:[],done:this.time>=2,sample:{position:[0,1,3],look:[0,1,0],fov:76,fade:0,actors:[],line:null}};}};
  c.game={voice,settings:{subtitles:true,motion:true},sound:{play(){}},config:{place:'Smithson Valley / Quarantine'},snapshot:()=>({})};c.world={camera:new T.PerspectiveCamera(76,1.5),renderer:{render(){},info:{render:{calls:0}}}};
  let complete=0;c.finish=()=>{complete++;c.active=false;};
  c.update(1);assert.equal(c.clock.time,0);assert.ok(c.leadIn>0);assert.equal(nodes.get('#scene-transition').hidden,false);
  c.paused=true;c.update(1);assert.equal(c.leadIn,MEMORY_LEAD_IN-1);c.paused=false;c.update(2);assert.deepEqual(pauses,[false]);assert.equal(c.clock.time,0);
  voice.sceneTime=2;c.update(.1);assert.equal(c.returnTime,0);assert.equal(complete,0);assert.equal(nodes.get('#scene-transition-title').textContent,'BACK TO THE PRESENT');assert.deepEqual(pauses,[false,true]);
  c.update(1);assert.equal(complete,0);c.update(.7);assert.equal(complete,1);
 }finally{globalThis.document=prior;}
});
test('Existing saves keep chapter discoveries and supplies while migrating obsolete level positions',()=>{
 const g=Object.create(Game.prototype);g.cinema={cancel(){}};g.toast=()=>{};let loaded;
 g.loadChapter=(chapter,saved)=>{loaded={chapter,saved};};
 const save={chapter:1,difficulty:'survivor',scenes:['opening','closet'],pages:[0,1],allies:[0],stats:{shots:22},ammo:7,reserve:53,meds:2,position:[60,48],collected:[0,3],killed:[0,2],bossSpawned:true,bossDead:false};
 g.restore(save);assert.equal(loaded.chapter,1);assert.equal(loaded.saved.position,null);assert.deepEqual(loaded.saved.collected,[]);assert.deepEqual(loaded.saved.killed,[]);assert.equal(loaded.saved.bossSpawned,false);assert.deepEqual([...g.pages],[0,1]);assert.equal(g.player.ammo,7);assert.equal(g.player.reserve,53);assert.ok(g.seenScenes.has('closet'));
 g.restore({...save,campaign:4});assert.deepEqual(loaded.saved.position,[60,48]);assert.deepEqual(loaded.saved.collected,[0,3]);
});
