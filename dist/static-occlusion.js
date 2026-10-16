import * as T from './vendor/three.module.js?v=5.5.4';
// An object is hidden only when its whole fixed bounding box lies in the
// shadow of one solid, full-height wall run from the current camera position.
// Bounds overlapping the occluder stay visible, preserving back-face shadows.
export const wallBlocksSegment=(x,z,px,pz,b)=>{
 let lo=0,hi=1,a,c,temp;const dx=px-x,dz=pz-z;
 if(Math.abs(dx)<1e-10){if(x<=b[0]||x>=b[2])return false;}else{a=(b[0]-x)/dx;c=(b[2]-x)/dx;if(a>c){temp=a;a=c;c=temp;}lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>=hi)return false;}
 if(Math.abs(dz)<1e-10){if(z<=b[1]||z>=b[3])return false;}else{a=(b[1]-z)/dz;c=(b[3]-z)/dz;if(a>c){temp=a;a=c;c=temp;}lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>=hi)return false;}
 return lo>1e-7&&lo<1-1e-5;
};
export class StaticOcclusion{
 constructor(root,grid,tile=2.4,height=3.35){
  this.enabled=true;this.height=height;this.entries=[];this.walls=[];this.lastX=this.lastZ=NaN;this.occludedCount=this.hiddenCount=0;
  for(let z=0;z<grid.length;z++)for(let x=0;x<grid[z].length;){if(!grid[z][x]){x++;continue;}const start=x;while(x<grid[z].length&&grid[z][x])x++;this.walls.push([start*tile+.015,z*tile+.015,x*tile-.015,(z+1)*tile-.015]);}
  root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh||o.children.length||o.matrixAutoUpdate||o.matrixWorldAutoUpdate||o.isSkinnedMesh||o.morphTargetInfluences||['level-walls','level-floor','level-ceiling'].includes(o.name))return;for(let p=o.parent;p&&p!==root;p=p.parent)if(p.matrixAutoUpdate||p.matrixWorldAutoUpdate)return;const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.some(m=>m.displacementMap||m.isShaderMaterial))return;
   let box;if(o.isInstancedMesh){o.computeBoundingBox();box=o.boundingBox.clone();}else{if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box=o.geometry.boundingBox.clone();}box.applyMatrix4(o.matrixWorld);
   if(box.isEmpty()||box.min.y<0||box.max.y>height)return;
   this.entries.push({mesh:o,b:[box.min.x-.01,box.min.z-.01,box.max.x+.01,box.max.z+.01]});
  });
  this.occluded=new Uint32Array(this.entries.length);this.hidden=new Uint32Array(this.entries.length);
 }
 dispose(){this.entries.length=this.walls.length=0;this.occluded=this.hidden=new Uint32Array(0);this.occludedCount=this.hiddenCount=0;}
 classify(x,z){
  if(x===this.lastX&&z===this.lastZ)return;this.lastX=x;this.lastZ=z;this.occludedCount=0;
  for(let index=0;index<this.entries.length;index++){const e=this.entries[index],a=e.b;if(x>=a[0]&&x<=a[2]&&z>=a[1]&&z<=a[3])continue;
   for(const b of this.walls){if(a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1])continue;if(wallBlocksSegment(x,z,a[0],a[1],b)&&wallBlocksSegment(x,z,a[2],a[1],b)&&wallBlocksSegment(x,z,a[0],a[3],b)&&wallBlocksSegment(x,z,a[2],a[3],b)){this.occluded[this.occludedCount++]=index;break;}}
  }
 }
 render(camera,draw,lightPosition=camera.position){
  const p=camera.position;
  // The gameplay flashlight shares the camera's X/Z. Fail open for other
  // cameras/light origins, or views outside the full-height walls.
  if(!this.enabled||!Number.isFinite(p.x+p.y+p.z+lightPosition.x+lightPosition.y+lightPosition.z)||p.y<.11||p.y>this.height-.01||lightPosition.y<.01||lightPosition.y>this.height-.01||Math.abs(p.x-lightPosition.x)>1e-7||Math.abs(p.z-lightPosition.z)>1e-7)return draw();
  this.classify(camera.position.x,camera.position.z);
  try{for(let i=0;i<this.occludedCount;i++){const index=this.occluded[i],mesh=this.entries[index].mesh;if(mesh.visible){mesh.visible=false;this.hidden[this.hiddenCount++]=index;}}return draw();}
  finally{for(let i=0;i<this.hiddenCount;i++)this.entries[this.hidden[i]].mesh.visible=true;this.hiddenCount=0;}
 }
}
