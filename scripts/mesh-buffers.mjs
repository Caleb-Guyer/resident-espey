import * as T from '../dist/vendor/three.module.js';
import {MeshoptEncoder} from 'meshoptimizer/encoder';
await MeshoptEncoder.ready;

// Reorder only: no simplification, quantization, welding or changed weights.
// Optimize each material's draw independently, then compact vertex fetch order.
export function optimizeMeshBuffers(source){
 const indices=Uint32Array.from(source.index.array),groups=source.groups.length?source.groups:[{start:0,count:indices.length}];
 for(const group of groups){
  const draw=indices.slice(group.start,group.start+group.count),[map,count]=MeshoptEncoder.reorderMesh(draw,true,false),inverse=new Uint32Array(count);
  for(let i=0;i<map.length;i++)if(map[i]!==0xffffffff)inverse[map[i]]=i;
  for(let i=0;i<draw.length;i++)indices[group.start+i]=inverse[draw[i]];
 }
 const [map,count]=MeshoptEncoder.reorderMesh(indices,false,false),g=new T.BufferGeometry();
 const reorder=a=>{const data=new a.array.constructor(count*a.itemSize);for(let i=0;i<a.count;i++)if(map[i]!==undefined&&map[i]!==0xffffffff)data.set(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize),map[i]*a.itemSize);return new T.BufferAttribute(data,a.itemSize,a.normalized);};
 for(const [name,a]of Object.entries(source.attributes))g.setAttribute(name,reorder(a));
 for(const [name,list]of Object.entries(source.morphAttributes))g.morphAttributes[name]=list.map(reorder);
 g.morphTargetsRelative=source.morphTargetsRelative;g.setIndex(new T.BufferAttribute(count<=65536?new Uint16Array(indices):indices,1));g.groups=source.groups.map(a=>({...a}));g.boundingSphere=source.boundingSphere?.clone()??null;g.boundingBox=source.boundingBox?.clone()??null;g.userData={...source.userData};
 return g;
}

export function cacheMisses(g,size=32){
 let misses=0;const groups=g.groups.length?g.groups:[{start:0,count:g.index.count}];
 for(const group of groups){const cache=[];for(let i=group.start;i<group.start+group.count;i++){const v=g.index.getX(i),at=cache.indexOf(v);if(at<0){misses++;if(cache.length===size)cache.pop();}else cache.splice(at,1);cache.unshift(v);}}
 return misses;
}
