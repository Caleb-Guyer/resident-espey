import {BOSS_PROFILES} from './boss-models.js?v=5.4.0';
import {attackMotion} from './combat-motion.js?v=5.4.0';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
export function plantBossFoot(leg,p,phase,walk,lift=.055,stride=.14){
 const calf=leg.userData.calf,ankle=calf.userData.ankle;if(!ankle)return;const a=Math.hypot(calf.position.y,calf.position.z),b=Math.hypot(ankle[1],ankle[2]),upperRest=-Math.atan2(calf.position.z,-calf.position.y),lowerRest=-Math.atan2(ankle[2],-ankle[1]),swing=Math.max(0,Math.sin(phase))*walk;
 leg.position.y=p.hip-.022*walk;const y=p.hip*.09+swing*lift,z=.035-Math.cos(phase)*stride*walk,dy=leg.position.y-y,distance=Math.max(.02,Math.min(a+b-.00001,Math.hypot(dy,z))),angle=Math.acos(Math.max(-1,Math.min(1,(a*a+distance*distance-b*b)/(2*a*distance)))),bend=Math.PI-Math.acos(Math.max(-1,Math.min(1,(a*a+b*b-distance*distance)/(2*a*b)))),upper=-Math.atan2(z,dy)-angle;
 leg.rotation.set(upper-upperRest,0,0);calf.rotation.set(bend-(lowerRest-upperRest),0,0);
}
export function animateBoss(g,t,moving,mood={}){
 const d=g.userData,kind=d.kind,p=BOSS_PROFILES[kind],seed=d.phase||0,pace=kind==='chris'?6.8:kind==='zeb'?2.7:kind==='birdy'?4.2:4.4,breathe=Math.sin(t*1.65+seed);
 const elapsed=Number.isFinite(d.gaitTime)?Math.max(0,Math.min(.1,t-d.gaitTime)):1/60;d.gaitTime=t;
 const target=moving?1:0;d.gaitBlend=(d.gaitBlend||0)+(target-(d.gaitBlend||0))*(1-Math.exp(-elapsed*9));
 d.gaitCycle=(d.gaitCycle??seed)+elapsed*pace*(mood.charge>0?1.8:1)*d.gaitBlend;const cycle=d.gaitCycle,walk=d.gaitBlend;
 g.position.y=0;g.rotation.x=0;g.rotation.z=0;d.body.position.y=p.spine+(kind==='zeb'?.007:.003)*breathe-(kind==='zeb'?.025:.010)*Math.abs(Math.sin(cycle))*walk;d.body.rotation.set(kind==='birdy'?.12:kind==='chris'?.16:.045,0,Math.sin(cycle)*walk*.022);d.body.scale.set(1+breathe*.0025,1,1+breathe*.004);
 d.spines.forEach((s,i)=>{if(s===d.body)return;s.rotation.set(.04+Math.sin(t*1.9+i)*.024,Math.sin(t*.9+i)*.035,(i?1:-1)*.035);});
 d.heads.forEach((h,i)=>{h.scale.set(1,1,1);h.position.y=h.userData.restHeadY??h.position.y;h.rotation.set(kind==='birdy'?-.12:-.06,Math.sin(t*.6+seed+i)*.045,kind==='chris'?-.1:kind==='jakob'?(i?-.075:.075):Math.sin(t*.8+seed)*.012);});
 d.eyes?.flat().forEach((eye,i)=>{const phase=(t+seed*.13+i*.007)%4.9,blink=phase<.15?Math.sin(phase/.15*Math.PI):0,lid=eye.userData.lid;if(lid){lid.position.y=.016*(1-blink);lid.scale.y=.006+.008*blink;}for(const part of[eye.userData.iris,eye.userData.pupil])if(part){part.position.x=Math.sin(t*.67+seed)*.0010;part.position.y=Math.sin(t*.47+i*.09)*.0008;}});
 d.body.position.y-=walk*.010;
 d.legs.forEach((l,i)=>plantBossFoot(l,p,cycle+(i%2)*Math.PI+(i>1?.65:0),d.gaitBlend,kind==='zeb'?.036:.055,kind==='zeb'?.11:.14));
 d.arms.forEach((a,i)=>{a.rotation.set((kind==='birdy'?.10:kind==='chris'&&i===1?.07:-.1)+Math.sin(cycle+(i%2)*Math.PI)*walk*(kind==='zeb'?.08:.16),0,(i%2?1:-1)*(kind==='zeb'?.07:.03));a.userData.forearm.rotation.set(-.10+Math.sin(t*.8+i)*.018,0,0);});
 const motion=attackMotion(mood,d.motion||=( {} )),{wind,strike:swing,follow,recover}=motion;
 let mouth=.045+(breathe+1)*.013;
 if(kind==='chris'){
  if(mood.attack==='rush'){d.body.rotation.x-=.34*wind;d.arms[1].rotation.x-=1.3*wind;d.arms[1].userData.forearm.rotation.x-=.5*wind;d.head.rotation.x+=wind*.09;mouth+=wind*.18;}
  if(mood.charge>0){const run=motion.charge;d.body.rotation.x+=run*.24;d.head.rotation.x-=run*.26;d.arms.forEach((arm,i)=>{arm.rotation.x-=run*(i?1.08:.65);arm.userData.forearm.rotation.x-=run*.12;});d.legs.forEach((l,i)=>plantBossFoot(l,p,cycle+i*Math.PI,walk,.09,.24));mouth+=run*.20;}
  if(['rake','backhand'].includes(mood.attack)){const back=mood.attack==='backhand'?-1:1;d.arms[1].rotation.x-=wind*1.15+follow*.55;d.arms[1].rotation.z+=back*(-wind*.65+follow*.72);d.arms[1].userData.forearm.rotation.x-=wind*.3+follow*.12;d.body.rotation.y+=back*(-wind*.20+follow*.26);d.head.rotation.y-=back*follow*.12;}
 }else if(kind==='jakob'){
  const lead=mood.activeHead||0;d.spines.forEach((s,i)=>{const active=i===lead;s.rotation.y+=(active?-1:1)*wind*.12;s.rotation.x-=active?wind*.12:0;d.heads[i].rotation.y+=(i?-.18:.18);d.jaws[i].rotation.x=mouth+(active?wind*.35:wind*.03);d.faces[i].morphTargetInfluences[0]=active?wind*.8:.05;
   for(let j=0;j<2;j++){const arm=d.arms[i*2+j];arm.rotation.x-=active?wind*(mood.attack==='bobby'?1.1:.62):wind*.16;arm.userData.forearm.rotation.x-=active?wind*.38:0;}
  });
  if(mood.charge>0){d.body.rotation.x=.28;d.heads[1].rotation.x=-.3;d.arms.slice(2).forEach(arm=>arm.rotation.x=-1.15);d.heads[0].rotation.z=.27;}
  d.spines.forEach((s,i)=>{const active=i===lead;s.rotation.y+=(active?1:-1)*follow*.16;s.rotation.x+=(active?.12:-.05)*follow;for(let j=0;j<2;j++){const arm=d.arms[i*2+j];arm.rotation.x-=active?follow*.74:follow*.15;arm.userData.forearm.rotation.x+=active?follow*.16:0;}d.heads[i].rotation.x-=active?follow*.16:0;});
 }else if(kind==='zeb'){
  if(['bile','deluge','siphon'].includes(mood.attack)){d.body.rotation.x-=.14*wind;d.head.rotation.x-=.14*wind;d.head.rotation.x+=follow*.17;d.body.rotation.x+=follow*.20;mouth+=wind*.28+follow*.17;d.arms.forEach(a=>a.rotation.x+=wind*.17-follow*.18);}
  if(['rupture','groundtear'].includes(mood.attack)){d.arms.forEach(a=>{a.rotation.x-=wind*2.05+follow*.32;a.userData.forearm.rotation.x-=wind*.50;});d.body.rotation.x-=wind*.08;d.body.position.y-=follow*.10;d.body.rotation.x+=follow*.30;}
  d.bileSacs?.forEach(s=>s.scale.set(.075,.13*(1+wind*.18+breathe*.035),.055*(1+wind*.18)));
 }else if(kind==='birdy'){
  const foldTarget=mood.wingSpace===false?1.45:.10+recover*.30;d.wingFold=(d.wingFold??foldTarget)+(foldTarget-(d.wingFold??foldTarget))*(1-Math.exp(-elapsed*8));
  const fold=d.wingFold,flap=Math.sin(t*(mood.charge>0?7.5:1.8))*(mood.charge>0?.24:.035);
  d.wings.forEach((w,i)=>{const side=i?1:-1;w.rotation.set(0,side*(fold-follow*.10),side*(.13+flap-wind*.24+follow*.34));d.wingWrists[i].rotation.set(0,side*(.16-motion.charge*.11),side*(Math.sin(t*(mood.charge>0?7.5:1.8)-.4)*.025+follow*.16));});
  if(mood.charge>0){const fly=motion.charge;g.position.y=(.29+Math.sin(t*7.5)*.018)*fly;d.body.rotation.x+=fly*.20;d.head.rotation.x-=fly*.18;d.legs.forEach(l=>{l.rotation.x+=.85*fly;l.userData.calf.rotation.x+=1.22*fly;});d.arms.forEach(a=>a.rotation.x-=.95*fly);mouth+=fly*.2;}
  else if(wind>0){d.head.rotation.x-=wind*.04;mouth+=wind*.19;}
 }
 if(mood.recover>0){const rest=recover*(1-wind)*(1-follow);d.body.rotation.x+=(kind==='zeb'?.14:.18)*rest;d.heads.forEach(h=>h.rotation.x+=.12*rest);mouth*=1-rest*.35;}
 if(mood.stagger>0){const hit=Math.min(.17,mood.stagger*.35);d.body.rotation.z+=(mood.hitSide||1)*hit;d.heads.forEach(h=>h.rotation.x-=hit);}
 if(kind!=='jakob'){d.jaws.forEach(j=>j.rotation.x=mouth);d.faces.forEach(f=>f.morphTargetInfluences[0]=mouth*2);}
 if(mood.intro){
  const time=mood.intro.time;
  if(kind==='chris'){const rise=ease((time-2)/3),notice=ease((time-5)/1.5),roar=Math.sin(clamp((time-7)/2)*Math.PI);d.body.rotation.x=.36*(1-rise)-roar*.04;d.body.rotation.z=-.04*rise;d.arms[1].rotation.x=.05-rise*.4-roar*.12;d.arms[1].userData.forearm.rotation.x-=notice*.16;d.head.rotation.x=.24-.3*rise;d.head.rotation.y=.22*(1-notice);d.jaw.rotation.x=.06+roar*.27;}
  if(kind==='jakob'){d.spines.forEach((s,i)=>{const wake=ease((time-(i?3:1))/2),listen=Math.sin(clamp((time-(i?5:4))/2.5)*Math.PI);s.rotation.x=.30*(1-wake);s.rotation.y=(i?-1:1)*listen*.12;d.heads[i].rotation.x=.6*(1-wake);d.heads[i].rotation.y+=(i?1:-1)*listen*.15;d.heads[i].rotation.z=(i?-.45:.40)*(1-wake);d.jaws[i].rotation.x=.03+(i===0?ease((time-6)/.7):ease((time-8)/.7))*.18;for(let j=0;j<2;j++)d.arms[i*2+j].userData.forearm.rotation.x-=wake*.18;});}
  if(kind==='zeb'){const rise=ease((time-2)/4),slam=Math.sin(clamp((time-7)/1.5)*Math.PI);d.body.position.y-=.16*(1-rise)+slam*.1;d.body.rotation.x+=.22*(1-rise)+slam*.26;d.head.rotation.x-=rise*.12;d.arms.forEach(a=>{a.rotation.x=-2.1*ease((time-5.5)/1.5)*(1-ease((time-7.4)/.45));a.userData.forearm.rotation.x-=.3*ease((time-5.5)/1.5)*(1-ease((time-7.4)/.65));});d.jaw.rotation.x=.09+rise*.13;}
  if(kind==='birdy'){const open=ease((time-3)/3.5),land=ease((time-6)/1.7),compression=Math.sin(clamp((time-6.8)/1.2)*Math.PI);g.position.y=.35*(1-land);d.body.position.y-=compression*.065;d.body.rotation.x=.25*(1-open)+compression*.1;d.head.rotation.z=-.27*(1-open);d.head.rotation.x-=ease((time-8)/1.2)*.10;d.wings.forEach((w,i)=>{w.rotation.y=(i?1:-1)*(1.45*(1-open)+.16*open);w.rotation.z=(i?1:-1)*(.08-.12*open+compression*.08);d.wingWrists[i].rotation.y=(i?1:-1)*.4*(1-ease((time-3.3)/3.5));});d.legs.forEach(l=>{l.rotation.x=.8*(1-land)-compression*.1;l.userData.calf.rotation.x=1.1*(1-land)+compression*.24;});}
 }
 const phase=mood.phase||0,beat=mood.beat;
 if(kind==='chris'){
  if(mood.attack==='groundtear'){d.arms[1].rotation.x-=wind*1.65;d.arms[1].userData.forearm.rotation.x-=wind*.4;d.body.rotation.x+=swing*.32;}
  if(phase>=2)d.arms[1].rotation.z+=.11;if(phase>=4){d.body.rotation.x+=.14;d.head.rotation.z=-.16;}
  if(beat?.id==='chris-break'){const u=ease(beat.time/2.4);d.body.rotation.x=.15+Math.sin(u*Math.PI)*.17;d.arms[1].rotation.x=-1.1*Math.sin(u*Math.PI);d.arms[1].userData.forearm.rotation.z=.22*u;d.jaw.rotation.x=.1+u*.24;}
 }
 if(kind==='jakob'){
  const crushed=beat?.id==='crusher'?ease((beat.time-2.7)/.7):mood.bobbyCrushed?1:0;d.crushedBobby=crushed>.7;
  d.heads[1].scale.set(1-crushed*.2,1-crushed*.84,1-crushed*.16);d.heads[1].position.y=(d.heads[1].userData.restHeadY||.79)-crushed*.10;d.heads[1].rotation.z+=crushed*.28;
  if(crushed){d.jaws[1].rotation.x=.01;d.faces[1].morphTargetInfluences[0]=0;d.arms.slice(2).forEach(a=>{a.rotation.x+=.15*crushed;a.userData.forearm.rotation.x=-.04;});}
  if(mood.bobbyCrushed&&!(beat?.id==='crusher'&&beat.time<4)){d.heads[0].rotation.x-=wind*.20;d.jaws[0].rotation.x=.1+wind*.28;d.faces[0].morphTargetInfluences[0]=wind*.7;}
  if(beat?.id==='crusher'&&beat.time>4){d.heads[0].rotation.x=-.26;d.heads[0].rotation.z=-.15;d.jaws[0].rotation.x=.34;d.faces[0].morphTargetInfluences[0]=.75;d.arms[0].rotation.x=-.8;d.arms[1].rotation.x=-1.2;}
 }
 if(kind==='birdy'){
  // The damaged wings are torn away by Ethan, one at each transition.
  const tearing=beat?.id==='birdy-left'||beat?.id==='birdy-break',side=beat?.id==='birdy-left'?0:1,rip=tearing?ease((beat.time-2.7)/.46):0,torn=phase>=3?2:phase>=2?1:0;
  for(let i=0;i<2;i++){
   const gone=tearing?(i<side||i===side&&rip>.72):i<torn,w=d.wings[i],stump=d.wingStumps[i],loose=d.detachedWings[i];
   w.visible=!gone;stump.visible=gone;d.wingWrists[i].scale.set(gone?.5:1,gone?.66:1,1);
   if(i===side&&tearing){w.rotation.y+=(i?1:-1)*rip*.35;w.position.x=(i?1:-1)*(.22+rip*.24);w.rotation.z+=(i?1:-1)*rip*.30;}else w.position.x=(i?1:-1)*.22;
   if(!loose.userData.landed){loose.visible=gone;loose.scale.setScalar(gone?1:0);const fall=tearing&&i===side?ease((beat.time-3)/1.25):1;loose.position.set((i?1:-1)*(1.0+fall*.4),1.65*(1-fall)+.05,fall*.32);loose.rotation.set(-fall*Math.PI/2,(i?1:-1)*(.10+fall*.30),(i?1:-1)*fall*.18);if(!gone)loose.position.set(0,0,0);}
  }
  if(phase===2){d.wings[1].rotation.z+=.16;d.wingWrists[1].rotation.z+=.30;d.body.rotation.z=-.075;}
  if(phase>=3){g.position.y=0;d.legs.forEach((l,i)=>plantBossFoot(l,p,cycle+i*Math.PI,d.gaitBlend,.052,mood.charge>0?.16:.14));d.body.rotation.x=.23;}
  if(tearing){const u=ease(beat.time/1.1);d.body.position.y-=.20*u;d.body.rotation.x=.18+Math.sin(rip*Math.PI)*.18;d.head.rotation.x=-.10-rip*.27;d.jaw.rotation.x=.05+rip*.37;d.faces[0].morphTargetInfluences[0]=rip*.8;d.arms.forEach(a=>a.rotation.x=-.22);}
  if(['groundRush','scream'].includes(mood.attack)){d.head.rotation.x-=wind*.28;d.jaw.rotation.x=.12+wind*.3;d.faces[0].morphTargetInfluences[0]=wind*.85;}
  if(mood.attack==='talons'){d.arms.forEach((arm,i)=>{arm.rotation.x-=wind*.7+swing*.7;arm.rotation.z+=(i?1:-1)*wind*.3;});}
 }
 if(kind==='zeb'){
  if(phase>=2){d.bileSacs[1].scale.set(.075,.043,.018);d.body.rotation.x+=.08;}
  if(beat?.id==='zeb-rupture'){const u=ease((beat.time-.8)/2);d.bileSacs[1].scale.set(.075,.13*(1-u)+.043*u,.055*(1-u)+.018*u);d.arms.forEach((arm,i)=>arm.rotation.z=(i?1:-1)*(.1+Math.sin(u*Math.PI)*.2));d.jaw.rotation.x=.12+u*.24;}
 }
 if(!mood.intro&&!mood.beat&&!mood.dead&&mood.impact){const s=mood.impact;d.body.rotation.x+=s[0];d.body.rotation.z+=s[1];d.heads[mood.impactHead||0].rotation.x+=s[2];d.arms.forEach((arm,i)=>{arm.rotation.x-=s[i%2?4:3];arm.userData.forearm.rotation.x-=s[i%2?4:3]*.6;});const leg=d.legs[mood.impactLeg||0];leg.rotation.x+=s[5];leg.userData.calf.rotation.x+=s[5]*1.4;}
 if(mood.dead){
  const time=mood.deathTime||0,kneel=ease(time/.65),fall=ease((time-.45)/(kind==='zeb'?1.3:1.05)),settle=Math.sin(Math.min(1,Math.max(0,(time-1.5)/.45))*Math.PI)*.018;
  // Weight gives way before the torso lands; each silhouette settles differently.
  g.position.y=-.13*kneel+.22*fall;d.body.rotation.x+=kneel*.12;
  g.rotation.x=-(kind==='birdy'?1.40:kind==='zeb'?1.30:1.44)*fall;g.rotation.z=(kind==='jakob'?-.21:kind==='chris'?.14:kind==='birdy'?-.10:.06)*fall;
  d.heads.forEach((h,i)=>{h.rotation.x=.22*kneel+.12*fall;h.rotation.z+=(i?-1:1)*fall*.12;});
  d.arms.forEach((arm,i)=>{arm.rotation.x=.18*kneel+.12*fall;arm.rotation.z=(i%2?1:-1)*(.13*kneel+.27*fall);arm.userData.forearm.rotation.x=-.25*kneel+.13*fall;});
  d.legs.forEach((l,i)=>{l.rotation.x=-.18*kneel+(i%2?.15:-.10)*fall;l.userData.calf.rotation.x=.62*kneel-.25*fall;});
  d.body.position.y+=settle;d.jaws.forEach(j=>j.rotation.x=.05+.10*fall);
  if(kind==='birdy')d.wings.forEach((w,i)=>{w.rotation.y=(i?1:-1)*(.4+fall*.5);w.rotation.z=(i?1:-1)*(.1+fall*.3);});
 }
 d.mouthCovers.forEach((cover,i)=>{const face=d.faces[i],artist=!!face.userData.artist,open=d.jaws[i].rotation.x>=.13;if(face.userData.artistDetail)face.userData.artistDetail.morphTargetInfluences[0]=face.morphTargetInfluences[0];cover.visible=!artist&&!open;d.jaws[i].visible=!artist&&open;d.oralParts?.[i]?.forEach(o=>o.visible=!artist&&open);});return g;
}
