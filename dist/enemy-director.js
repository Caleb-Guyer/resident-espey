import {isBoss,desiredPhase,encounterPattern,phaseRule} from './boss-fights.js?v=4.7.1';
// Targets commit during a readable tell. Every combo has a fresh warning and a
// dodge window; a wall collision cancels the combo and exposes the creature.
export const ATTACKS=Object.freeze({
 bite:{tell:.58,recover:.72,cool:1.35,radius:1.55,damage:1},
 pounce:{tell:.52,recover:.9,cool:2.7,dash:8.5,duration:.48,radius:1.5,damage:1.1},
 crawl:{tell:.65,recover:1.1,cool:3,dash:7,duration:.48,radius:1.4,damage:1},
 acid:{tell:1,recover:.8,cool:3.8,projectile:'acid',shots:1,speed:7.5,damage:.9},
 crush:{tell:1.25,recover:1.65,cool:4,radius:2.9,damage:1.4},
 stalk:{tell:.78,recover:1.2,cool:3.8,dash:10,duration:.48,radius:1.8,damage:1.25},
 rush:{tell:1.15,recover:1.1,wallRecover:2.8,cool:4.1,dash:13,duration:.75,radius:1.85,damage:1.4},
 rake:{tell:.9,recover:1.5,cool:3.4,radius:3.1,cone:.55,damage:1.2},
 backhand:{tell:.78,recover:.85,cool:3,radius:2.65,cone:.25,damage:.9},
 groundtear:{tell:1.4,recover:2.2,cool:4.8,wave:6.5,damage:1.05},
 jakob:{tell:1.25,recover:1.6,cool:4.4,projectile:'echo',shots:5,speed:6.5,damage:1},
 bobby:{tell:1.05,recover:1.9,wallRecover:2.4,cool:4.3,dash:11,duration:.65,radius:2,damage:1.35},
 wrath:{tell:1.12,recover:1.5,cool:4.2,projectile:'echo',shots:7,speed:8,damage:.85,spread:.18},
 pursue:{tell:.85,recover:.65,wallRecover:1.8,cool:2.8,dash:10.5,duration:.6,radius:1.8,damage:.9},
 revenge:{tell:.98,recover:1.2,wallRecover:3,cool:3.8,dash:14,duration:.8,radius:1.9,damage:1.25},
 rupture:{tell:1.55,recover:2.1,cool:5.2,wave:6.2,damage:1.3},
 bile:{tell:1.4,recover:1.4,cool:4.6,projectile:'acid',shots:3,speed:6,damage:1},
 deluge:{tell:1.65,recover:2.1,cool:5.4,projectile:'acid',shots:7,speed:6.8,damage:.8,spread:.23},
 siphon:{tell:2.4,recover:2.4,cool:8.5,heal:.035,wave:3.3,damage:.5},
 swoop:{tell:1.25,recover:2,wallRecover:2.3,cool:4.5,dash:10,duration:.7,radius:1.7,damage:1.3},
 skydive:{tell:1.35,recover:2.1,wallRecover:3,cool:4.8,dash:13,duration:.85,radius:1.85,damage:1.25},
 gale:{tell:1.4,recover:1.7,cool:4.8,projectile:'feather',shots:5,speed:8,damage:1},
 crosswind:{tell:1.55,recover:1.8,cool:4.5,projectile:'feather',shots:11,speed:7.5,damage:.8,radial:true},
 groundRush:{tell:1.05,recover:1.35,wallRecover:3,cool:4.1,dash:14,duration:.72,radius:1.8,damage:1.2},
 talons:{tell:.85,recover:.7,cool:3.8,radius:2.4,cone:.3,damage:.85},
 scream:{tell:1.35,recover:1,cool:4,wave:4.2,damage:.45}
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const phaseFor=desiredPhase;
export const enemyRadius=e=>e.kind==='zeb'?.72:e.kind==='brute'?.5:.4;
export function navigationGoal(grid,target,canReach=()=>true,tile=2.4){
 const cx=Math.floor(target.x/tile),cz=Math.floor(target.z/tile);if(grid[cz]?.[cx]===0)return target;let best=null,score=Infinity;
 for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++){if(grid[z]?.[x]!==0)continue;const p={x:(x+.5)*tile,z:(z+.5)*tile},d=(p.x-target.x)**2+(p.z-target.z)**2;if(d<score&&canReach(p,target)){score=d;best=p;}}return best;
}
export function chooseAttack(e,dist){
 const rule=encounterPattern(e,dist);if(rule)return rule[0];
 switch(e.kind){case 'spitter':return 'acid';case 'brute':return 'crush';case 'crawler':return 'crawl';case 'stalker':return 'stalk';case 'runner':case 'zsiga':return dist>2.3?'pounce':'bite';default:return 'bite';}
}
export function attackReach(e){return isBoss(e.kind)?e.phase===2&&e.kind==='jakob'?8:12:e.kind==='spitter'?12:['stalker','crawler','runner','zsiga'].includes(e.kind)?5:e.kind==='brute'?3.1:e.range;}
export function beginAttack(e,player){
 let name;
 if(e.comboPattern&&e.comboStep<e.comboPattern.length)name=e.comboPattern[e.comboStep++];
 else {e.comboPattern=encounterPattern(e,distance(e,player));e.comboStep=1;name=e.comboPattern?.[0]||chooseAttack(e,distance(e,player));e.patternCount=(e.patternCount||0)+1;}
 const a=ATTACKS[name],dx=player.x-e.x,dz=player.z-e.z,len=Math.hypot(dx,dz)||1;
 e.attack=name;e.tellDuration=a.tell*(isBoss(e.kind)&&e.phase>=3?.9:1);e.windup=e.tellDuration;e.attackTime=0;e.targetX=player.x;e.targetZ=player.z;e.chargeX=dx/len;e.chargeZ=dz/len;
 e.activeHead=e.bobbyCrushed?0:name==='bobby'||name==='pursue'?1:0;e.cool=a.cool*(isBoss(e.kind)?Math.max(.75,1-(e.phase||0)*.055):1);e.attackCount=(e.attackCount||0)+1;e.strike=0;e.interruptHits=0;
 return {type:'tell',name,attack:a};
}
export function interruptAttack(e,headshot,head){
 if(!headshot||!(e.windup>0)||!(['birdy','brute','jakob','spitter'].includes(e.kind)||e.kind==='zeb'&&e.attack==='siphon'))return false;
 if(e.kind==='jakob'&&Number.isInteger(head)&&head!==e.activeHead)return false;
 e.interruptHits=(e.interruptHits||0)+1;if(e.interruptHits<(e.kind==='brute'||e.kind==='birdy'&&e.phase>=3?2:1))return false;
 if(isBoss(e.kind))e.stageResolved=(e.stageResolved||0)+1;
 e.windup=0;e.charge=0;e.recover=1.8;e.stagger=.8;e.exposed=1.8;e.attack=null;e.comboPattern=null;return true;
}
export function damageScale(e,headshot=false){
 if(e.exposed>0)return isBoss(e.kind)?1.8:1.35;
 if(e.recover>0&&(isBoss(e.kind)||e.kind==='brute'))return 1.35;
 if(e.kind==='zeb'&&!headshot)return e.phase>=2?.82:.62;
 if(e.kind==='chris'&&!headshot&&e.phase<2)return .68;
 if(e.kind==='brute'&&!headshot)return .7;return 1;
}
export function stepEnemy(e,dt,context){
 const events=[],p=context.player,dist=distance(e,p),phase=phaseFor(e);
 for(const key of ['cool','strike','stagger','exposed','ventCool','purged'])e[key]=Math.max(0,(e[key]||0)-dt);
 if(phase>e.phase){e.phase=Math.min(phase,e.phase+1);e.stageResolved=0;e.guardNotified=false;e.windup=e.charge=0;e.attack=null;e.comboPattern=null;e.recover=2.1;e.cool=2.4;events.push({type:'phase',phase:e.phase,rule:phaseRule(e)});return {mode:'hold',events};}
 if(e.recover>0){e.recover=Math.max(0,e.recover-dt);return {mode:'hold',events};}
 if(e.windup>0){
  e.attackTime+=dt;e.windup=Math.max(0,e.windup-dt);
  if(e.windup===0){const a=ATTACKS[e.attack];if(isBoss(e.kind))e.stageResolved=(e.stageResolved||0)+1;events.push({type:'release',name:e.attack,attack:a});e.strike=.4;
   if(e.comboPattern&&e.comboStep<e.comboPattern.length)e.cool=(a.dash?a.duration:0)+a.recover+.36;
   if(a.dash){e.charge=a.duration;e.hitCharge=false;return {mode:'charge',speed:a.dash,events};}e.recover=a.recover;
  }return {mode:'hold',events};
 }
 if(e.charge>0){
  const a=ATTACKS[e.attack];e.charge=Math.max(0,e.charge-dt);
  if(context.wallHit||e.charge===0){e.charge=0;e.recover=context.wallHit?(a.wallRecover||a.recover):a.recover;e.exposed=e.recover;
   if(context.wallHit){e.comboPattern=null;e.cool=e.recover+1.2;}events.push({type:context.wallHit?'wall':'recover'});return {mode:'hold',events};}
  return {mode:'charge',speed:a.dash,events};
 }
 if(e.stagger>0)return {mode:'hold',events};
 if(e.cool===0&&dist<attackReach(e)&&context.visible){events.push(beginAttack(e,p));return {mode:'hold',events};}
 if(e.kind==='spitter'&&context.visible)return {mode:dist<4?'retreat':dist>8?'chase':'strafe',events};
 return {mode:dist>e.range*.8?'chase':'hold',speedScale:phaseRule(e)?.speed||1+(e.phase||0)*.04,events};
}
