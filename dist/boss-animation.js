import {BOSS_PROFILES} from './boss-models.js?v=4.5.1';
import {ATTACKS} from './enemy-director.js?v=4.5.1';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
export function animateBoss(g,t,moving,mood={}){
 const d=g.userData,kind=d.kind,p=BOSS_PROFILES[kind],seed=d.phase||0,pace=kind==='chris'?6.8:kind==='zeb'?2.7:kind==='birdy'?4.2:4.4,cycle=t*pace+seed,walk=moving?1:0,breathe=Math.sin(t*1.65+seed);
 g.position.y=0;g.rotation.x=0;g.rotation.z=0;d.body.position.y=p.spine+(kind==='zeb'?.007:.003)*breathe-(kind==='zeb'?.025:.010)*Math.abs(Math.sin(cycle))*walk;d.body.rotation.set(kind==='birdy'?.12:kind==='chris'?.16:.045,0,Math.sin(cycle)*walk*.022);d.body.scale.set(1+breathe*.0025,1,1+breathe*.004);
 d.spines.forEach((s,i)=>{if(s===d.body)return;s.rotation.set(.04+Math.sin(t*1.9+i)*.024,Math.sin(t*.9+i)*.035,(i?1:-1)*.035);});
 d.heads.forEach((h,i)=>{h.scale.set(1,1,1);h.position.y=h.userData.restHeadY??h.position.y;h.rotation.set(kind==='birdy'?-.12:-.06,Math.sin(t*.6+seed+i)*.045,kind==='chris'?-.1:kind==='jakob'?(i?-.075:.075):Math.sin(t*.8+seed)*.012);});
 d.legs.forEach((l,i)=>{const s=Math.sin(cycle+(i%2)*Math.PI+(i>1?.65:0)),heavy=kind==='zeb'?.20:.30;l.rotation.set(s*heavy*walk+(kind==='chris'&&i===1?.1:0),0,0);l.userData.calf.rotation.set(Math.max(0,-s)*.38*walk+(kind==='birdy'?.12:.05),0,0);});
 d.arms.forEach((a,i)=>{a.rotation.set((kind==='birdy'?.10:kind==='chris'&&i===1?.07:-.1)+Math.sin(cycle+(i%2)*Math.PI)*walk*(kind==='zeb'?.08:.16),0,(i%2?1:-1)*(kind==='zeb'?.07:.03));a.userData.forearm.rotation.set(-.10+Math.sin(t*.8+i)*.018,0,0);});
 const a=ATTACKS[mood.attack],u=a?ease((mood.attackTime||0)/(mood.tellDuration||a.tell)):0,wind=mood.windup>0?u:0,swing=mood.strike>0?Math.sin((1-mood.strike/.4)*Math.PI):0;
 let mouth=.045+(breathe+1)*.013;
 if(kind==='chris'){
  if(mood.attack==='rush'&&mood.windup>0){d.body.rotation.x=-.18*wind;d.arms[1].rotation.x=-1.3*wind;d.arms[1].userData.forearm.rotation.x=-.5*wind;d.head.rotation.x=.03;mouth+=wind*.18;}
  if(mood.charge>0){d.body.rotation.x=.40;d.head.rotation.x=-.32;d.arms.forEach((arm,i)=>{arm.rotation.x=i?-1.08:-.65;arm.userData.forearm.rotation.x=-.22;});d.legs.forEach((l,i)=>{l.rotation.x=Math.sin(t*10+i*Math.PI)*.36;l.userData.calf.rotation.x=Math.max(0,-Math.sin(t*10+i*Math.PI))*.48;});mouth=.27;}
  if(['rake','backhand'].includes(mood.attack)){d.arms[1].rotation.x-=wind*1.15+swing*.75;d.arms[1].rotation.z-=wind*.65-swing*1.1;d.body.rotation.y-=wind*.20-swing*.32;}
 }else if(kind==='jakob'){
  const lead=mood.activeHead||0;d.spines.forEach((s,i)=>{const active=i===lead;s.rotation.y+=(active?-1:1)*wind*.12;s.rotation.x-=active?wind*.12:0;d.heads[i].rotation.y+=(i?-.18:.18);d.jaws[i].rotation.x=mouth+(active?wind*.35:wind*.03);d.faces[i].morphTargetInfluences[0]=active?wind*.8:.05;
   for(let j=0;j<2;j++){const arm=d.arms[i*2+j];arm.rotation.x-=active?wind*(mood.attack==='bobby'?1.1:.62):wind*.16;arm.userData.forearm.rotation.x-=active?wind*.38:0;}
  });
  if(mood.charge>0){d.body.rotation.x=.28;d.heads[1].rotation.x=-.3;d.arms.slice(2).forEach(arm=>arm.rotation.x=-1.15);d.heads[0].rotation.z=.27;}
 }else if(kind==='zeb'){
  if(['bile','deluge','siphon'].includes(mood.attack)&&mood.windup>0){d.body.rotation.x=-.10*wind;d.head.rotation.x=-.14*wind;mouth+=wind*.28;d.arms.forEach(a=>a.rotation.x+=wind*.17);}
  if(['rupture','groundtear'].includes(mood.attack)){d.arms.forEach(a=>{a.rotation.x-=wind*2.25;a.userData.forearm.rotation.x-=wind*.6;});d.body.rotation.x-=wind*.08;d.body.position.y-=swing*.12;d.body.rotation.x+=swing*.4;}
  d.bileSacs?.forEach(s=>s.scale.set(.075,.13*(1+wind*.18+breathe*.035),.055*(1+wind*.18)));
 }else if(kind==='birdy'){
  const fold=mood.wingSpace===false?1.45:mood.recover>0?.9:.24,flap=Math.sin(t*(mood.charge>0?7.5:1.8))*(mood.charge>0?.24:.035);
  d.wings.forEach((w,i)=>{const side=i?1:-1;w.rotation.set(0,side*fold,side*(.13+flap-wind*.24));d.wingWrists[i].rotation.set(0,side*(mood.charge>0?.05:.16),side*(flap*.5));});
  if(mood.charge>0){g.position.y=.29+Math.sin(t*7.5)*.018;d.body.rotation.x=.32;d.head.rotation.x=-.30;d.legs.forEach(l=>{l.rotation.x=.85;l.userData.calf.rotation.x=1.22;});d.arms.forEach(a=>a.rotation.x=-.95);mouth=.25;}
  else if(mood.windup>0){d.head.rotation.x=-.16;mouth+=wind*.19;}
 }
 if(mood.recover>0){d.body.rotation.x+=kind==='zeb'?.14:.18;d.heads.forEach(h=>h.rotation.x+=.12);mouth*=.65;}
 if(mood.stagger>0){const hit=Math.min(.17,mood.stagger*.35);d.body.rotation.z+=(mood.hitSide||1)*hit;d.heads.forEach(h=>h.rotation.x-=hit);}
 if(kind!=='jakob'){d.jaws.forEach(j=>j.rotation.x=mouth);d.faces.forEach(f=>f.morphTargetInfluences[0]=mouth*2);}
 if(mood.intro){
  const time=mood.intro.time;
  if(kind==='chris'){const rise=ease((time-2)/3);d.body.rotation.x=.36*(1-rise);d.arms[1].rotation.x=.05-rise*.4;d.head.rotation.x=.24-.3*rise;d.jaw.rotation.x=.06+ease((time-7)/.7)*.27;}
  if(kind==='jakob'){d.spines.forEach((s,i)=>{const wake=ease((time-(i?3:1))/2);s.rotation.x=.30*(1-wake);d.heads[i].rotation.x=.6*(1-wake);d.heads[i].rotation.z=(i?-.45:.40)*(1-wake);d.jaws[i].rotation.x=.03+(i===0?ease((time-6)/.7):ease((time-8)/.7))*.18;});}
  if(kind==='zeb'){const rise=ease((time-2)/4),slam=Math.sin(clamp((time-7)/1.5)*Math.PI);d.body.position.y-=.16*(1-rise)+slam*.1;d.body.rotation.x+=.22*(1-rise)+slam*.26;d.arms.forEach(a=>a.rotation.x=-2.1*ease((time-5.5)/1.5)*(1-ease((time-7.4)/.45)));d.jaw.rotation.x=.09+rise*.13;}
  if(kind==='birdy'){const open=ease((time-3)/3.5),land=ease((time-6)/1.7);g.position.y=.35*(1-land);d.body.rotation.x=.25*(1-open);d.head.rotation.z=-.27*(1-open);d.wings.forEach((w,i)=>{w.rotation.y=(i?1:-1)*(1.45*(1-open)+.16*open);w.rotation.z=(i?1:-1)*(.08-.12*open);d.wingWrists[i].rotation.y=(i?1:-1)*.4*(1-open);});d.legs.forEach(l=>{l.rotation.x=.8*(1-land);l.userData.calf.rotation.x=1.1*(1-land);});}
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
  const broken=beat?.id==='birdy-break'?ease((beat.time-.7)/2.0):phase>=3?1:0;
  d.wingWrists.forEach(w=>w.scale.set(1-broken*.5,1-broken*.34,1));
  if(phase===2&&!broken){d.wings[0].rotation.z-=.43;d.wingWrists[0].rotation.z-=.55;}
  if(broken){d.wings.forEach((w,i)=>{const side=i?1:-1;w.rotation.y+=(side*1.3-w.rotation.y)*broken;w.rotation.z+=(-side*.55-w.rotation.z)*broken;d.wingWrists[i].rotation.y+=(side*1.55-d.wingWrists[i].rotation.y)*broken;w.rotation.x=.3*broken;d.wingWrists[i].rotation.z=-side*.2*broken;d.wingWrists[i].rotation.x=.3*broken;});g.position.y*=1-broken;d.legs.forEach((l,i)=>{l.rotation.x=Math.sin(cycle+i*Math.PI)*.36*walk;l.userData.calf.rotation.x=Math.max(0,-Math.sin(cycle+i*Math.PI))*.4*walk;});d.body.rotation.x=.23;}
  if(beat?.id==='birdy-break'){const t=beat.time;d.body.position.y-=Math.sin(Math.min(1,t/4)*Math.PI)*.25;d.head.rotation.x=-.12-ease((t-2.6)/.6)*.26;d.jaw.rotation.x=.08+ease((t-2.6)/.6)*.34;d.faces[0].morphTargetInfluences[0]=ease((t-2.6)/.6)*.8;}
  if(['groundRush','scream'].includes(mood.attack)){d.head.rotation.x-=wind*.28;d.jaw.rotation.x=.12+wind*.3;d.faces[0].morphTargetInfluences[0]=wind*.85;}
  if(mood.attack==='talons'){d.arms.forEach((arm,i)=>{arm.rotation.x-=wind*.7+swing*.7;arm.rotation.z+=(i?1:-1)*wind*.3;});}
 }
 if(kind==='zeb'){
  if(phase>=2){d.bileSacs[1].scale.set(.075,.043,.018);d.body.rotation.x+=.08;}
  if(beat?.id==='zeb-rupture'){const u=ease((beat.time-.8)/2);d.bileSacs[1].scale.set(.075,.13*(1-u)+.043*u,.055*(1-u)+.018*u);d.arms.forEach((arm,i)=>arm.rotation.z=(i?1:-1)*(.1+Math.sin(u*Math.PI)*.2));d.jaw.rotation.x=.12+u*.24;}
 }
 if(mood.dead){const u=ease((mood.deathTime||0)/1.1);g.position.y=.10*u;g.rotation.x=-Math.PI*.47*u;d.heads.forEach(h=>h.rotation.x=.3*u);d.arms.forEach((arm,i)=>{arm.rotation.x=.26*u;arm.rotation.z=(i%2?1:-1)*.38*u;});d.legs.forEach(l=>l.userData.calf.rotation.x=.42*u);}
 d.mouthCovers.forEach((cover,i)=>cover.visible=d.jaws[i].rotation.x<.13);return g;
}
