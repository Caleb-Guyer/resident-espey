// Attack decisions are deterministic and independent of rendering. Targets are
// committed at the start of a tell: dodging never causes a charge to turn around.
export const ATTACKS=Object.freeze({
 bite:{tell:.58,recover:.72,cool:1.35,radius:1.55,damage:1},
 pounce:{tell:.52,recover:.9,cool:2.7,dash:8.5,duration:.48,radius:1.5,damage:1.1},
 crawl:{tell:.65,recover:1.1,cool:3,dash:7,duration:.48,radius:1.4,damage:1},
 acid:{tell:1,recover:.8,cool:3.8,projectile:'acid',shots:1,speed:7.5,damage:.9},
 crush:{tell:1.25,recover:1.65,cool:4,radius:2.9,damage:1.4},
 stalk:{tell:.78,recover:1.2,cool:3.8,dash:10,duration:.48,radius:1.8,damage:1.25},
 rush:{tell:1.15,recover:1.1,wallRecover:2.8,cool:4.1,dash:13,duration:.75,radius:1.85,damage:1.4},
 rake:{tell:.9,recover:1.5,cool:3.4,radius:3.1,cone:.55,damage:1.2},
 jakob:{tell:1.25,recover:1.6,cool:4.4,projectile:'echo',shots:5,speed:6.5,damage:1},
 bobby:{tell:1.05,recover:1.9,wallRecover:2.4,cool:4.3,dash:11,duration:.65,radius:2,damage:1.35},
 rupture:{tell:1.55,recover:2.1,cool:5.2,wave:6.2,damage:1.3},
 bile:{tell:1.4,recover:1.4,cool:4.6,projectile:'acid',shots:3,speed:6,damage:1},
 swoop:{tell:1.25,recover:2,wallRecover:2.3,cool:4.5,dash:10,duration:.7,radius:1.7,damage:1.3},
 gale:{tell:1.4,recover:1.7,cool:4.8,projectile:'feather',shots:5,speed:8,damage:1}
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bosses=new Set(['chris','jakob','zeb','birdy']);
export function phaseFor(e){return bosses.has(e.kind)&&e.hp/e.max<.55?1:0;}
export function chooseAttack(e,dist){
 const n=e.attackCount||0;
 switch(e.kind){
  case 'chris':return dist<2.2||n%3===2?'rake':'rush';
  case 'jakob':return n%2===0?'jakob':'bobby';
  case 'zeb':return (dist<3.2&&n%2===0)||n%3===2?'rupture':'bile';
  case 'birdy':return n%2===0?'swoop':'gale';
  case 'spitter':return 'acid';
  case 'brute':return 'crush';
  case 'crawler':return 'crawl';
  case 'stalker':return 'stalk';
  case 'runner':case 'zsiga':return dist>2.3?'pounce':'bite';
  default:return 'bite';
 }
}
export function attackReach(e){return bosses.has(e.kind)?11:e.kind==='spitter'?12:['stalker','crawler','runner','zsiga'].includes(e.kind)?5:e.kind==='brute'?3.1:e.range;}
export function beginAttack(e,player){
 const name=chooseAttack(e,distance(e,player)),a=ATTACKS[name],dx=player.x-e.x,dz=player.z-e.z,len=Math.hypot(dx,dz)||1;
 e.attack=name;e.windup=a.tell;e.attackTime=0;e.targetX=player.x;e.targetZ=player.z;e.chargeX=dx/len;e.chargeZ=dz/len;
 e.activeHead=name==='bobby'?1:0;e.cool=a.cool*(phaseFor(e)?.8:1);e.attackCount=(e.attackCount||0)+1;e.strike=0;e.interruptHits=0;
 return {type:'tell',name,attack:a};
}
export function interruptAttack(e,headshot,head){
 if(!headshot||!(e.windup>0)||!['birdy','brute','jakob','spitter'].includes(e.kind))return false;
 if(e.kind==='jakob'&&Number.isInteger(head)&&head!==e.activeHead)return false;
 e.interruptHits=(e.interruptHits||0)+1;
 if(e.interruptHits<(e.kind==='brute'?2:1))return false;
 e.windup=0;e.charge=0;e.recover=1.8;e.stagger=.8;e.exposed=1.8;e.attack=null;return true;
}
export function damageScale(e,headshot=false){
 if(e.recover>0&&(bosses.has(e.kind)||e.kind==='brute'))return 1.35;
 if(e.kind==='zeb'&&!headshot)return .62;
 if(e.kind==='brute'&&!headshot)return .7;
 return 1;
}
export function stepEnemy(e,dt,context){
 const events=[],p=context.player,dist=distance(e,p),phase=phaseFor(e);
 e.cool=Math.max(0,(e.cool||0)-dt);e.strike=Math.max(0,(e.strike||0)-dt);e.stagger=Math.max(0,(e.stagger||0)-dt);e.exposed=Math.max(0,(e.exposed||0)-dt);
 if(phase!==e.phase){e.phase=phase;events.push({type:'phase',phase});}
 if(e.recover>0){e.recover=Math.max(0,e.recover-dt);return {mode:'hold',events};}
 if(e.windup>0){
  e.attackTime+=dt;e.windup=Math.max(0,e.windup-dt);
  if(e.windup===0){const a=ATTACKS[e.attack];events.push({type:'release',name:e.attack,attack:a});e.strike=.4;
   if(a.dash){e.charge=a.duration;e.hitCharge=false;return {mode:'charge',speed:a.dash,events};}
   e.recover=a.recover;
  }
  return {mode:'hold',events};
 }
 if(e.charge>0){
  const a=ATTACKS[e.attack];e.charge=Math.max(0,e.charge-dt);
  if(context.wallHit||e.charge===0){e.charge=0;e.recover=context.wallHit?(a.wallRecover||a.recover):a.recover;e.exposed=e.recover;events.push({type:context.wallHit?'wall':'recover'});return {mode:'hold',events};}
  return {mode:'charge',speed:a.dash,events};
 }
 if(e.stagger>0)return {mode:'hold',events};
 if(e.cool===0&&dist<attackReach(e)&&context.visible){events.push(beginAttack(e,p));return {mode:'hold',events};}
 if(e.kind==='spitter'&&context.visible)return {mode:dist<4?'retreat':dist>8?'chase':'strafe',events};
 return {mode:dist>e.range*.8?'chase':'hold',events};
}
