import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {World} from '../dist/world.js';
import {BOSS_FIGHTS} from '../dist/boss-fights.js';
import {ATTACKS} from '../dist/enemy-director.js';

test('Boss culling bounds enclose weighted geometry across fight poses and story beats',()=>{
 const w=Object.create(World.prototype);w.assets=Object.fromEntries(['boss','skin','face','ethan','survivor'].map(k=>[k,new T.Texture()]));w.characterTemplates=new Map();w.characterResources=new Set();w.procedural=()=>new T.Texture();
 const point=new T.Vector3();let checked=0;
 for(const [kind,fight]of Object.entries(BOSS_FIGHTS)){
  const g=w.character(kind),skin=g.userData.skin,positions=skin.geometry.attributes.position;
  assert.equal(skin.frustumCulled,true);assert.ok(skin.boundingSphere);assert.notEqual(skin.boundingSphere,w.characterTemplates.get([kind,"",kind].join("/")).userData.skin.boundingSphere);
  // A skinned point is a convex weighted sum. Checking the support vertices
  // for each influence proves the entire surface fits, including vertices
  // between samples and every triangle within the checked authored poses.
  const weights=skin.geometry.attributes.skinWeight,indices=skin.geometry.attributes.skinIndex,support=skin.skeleton.bones.map(()=>new T.Box3()),value=(a,i,j)=>j===0?a.getX(i):j===1?a.getY(i):j===2?a.getZ(i):a.getW(i);
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(skin.bindMatrix);for(let j=0;j<4;j++)if(value(weights,i,j)>0)support[value(indices,i,j)].expandByPoint(point);}
  const check=mood=>{
   w.animateCharacter(g,checked++/60,true,mood);g.updateMatrixWorld(true);const bound=skin.boundingSphere;
   for(let i=0;i<support.length;i++){const box=support[i];if(box.isEmpty())continue;const transform=new T.Matrix4().copy(skin.bindMatrixInverse).multiply(skin.skeleton.bones[i].matrixWorld).multiply(skin.skeleton.boneInverses[i]);for(let corner=0;corner<8;corner++){point.set(corner&1?box.max.x:box.min.x,corner&2?box.max.y:box.min.y,corner&4?box.max.z:box.min.z).applyMatrix4(transform);assert.ok(bound.containsPoint(point),kind+' bound missed '+JSON.stringify(mood)+' bone '+i);}}
  };
  for(const [phase,rule]of fight.phases.entries())for(const attack of new Set(rule.patterns.flat())){
   const tell=ATTACKS[attack].tell;
   for(const u of [0,.5,1])check({phase,attack,tellDuration:tell,windup:tell*(1-u),attackTime:tell*u,actionTime:u===1?0:-1,bobbyCrushed:phase>=3});
   for(const age of [.09,.3,.8])check({phase,attack,actionTime:age,recover:1,strike:.3,charge:ATTACKS[attack].dash?.4:0,bobbyCrushed:phase>=3});
  }
  for(let time=0;time<=10;time+=.5)check({intro:{kind,time},phase:0});
  for(const id of ['chris-break','crusher','zeb-rupture','birdy-left','birdy-break'])for(const time of [0,2.8,3.2,4.5,6])check({beat:{id,time},phase:2});
  for(const phase of [0,4])for(const time of [0,.3,.6,1,1.5,2.5,3])check({dead:true,deathTime:time,phase});
  check({phase:4,impact:new Float64Array([.14,-.12,.18,.15,-.15,.12]),impactHead:kind==='jakob'?1:0});
  w.disposeObject(g);
 }
 assert.ok(checked>450);
});
