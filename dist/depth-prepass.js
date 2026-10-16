import * as T from './vendor/three.module.js?v=5.5.3';

// Only immutable, fully opaque architecture primes depth. Characters, doors,
// cutouts and transparent props keep their normal rendering and visibility.
export class DepthPrepass{
 constructor(root){
  this.enabled=true;this.scene=new T.Scene();this.material=new T.MeshBasicMaterial({colorWrite:false});this.instances=[];
  root.updateMatrixWorld(true);root.traverse(source=>{
   if(!source.isMesh||!['level-walls','level-floor','level-ceiling'].includes(source.name))return;
   let mesh;if(source.isInstancedMesh){mesh=new T.InstancedMesh(source.geometry,this.material,source.count);mesh.instanceMatrix.array.set(source.instanceMatrix.array);this.instances.push(mesh);}else mesh=new T.Mesh(source.geometry,this.material);
   mesh.matrix.copy(source.matrixWorld);mesh.matrixWorld.copy(source.matrixWorld);mesh.matrixAutoUpdate=mesh.matrixWorldAutoUpdate=false;mesh.frustumCulled=source.frustumCulled;this.scene.add(mesh);
  });
 }
 warm(renderer,camera){
  const culling=this.scene.children.map(o=>o.frustumCulled);for(const mesh of this.scene.children)mesh.frustumCulled=false;
  try{renderer.render(this.scene,camera);}finally{this.scene.children.forEach((mesh,i)=>mesh.frustumCulled=culling[i]);}
 }
 render(renderer,world,camera){
  const background=world.background,auto=renderer.autoClear;
  try{this.scene.background=background;renderer.render(this.scene,camera);const calls=renderer.info.render.calls;renderer.autoClear=false;world.background=null;renderer.render(world,camera);return calls+renderer.info.render.calls;}
  finally{world.background=background;renderer.autoClear=auto;}
 }
 dispose(){for(const mesh of this.instances)mesh.dispose();this.material.dispose();this.scene.clear();this.instances.length=0;}
}
