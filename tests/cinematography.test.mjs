import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {SCENES,sceneSample,poseWeight} from '../dist/story.js';
import {voicedScene} from '../dist/voice-timeline.js';
import {dialogueFrame,DialogueCamera} from '../dist/cinematic-direction.js';
import {fitStoryCamera} from '../dist/cinematic-camera.js';
import {reachCinematicArm,poseCinematicActor} from '../dist/cinematic-performance.js';
import {createAnatomy} from '../dist/anatomy.js';
import {fitEncounterCamera,encounterViewClear} from '../dist/combat-space.js';

test('All thirteen scenes have authored coverage that survives performed dialogue retiming',()=>{
 let shots=0;for(const scene of Object.values(SCENES)){
  assert.equal(scene.directed,true);assert.ok(scene.shots.some(s=>s.coverage.type==='wide'));const voiced=voicedScene(scene);
  for(const [i,shot]of voiced.shots.entries()){shots++;assert.ok(Math.abs(voiced.sourceTime(shot.at)-scene.shots[i].at)<1e-7);assert.deepEqual(shot.coverage,scene.shots[i].coverage);const frame=dialogueFrame(voiced,sceneSample(voiced,shot.at+.01),shot.at+.01);assert.ok([...frame.position,...frame.look,frame.fov].every(Number.isFinite));assert.ok(Math.hypot(...frame.position.map((v,i)=>v-frame.look[i]))>.5);}
 }assert.ok(shots>=75);
});
test('Coverage holds its subject through dialogue gaps and reverse shots retain their side of the axis',()=>{
 let holds=0,reverses=0;for(const scene of Object.values(SCENES))for(const line of scene.lines){
  const before=sceneSample(scene,line.to-.0001),after=sceneSample(scene,line.to+.0001);if(before.shot!==after.shot)continue;
  const a=dialogueFrame(scene,before,line.to-.0001),b=dialogueFrame(scene,after,line.to+.0001);assert.equal(a.subject,b.subject);assert.ok(Math.hypot(...a.position.map((v,i)=>v-b.position[i]))<.02);holds++;
 }
 for(const scene of Object.values(SCENES))for(const shot of scene.shots){const c=shot.coverage;if(!['single','shoulder'].includes(c.type)||!scene.axis.includes(c.subject)||!scene.axis.includes(c.listener))continue;const sample=sceneSample(scene,shot.at+.01),frame=dialogueFrame(scene,sample,shot.at+.01),a=sample.actors.find(a=>a.id===scene.axis[0]),b=sample.actors.find(a=>a.id===scene.axis[1]),subject=sample.actors.find(a=>a.id===c.subject),side=(frame.position[0]-subject.x)*(b.z-a.z)-(frame.position[2]-subject.z)*(b.x-a.x);assert.ok(side*(scene.axisSide||1)>0);reverses++;}
 assert.ok(holds>40&&reverses>15);
});
test('A cut is immediate; a paused authored dolly stays exactly still',()=>{
 const scene=voicedScene(SCENES.closet),director=new DialogueCamera();for(const time of [0,2,9,16]){const sample=sceneSample(scene,time),frame=dialogueFrame(scene,sample,time);director.resolve(frame,sample.shot,time);const held=[...director.position,...director.look,director.fov];director.resolve(frame,sample.shot,time);assert.deepEqual([...director.position,...director.look,director.fov],held);}
 const sample=sceneSample(scene,scene.shots[2].at+.001),frame=dialogueFrame(scene,sample,scene.shots[2].at+.001);director.resolve(frame,sample.shot,scene.shots[2].at+.001);assert.deepEqual(director.position,frame.position);
});
test('Story cameras stop before an occluding wall without moving an unobstructed composition',()=>{
 const box={min:[-1,0,1.5],max:[1,3,1.8]},look=[0,1.5,0],position=[0,1.5,3];const fitted=fitStoryCamera(position,look,[box]);assert.ok(fitted[2]<1.5&&fitted[2]>1);assert.deepEqual(fitStoryCamera([3,1.5,3],look,[box]),[3,1.5,3]);assert.ok(position[2]===3);
});
test('Boss framing tests the view to its subject, including a wall between two clear floor cells',()=>{
 const grid=Array.from({length:12},()=>Array(12).fill(0));grid[3][3]=1;const focus=new T.Vector3(8.4,1.6,6),desired=new T.Vector3(8.4,1.6,12),fallback={x:6,z:6},out=new T.Vector3();assert.equal(encounterViewClear(grid,[],desired,focus),false);fitEncounterCamera(grid,[],desired,fallback,out,focus);assert.equal(encounterViewClear(grid,[],out,focus),true);assert.ok(out.distanceTo(focus)>.75);
});
test('A wrist reaches its prop target without stretching either arm segment',()=>{
 const g=createAnatomy('npc',[new T.MeshStandardMaterial(),new T.MeshStandardMaterial(),new T.MeshStandardMaterial()]),arm=g.userData.arms[0],fore=arm.userData.forearm,start=new T.Vector3(),elbow=new T.Vector3(),wrist=new T.Vector3(),target=new T.Vector3(-.35,1.2,.45);g.updateMatrixWorld(true);arm.getWorldPosition(start);fore.getWorldPosition(elbow);const upper=start.distanceTo(elbow);wrist.set(0,-.39,.03).applyMatrix4(fore.matrixWorld);const lower=elbow.distanceTo(wrist);reachCinematicArm(g,0,target);fore.getWorldPosition(elbow);wrist.set(0,-.39,.03).applyMatrix4(fore.matrixWorld);assert.ok(wrist.distanceTo(target)<1e-6);assert.ok(Math.abs(start.distanceTo(elbow)-upper)<1e-7);assert.ok(Math.abs(elbow.distanceTo(wrist)-lower)<1e-7);
});
test('Kneeling blends in instead of teleporting the actor and camera down at the path key',()=>{
 const a=sceneSample(SCENES.opening,22.001).actors.find(a=>a.id==='ethan'),b=sceneSample(SCENES.opening,22.25).actors.find(a=>a.id==='ethan'),c=sceneSample(SCENES.opening,22.6).actors.find(a=>a.id==='ethan');assert.ok(poseWeight(a,'kneel')<.001);assert.ok(Math.abs(poseWeight(b,'kneel')-.5)<1e-8);assert.equal(poseWeight(c,'kneel'),1);
});
test('A licensed infected in a story stage keeps its authored rig instead of receiving human pose offsets',()=>{const g={userData:{human:false,arms:[],legs:[]}};assert.doesNotThrow(()=>poseCinematicActor(g,{pose:'',moving:true}));});
