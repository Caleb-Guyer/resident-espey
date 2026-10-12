import * as T from './vendor/three.module.js';
import {solid} from './data.js?v=4.4.0';

// Fixed batches prevent an acid volley or a wing attack from allocating new
// meshes in combat. Pools and waves are temporary hazards, never obstacles.
export class EnemyEffects{
 constructor(root){
  this.root=root;this.bolts=[];this.pools=[];this.waves=[];this.dummy=new T.Object3D();
  this.projectiles=new T.InstancedMesh(new T.SphereGeometry(1,12,8),new T.MeshStandardMaterial({color:0xffffff,roughness:.3,emissive:0x88905b,emissiveIntensity:.5}),32);
  this.stains=new T.InstancedMesh(new T.CircleGeometry(1,32),new T.MeshBasicMaterial({color:0x849751,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}),12);
  this.rings=new T.InstancedMesh(new T.RingGeometry(.94,1,48),new T.MeshBasicMaterial({color:0xde9d66,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}),6);
  for(const m of [this.projectiles,this.stains,this.rings]){m.count=0;m.frustumCulled=false;m.userData.kind='enemy-fx';root.add(m);}
  this.projectiles.castShadow=false;
  this.projectiles.setColorAt(0,new T.Color(0xffffff));
 }
 volley(e,a){
  const angle=Math.atan2(e.chargeZ,e.chargeX),n=a.shots;
  for(let i=0;i<n;i++){
   if(this.bolts.length===32)this.bolts.shift();const offset=(i-(n-1)/2)*(a.projectile==='echo'?.16:.12),v=angle+offset;
   const y=e.kind==='birdy'?1.9:e.kind==='jakob'?2.15:e.kind==='zeb'?2.1:1.25,travel=Math.max(.4,Math.hypot(e.targetX-e.x,e.targetZ-e.z)/a.speed);
   this.bolts.push({x:e.x,z:e.z,y,vy:(1.15-y)/travel,vx:Math.cos(v)*a.speed,vz:Math.sin(v)*a.speed,life:3,damage:e.damage*a.damage,kind:a.projectile,color:a.projectile==='acid'?0xa9ba64:a.projectile==='echo'?0xb0c9c4:0xb39b81});
  }
 }
 pool(x,z,damage){if(this.pools.length===12)this.pools.shift();this.pools.push({x,z,r:1.1,life:4.5,damage});}
 wave(e,radius,damage){if(this.waves.length===6)this.waves.shift();this.waves.push({x:e.x,z:e.z,r:.1,max:radius,damage,hit:false});}
 update(dt,game){
  const p=game.player,blocked=(x,z,y)=>solid(game.grid,x,z,.12)||game.world.obstacles?.some(o=>o.active!==false&&o.h>y&&x>o.x-o.w/2-.1&&x<o.x+o.w/2+.1&&z>o.z-o.d/2-.1&&z<o.z+o.d/2+.1);
  this.bolts=this.bolts.filter(b=>{
   b.life-=dt;const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vz)*dt/.15));let impact=false;
   for(let i=0;i<steps&&!impact;i++){
    const x=b.x+b.vx*dt/steps,z=b.z+b.vz*dt/steps;
    b.y+=b.vy*dt/steps;if(b.y<.05||blocked(x,z,b.y))impact=true;else {b.x=x;b.z=z;if(Math.hypot(x-p.x,z-p.z)<.42&&b.y<(p.crouching?1.3:1.95)){game.hurt(b.damage);impact=true;}}
   }
   if(impact||b.life<=0){if(b.kind==='acid'&&!solid(game.grid,b.x,b.z,.05))this.pool(b.x,b.z,b.damage*.55);game.world.effect?.(b.x,b.z,b.color,4,b.y);return false;}return true;
  });
  this.pools=this.pools.filter(s=>{s.life-=dt;if(s.life<=0)return false;if(Math.hypot(p.x-s.x,p.z-s.z)<s.r&&game.canSee(s,p))game.hurt(s.damage);return true;});
  this.waves=this.waves.filter(w=>{const before=w.r;w.r+=4.2*dt;const d=Math.hypot(p.x-w.x,p.z-w.z);if(!w.hit&&d>before-.38&&d<w.r+.38&&game.canSee(w,p)){game.hurt(w.damage);w.hit=true;}return w.r<w.max;});
  this.sync();
 }
 sync(){
  const d=this.dummy;this.projectiles.count=this.bolts.length;
  this.bolts.forEach((b,i)=>{d.position.set(b.x,b.y,b.z);d.rotation.set(0,Math.atan2(b.vx,b.vz),0);d.scale.set(.085,.085,b.kind==='feather'?.35:.16);d.updateMatrix();this.projectiles.setMatrixAt(i,d.matrix);this.projectiles.setColorAt(i,new T.Color(b.color));});
  this.stains.count=this.pools.length;this.pools.forEach((s,i)=>{d.position.set(s.x,.026,s.z);d.rotation.set(-Math.PI/2,0,0);d.scale.setScalar(s.r*Math.min(1,s.life));d.updateMatrix();this.stains.setMatrixAt(i,d.matrix);});
  this.rings.count=this.waves.length;this.waves.forEach((w,i)=>{d.position.set(w.x,.04,w.z);d.rotation.set(-Math.PI/2,0,0);d.scale.setScalar(w.r);d.updateMatrix();this.rings.setMatrixAt(i,d.matrix);});
  for(const m of [this.projectiles,this.stains,this.rings]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 }
 dispose(){for(const m of [this.projectiles,this.stains,this.rings]){this.root.remove(m);m.geometry.dispose();m.material.dispose();}this.bolts=[];this.pools=[];this.waves=[];}
}
