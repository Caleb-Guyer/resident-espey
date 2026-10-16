import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {attackMotion,recordImpact,settleImpact} from '../dist/combat-motion.js';
import {ATTACKS,beginAttack,stepEnemy} from '../dist/enemy-director.js';
import {DialogueCamera} from '../dist/cinematic-direction.js';
import {prepareScreamSamples} from '../dist/audio-preparation.js';
import {World} from '../dist/world.js';

test('Every attack carries its anticipation through release, follows through and settles',()=>{
 const out={};for(const [attack,a]of Object.entries(ATTACKS)){
  const e={attack,tellDuration:a.tell,attackTime:a.tell,windup:.00001,actionTime:-1};
  assert.equal(attackMotion(e,out),out);assert.equal(out.wind,1);
  e.windup=0;e.actionTime=0;e.recover=a.recover;attackMotion(e,out);assert.equal(out.wind,1);assert.equal(out.strike,0);
  e.actionTime=.09;attackMotion(e,out);assert.ok(out.strike>.9);assert.ok(out.follow>.95);
  e.actionTime=8;e.recover=0;attackMotion(e,out);assert.equal(out.wind+out.strike+out.follow+out.recover,0);
  for(let t=0;t<3;t+=.013){e.actionTime=t;attackMotion(e,out);assert.ok(Object.values(out).every(v=>Number.isFinite(v)&&v>=0&&v<=1));}
 }
});
test('The director records release age throughout recovery and starts a fresh combo at anticipation',()=>{
 const e={kind:'chris',x:0,z:0,hp:2000,max:2000,phase:0,stageResolved:0,cool:0};const player={x:0,z:6};
 beginAttack(e,player);assert.equal(e.actionTime,-1);stepEnemy(e,e.windup,{player,visible:true});assert.equal(e.actionTime,0);
 stepEnemy(e,.1,{player,visible:true});assert.equal(e.actionTime,.1);beginAttack(e,player);assert.equal(e.actionTime,-1);
});
test('Regional impulses preserve shot direction, target the correct limb and settle independently of frame rate',()=>{
 const create=()=>({model:{rotation:{y:0},userData:{bossRig:true}}}),a=create(),b=create(),regions=new Float32Array([0,50,0,40,0,20]);
 const storage=recordImpact(a,80,1,0,true,1,regions);recordImpact(b,80,1,0,true,1,regions);
 assert.equal(a.impactHead,1);assert.equal(a.impactLeg,1);assert.equal(a.impact[9],0);assert.ok(a.impact[10]>0);assert.ok(a.impact[7]<0);
 for(let i=0;i<60;i++)settleImpact(a,1/60);for(let i=0;i<30;i++)settleImpact(b,1/30);
 for(let i=0;i<12;i++)assert.ok(Math.abs(a.impact[i]-b.impact[i])<.00001);assert.equal(a.impact,storage);
 for(let i=0;i<500;i++)recordImpact(a,100,1,0,true,1,regions);assert.ok([...a.impact].every(v=>Math.abs(v)<=7));
 for(let i=0;i<180;i++)settleImpact(a,1/60);assert.ok([...a.impact].every(v=>v===0));
});
test('Automatic dialogue coverage blends, authored cuts remain immediate, and pause holds the camera',()=>{
 const c=new DialogueCamera(),frame=(x,subject)=>({position:[x,1,3],look:[x,1,0],fov:43,subject});
 c.resolve(frame(0,'ethan'),0,6);c.resolve(frame(4,'joel'),0,6.016);assert.ok(c.position[0]>0&&c.position[0]<1);
 const held=c.position.slice();c.resolve(frame(10,'joel'),0,6.016);assert.deepEqual(c.position,held);
 c.resolve(frame(8,'joel'),1,7);assert.equal(c.position[0],8);c.resolve(frame(2,'ethan'),0,1);assert.equal(c.position[0],2);
});
const world=()=>{const w=Object.create(World.prototype);w.assets=Object.fromEntries(['boss','skin','face','ethan','survivor'].map(k=>[k,new T.Texture()]));w.characterTemplates=new Map();w.characterResources=new Set();w.procedural=()=>new T.Texture();return w;};
test('Boss hit reactions affect the struck head and limbs without changing attack state',()=>{
 const w=world(),g=w.character('jakob'),e={model:g,attack:'bobby',windup:.5,attackTime:.5,tellDuration:1.05,activeHead:1};
 w.animateCharacter(g,1,false,e);const before=[g.userData.heads[0].rotation.x,g.userData.heads[1].rotation.x,g.userData.arms[1].rotation.x];
 recordImpact(e,80,0,1,true,1,new Float32Array([0,50,0,30,0,0]));settleImpact(e,.04);w.animateCharacter(g,1,false,e);
 assert.equal(g.userData.heads[0].rotation.x,before[0]);assert.ok(g.userData.heads[1].rotation.x>before[1]);assert.ok(g.userData.arms[1].rotation.x<before[2]);assert.equal(e.attack,'bobby');assert.equal(e.windup,.5);w.disposeObject(g);
});
test('All boss collapses settle in distinct grounded poses with finite joints',()=>{
 const w=world(),poses=[];for(const kind of ['chris','jakob','zeb','birdy']){const g=w.character(kind);for(let t=0;t<=3;t+=.04){w.animateCharacter(g,t,false,{dead:true,deathTime:t,phase:0});g.updateMatrixWorld(true);g.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}poses.push(g.rotation.toArray().slice(0,3).join(','));assert.ok(g.position.y>-.01);w.disposeObject(g);}assert.equal(new Set(poses).size,4);
});
test('Attack warnings cache stationary corridor checks and refresh when doors or positions may change',()=>{
 const w=world();w.root=new T.Group();w.grid=Array.from({length:40},()=>Array(40).fill(0));let calls=0;w.blocked=()=>{calls++;return false;};
 const e={x:20,z:20,kind:'chris',attack:'rush',attackCount:1,attackTime:0,tellDuration:1.15,chargeX:0,chargeZ:1};e.warning=w.attackMarker();w.updateAttackMarker(e);const initial=calls;assert.ok(initial>20);
 for(let i=1;i<8;i++){e.attackTime=i*.016;w.updateAttackMarker(e);}assert.equal(calls,initial);
 e.attackTime=.16;w.updateAttackMarker(e);assert.ok(calls>initial);const after=calls;e.x+=.1;w.updateAttackMarker(e);assert.ok(calls>after);w.disposeObject(w.root);
});
test('Cold scream synthesis yields in bounded chunks and requires no audio device',async()=>{
 let yields=0;const {samples,sampleRate}=await prepareScreamSamples(async()=>{yields++;});assert.ok(yields>=40);assert.equal(sampleRate,22050);
 for(const data of Object.values(samples)){assert.equal(data.length,Math.ceil(sampleRate*1.35));assert.ok([...data].every(Number.isFinite));assert.ok(Math.max(...data)>.1);assert.ok(Math.abs(data.at(-1))<.001);}
});


test('Attached and detached feathers retain independent dedicated shadow materials through rig cloning',()=>{
 const w=world(),a=w.character('birdy'),b=w.character('birdy');
 const shadows=g=>{const out=[];g.traverse(o=>{if(o.customDepthMaterial)out.push(o.customDepthMaterial);});return out;},first=shadows(a),second=shadows(b);assert.ok(first.length>=4);assert.equal(first.length,second.length);assert.equal(new Set(first).size,1);assert.notEqual(first[0],second[0]);assert.equal(first[0].customProgramCacheKey(),'birdy-feather-depth-v1');assert.equal(first[0].side,T.DoubleSide);w.disposeObject(a);w.disposeObject(b);
});
