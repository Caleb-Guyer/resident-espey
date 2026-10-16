import * as T from './vendor/three.module.js?v=5.5.3';
// Preserve indexed vertices and UV/normal seams instead of expanding every
// triangle corner. Only siblings with the same opaque material may be merged.
export function mergeRigidParts(group,shared=new Set()){
 const buckets=new Map();for(const o of [...group.children])if(o.isMesh&&!o.isSkinnedMesh&&!o.morphTargetInfluences&&!Array.isArray(o.material)&&!o.material.transparent){const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);}
 for(const objects of buckets.values()){
  if(objects.length<2)continue;
  const parts=objects.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix);}),geometry=new T.BufferGeometry();
  for(const name of ['position','normal','uv']){if(parts.some(p=>!p.getAttribute(name)))continue;const size=parts[0].getAttribute(name).itemSize,data=new Float32Array(parts.reduce((n,p)=>n+p.getAttribute(name).array.length,0));let offset=0;for(const p of parts){const a=p.getAttribute(name).array;data.set(a,offset);offset+=a.length;}geometry.setAttribute(name,new T.BufferAttribute(data,size));}
  const count=parts.reduce((n,p)=>n+(p.index?.count??p.attributes.position.count),0),indices=new Uint32Array(count);let offset=0,vertex=0;
  for(const p of parts){const n=p.index?.count??p.attributes.position.count;for(let i=0;i<n;i++)indices[offset++]=vertex+(p.index?p.index.getX(i):i);vertex+=p.attributes.position.count;}
  geometry.setIndex(new T.BufferAttribute(indices,1));geometry.computeBoundingSphere();const batch=new T.Mesh(geometry,objects[0].material);batch.castShadow=objects.some(o=>o.castShadow);batch.receiveShadow=objects.some(o=>o.receiveShadow);group.add(batch);
  for(const p of parts)p.dispose();for(const old of objects){group.remove(old);if(!shared.has(old.geometry))old.geometry.dispose();}
 }
}
