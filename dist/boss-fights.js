// Encounter rules stay independent of graphics and input so phases and save
// restoration share the same rules. Patterns include real, telegraphed combos.
const phase=(threshold,patterns,options={})=>({threshold,patterns,...options});
export const BOSS_FIGHTS=Object.freeze({
 chris:{health:1800,phases:[
  phase(1,[['rush'],['rake']]),
  phase(.82,[['rush','backhand'],['rake','backhand']]),
  phase(.62,[['groundtear'],['rush','rake']],{beat:'chris-break'}),
  phase(.40,[['rush','rush'],['groundtear','backhand']]),
  phase(.18,[['rush','rush','rake'],['groundtear','rush']],{speed:1.24})]},
 jakob:{health:2200,phases:[
  phase(1,[['jakob'],['bobby']]),
  phase(.80,[['jakob','bobby'],['bobby','wrath']]),
  phase(.58,[['pursue']],{chase:true,speed:1.65}),
  phase(.46,[['revenge','backhand'],['wrath','revenge']],{speed:1.28}),
  phase(.20,[['revenge','revenge','backhand'],['wrath','revenge']],{speed:1.42})]},
 zeb:{health:2800,phases:[
  phase(1,[['bile'],['rupture']]),
  phase(.82,[['bile','bile'],['rupture','siphon']]),
  phase(.62,[['deluge'],['rupture','bile']],{beat:'zeb-rupture'}),
  phase(.40,[['deluge','rupture'],['siphon','bile']]),
  phase(.18,[['rupture','rupture'],['deluge','siphon']],{speed:1.15})]},
 birdy:{health:1500,phases:[
  phase(1,[['swoop'],['gale']]),
  phase(.80,[['gale','swoop'],['crosswind']]),
  phase(.58,[['skydive','gale'],['crosswind','swoop']],{beat:'birdy-left'}),
  phase(.36,[['groundRush'],['talons','talons']],{beat:'birdy-break',grounded:true,speed:1.25}),
  phase(.15,[['groundRush','groundRush'],['scream','talons','groundRush']],{grounded:true,speed:1.40})]}
});
export const isBoss=kind=>Object.hasOwn(BOSS_FIGHTS,kind);
export function desiredPhase(e){
 const fight=BOSS_FIGHTS[e.kind];if(!fight)return 0;
 const ratio=e.hp/e.max;let phase=0;for(let i=1;i<fight.phases.length;i++)if(ratio<=fight.phases[i].threshold)phase=i;
 if(e.kind==='jakob')phase=e.bobbyCrushed?Math.max(3,phase):Math.min(2,phase);
 return Math.max(e.phase||0,phase);
}
export const phaseRule=e=>BOSS_FIGHTS[e.kind]?.phases[Math.min(4,e.phase||0)];
export function encounterPattern(e,dist){
 const rule=phaseRule(e);if(!rule)return null;
 const n=e.patternCount??e.attackCount??0;if(e.kind==='chris'&&dist<2.2&&e.phase===0)return rule.patterns[1];
 return rule.patterns[n%rule.patterns.length];
}
export function encounterDamage(e,damage){
 const fight=BOSS_FIGHTS[e.kind];if(fight&&!(e.stageResolved>0)){
  const next=fight.phases[(e.phase||0)+1],floor=next?e.max*next.threshold+.01:1;
  damage=Math.min(damage,Math.max(0,e.hp-floor));
 }
 // The twins must be separated by Ethan's trap; shooting cannot skip the chase.
 if(e.kind==='jakob'&&!e.bobbyCrushed)return Math.min(damage,Math.max(0,e.hp-e.max*.58));
 return damage;
}
export function crushBobby(e){
 if(e.kind!=='jakob'||e.dead||e.bobbyCrushed||(e.phase||0)!==2)return false;
 e.bobbyCrushed=true;e.hp=Math.min(e.hp,e.max*.46);e.windup=e.charge=0;e.attack=null;e.comboPattern=null;e.cool=2.4;e.recover=2.4;e.stagger=0;return true;
}
export function saveBossProgress(e){return {id:e.id,kind:e.kind,hp:e.hp,max:e.max,phase:e.phase||0,position:[e.x,e.z],alert:!!e.alert,stageResolved:e.stageResolved||0,bobbyCrushed:!!e.bobbyCrushed,summoned:!!e.summoned,beatsDone:[...(e.beatsDone||[])],ventCool:e.ventCool||0,purged:e.purged||0};}
export function restoreBossProgress(e,s,canStand=()=>true){
 if(!s||s.kind!==e.kind||!Number.isFinite(s.hp)||!Number.isFinite(s.max)||s.max<=0)return false;
 e.hp=Math.max(1,Math.min(e.max,s.hp/s.max*e.max));e.phase=Number.isInteger(s.phase)?Math.max(0,Math.min(4,s.phase)):0;e.bobbyCrushed=e.kind==='jakob'&&s.bobbyCrushed===true;
 e.stageResolved=Math.max(0,Math.min(50,Number(s.stageResolved)||0));e.summoned=s.summoned===true;if(e.kind==='jakob'&&!e.bobbyCrushed)e.phase=Math.min(2,e.phase);e.phase=desiredPhase(e);e.beatsDone=new Set((Array.isArray(s.beatsDone)?s.beatsDone:[]).filter(n=>['chris-break','zeb-rupture','birdy-left','birdy-break','crusher'].includes(n)));e.ventCool=Math.max(0,Math.min(20,Number(s.ventCool)||0));e.purged=Math.max(0,Math.min(20,Number(s.purged)||0));
 if(Array.isArray(s.position)&&s.position.length===2&&s.position.every(Number.isFinite)&&canStand(...s.position))[e.x,e.z]=s.position;e.alert=s.alert===true||e.alert||e.phase>0||e.hp<e.max;return true;
}
