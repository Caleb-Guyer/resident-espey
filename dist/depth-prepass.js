import * as T from './vendor/three.module.js?v=5.5.4';

// Immutable architecture and fixed opaque planes prime depth. Characters,
// doors, cutouts, clipping and offset/transparent surfaces keep their own draws.
export class DepthPrepass{
 constructor(root,includeSurfaces=true){
  this.enabled=true;this.scene=new T.Scene();this.material=new T.MeshBasicMaterial({colorWrite:false});this.instances=[];
  root.updateMatrixWorld(true);root.traverse(source=>{
   if(!source.isMesh)return;
   if(!['level-walls','level-floor','level-ceiling'].includes(source.name)){
    const m=source.material;
    if(!includeSurfaces||source.geometry.type!=='PlaneGeometry'||source.matrixAutoUpdate||source.matrixWorldAutoUpdate||source.isSkinnedMesh||source.morphTargetInfluences||Array.isArray(m)||m.isShaderMaterial||m.colorWrite===false||(m.blending!==T.NormalBlending&&m.blending!==T.NoBlending)||m.transparent||m.alphaTest||m.alphaHash||m.alphaToCoverage||m.displacementMap||m.depthWrite===false||m.depthTest===false||m.depthFunc!==T.LessEqualDepth||m.side!==T.FrontSide||m.polygonOffset||m.stencilWrite||m.clippingPlanes?.length||!source.visible)return;
    for(let parent=source.parent;parent&&parent!==root;parent=parent.parent)if(!parent.visible||parent.matrixAutoUpdate||parent.matrixWorldAutoUpdate)return;
   }
   let mesh;if(source.isInstancedMesh){mesh=new T.InstancedMesh(source.geometry,this.material,source.count);mesh.instanceMatrix.array.set(source.instanceMatrix.array);this.instances.push(mesh);}else mesh=new T.Mesh(source.geometry,this.material);
   mesh.matrix.copy(source.matrixWorld);mesh.matrixWorld.copy(source.matrixWorld);mesh.matrixAutoUpdate=mesh.matrixWorldAutoUpdate=false;mesh.frustumCulled=source.frustumCulled;mesh.layers.mask=source.layers.mask;this.scene.add(mesh);
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
