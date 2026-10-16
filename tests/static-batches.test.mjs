import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../dist/vendor/three.module.js';
import {splitStaticInstances} from '../dist/static-batches.js';
test('Spatial wall batches retain every transform, color, surface, shadow flag and conservative bound',()=>{
 const source=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshStandardMaterial(),60),m=new T.Matrix4(),c=new T.Color(),expected=[];source.castShadow=source.receiveShadow=true;source.position.set(3,0,7);source.rotation.y=.4;
 for(let i=0;i<60;i++){m.makeScale(3.2,3.3,3.2).setPosition(i%10*3.2,1.65,Math.floor(i/10)*3.2);source.setMatrixAt(i,m);source.setColorAt(i,c.setRGB(i/60,.3,.6));source.getMatrixAt(i,m);source.getColorAt(i,c);expected.push([...m.elements,...c.toArray()].join(','));}
 const chunks=splitStaticInstances(source,9.6),actual=[];assert.ok(chunks.length>1);assert.equal(chunks.reduce((n,g)=>n+g.count,0),source.count);
 for(const g of chunks){assert.equal(g.geometry,source.geometry);assert.equal(g.material,source.material);assert.ok(g.castShadow&&g.receiveShadow);assert.deepEqual(g.position,source.position);assert.deepEqual(g.quaternion.toArray(),source.quaternion.toArray());
  for(let i=0;i<g.count;i++){g.getMatrixAt(i,m);g.getColorAt(i,c);actual.push([...m.elements,...c.toArray()].join(','));for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])assert.ok(new T.Vector3(x,y,z).applyMatrix4(m).distanceTo(g.boundingSphere.center)<=g.boundingSphere.radius+1e-5);}
  g.dispose();
 }assert.deepEqual(actual.sort(),expected.sort());assert.throws(()=>splitStaticInstances(source,0),RangeError);
});
test('A single fixed cell retains its original batch',()=>{const g=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshStandardMaterial(),1);g.setMatrixAt(0,new T.Matrix4());assert.deepEqual(splitStaticInstances(g),[g]);});
