import * as T from './vendor/three.module.js?v=5.3.0';

// Combat keeps two GPU batches alive for the chapter. Bursts only change their
// buffers; they never create/dispose materials or recompile shaders mid-fight.
export class CombatEffects{
 constructor(root,particleCapacity=256,tracerCapacity=16){
  this.root=root;this.particleCapacity=particleCapacity;this.tracerCapacity=tracerCapacity;
  this.particleCount=0;this.tracerCount=0;this.matrix=new T.Matrix4();this.color=new T.Color();
  this.particleData=Array.from({length:particleCapacity},()=>({}));
  this.tracerData=Array.from({length:tracerCapacity},()=>({}));
  this.particles=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,depthWrite:false}),particleCapacity);
  this.particles.instanceMatrix.setUsage(T.DynamicDrawUsage);
  this.particles.instanceColor=new T.InstancedBufferAttribute(new Float32Array(particleCapacity*3),3).setUsage(T.DynamicDrawUsage);
  this.particles.count=0;this.particles.frustumCulled=false;root.add(this.particles);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(tracerCapacity*6),3).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(tracerCapacity*6),3).setUsage(T.DynamicDrawUsage));
  geometry.setDrawRange(0,0);
  this.tracers=new T.LineSegments(geometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.45,depthWrite:false}));
  this.tracers.frustumCulled=false;root.add(this.tracers);
  this.casingCapacity=48;this.casingCount=0;this.casingData=Array.from({length:this.casingCapacity},()=>({}));
  this.casings=new T.InstancedMesh(new T.CylinderGeometry(.005,.005,.023,8),new T.MeshStandardMaterial({color:0xb79851,roughness:.29,metalness:.76}),this.casingCapacity);this.casings.instanceMatrix.setUsage(T.DynamicDrawUsage);this.casings.instanceColor=new T.InstancedBufferAttribute(new Float32Array(this.casingCapacity*3).fill(1),3).setUsage(T.DynamicDrawUsage);this.casings.count=0;this.casings.frustumCulled=false;root.add(this.casings);this.casingTransform=new T.Object3D();
 }
 get active(){return this.particleCount+this.tracerCount+this.casingCount;}
 eject(origin,yaw,atPort=false){
  if(![origin.x,origin.y,origin.z,yaw].every(Number.isFinite)||this.casingCount===this.casingCapacity)return;
  const c=this.casingData[this.casingCount++],rightX=Math.cos(yaw),rightZ=-Math.sin(yaw);
  Object.assign(c,{x:origin.x+(atPort?0:rightX*.16-Math.sin(yaw)*.35),y:origin.y-(atPort?0:.19),z:origin.z+(atPort?0:rightZ*.16-Math.cos(yaw)*.35),vx:rightX*1.8,vz:rightZ*1.8,vy:1.4,spin:Math.random()*6,life:3.2,bounces:0,shell:false});
 }
 shellLast(){if(this.casingCount)this.casingData[this.casingCount-1].shell=true;}
 burst(x,z,color=0xe6b25e,count=8,y=1.1){
  if(![x,y,z,count].every(Number.isFinite))return;
  this.color.setHex(color);const {r,g,b}=this.color;
  const end=Math.min(this.particleCapacity,this.particleCount+Math.max(0,Math.floor(count)));
  while(this.particleCount<end){
   const p=this.particleData[this.particleCount++];
   p.x=x;p.y=y;p.z=z;p.r=r;p.g=g;p.b=b;p.life=.3+Math.random()*.3;
   p.vx=(Math.random()-.5)*3;p.vz=(Math.random()-.5)*3;p.vy=Math.random()*2;
  }
 }
 tracer(a,b){
  const ay=a.y??1.64,by=b.y??1.1;
  if(![a.x,ay,a.z,b.x,by,b.z].every(Number.isFinite)||this.tracerCount===this.tracerCapacity)return;
  const t=this.tracerData[this.tracerCount++];
  t.ax=a.x;t.ay=ay;t.az=a.z;t.bx=b.x;t.by=by;t.bz=b.z;t.life=.055;
 }
 update(dt){
  if(!Number.isFinite(dt)||dt<0)return;
  for(let i=this.particleCount-1;i>=0;i--){
   const p=this.particleData[i];p.life-=dt;
   if(p.life<=0){this.particleData[i]=this.particleData[--this.particleCount];this.particleData[this.particleCount]=p;continue;}
   p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=dt*5;
  }
  for(let i=0;i<this.particleCount;i++){
   const p=this.particleData[i],size=.016*Math.min(1,p.life*5);
   this.matrix.makeScale(size,size,size).setPosition(p.x,p.y,p.z);this.particles.setMatrixAt(i,this.matrix);
   this.color.setRGB(p.r,p.g,p.b);this.particles.setColorAt(i,this.color);
  }
  this.particles.count=this.particleCount;
  if(this.particleCount){this.particles.instanceMatrix.needsUpdate=true;this.particles.instanceColor.needsUpdate=true;}
  for(let i=this.tracerCount-1;i>=0;i--){
   const t=this.tracerData[i];t.life-=dt;
   if(t.life<=0){this.tracerData[i]=this.tracerData[--this.tracerCount];this.tracerData[this.tracerCount]=t;}
  }
  const position=this.tracers.geometry.getAttribute('position'),color=this.tracers.geometry.getAttribute('color');
  this.color.setHex(0xffd6a3);
  for(let i=0;i<this.tracerCount;i++){
   const t=this.tracerData[i],j=i*2,fade=Math.min(1,t.life/.025);
   position.setXYZ(j,t.ax,t.ay,t.az);position.setXYZ(j+1,t.bx,t.by,t.bz);
   for(const k of [j,j+1])color.setXYZ(k,this.color.r*fade,this.color.g*fade,this.color.b*fade);
  }
  this.tracers.geometry.setDrawRange(0,this.tracerCount*2);
  if(this.tracerCount){position.needsUpdate=true;color.needsUpdate=true;}
  for(let i=this.casingCount-1;i>=0;i--){const c=this.casingData[i];c.life-=dt;if(c.life<=0){this.casingData[i]=this.casingData[--this.casingCount];this.casingData[this.casingCount]=c;continue;}c.x+=c.vx*dt;c.z+=c.vz*dt;c.y+=c.vy*dt;c.vy-=dt*9.8;if(c.y<.023){c.y=.023;c.vy=c.bounces++<2?Math.abs(c.vy)*.28:0;c.vx*=.6;c.vz*=.6;}if(c.y>.023)c.spin+=dt*13;}
  for(let i=0;i<this.casingCount;i++){const c=this.casingData[i];this.casingTransform.position.set(c.x,c.y,c.z);this.casingTransform.rotation.set(c.y<=.023?Math.PI/2:c.spin,0,c.spin*.7);this.casingTransform.scale.set(c.shell?1.7:1,c.shell?1.9:1,c.shell?1.7:1);this.color.setHex(c.shell?0x9b3528:0xffffff);this.casings.setColorAt(i,this.color);this.casingTransform.updateMatrix();this.casings.setMatrixAt(i,this.casingTransform.matrix);}this.casings.count=this.casingCount;if(this.casingCount){this.casings.instanceMatrix.needsUpdate=true;this.casings.instanceColor.needsUpdate=true;}
 }
 dispose(){
  this.particles.dispose();this.casings.dispose();
  for(const o of [this.particles,this.tracers,this.casings]){this.root.remove(o);o.geometry.dispose();o.material.dispose();}
  this.particleCount=this.tracerCount=this.casingCount=0;
 }
}
