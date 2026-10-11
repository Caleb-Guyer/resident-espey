export const MAGAZINE_SIZE=12;
export function beginReload(p){
 if(p.reloading>0||p.ammo>=MAGAZINE_SIZE||p.reserve<=0)return false;
 p.reloadDuration=p.ammo===0?1.9:1.65;p.reloading=p.reloadDuration;p.reloadCues=0;p.reloadEmpty=p.ammo===0;return true;
}
export function reloadProgress(p){return p.reloading>0?Math.max(0,Math.min(1,1-p.reloading/(p.reloadDuration||1.65))):0;}
export function advanceReload(p,dt,cue=()=>{}){
 if(!(p.reloading>0)||!Number.isFinite(dt))return false;
 const before=reloadProgress(p);p.reloading=Math.max(0,p.reloading-Math.max(0,dt));
 const progress=p.reloading>0?reloadProgress(p):1;
 for(const [i,at,sound]of [[0,.12,'magOut'],[1,.63,'magIn'],[2,.88,'chamber']])if(before<at&&progress>=at&&!(p.reloadCues&(1<<i))){p.reloadCues|=1<<i;cue(sound);}
 if(p.reloading===0){const rounds=Math.min(MAGAZINE_SIZE-p.ammo,p.reserve);p.ammo+=rounds;p.reserve-=rounds;p.reloadCues=0;return true;}
 return false;
}
export function cancelReload(p){const active=p.reloading>0;p.reloading=0;p.reloadCues=0;return active;}
