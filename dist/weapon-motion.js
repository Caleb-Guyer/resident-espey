import {weaponFor} from './weapons.js?v=5.1.3';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};
const mix=(a,b,t)=>a+(b-a)*t;
const fade=(x,a,b)=>smooth((x-a)/(b-a));
const window=(x,a,b,c,d)=>fade(x,a,b)*(1-fade(x,c,d));
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
// The analytic critically damped solution remains stable at any frame rate.
export function dampSpring(s,target,omega,dt){
 const offset=s.x-target,j=s.v+omega*offset,e=Math.exp(-omega*dt);
 s.x=target+(offset+j*dt)*e;s.v=(s.v-omega*j*dt)*e;
 if(Math.abs(s.x-target)<1e-7&&Math.abs(s.v)<1e-7){s.x=target;s.v=0;}return s.x;
}
export function createWeaponMotion(){return {ads:0,obstruction:{x:0,v:0},move:{x:0,v:0},sprint:{x:0,v:0},kick:{x:0,v:0},lagX:{x:0,v:0},lagY:{x:0,v:0},shotAge:10,shots:0,lastYaw:null,lastPitch:0};}
export function kickWeapon(s,aiming,power=1){s.kick.v=Math.min((aiming?3.6:5.2)*power,s.kick.v+(aiming?2.8:4.1)*power);s.shotAge=0;s.shots++;}

const keys=[
 // progress, weapon tilt, support hand displacement, hand rotation, magazine displacement
 [0,[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
 [.10,[-.08,.22,.12],[-.018,-.01,.025],[.10,-.20,-.10],[0,0,0]],
 [.16,[-.12,.45,.22],[-.012,-.075,.05],[.16,-.82,-.20],[0,-.012,0]],
 [.30,[-.12,.45,.22],[-.03,-.22,.09],[.10,-.85,-.15],[-.025,-.21,.07]],
 [.42,[-.12,.45,.22],[-.09,-.34,.16],[.05,-.92,-.16],[-.10,-.43,.17]],
 [.50,[-.12,.45,.22],[-.08,-.32,.14],[.05,-.92,-.12],[-.09,-.37,.15]],
 [.60,[-.12,.45,.22],[-.018,-.13,.06],[.12,-.80,-.08],[-.008,-.12,.025]],
 [.63,[-.12,.45,.22],[0,-.05,.025],[.12,-.75,-.05],[0,0,0]],
 [.72,[-.09,.33,.16],[-.018,-.028,.03],[.08,0,-.04],[0,0,0]],
 [.80,[-.06,.20,.09],[-.01,.105,-.032],[-.50,.10,.42],[0,0,0]],
 [.88,[-.03,.12,.05],[-.01,.125,-.054],[-.55,.12,.45],[0,0,0]],
 [.96,[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
 [1,[0,0,0],[0,0,0],[0,0,0],[0,0,0]]
];
export function reloadPose(progress,empty=false){
 const p=clamp(progress,0,1);let i=0;while(i<keys.length-2&&p>keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],u=smooth((p-a[0])/(b[0]-a[0]));
 const blend=k=>a[k].map((x,j)=>mix(x,b[k][j],u));
 const rotation=blend(1),hand=blend(2),handRotation=blend(3),magazine=blend(4);
 // Tactical reloads return straight to the grip; an empty pistol releases its slide.
 if(!empty&&p>.72){const t=1-fade(p,.72,.94);for(let j=0;j<3;j++){hand[j]=keys[8][2][j]*t;handRotation[j]=keys[8][3][j]*t;}}
 const present=window(p,.02,.15,.75,.96);
 return {rotation,hand,handRotation,magazine,magazineVisible:p<.405||p>.475,grasp:window(p,.07,.14,.90,.96),lower:-present*.185,present,pullback:present*.09,adsBlock:window(p,.01,.12,.78,.97)};
}
export function stepWeaponMotion(s,dt,p,{reduced=false,walk=0,aspect=1.6,progress=0,viewScale=1.08,obstruction=0}={}){
 dt=Number.isFinite(dt)?clamp(dt,0,1):0;
 const w=weaponFor(p),reload=p.reloading>0?reloadPose(progress,!!p.reloadEmpty):reloadPose(0),yaw=p.yaw||0,pitch=p.pitch||0;
 if(w.id==='shotgun'&&p.reloading>0){
  const elapsed=p.reloadDuration-p.reloading,u=Math.max(0,(elapsed-.45)/.62)%1,load=elapsed>.45&&elapsed<.45+(p.reloadShells||1)*.62,reach=load?Math.sin(u*Math.PI):0,envelope=Math.max(0,Math.min(1,progress/.10,(1-progress)/.12));
  reload.rotation=[.18*envelope,-.08*envelope,.38*envelope];reload.hand=[.035*reach,-.12*(1-reach)*envelope,.28*reach];reload.handRotation=[-.30*reach,.12*reach,.7*reach];reload.magazine=[0,0,0];reload.magazineVisible=false;reload.grasp=.75*reach;reload.lower=-.035*envelope;reload.pullback=.035*envelope;reload.present=.2*envelope;
 }else if(w.id==='carbine'){reload.hand[2]+=.17*reload.present;reload.hand[0]+=.02*reload.present;}
 s.obstruction??={x:0,v:0};dampSpring(s.obstruction,clamp(obstruction,0,1),22,dt);const close=s.obstruction.x;
 const aim=Number(!!p.aiming&&!p.sprinting)*(1-reload.adsBlock)*(1-close),blend=1-Math.exp(-dt*14);s.ads=mix(s.ads,aim,blend);if(Math.abs(s.ads-aim)<1e-6)s.ads=aim;
 dampSpring(s.kick,0,28,dt);dampSpring(s.move,Number(!!p.moving),14,dt);dampSpring(s.sprint,Number(!!p.sprinting),12,dt);
 const vx=dt&&s.lastYaw!==null?clamp(wrap(yaw-s.lastYaw)/dt,-4,4):0,vy=dt&&s.lastYaw!==null?clamp((pitch-s.lastPitch)/dt,-3,3):0;
 s.lastYaw=yaw;s.lastPitch=pitch;
 const lagScale=reduced?0:1-s.ads*.93;dampSpring(s.lagX,-vx*.004*lagScale,24,dt);dampSpring(s.lagY,vy*.003*lagScale,24,dt);
 s.shotAge+=dt;const age=s.shotAge;
 const cycle=age<.022?fade(age,0,.022):age<.09?1-fade(age,.022,.09):0;
 const lock=(p.reloading>0?!!p.reloadEmpty&&progress<.88:p.ammo===0)?1:0;
 const bob=(reduced?0:s.move.x)*(1-s.ads*.92),kick=s.kick.x,long=w.id!=='sidearm',equip=Math.min(1,(p.equipping||0)/.24),pump=w.id==='shotgun'?(p.reloadEmpty&&p.reloading>0&&p.reloading<.45?Math.sin((.45-p.reloading)/.45*Math.PI)*.087:age>.22&&age<.70?Math.sin((age-.22)/.48*Math.PI)*.087:0):0;
 return {
  obstruction:close,pump,shell:w.id==='shotgun'&&p.reloading>0&&reload.grasp>.35,ads:s.ads,headBob:(reduced?0:s.move.x)*Math.sin(walk*7)*.009*(1-s.ads*.8),
  position:[.16*(1-s.ads)*Math.min(1,aspect/1.3)+s.lagX.x*.3-reload.present*.06,(long?-.178:-.145)+((long?.178:.145)-w.sightHeight*viewScale)*s.ads+Math.sin(walk*7)*.004*bob-reload.lower-s.sprint.x*.055-equip*.22-close*.08,(long?-.40:-.45)+.03*s.ads+kick*.32-reload.pullback+close*(long?.03:.075)],
  rotation:[equip*.38+kick+reload.rotation[0]+s.lagY.x+close*1.55,.16*(1-s.ads)+reload.rotation[1]+s.lagX.x,reload.rotation[2]+Math.sin(walk*3.5)*.004*bob-s.sprint.x*.10],
  slide:w.id==='shotgun'?0:Math.max(cycle,lock)*(w.id==='carbine'?.042:.028),trigger:age<.12?window(age,0,.016,.06,.12):0,
  reload,fovOffset:-s.ads*w.ads+(reduced?0:s.sprint.x*2)
 };
}
