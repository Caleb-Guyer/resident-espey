import {poseWeight} from './story.js?v=5.3.0';
import * as T from './vendor/three.module.js?v=5.3.0';
import {speakingActor,speechMotion} from './cinematic-direction.js?v=5.3.0';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const ik={a:new T.Vector3(),b:new T.Vector3(),end:new T.Vector3(),target:new T.Vector3(),dir:new T.Vector3(),bend:new T.Vector3(),elbow:new T.Vector3(),from:new T.Vector3(),to:new T.Vector3(),q:new T.Quaternion(),world:new T.Quaternion(),parent:new T.Quaternion()};
function aim(joint,from,to,weight){
 const s=ik;joint.getWorldPosition(s.a);s.from.copy(from).sub(s.a).normalize();s.to.copy(to).sub(s.a).normalize();s.q.setFromUnitVectors(s.from,s.to);joint.getWorldQuaternion(s.world);joint.parent.getWorldQuaternion(s.parent).invert();s.q.premultiply(s.parent).multiply(s.world);joint.quaternion.slerp(s.q,weight);joint.updateMatrixWorld(true);
}
// The vial and bracing palms follow the actual wrist, rather than floating
// near a hand. The two-link solve changes pose, never actor position or scale.
export function reachCinematicArm(model,index,target,weight=1){
 if(weight<=0)return;const arm=model.userData.arms[index],fore=arm.userData.forearm,s=ik;
 model.updateMatrixWorld(true);arm.getWorldPosition(s.a);fore.getWorldPosition(s.b);s.end.set(0,-.39,.03).applyMatrix4(fore.matrixWorld);s.target.copy(target);
 const upper=s.a.distanceTo(s.b),lower=s.b.distanceTo(s.end),distance=clamp(s.target.distanceTo(s.a),.01,upper+lower-.0001);s.dir.copy(s.target).sub(s.a).normalize();s.target.copy(s.a).addScaledVector(s.dir,distance);
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));s.bend.set(0,-1,0).addScaledVector(s.dir,s.dir.y);if(s.bend.lengthSq()<.001)s.bend.set(index?1:-1,0,0);s.bend.normalize();s.elbow.copy(s.a).addScaledVector(s.dir,along).addScaledVector(s.bend,height);
 aim(arm,s.b,s.elbow,weight);s.end.set(0,-.39,.03).applyMatrix4(fore.matrixWorld);aim(fore,s.end,s.target,weight);
}
export function poseCinematicActor(g,a){
 const d=g.userData,move=a.moveBlend??1;
 if(!d.human)return;
 if(d.human&&a.moving){for(const leg of d.legs){leg.rotation.x*=move;leg.userData.calf.rotation.x*=move;}}
 const hurt=poseWeight(a,'hurt'),low=poseWeight(a,'kneel')+poseWeight(a,'sit'),reach=poseWeight(a,'reach'),brace=poseWeight(a,'brace');
 d.body.rotation.z+=.10*hurt;d.head.rotation.z+=.15*hurt;d.arms[0].rotation.x+=( -.4-d.arms[0].rotation.x)*hurt;d.arms[0].userData.forearm.rotation.x+=(-1.5-d.arms[0].userData.forearm.rotation.x)*hurt;
 g.position.y-=.42*low;d.legs.forEach(l=>{l.rotation.x+=(-1.1-l.rotation.x)*low;l.userData.calf.rotation.x+=(1.6-l.userData.calf.rotation.x)*low;});d.body.rotation.x+=.1*low;
 d.arms.forEach((arm,i)=>{arm.rotation.x+=(-.85-arm.rotation.x)*brace+((i===0?-.65:-.1)-arm.rotation.x)*reach;arm.userData.forearm.rotation.x+=(-.6-arm.userData.forearm.rotation.x)*brace+((i===0?-.7:-.15)-arm.userData.forearm.rotation.x)*reach;});d.head.rotation.x-=.1*(reach+brace);
}
export function stagePerformance(cinema,sample,time,sourceTime){
 const speaker=speakingActor(cinema.story,sample.line),mouth=speechMotion(sample.line,time),actors=cinema.actors,coverage=sample.coverage||{};
 for(const a of sample.actors){const g=actors.get(a.id),d=g?.userData;if(!d)continue;
  if(d.face?.morphTargetInfluences){d.face.morphTargetInfluences[0]=a.id===speaker?mouth:0;if(d.face.userData.artistDetail)d.face.userData.artistDetail.morphTargetInfluences[0]=d.face.morphTargetInfluences[0];}
  if(!d.human)continue;
  const partnerId=a.id===coverage.subject?coverage.listener:a.id!==speaker?speaker:coverage.listener,partner=actors.get(partnerId);
  if(partner&&a.pose!=='brace'){
   const yaw=Math.atan2(partner.position.x-g.position.x,partner.position.z-g.position.z),turn=Math.atan2(Math.sin(yaw-g.rotation.y),Math.cos(yaw-g.rotation.y));d.head.rotation.y+=clamp(turn,-.42,.42)*.72;
   const height=partner.position.y-g.position.y;d.head.rotation.x-=clamp(height*.18,-.12,.12);
  }
  const breath=Math.sin(time*1.7+(d.phase||0));d.head.rotation.x+=breath*.009;d.body.rotation.y+=Math.sin(time*.7+(d.phase||0))*.006;
  if(a.id===speaker){d.head.rotation.z+=Math.sin(time*2.1)*.009;if(!a.pose){d.arms[1].rotation.x-=mouth*.13;d.arms[1].userData.forearm.rotation.x-=mouth*.20;}}
  g.updateMatrixWorld(true);
 }
 const hall=actors.get('hall'),joel=actors.get('joel');
 if(hall&&joel&&cinema.vial?.parent===hall.userData.arms[0].userData.forearm){
  const start=cinema.id==='opening'?14.5:cinema.id==='closet'?8.5:0,end=cinema.id==='opening'?17.5:cinema.id==='closet'?12:4,weight=cinema.id==='serum'?1-ease(sourceTime/end):ease((sourceTime-start)/1.5)*(1-ease((sourceTime-end)/1.5));
  (cinema.injectionTarget||=new T.Vector3()).set(.19,1.29,.055).applyMatrix4(joel.matrixWorld);reachCinematicArm(hall,0,cinema.injectionTarget,weight);
 }
 const earl=actors.get('earl');if(earl&&sample.actors.find(a=>a.id==='earl')?.pose==='brace')for(let i=0;i<2;i++){(cinema.palmTarget||=new T.Vector3()).set(i?.23:-.23,1.37,2.72);reachCinematicArm(earl,i,cinema.palmTarget,.94);}
}
