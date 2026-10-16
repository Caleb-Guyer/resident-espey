import {writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {handSurface} from '../dist/viewmodel.js';
import {optimizeMeshBuffers,cacheMisses} from './mesh-buffers.mjs';
const header=new Uint32Array([0x38344852,2,2]),parts=[Buffer.from(header.buffer)],stats=[];
for(const side of [1,-1]){
 const source=handSurface(side),g=optimizeMeshBuffers(source),meta=new Uint32Array([side===1?1:0,g.attributes.position.count,g.index.count,g.index.array.BYTES_PER_ELEMENT]);parts.push(Buffer.from(meta.buffer));
 for(const a of [g.attributes.position,g.attributes.normal,g.attributes.uv,g.morphAttributes.position[0],g.index])parts.push(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));const padding=(4-g.index.array.byteLength%4)%4;if(padding)parts.push(Buffer.alloc(padding));
 stats.push({side,vertices:g.attributes.position.count,triangles:g.index.count/3,cacheMissesBefore:cacheMisses(source),cacheMissesAfter:cacheMisses(g)});
}
const raw=Buffer.concat(parts),bytes=gzipSync(raw,{level:9,mtime:0});await writeFile(new URL('../dist/assets/hands-v4.bin.gz',import.meta.url),bytes);console.log(JSON.stringify({hands:stats,bytes:raw.length,compressedBytes:bytes.length}));
