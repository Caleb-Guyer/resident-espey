import * as T from './vendor/three.module.js';

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
 }
 get active(){return this.particleCount+this.tracerCount;}
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
 }
 dispose(){
  this.particles.dispose();
  for(const o of [this.particles,this.tracers]){this.root.remove(o);o.geometry.dispose();o.material.dispose();}
  this.particleCount=this.tracerCount=0;
 }
}
