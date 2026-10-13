import {weaponFor} from './weapons.js?v=5.1.0';
import {viewDirection,EYE_HEIGHT} from './fps.js?v=5.1.0';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function settleWeapon(p,dt){
 if(!Number.isFinite(dt)||dt<0)return;
 const eye=p.crouching?1.14:EYE_HEIGHT;p.eyeHeight=(Number.isFinite(p.eyeHeight)?p.eyeHeight:EYE_HEIGHT)+(eye-(Number.isFinite(p.eyeHeight)?p.eyeHeight:EYE_HEIGHT))*(1-Math.exp(-dt*12));
 p.bloom=Math.max(0,(p.bloom||0)-dt*1.9);
 const target=p.aiming&&!p.sprinting?(p.moving?.58:1):0;
 p.focus=(p.focus||0)+(target-(p.focus||0))*(1-Math.exp(-dt*8));
}
export function shotDirection(p,yaw,pitch,random=Math.random){
 const focus=clamp(p.focus??(p.aiming?1:0),0,1),spread=(.0045*(1-focus)+(p.bloom||0)*.006+(p.moving?.004:0))*(p.crouching?.65:1);
 const angle=random()*Math.PI*2,radius=Math.sqrt(random())*spread;
 return viewDirection(yaw+Math.cos(angle)*radius,pitch+Math.sin(angle)*radius);
}
export function applyRecoil(p){
 const w=weaponFor(p);p.bloom=clamp((p.bloom||0)+.28*w.recoil,0,1);
 p.pitch=clamp((p.pitch||0)+(p.aiming?.0055:.012)*w.recoil,-1.35,1.35);
 // A small consistent drift avoids the old alternating left/right vibration.
 p.recoilShot=(p.recoilShot||0)+1;p.yaw=(p.yaw||0)+(p.aiming?.00035:.0008)*w.recoil;
}
