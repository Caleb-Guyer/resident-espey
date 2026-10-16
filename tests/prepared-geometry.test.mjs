import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';
import {buildBossGeometry} from '../dist/boss-models.js';
import {createAnatomy} from '../dist/anatomy.js';
import {decodePreparedGeometry,decodePreparedGeometryAsync,preparedGeometry} from '../dist/prepared-geometry.js?v=5.5.1';
import {assertMeshEquivalent} from './mesh-equivalence.mjs';
import {cacheMisses} from '../scripts/mesh-buffers.mjs';
const arrayBuffer=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
test('Published creature buffers exactly preserve the editable sculpt, UVs, normals, indices and bind weights',async()=>{
 const originals=new Map([['human',createAnatomy('player',[]).userData.skin.geometry],...['chris','jakob','zeb','birdy'].map(k=>[k,buildBossGeometry(k)])]);
 const packed=gunzipSync(await readFile(new URL('../dist/assets/creatures-v2.bin.gz',import.meta.url)));assert.equal(decodePreparedGeometry(arrayBuffer(packed)),true);
 for(const [key,original]of originals){const loaded=preparedGeometry(key);assert.ok(loaded);assertMeshEquivalent(original,loaded);assert.deepEqual(loaded.boundingSphere,original.boundingSphere);assert.ok(cacheMisses(loaded)<cacheMisses(original)*.8,key+' failed to improve simulated vertex reuse');}
 const a=createAnatomy('player',[]).userData.skin.geometry,b=createAnatomy('npc',[]).userData.skin.geometry;assert.notEqual(a,b);assert.notEqual(a.attributes.position.array,b.attributes.position.array);
});
test('Corrupt creature buffers cannot replace working prepared geometry',()=>{
 const before=preparedGeometry('chris');assert.equal(decodePreparedGeometry(new ArrayBuffer(12)),false);assert.equal(preparedGeometry('chris'),before);
 const broken=new ArrayBuffer(20),view=new DataView(broken);view.setUint32(0,0x45534d31,true);view.setUint32(4,1000000,true);assert.equal(decodePreparedGeometry(broken),false);assert.equal(preparedGeometry('chris'),before);
});
test('Loading validation yields between bounded slices and never commits a partially corrupt sculpt set',async()=>{
 const bytes=gunzipSync(await readFile(new URL('../dist/assets/creatures-v2.bin.gz',import.meta.url))),buffer=arrayBuffer(bytes);let ticks=0,yields=0;
 assert.equal(await decodePreparedGeometryAsync(buffer,{budget:2,clock:()=>ticks++,yieldFrame:async()=>{yields++;}}),true);assert.ok(yields>5);
 const before=preparedGeometry('chris'),view=new DataView(buffer),length=view.getUint32(4,true),start=(8+length+3)&~3,records=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length)));view.setFloat32(start+records.at(-1).attributes.skinWeight.offset,NaN,true);
 assert.equal(await decodePreparedGeometryAsync(buffer,{budget:2,clock:()=>ticks++,yieldFrame:async()=>{yields++;}}),false);assert.equal(preparedGeometry('chris'),before);
});
test('The largest individual attribute yields before validation reaches its next block',async()=>{
 const buffer=arrayBuffer(gunzipSync(await readFile(new URL('../dist/assets/creatures-v2.bin.gz',import.meta.url)))),view=new DataView(buffer),length=view.getUint32(4,true),start=(8+length+3)&~3,records=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length))),a=records[0].attributes.position,before=preparedGeometry('chris');assert.ok(a.length>8192);let yields=0;
 const result=await decodePreparedGeometryAsync(buffer,{budget:0,clock:()=>0,yieldFrame:async()=>{if(++yields===1)view.setFloat32(start+a.offset+8192*4,NaN,true);}});
 assert.equal(result,false);assert.equal(yields,1);assert.equal(preparedGeometry('chris'),before);
});
