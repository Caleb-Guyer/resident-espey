import * as T from './vendor/three.module.js?v=5.5.1';
import {solid} from './data.js?v=5.5.1';
const acquire=(list,free,capacity)=>free.pop()||(list.length>=capacity?list.shift():{});
const release=(free,item,capacity)=>{if(item.pooled&&free.length<capacity)free.push(item);};
export class EnemyEffects{
 constructor(root){
  this.root=root;this.bolts=[];this.pools=[];this.waves=[];this.freeBolts=Array.from({length:32},()=>({pooled:true}));this.freePools=Array.from({length:12},()=>({pooled:true}));this.freeWaves=Array.from({length:6},()=>({pooled:true}));this.dummy=new T.Object3D();this.color=new T.Color();
  this.projectiles=new T.InstancedMesh(new T.SphereGeometry(1,12,8),new T.MeshStandardMaterial({color:0xffffff,roughness:.3,emissive:0x88905b,emissiveIntensity:.5}),32);
  this.stains=new T.InstancedMesh(new T.CircleGeometry(1,32),new T.MeshBasicMaterial({color:0x849751,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}),12);
  this.rings=new T.InstancedMesh(new T.RingGeometry(.94,1,48),new T.MeshBasicMaterial({color:0xde9d66,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}),6);
  for(const m of [this.projectiles,this.stains,this.rings]){m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.userData.kind='enemy-fx';root.add(m);}this.projectiles.castShadow=false;this.projectiles.instanceColor=new T.InstancedBufferAttribute(new Float32Array(32*3),3).setUsage(T.DynamicDrawUsage);
 }
 volley(e,a){
  const angle=Math.atan2(e.chargeZ,e.chargeX),n=a.shots,y=e.kind==='birdy'?1.9:e.kind==='jakob'?2.15:e.kind==='zeb'?2.1:1.25,travel=Math.max(.4,Math.hypot(e.targetX-e.x,e.targetZ-e.z)/a.speed);
  for(let i=0;i<n;i++){const b=acquire(this.bolts,this.freeBolts,32),offset=a.radial?i/n*Math.PI*2:(i-(n-1)/2)*(a.spread||(a.projectile==='echo'?.16:.12)),v=angle+offset;
   Object.assign(b,{x:e.x,z:e.z,sourceX:e.x,sourceZ:e.z,y,vy:(1.15-y)/travel,vx:Math.cos(v)*a.speed,vz:Math.sin(v)*a.speed,life:3,damage:e.damage*a.damage,kind:a.projectile,color:a.projectile==='acid'?0xa9ba64:a.projectile==='echo'?0xb0c9c4:0xb39b81});this.bolts.push(b);
  }
 }
 pool(x,z,damage,source=null){const p=acquire(this.pools,this.freePools,12);Object.assign(p,{x,z,sourceX:source?.sourceX??x,sourceZ:source?.sourceZ??z,r:1.1,life:4.5,damage});this.pools.push(p);}
 wave(e,radius,damage){const w=acquire(this.waves,this.freeWaves,6);Object.assign(w,{x:e.x,z:e.z,r:.1,max:radius,damage,hit:false});this.waves.push(w);}
 clearHazards(){for(const b of this.bolts)release(this.freeBolts,b,32);for(const s of this.pools)release(this.freePools,s,12);for(const w of this.waves)release(this.freeWaves,w,6);this.bolts.length=this.pools.length=this.waves.length=0;this.sync();}
 update(dt,game){
  if(!Number.isFinite(dt)||dt<=0){this.sync();return;}
  const p=game.player,obstacles=game.world.obstacles||[];let count=0;
  const blocked=(x,z,y)=>{if(solid(game.grid,x,z,.12))return true;for(const o of obstacles)if((o.active!==false||o.blocksShots)&&y>(o.minY||0)-.1&&y<o.h+.1&&x>o.x-o.w/2-.1&&x<o.x+o.w/2+.1&&z>o.z-o.d/2-.1&&z<o.z+o.d/2+.1)return true;return false;};
  for(const b of this.bolts){b.life-=dt;const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vz)*dt/.15));let impact=false;
   for(let i=0;i<steps&&!impact;i++){const x=b.x+b.vx*dt/steps,z=b.z+b.vz*dt/steps;b.y+=b.vy*dt/steps;if(b.y<.05||blocked(x,z,b.y))impact=true;else {b.x=x;b.z=z;if(Math.hypot(x-p.x,z-p.z)<.42&&b.y<(Number.isFinite(p.eyeHeight)?p.eyeHeight+.31:p.crouching?1.3:1.95)){game.hurt(b.damage,b);impact=true;}}}
   if(impact||b.life<=0){if(b.kind==='acid'&&!solid(game.grid,b.x,b.z,.05))this.pool(b.x,b.z,b.damage*.55,b);game.world.effect?.(b.x,b.z,b.color,4,b.y);release(this.freeBolts,b,32);}else this.bolts[count++]=b;
  }this.bolts.length=count;count=0;
  for(const s of this.pools){s.life-=dt;if(s.life<=0){release(this.freePools,s,12);continue;}if(Math.hypot(p.x-s.x,p.z-s.z)<s.r&&game.canSee(s,p))game.hurt(s.damage,s);this.pools[count++]=s;}this.pools.length=count;count=0;
  for(const w of this.waves){const before=w.r;w.r+=4.2*dt;const d=Math.hypot(p.x-w.x,p.z-w.z);if(!w.hit&&d>before-.38&&d<w.r+.38&&game.canSee(w,p)){game.hurt(w.damage,w);w.hit=true;}if(w.r<w.max)this.waves[count++]=w;else release(this.freeWaves,w,6);}this.waves.length=count;this.sync();
 }
 sync(){
  const d=this.dummy;this.projectiles.count=this.bolts.length;
  for(let i=0;i<this.bolts.length;i++){const b=this.bolts[i];d.position.set(b.x,b.y,b.z);d.rotation.set(0,Math.atan2(b.vx,b.vz),0);d.scale.set(.085,.085,b.kind==='feather'?.35:.16);d.updateMatrix();this.projectiles.setMatrixAt(i,d.matrix);this.projectiles.setColorAt(i,this.color.setHex(b.color));}
  this.stains.count=this.pools.length;for(let i=0;i<this.pools.length;i++){const s=this.pools[i];d.position.set(s.x,.026,s.z);d.rotation.set(-Math.PI/2,0,0);d.scale.setScalar(s.r*Math.min(1,s.life));d.updateMatrix();this.stains.setMatrixAt(i,d.matrix);}
  this.rings.count=this.waves.length;for(let i=0;i<this.waves.length;i++){const w=this.waves[i];d.position.set(w.x,.04,w.z);d.rotation.set(-Math.PI/2,0,0);d.scale.setScalar(w.r);d.updateMatrix();this.rings.setMatrixAt(i,d.matrix);}
  // Empty pools change draw counts without resending unused instance buffers.
  for(const m of [this.projectiles,this.stains,this.rings])if(m.count){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 }
 dispose(){for(const m of [this.projectiles,this.stains,this.rings]){this.root.remove(m);m.dispose();m.geometry.dispose();m.material.dispose();}this.bolts.length=this.pools.length=this.waves.length=0;}
}
