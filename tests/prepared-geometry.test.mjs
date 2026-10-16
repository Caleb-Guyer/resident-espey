import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';
import {buildBossGeometry} from '../dist/boss-models.js';
import {createAnatomy} from '../dist/anatomy.js';
import {decodePreparedGeometry,preparedGeometry} from '../dist/prepared-geometry.js?v=5.4.0';
const arrayBuffer=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
test('Published creature buffers exactly preserve the editable sculpt, UVs, normals, indices and bind weights',async()=>{
 const originals=new Map([['human',createAnatomy('player',[]).userData.skin.geometry],...['chris','jakob','zeb','birdy'].map(k=>[k,buildBossGeometry(k)])]);
 const packed=gunzipSync(await readFile(new URL('../dist/assets/creatures-v1.bin.gz',import.meta.url)));assert.equal(decodePreparedGeometry(arrayBuffer(packed)),true);
 for(const [key,original]of originals){const loaded=preparedGeometry(key);assert.ok(loaded);for(const [name,a]of Object.entries(original.attributes))assert.deepEqual(loaded.attributes[name].array,a.array,key+'/'+name);assert.deepEqual(loaded.index.array,original.index.array);assert.deepEqual(loaded.groups,original.groups);assert.deepEqual(loaded.boundingSphere,original.boundingSphere);}
 const a=createAnatomy('player',[]).userData.skin.geometry,b=createAnatomy('npc',[]).userData.skin.geometry;assert.notEqual(a,b);assert.notEqual(a.attributes.position.array,b.attributes.position.array);
});
test('Corrupt creature buffers cannot replace working prepared geometry',()=>{
 const before=preparedGeometry('chris');assert.equal(decodePreparedGeometry(new ArrayBuffer(12)),false);assert.equal(preparedGeometry('chris'),before);
 const broken=new ArrayBuffer(20),view=new DataView(broken);view.setUint32(0,0x45534d31,true);view.setUint32(4,1000000,true);assert.equal(decodePreparedGeometry(broken),false);assert.equal(preparedGeometry('chris'),before);
});
