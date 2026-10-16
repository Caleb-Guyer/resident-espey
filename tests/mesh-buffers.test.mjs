import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';
import {handSurface,decodeHandSurfaces,loadHandSurfaces} from '../dist/viewmodel.js';
import {assertMeshEquivalent} from './mesh-equivalence.mjs';
import {cacheMisses} from '../scripts/mesh-buffers.mjs';
test('Compressed hand buffers preserve every triangle, normal, UV and morph while improving vertex reuse',async()=>{
 const original=await readFile(new URL('../dist/assets/hands-v3.bin',import.meta.url));decodeHandSurfaces(original);const before=new Map([1,-1].map(side=>[side,handSurface(side)]));
 const compressed=await readFile(new URL('../dist/assets/hands-v4.bin.gz',import.meta.url));assert.ok(compressed.length<original.length*.65);decodeHandSurfaces(gunzipSync(compressed));
 for(const side of [1,-1]){const source=before.get(side),actual=handSurface(side);assert.ok(actual.index.array instanceof Uint16Array);assertMeshEquivalent(source,actual);assert.ok(cacheMisses(actual)<cacheMisses(source)*.82);assert.deepEqual(actual.boundingSphere,source.boundingSphere);}
 const corrupt=Buffer.from(gunzipSync(compressed));corrupt.writeUInt32LE(1,24);assert.throws(()=>decodeHandSurfaces(corrupt));assert.ok(handSurface(1).index.array instanceof Uint16Array);
});
test('Hand loading accepts gzip, transparently decoded hosts and a prepared compatibility fallback',async()=>{
 const fetch=globalThis.fetch,Decompress=globalThis.DecompressionStream,raw=await readFile(new URL('../dist/assets/hands-v3.bin',import.meta.url)),compressed=await readFile(new URL('../dist/assets/hands-v4.bin.gz',import.meta.url));
 try{for(const mode of ['gzip','decoded','unsupported','corrupt']){const calls=[];globalThis.DecompressionStream=mode==='unsupported'?undefined:Decompress;globalThis.fetch=async url=>{const name=url.pathname.split('/').at(-1);calls.push(name);return new Response(name==='hands-v3.bin'?raw:mode==='decoded'?gunzipSync(compressed):mode==='corrupt'?new Uint8Array([31,139,0,0]):compressed);};assert.equal(await loadHandSurfaces(),true,mode);assert.deepEqual(calls,mode==='unsupported'?['hands-v3.bin']:mode==='corrupt'?['hands-v4.bin.gz','hands-v3.bin']:['hands-v4.bin.gz']);}}
 finally{globalThis.fetch=fetch;globalThis.DecompressionStream=Decompress;}
});
