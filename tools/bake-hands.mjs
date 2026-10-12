import {writeFile} from 'node:fs/promises';
import {handSurface} from '../dist/viewmodel.js';

// Run offline after editing the authored hand surface. Gameplay only decodes it.
const parts=[Buffer.from(new Uint32Array([0x38344852,1,2]).buffer)],details=[];
for(const side of[1,-1]){
 const g=handSurface(side),n=g.attributes.position.count;
 parts.push(Buffer.from(new Uint32Array([side===1?1:0,n,g.index.count]).buffer));
 for(const a of[g.attributes.position,g.attributes.normal,g.attributes.uv,g.morphAttributes.position[0]])parts.push(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));
 parts.push(Buffer.from(new Uint32Array(g.index.array).buffer));
 details.push({side,vertices:n,triangles:g.index.count/3});
}
const asset=Buffer.concat(parts);
await writeFile(new URL('../dist/assets/hands-v3.bin',import.meta.url),asset);
console.log(JSON.stringify({bytes:asset.length,details}));
