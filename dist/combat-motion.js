import {ATTACKS} from './enemy-director.js?v=5.5.3';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};

// Separate anticipation, contact, follow-through and recovery. A release starts
// in exactly the pose where the tell ended, rather than snapping to idle.
export function attackMotion(e,out={}){
 const a=ATTACKS[e.attack],w=e.windup>0,age=e.actionTime>=0?e.actionTime:e.strike>0?.4-e.strike:-1;
 out.wind=w?smooth((e.attackTime||0)/(e.tellDuration||a?.tell||1)):age>=0?1-smooth(age/.17):0;
 out.strike=!w&&age>=0?smooth(age/.075)*(1-smooth((age-.075)/.32)):0;
 out.follow=!w&&age>=0?smooth(age/.075)*(1-smooth((age-.15)/Math.max(.35,(a?.recover||1)*.72))):0;
 out.recover=e.recover>0?smooth(e.recover/Math.max(.5,a?.recover||2.1)):0;
 out.charge=e.charge>0?smooth(Math.min((a?.duration||.7)-e.charge,.12)/.12):0;
 return out;
}

// Six critically damped channels: torso pitch/roll, head, left/right arm, knee.
// These are additive to the authored pose, and never restart locomotion clips.
export function recordImpact(e,damage,nx,nz,head=false,headIndex=0,regions=null,strength=1){
 const s=e.impact||=(new Float64Array(12)),yaw=e.model?.rotation?.y||0,side=clamp(nx*Math.cos(yaw)-nz*Math.sin(yaw),-1,1),front=nx*Math.sin(yaw)+nz*Math.cos(yaw),boss=!!e.model?.userData?.bossRig;
 const force=clamp(Math.sqrt(Math.max(0,damage)/30),.4,2.1)*strength*(boss?.7:1);
 const kick=(channel,v)=>s[channel+6]=clamp(s[channel+6]+v,-7,7);
 kick(0,force*(front<0?-1:1)*1.8);kick(1,-force*side*2.2);
 if(head){kick(2,force*(front<0?-1:1)*3.4);e.impactHead=Number.isInteger(headIndex)?headIndex:0;}
 if(regions){if(regions[2]>0)kick(3,force*2.6);if(regions[3]>0)kick(4,force*2.6);if(regions[4]+regions[5]>0){kick(5,force*1.9);e.impactLeg=regions[4]>=regions[5]?0:1;}}
 return s;
}
export function settleImpact(e,dt){
 const s=e.impact;if(!s||!(dt>0))return;
 const omega=15,decay=Math.exp(-omega*dt);
 for(let i=0;i<6;i++){const x=s[i],v=s[i+6],c=v+omega*x;s[i]=(x+c*dt)*decay;s[i+6]=(v-omega*c*dt)*decay;if(Math.abs(s[i])+Math.abs(s[i+6])<.00001)s[i]=s[i+6]=0;}
}
