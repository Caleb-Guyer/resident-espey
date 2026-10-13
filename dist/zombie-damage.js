// Region damage is accumulated per trigger pull, including every shotgun pellet.
// Identity determines resilience; retrying a checkpoint never rerolls it.
export const ZOMBIE_KINDS=Object.freeze(['walker','runner','zsiga','crawler','spitter','brute','stalker','screamer','bulwark','feral']);
export const REGIONS=Object.freeze(['torso','head','leftArm','rightArm','leftLeg','rightLeg']);
export const isZombie=kind=>ZOMBIE_KINDS.includes(kind);
export function zombieSeed(kind,id,chapter=0){let h=2166136261;for(const c of `${chapter}/${id}/${kind}`)h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;return h>>>0;}
export function initializeZombie(e,chapter=0){
 if(!isZombie(e.kind))return;
 const seed=zombieSeed(e.kind,e.id,chapter),variant=['wasted','fresh','resilient'][seed%3],factor=variant==='resilient'?1.16:variant==='wasted'?.94:1;
 e.max=Math.round(e.max*factor);e.hp=e.max;
 e.zombie={seed,variant,headlessEligible:seed%20===0,damage:[0,0,0,0,0,0],severed:[false,false,false,false,false,false]};
}
export function regionThreshold(e,index){const heavy=e.kind==='brute'?1.6:e.kind==='bulwark'?1.25:1,resilience=e.zombie?.variant==='resilient'?1.12:1;return (index===1?155:index<4?90:66)*heavy*resilience;}
export function damageZombie(e,regions,total){
 const z=e.zombie;if(!z)return {severed:[],fatal:false};const severed=[];
 for(let i=1;i<6;i++){
  const value=regions?.[i];if(z.severed[i]||!Number.isFinite(value)||value<=0)continue;
  z.damage[i]+=value;
  if(z.damage[i]>=regionThreshold(e,i)){z.severed[i]=true;severed.push(REGIONS[i]);}
 }
 // A headless infected remains mortal. Its body can still be killed normally.
 const fatal=severed.includes('head')&&!z.headlessEligible;
 if(severed.includes('head')&&z.headlessEligible)e.hp=Math.max(e.hp,total+Math.max(40,e.max*.28));
 if(severed.length){e.windup=e.charge=e.strike=0;e.attack=null;e.comboPattern=null;e.recover=.65;e.stagger=.65;e.cool=Math.max(1,e.cool||0);}
 return {severed,fatal};
}
export function zombieMobility(e){
 const s=e.zombie?.severed;if(!s)return 1;
 if(s[4]&&s[5])return .24;if(s[4]||s[5])return .46;
 return s[1]?.72:1;
}
export function zombieAttack(e){const s=e.zombie?.severed;return s&&(s[4]||s[5]||s[1]||s[2]&&s[3])?'bite':null;}
export function saveZombie(e){return {id:e.id,kind:e.kind,hp:e.hp,damage:e.zombie.damage.slice(),severed:e.zombie.severed.slice(),position:[e.x,e.z]};}
export function restoreZombie(e,s,canStand=()=>false){
 if(!e.zombie||!s||s.kind!==e.kind||s.id!==e.id||!Number.isFinite(s.hp)||s.hp<=0)return false;
 const z=e.zombie;
 for(let i=1;i<6;i++){z.damage[i]=Number.isFinite(s.damage?.[i])?Math.max(0,Math.min(regionThreshold(e,i),s.damage[i])):0;z.severed[i]=s.severed?.[i]===true&&z.damage[i]>=regionThreshold(e,i);}
 // A forged save cannot create an ordinary, living decapitated zombie.
 if(z.severed[1]&&!z.headlessEligible){z.severed[1]=false;z.damage[1]=0;}
 e.hp=Math.min(e.max,s.hp);
 if(Array.isArray(s.position)&&s.position.length===2&&s.position.every(Number.isFinite)&&canStand(...s.position))[e.x,e.z]=s.position;
 return true;
}
