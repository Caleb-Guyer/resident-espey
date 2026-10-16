import {poseWeight} from './story.js?v=5.4.2';
const ids={'Ethan':'ethan','Joel':'joel','Coach Hall':'hall','Earl':'earl','Earl Britt':'earl','Landon':'landon','The Gentleman':'gent','Calen':'calen','Benny':'benny','Luke':'luke','Paul Cauley':'paul','Mr. Johnson':'johnson'};
export function speakingActor(scene,line){const id=ids[line?.speaker];return scene.actors?.find(a=>a.id===id)?.id||null;}
const eye=(a,targets)=>targets?.[a.id]||[a.x,(a.id==='gent'?2.51:1.60)+a.y-(.42*(poseWeight(a,'sit')+poseWeight(a,'kneel'))),a.z];
export function dialogueFrame(scene,sample,time,targets={}){
 const c=sample.coverage;
 if(scene.directed&&c){
  const fixed={position:sample.position,look:sample.look,fov:sample.fov,subject:null};
  if(c.type==='wide'||c.type==='insert'){
   const prop=targets[c.prop];if(!prop)return fixed;const delta=prop.map((v,i)=>v-sample.look[i]);return {...fixed,position:sample.position.map((v,i)=>v+delta[i]),look:prop};
  }
  const a=sample.actors.find(a=>a.id===c.subject),b=sample.actors.find(a=>a.id===c.listener);if(!a||!b)return fixed;
  const s=eye(a,targets),l=eye(b,targets),axis=c.axis||scene.axis||[a.id,b.id],first=sample.actors.find(a=>a.id===axis[0])||a,last=sample.actors.find(a=>a.id===axis[1])||b;
  const dx=last.x-first.x,dz=last.z-first.z,length=Math.hypot(dx,dz)||1,nx=dz/length*(c.axisSide||scene.axisSide||1),nz=-dx/length*(c.axisSide||scene.axisSide||1);
  const distance=Math.hypot(l[0]-s[0],l[2]-s[2])||1,fx=(l[0]-s[0])/distance,fz=(l[2]-s[2])/distance,push=(c.push||0)*(sample.progress||0),offset=c.offset??.5;
  let position,look=[s[0],s[1]-.14,s[2]];
  if(c.type==='two'){look=s.map((v,i)=>(v+l[i])/2);look[1]-=.12;const reach=c.distance-push;position=[look[0]+nx*reach,Math.max(s[1],l[1])+.10,look[2]+nz*reach];}
  else if(c.type==='shoulder'){position=[l[0]+fx*((c.back||.64)-push)+nx*offset,l[1]+.035,l[2]+fz*((c.back||.64)-push)+nz*offset];}
  else{const reach=(c.distance||1.65)-push;position=[s[0]+fx*reach+nx*offset,s[1]+(c.height||.04),s[2]+fz*reach+nz*offset];}
  if(c.type!=='two'){const vx=position[0]-s[0],vz=position[2]-s[2],length=Math.hypot(vx,vz)||1,rx=vz/length,rz=-vx/length,lead=Math.sign((l[0]-s[0])*rx+(l[2]-s[2])*rz),room=c.type==='shoulder'?.11:.16;look[0]+=rx*lead*room;look[2]+=rz*lead*room;}
  return {position,look,fov:c.fov||sample.fov,subject:a.id,listener:b.id};
 }
 const id=speakingActor(scene,sample.line),a=sample.actors.find(a=>a.id===id),original=scene.sourceTime?.(time)??time;
 if(!a||a.moving||original<6||scene.stage==='road'||scene.stage==='dawn'||scene.stage==='seal'||a.pose==='reach'||a.pose==='brace')return {position:sample.position,look:sample.look,fov:sample.fov,subject:null};
 const target=eye(a,targets),side=sample.position[0]<a.x?-.45:.45,front=[Math.sin(a.yaw),Math.cos(a.yaw)],right=[Math.cos(a.yaw),-Math.sin(a.yaw)],distance=id==='gent'?2.8:2.1;
 return {position:[a.x+front[0]*distance+right[0]*side,target[1]+.015,a.z+front[1]*distance+right[1]*side],look:[a.x,target[1]-.06,a.z],fov:43,subject:id};
}
export function speechMotion(line,time){
 if(!line||time<line.at||time>=line.to)return 0;
 const elapsed=time-line.at,envelope=Math.min(1,elapsed/.12,(line.to-time)/.16);
 return Math.max(0,envelope)*(.18+Math.abs(Math.sin(elapsed*15.1)*Math.sin(elapsed*7.3))*.82);
}

// Authored edits remain cuts. Automatic dialogue coverage eases between faces
// within a shot, including the quiet gaps between lines.
export class DialogueCamera{
 constructor(){this.position=[0,0,0];this.look=[0,0,0];this.reset();}
 reset(){this.time=null;this.shot=null;}
 resolve(frame,shot,time){
  const cut=this.time===null||shot!==this.shot||time<this.time,dt=cut?0:time-this.time,k=cut?1:1-Math.exp(-dt*11);
  for(let i=0;i<3;i++){this.position[i]+=(frame.position[i]-this.position[i])*k;this.look[i]+=(frame.look[i]-this.look[i])*k;}
  this.fov=cut?frame.fov:this.fov+(frame.fov-this.fov)*k;this.subject=frame.subject;this.shot=shot;this.time=time;return this;
 }
}
