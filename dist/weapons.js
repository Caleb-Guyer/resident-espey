// The active ammo fields remain on the player for combat. Stored slots are
// committed on switching and saving; old sidearm-only checkpoints migrate here.
export const WEAPONS=Object.freeze({
 sidearm:Object.freeze({id:'sidearm',sightHeight:.083,name:'Sidearm',slot:1,capacity:12,damage:34,head:68,interval:.28,pellets:1,range:24,spread:0,recoil:1,ads:14,emptyReload:1.9,tacticalReload:1.65,muzzle:[0,.054,-.197],port:[.024,.052,-.024]}),
 shotgun:Object.freeze({id:'shotgun',sightHeight:.088,name:'Shotgun',slot:2,capacity:8,damage:17,head:24,interval:.94,pellets:8,range:19,spread:.042,recoil:1.9,ads:9,emptyReload:0,tacticalReload:0,muzzle:[0,.059,-.69],port:[.028,.045,-.085]}),
 carbine:Object.freeze({id:'carbine',sightHeight:.111,name:'Carbine',slot:3,capacity:30,damage:23,head:46,interval:.115,pellets:1,range:32,spread:0,recoil:.65,ads:18,emptyReload:2.45,tacticalReload:2.15,muzzle:[0,.071,-.56],port:[.027,.048,-.11]})
});
export const WEAPON_ORDER=Object.keys(WEAPONS);
export const weaponFor=p=>WEAPONS[p?.weapon]||WEAPONS.sidearm;
const rounds=(n,max)=>Number.isInteger(n)?Math.max(0,Math.min(max,n)):0;
export function ensureInventory(p){
 p.inventory??={sidearm:{ammo:rounds(p.ammo,12),reserve:rounds(p.reserve,999)}};
 if(!p.inventory.sidearm)p.inventory.sidearm={ammo:12,reserve:60};
 if(!WEAPONS[p.weapon]||!p.inventory[p.weapon])p.weapon='sidearm';return p.inventory;
}
export function storeWeapon(p){ensureInventory(p);p.inventory[p.weapon]={ammo:rounds(p.ammo,weaponFor(p).capacity),reserve:rounds(p.reserve,999)};return p.inventory;}
export function restoreInventory(p,source,chapter=0){
 const bag={sidearm:{ammo:rounds(p.ammo,12),reserve:rounds(p.reserve,999)}};
 for(const id of WEAPON_ORDER){const s=source?.slots?.[id];if(s&&Number.isInteger(s.ammo)&&Number.isInteger(s.reserve))bag[id]={ammo:rounds(s.ammo,WEAPONS[id].capacity),reserve:rounds(s.reserve,999)};}
 // Earlier saves may already be past the new weapon pickups.
 if(!source?.slots){if(chapter>=1)bag.shotgun={ammo:8,reserve:16};if(chapter>=2)bag.carbine={ammo:30,reserve:60};}
 p.inventory=bag;p.stashedAmmo={};for(const id of WEAPON_ORDER)p.stashedAmmo[id]=rounds(source?.stash?.[id],999);p.weapon=bag[source?.active]&&WEAPONS[source.active]?source.active:'sidearm';Object.assign(p,bag[p.weapon]);return bag;
}
export function inventorySave(p){storeWeapon(p);return {active:p.weapon,slots:Object.fromEntries(Object.entries(p.inventory).map(([id,s])=>[id,{...s}])),stash:{...p.stashedAmmo}};}
export function switchWeapon(p,id){
 ensureInventory(p);if(!p.inventory[id]||id===p.weapon||p.melee>0||p.dash>0||p.equipping>0)return false;
 storeWeapon(p);p.weapon=id;Object.assign(p,p.inventory[id]);p.reloading=0;p.reloadCues=0;p.focus=p.bloom=0;p.equipping=.36;p.cooldown=Math.max(p.cooldown||0,.36);return true;
}
export function giveWeapon(p,id){
 if(!WEAPONS[id])return false;ensureInventory(p);if(p.inventory[id]){giveAmmo(p,id,WEAPONS[id].capacity);return false;}
 p.inventory[id]={ammo:WEAPONS[id].capacity,reserve:rounds((id==='shotgun'?16:60)+(p.stashedAmmo?.[id]||0),999)};if(p.stashedAmmo)p.stashedAmmo[id]=0;return true;
}
export function giveAmmo(p,id,amount){
 ensureInventory(p);if(!WEAPONS[id])return;
 if(!p.inventory[id]){p.stashedAmmo??={};p.stashedAmmo[id]=rounds((p.stashedAmmo[id]||0)+amount,999);return;}
 if(p.weapon===id)p.reserve=rounds(p.reserve+amount,999);else p.inventory[id].reserve=rounds(p.inventory[id].reserve+amount,999);
}
export function pelletDirection(center,index,count,spread,phase=0){
 if(count===1||spread===0)return center;
 // A stratified disc gives every shell a reliable pattern without a pile of
 // coincident rays; ADS tightens this pattern but never makes it a single slug.
 const a=index*2.3999632297+phase,r=Math.sqrt((index+.5)/count)*spread;
 const right={x:-center.z,z:center.x},rl=Math.hypot(right.x,right.z)||1;
 const x=center.x+right.x/rl*Math.cos(a)*r,y=center.y+Math.sin(a)*r,z=center.z+right.z/rl*Math.cos(a)*r,l=Math.hypot(x,y,z);return {x:x/l,y:y/l,z:z/l};
}
export function bulletDamage(w,hit){const falloff=w.id==='shotgun'?Math.max(.24,Math.min(1,1-(hit.distance-5)/18)):1;return (hit.headshot?w.head:w.damage)*falloff;}
