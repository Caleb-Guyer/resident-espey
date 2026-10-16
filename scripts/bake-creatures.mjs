import {writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createAnatomy} from '../dist/anatomy.js';
import {buildBossGeometry} from '../dist/boss-models.js';

// Keep the source sculpt and bind weights editable; publish its exact buffers.
const geometries=new Map([['human',createAnatomy('player',[]).userData.skin.geometry],...['chris','jakob','zeb','birdy'].map(kind=>[kind,buildBossGeometry(kind)])]);
const records=[],chunks=[];let offset=0;
for(const [key,g]of geometries){
 const pack=a=>{const record={offset,type:a.array.constructor.name,length:a.array.length,size:a.itemSize};const bytes=Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength);chunks.push(bytes);offset+=bytes.length;const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}return record;};
 records.push({key,attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,pack(a)])),index:pack(g.index),groups:g.groups,sphere:{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius}});
}
const header=Buffer.from(JSON.stringify(records)),prefix=Buffer.alloc((8+header.length+3)&~3);prefix.writeUInt32LE(0x45534d31,0);prefix.writeUInt32LE(header.length,4);header.copy(prefix,8);
const bytes=Buffer.concat([prefix,...chunks]),compressed=gzipSync(bytes,{level:9,mtime:0});await mkdir(new URL('../dist/assets/',import.meta.url),{recursive:true});await writeFile(new URL('../dist/assets/creatures-v1.bin.gz',import.meta.url),compressed);
console.log(JSON.stringify({meshes:records.map(r=>({key:r.key,vertices:r.attributes.position.length/3})),bytes:bytes.length,compressedBytes:compressed.length}));
