import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {ZombieGore} from '../dist/zombie-gore.js';

test('Stationary blood retains its GPU data until insertion, overwrite or expiry changes the draw',()=>{
 const fx=new ZombieGore(new T.Group()),grid=Array.from({length:8},()=>Array(8).fill(0)),matrix=new T.Matrix4();
 fx.stain(2,3,.5);fx.update(.016,grid);const version=fx.splats.instanceMatrix.version,data=fx.splats.instanceMatrix.array.slice();
 for(let i=0;i<120;i++)fx.update(1/60,grid);
 assert.equal(fx.splats.instanceMatrix.version,version);assert.deepEqual(fx.splats.instanceMatrix.array,data);assert.equal(fx.splats.count,1);assert.equal(fx.droplets.instanceMatrix.version,0);
 fx.stain(5,6,.8);fx.update(.016,grid);assert.equal(fx.splats.count,2);assert.equal(fx.splats.instanceMatrix.version,version+1);
 fx.stains[0].life=.01;fx.update(.02,grid);assert.equal(fx.splats.count,1);assert.equal(fx.splats.instanceMatrix.version,version+2);fx.splats.getMatrixAt(0,matrix);assert.equal(matrix.elements[12],5);assert.equal(matrix.elements[14],6);
 for(let i=0;i<55;i++)fx.stain(i,2,.4);fx.update(.016,grid);assert.equal(fx.splats.count,48);assert.ok(fx.splats.instanceMatrix.array.every(Number.isFinite));
 fx.update(100,grid);assert.equal(fx.splats.count,0);fx.dispose();
});

test('Moving blood still uploads fresh transforms while floor stains retain their complete pool',()=>{
 const fx=new ZombieGore(new T.Group()),grid=Array.from({length:8},()=>Array(8).fill(0));
 fx.burst({x:3,y:2,z:3},{x:.1,z:1},true);fx.update(.016,grid);const version=fx.droplets.instanceMatrix.version,data=fx.droplets.instanceMatrix.array.slice();
 fx.update(.016,grid);assert.ok(fx.droplets.instanceMatrix.version>version);assert.notDeepEqual(fx.droplets.instanceMatrix.array,data);assert.equal(fx.stains.length,48);assert.equal(fx.spray.length,192);assert.ok(fx.splats.material.alphaTest>0&&fx.splats.material.alphaTest<1/255);fx.dispose();
});
