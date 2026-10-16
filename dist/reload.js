import {weaponFor} from './weapons.js?v=5.5.1';
export const MAGAZINE_SIZE=12;
export function beginReload(p){
 const w=weaponFor(p);if(p.reloading>0||p.ammo>=w.capacity||p.reserve<=0||p.equipping>0)return false;
 p.reloadEmpty=p.ammo===0;p.reloadStartAmmo=p.ammo;p.reloadShells=Math.min(w.capacity-p.ammo,p.reserve);p.shellsInserted=0;p.reloadCommitted=false;
 p.reloadDuration=w.id==='shotgun'?.45+p.reloadShells*.62+(p.reloadEmpty?.45:.18):p.reloadEmpty?w.emptyReload:w.tacticalReload;p.reloading=p.reloadDuration;p.reloadCues=0;return true;
}
export function reloadProgress(p){return p.reloading>0?Math.max(0,Math.min(1,1-p.reloading/(p.reloadDuration||1.65))):0;}
export function advanceReload(p,dt,cue=()=>{}){
 if(!(p.reloading>0)||!Number.isFinite(dt))return false;
 const before=reloadProgress(p);p.reloading=Math.max(0,p.reloading-Math.max(0,dt));
 const progress=p.reloading>0?reloadProgress(p):1;
 if(weaponFor(p).id==='shotgun'){
  const elapsed=p.reloadDuration-p.reloading,inserted=Math.min(p.reloadShells,Math.max(0,Math.floor((elapsed-.45)/.62)));
  while((p.shellsInserted||0)<inserted&&p.reserve>0){p.ammo++;p.reserve--;p.shellsInserted=(p.shellsInserted||0)+1;cue('shellIn');}
  if(p.reloading===0){if(p.reloadEmpty)cue('pump');p.reloadCues=0;return true;}return false;
 }
 for(const [i,at,sound]of [[0,.12,'magOut'],[1,.63,'magIn'],[2,.88,'chamber']])if(before<at&&progress>=at&&!(p.reloadCues&(1<<i))){p.reloadCues|=1<<i;cue(sound);}
 // Seating the magazine commits its rounds. A dodge or weapon switch after
 // this point cannot undo an inserted magazine or debit the reserve twice.
 if(progress>=.63&&!p.reloadCommitted){const rounds=Math.min(weaponFor(p).capacity-p.ammo,p.reserve);p.ammo+=rounds;p.reserve-=rounds;p.reloadCommitted=true;}
 if(p.reloading===0){p.reloadCues=0;return true;}
 return false;
}
export function cancelReload(p){const active=p.reloading>0;p.reloading=0;p.reloadCues=0;return active;}
