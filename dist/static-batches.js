import * as T from './vendor/three.module.js?v=5.5.4';

// Spatial bounds let the renderer cull and order fixed instances independently.
// Share geometry/materials and preserve every matrix and per-instance color.
export function splitStaticInstances(source,cellSize=9.6){
 if(!Number.isFinite(cellSize)||cellSize<=0)throw new RangeError('Invalid static batch size');
 const cells=new Map(),matrix=new T.Matrix4(),color=new T.Color();
 for(let i=0;i<source.count;i++){source.getMatrixAt(i,matrix);const key=Math.floor(matrix.elements[12]/cellSize)+','+Math.floor(matrix.elements[14]/cellSize);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);}
 if(cells.size<2)return [source];
 return [...cells.values()].map(indices=>{
  const batch=new T.InstancedMesh(source.geometry,source.material,indices.length);batch.name=source.name;batch.position.copy(source.position);batch.quaternion.copy(source.quaternion);batch.scale.copy(source.scale);batch.updateMatrix();batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;batch.frustumCulled=source.frustumCulled;batch.renderOrder=source.renderOrder;batch.layers.mask=source.layers.mask;batch.visible=source.visible;batch.userData={...source.userData};batch.customDepthMaterial=source.customDepthMaterial;batch.customDistanceMaterial=source.customDistanceMaterial;
  indices.forEach((id,i)=>{source.getMatrixAt(id,matrix);batch.setMatrixAt(i,matrix);if(source.instanceColor){source.getColorAt(id,color);batch.setColorAt(i,color);}});batch.computeBoundingSphere();return batch;
 });
}
