import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {StaticOcclusion,wallBlocksSegment} from '../dist/static-occlusion.js';

const fixed=(parent,x,z)=>{const o=new T.Mesh(new T.BoxGeometry(.4,.8,.4),new T.MeshStandardMaterial());o.position.set(x,1,z);parent.add(o);o.updateMatrixWorld(true);o.matrixAutoUpdate=o.matrixWorldAutoUpdate=false;return o;};
const camera=(x,z,y=1.6)=>({position:new T.Vector3(x,y,z)});

test('Wall segment proof rejects gaps, tangencies, coplanar endpoints and an origin in the wall',()=>{
 const b=[2,0,3,4];assert.ok(wallBlocksSegment(0,2,6,2,b));assert.ok(wallBlocksSegment(6,2,0,2,b));
 for(const p of [[0,5,6,5],[0,0,6,0],[0,2,2,2],[2.5,2,6,2],[0,2,1,2]])assert.equal(wallBlocksSegment(...p,b),false);
});

test('Only the complete fixed box behind a wall is culled, and visibility is restored on failure',()=>{
 const root=new T.Group(),hidden=fixed(root,5,1),visible=fixed(root,5,7),alreadyHidden=fixed(root,5,1.2);alreadyHidden.visible=false;
 const inside=fixed(root,3,1),c=new StaticOcclusion(root,[[0,1,0],[0,0,0]],2.4,3.35),cam=camera(1,1);
 assert.throws(()=>c.render(cam,()=>{assert.equal(hidden.visible,false);assert.equal(inside.visible,true);assert.equal(visible.visible,true);assert.equal(alreadyHidden.visible,false);throw Error('lost context');}),/lost context/);
 assert.equal(hidden.visible,true);assert.equal(visible.visible,true);assert.equal(alreadyHidden.visible,false);assert.equal(c.hiddenCount,0);
 c.render(camera(5,3),()=>assert.equal(hidden.visible,true));
 for(const [view,light]of [[camera(1,1,4),undefined],[cam,new T.Vector3(2,1.5,1)],[camera(1,1,.05),undefined]])c.render(view,()=>assert.equal(hidden.visible,true),light);
 c.enabled=false;c.render(cam,()=>assert.equal(hidden.visible,true));let disposed=0;hidden.geometry.addEventListener('dispose',()=>disposed++);c.dispose();assert.equal(disposed,0);assert.equal(c.entries.length,0);
});

test('Animated ancestors, morphs, children, displaced surfaces and geometry outside wall height stay eligible to render',()=>{
 const root=new T.Group(),actor=new T.Group();root.add(actor);const moving=fixed(actor,5,1),morph=fixed(root,5,1),parent=fixed(root,5,1),high=fixed(root,5,1),displaced=fixed(root,5,1);
 morph.morphTargetInfluences=[0];parent.add(new T.Object3D());high.position.y=4;high.updateMatrix();high.matrixWorld.copy(high.matrix);displaced.material.displacementMap=new T.Texture();
 const c=new StaticOcclusion(root,[[0,1,0]],2.4,3.35);for(const o of [moving,morph,parent,high,displaced])assert.ok(!c.entries.some(e=>e.mesh===o));
});

test('A whole-box occlusion proof also covers interior samples across many camera positions',()=>{
 const root=new T.Group(),o=fixed(root,9,1),c=new StaticOcclusion(root,[[0,1,1,0]],2.4,3.35);let proofs=0;
 for(let x=.1;x<2;x+=.19)for(let z=.1;z<2.3;z+=.23){c.classify(x,z);if(!c.occluded.subarray(0,c.occludedCount).some(i=>c.entries[i].mesh===o))continue;proofs++;const a=c.entries[0].b,b=c.walls[0];for(let u=0;u<=10;u++)for(let v=0;v<=10;v++)assert.ok(wallBlocksSegment(x,z,a[0]+(a[2]-a[0])*u/10,a[1]+(a[3]-a[1])*v/10,b));}assert.ok(proofs>50);
});

test('Instanced scenery uses the bounds of every instance without altering its matrices',()=>{
 const root=new T.Group(),o=new T.InstancedMesh(new T.BoxGeometry(.4,.8,.4),new T.MeshStandardMaterial(),2);o.setMatrixAt(0,new T.Matrix4().makeTranslation(5,1,1));o.setMatrixAt(1,new T.Matrix4().makeTranslation(5,1,7));root.add(o);o.updateMatrixWorld(true);o.matrixAutoUpdate=o.matrixWorldAutoUpdate=false;
 const before=o.instanceMatrix.array.slice(),c=new StaticOcclusion(root,[[0,1,0],[0,0,0]],2.4,3.35);c.render(camera(1,1),()=>assert.equal(o.visible,true));assert.deepEqual(o.instanceMatrix.array,before);
});
