import * as T from './vendor/three.module.js?v=5.2.1';
import {solid} from './data.js?v=5.2.1';
function bloodMap(){
 const size=128,data=new Uint8Array(size*size*4);let seed=57;const rand=()=>{seed=Math.imul(seed,1664525)+1013904223;return(seed>>>0)/4294967296;},drops=Array.from({length:28},()=>({x:rand()*2-1,y:rand()*2-1,r:.013+rand()*.065}));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x/size-.5)*2,v=(y/size-.5)*2,a=Math.atan2(v,u),edge=.56+Math.sin(a*7)*.09+Math.sin(a*13+1)*.04,r=Math.hypot(u,v);let alpha=Math.max(0,Math.min(1,(edge-r)*35));for(const d of drops)alpha=Math.max(alpha,Math.max(0,Math.min(1,(d.r-Math.hypot(u-d.x,v-d.y))*100)));const i=(y*size+x)*4;data[i]=80+rand()*22;data[i+1]=9+rand()*6;data[i+2]=8+rand()*6;data[i+3]=alpha*230;}
 const map=new T.DataTexture(data,size,size,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;return map;
}
// Fixed storage for every effect. A burst only changes already uploaded data.
export class ZombieGore{
 constructor(root){
  this.root=root;this.spray=Array.from({length:192},()=>({life:0}));this.stains=Array.from({length:48},()=>({life:0}));this.fragments=[];this.sprayCursor=0;this.stainCursor=0;this.stainsDirty=true;this.dummy=new T.Object3D();this.map=bloodMap();
  this.droplets=new T.InstancedMesh(new T.SphereGeometry(1,7,5),new T.MeshBasicMaterial({color:0x530c08}),192);
  this.splats=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshStandardMaterial({map:this.map,transparent:true,opacity:.92,alphaTest:.000001,roughness:.45,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),48);
  for(const m of [this.droplets,this.splats]){m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.userData.kind='zombie-gore';root.add(m);}
  this.droplets.castShadow=false;
 }
 burst(point,direction={x:0,z:0},heavy=false){
  const count=heavy?30:8;
  for(let i=0;i<count;i++){const p=this.spray[this.sprayCursor++%this.spray.length],a=i*2.39996+this.sprayCursor*.23,r=(i%5)/5;Object.assign(p,{x:point.x,y:point.y,z:point.z,vx:direction.x*(1+r)+Math.cos(a)*(heavy?2:1.1),vy:.4+r*(heavy?3:1.5),vz:direction.z*(1+r)+Math.sin(a)*(heavy?2:1.1),life:.4+r*.4,r:.0045+r*.01});}
  if(heavy)this.stain(point.x,point.z,.75);
 }
 stain(x,z,size=.45){const s=this.stains[this.stainCursor++%this.stains.length];Object.assign(s,{x,z,size,angle:this.stainCursor*2.39996,life:75});this.stainsDirty=true;}
 bleed(model,e,dt){
  const a=model.userData?.licensedActor?.anatomy;if(!a||!e.zombie)return;e.bleedCool=Math.max(0,(e.bleedCool||0)-dt);if(e.bleedCool>0)return;e.bleedCool=.6;
  this.bleedPoint??=new T.Vector3();for(let i=1;i<6;i++)if(e.zombie.severed[i]){a.caps[i].getWorldPosition(this.bleedPoint);for(let j=0;j<2;j++){const p=this.spray[this.sprayCursor++%this.spray.length];Object.assign(p,{x:this.bleedPoint.x,y:this.bleedPoint.y,z:this.bleedPoint.z,vx:j?.09:-.09,vy:-.15,vz:.08,life:.65,r:.007});}}
 }
 detach(piece,direction){
  if(!piece)return;
  if(this.fragments.length>=10){const old=this.fragments.shift();old.piece.visible=false;}
  this.root.attach(piece);piece.visible=true;this.fragments.push({piece,vx:direction.x*2.4,vy:2.1,vz:direction.z*2.4,spin:piece.userData.region==='head'?2.4:1.4,life:35,landed:false});
 }
 update(dt,grid,obstacles=[]){
  const blocked=(x,z)=>solid(grid,x,z,.08)||obstacles.some(p=>(p.active!==false||p.blocksShots)&&x>p.x-p.w/2&&x<p.x+p.w/2&&z>p.z-p.d/2&&z<p.z+p.d/2);
  for(const p of this.spray){if(p.life<=0)continue;p.life-=dt;p.vy-=9*dt;const x=p.x+p.vx*dt,z=p.z+p.vz*dt;if(blocked(x,z)){p.vx=p.vz=0;}else{p.x=x;p.z=z;}p.y+=p.vy*dt;if(p.y<.035){p.life=0;}}
  for(const s of this.stains)if(s.life>0){s.life=Math.max(0,s.life-dt);if(s.life===0)this.stainsDirty=true;}
  let n=0;for(const f of this.fragments){f.life-=dt;if(f.life<=0){f.piece.visible=false;continue;}if(!f.landed){f.vy-=8.5*dt;const p=f.piece.position,x=p.x+f.vx*dt,z=p.z+f.vz*dt;if(blocked(x,z)){f.vx=f.vz=0;}else{p.x=x;p.z=z;}p.y+=f.vy*dt;f.piece.rotation.x+=f.spin*dt;f.piece.rotation.z+=f.spin*.7*dt;
    // The pivot is at the cut, so an arm hangs below it. Settle above the
    // ground according to region, without burying the whole fragment.
    const floor=f.piece.userData.region==='head'?.13:.19;if(p.y<floor){p.y=floor;f.landed=true;this.stain(p.x,p.z,.5);}}
   this.fragments[n++]=f;
  }this.fragments.length=n;this.sync();
 }
 sync(){
  const d=this.dummy;let n=0;for(const p of this.spray)if(p.life>0){d.position.set(p.x,p.y,p.z);d.rotation.set(0,0,0);d.scale.set(p.r,p.r*1.6,p.r);d.updateMatrix();this.droplets.setMatrixAt(n++,d.matrix);}this.droplets.count=n;if(n)this.droplets.instanceMatrix.needsUpdate=true;
  // Floor stains stay still until one is inserted, overwritten or expires.
  // Re-uploading this buffer every frame can contend with the prior GPU read.
  if(this.stainsDirty){n=0;for(const s of this.stains)if(s.life>0){d.position.set(s.x,.023,s.z);d.rotation.set(-Math.PI/2,0,s.angle);d.scale.set(s.size,s.size,1);d.updateMatrix();this.splats.setMatrixAt(n++,d.matrix);}this.splats.count=n;if(n)this.splats.instanceMatrix.needsUpdate=true;this.stainsDirty=false;}
 }
 dispose(){for(const f of this.fragments)f.piece.visible=false;this.fragments.length=0;for(const m of [this.droplets,this.splats]){this.root.remove(m);m.dispose();m.geometry.dispose();m.material.dispose();}this.map.dispose();}
}
