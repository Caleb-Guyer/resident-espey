import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../dist/vendor/three.module.js';
import {DepthPrepass} from '../dist/depth-prepass.js';
test('Depth priming includes only fixed architecture and owns independent instance buffers',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial(),wall=new T.InstancedMesh(geometry,material,2);wall.name='level-walls';wall.position.set(3,0,2);wall.setMatrixAt(0,new T.Matrix4().makeTranslation(4,0,6));wall.setMatrixAt(1,new T.Matrix4().makeTranslation(8,0,6));root.add(wall);const door=new T.Mesh(geometry,material);door.name='door';root.add(door);const floor=new T.Mesh(geometry,material);floor.name='level-floor';root.add(floor);
 const pass=new DepthPrepass(root);assert.equal(pass.scene.children.length,2);const copy=pass.instances[0];assert.equal(copy.geometry,geometry);assert.notEqual(copy.instanceMatrix,wall.instanceMatrix);assert.deepEqual(copy.instanceMatrix.array,wall.instanceMatrix.array);assert.deepEqual(copy.matrixWorld.elements,wall.matrixWorld.elements);assert.equal(copy.material.colorWrite,false);assert.equal(copy.material.depthWrite,true);assert.equal(copy.castShadow,false);
 let sharedDisposals=0,instanceDisposals=0;geometry.addEventListener('dispose',()=>sharedDisposals++);wall.addEventListener('dispose',()=>sharedDisposals++);copy.addEventListener('dispose',()=>instanceDisposals++);pass.dispose();assert.equal(sharedDisposals,0);assert.equal(instanceDisposals,1);assert.equal(pass.scene.children.length,0);
});
test('A failed world draw restores its background and the renderer clear state',()=>{
 const pass=new DepthPrepass(new T.Group()),world=new T.Scene(),background=new T.Color(0x345678),camera=new T.PerspectiveCamera(),calls=[];world.background=background;
 const renderer={autoClear:true,info:{render:{calls:3}},render(scene){calls.push(scene);if(scene===world){assert.equal(scene.background,null);assert.equal(this.autoClear,false);throw Error('GPU lost');}assert.equal(scene.background,background);}};
 assert.throws(()=>pass.render(renderer,world,camera),/GPU lost/);assert.deepEqual(calls,[pass.scene,world]);assert.equal(world.background,background);assert.equal(renderer.autoClear,true);pass.dispose();
});
test('Warmup restores conservative culling after an interrupted upload',()=>{
 const root=new T.Group(),wall=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());wall.name='level-walls';root.add(wall);const pass=new DepthPrepass(root),mesh=pass.scene.children[0];assert.equal(mesh.frustumCulled,true);
 assert.throws(()=>pass.warm({render(){assert.equal(mesh.frustumCulled,false);throw Error('interrupted');}},new T.PerspectiveCamera()),/interrupted/);assert.equal(mesh.frustumCulled,true);pass.dispose();
});
