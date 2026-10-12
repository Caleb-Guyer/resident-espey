import {BOSS_PROFILES} from './boss-models.js?v=4.4.0';
import {ATTACKS} from './enemy-director.js?v=4.4.0';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
export function animateBoss(g,t,moving,mood={}){
 const d=g.userData,kind=d.kind,p=BOSS_PROFILES[kind],seed=d.phase||0,pace=kind==='chris'?6.8:kind==='zeb'?2.7:kind==='birdy'?4.2:4.4,cycle=t*pace+seed,walk=moving?1:0,breathe=Math.sin(t*1.65+seed);
 g.position.y=0;g.rotation.x=0;g.rotation.z=0;d.body.position.y=p.spine+(kind==='zeb'?.007:.003)*breathe-(kind==='zeb'?.025:.010)*Math.abs(Math.sin(cycle))*walk;d.body.rotation.set(kind==='birdy'?.12:kind==='chris'?.16:.045,0,Math.sin(cycle)*walk*.022);d.body.scale.set(1+breathe*.0025,1,1+breathe*.004);
 d.spines.forEach((s,i)=>{if(s===d.body)return;s.rotation.set(.04+Math.sin(t*1.9+i)*.024,Math.sin(t*.9+i)*.035,(i?1:-1)*.035);});
 d.heads.forEach((h,i)=>{h.rotation.set(kind==='birdy'?-.12:-.06,Math.sin(t*.6+seed+i)*.045,kind==='chris'?-.1:kind==='jakob'?(i?-.075:.075):Math.sin(t*.8+seed)*.012);});
 d.legs.forEach((l,i)=>{const s=Math.sin(cycle+(i%2)*Math.PI+(i>1?.65:0)),heavy=kind==='zeb'?.20:.30;l.rotation.set(s*heavy*walk+(kind==='chris'&&i===1?.1:0),0,0);l.userData.calf.rotation.set(Math.max(0,-s)*.38*walk+(kind==='birdy'?.12:.05),0,0);});
 d.arms.forEach((a,i)=>{a.rotation.set((kind==='birdy'?.10:kind==='chris'&&i===1?.07:-.1)+Math.sin(cycle+(i%2)*Math.PI)*walk*(kind==='zeb'?.08:.16),0,(i%2?1:-1)*(kind==='zeb'?.07:.03));a.userData.forearm.rotation.set(-.10+Math.sin(t*.8+i)*.018,0,0);});
 const a=ATTACKS[mood.attack],u=a?ease((mood.attackTime||0)/a.tell):0,wind=mood.windup>0?u:0,swing=mood.strike>0?Math.sin((1-mood.strike/.4)*Math.PI):0;
 let mouth=.045+(breathe+1)*.013;
 if(kind==='chris'){
  if(mood.attack==='rush'&&mood.windup>0){d.body.rotation.x=-.18*wind;d.arms[1].rotation.x=-1.3*wind;d.arms[1].userData.forearm.rotation.x=-.5*wind;d.head.rotation.x=.03;mouth+=wind*.18;}
  if(mood.charge>0){d.body.rotation.x=.40;d.head.rotation.x=-.32;d.arms.forEach((arm,i)=>{arm.rotation.x=i?-1.08:-.65;arm.userData.forearm.rotation.x=-.22;});d.legs.forEach((l,i)=>{l.rotation.x=Math.sin(t*10+i*Math.PI)*.36;l.userData.calf.rotation.x=Math.max(0,-Math.sin(t*10+i*Math.PI))*.48;});mouth=.27;}
  if(mood.attack==='rake'){d.arms[1].rotation.x-=wind*1.15+swing*.75;d.arms[1].rotation.z-=wind*.65-swing*1.1;d.body.rotation.y-=wind*.20-swing*.32;}
 }else if(kind==='jakob'){
  const lead=mood.activeHead||0;d.spines.forEach((s,i)=>{const active=i===lead;s.rotation.y+=(active?-1:1)*wind*.12;s.rotation.x-=active?wind*.12:0;d.heads[i].rotation.y+=(i?-.18:.18);d.jaws[i].rotation.x=mouth+(active?wind*.35:wind*.03);d.faces[i].morphTargetInfluences[0]=active?wind*.8:.05;
   for(let j=0;j<2;j++){const arm=d.arms[i*2+j];arm.rotation.x-=active?wind*(mood.attack==='bobby'?1.1:.62):wind*.16;arm.userData.forearm.rotation.x-=active?wind*.38:0;}
  });
  if(mood.charge>0){d.body.rotation.x=.28;d.heads[1].rotation.x=-.3;d.arms.slice(2).forEach(arm=>arm.rotation.x=-1.15);d.heads[0].rotation.z=.27;}
 }else if(kind==='zeb'){
  if(mood.attack==='bile'&&mood.windup>0){d.body.rotation.x=-.10*wind;d.head.rotation.x=-.14*wind;mouth+=wind*.28;d.arms.forEach(a=>a.rotation.x+=wind*.17);}
  if(mood.attack==='rupture'){d.arms.forEach(a=>{a.rotation.x-=wind*2.25;a.userData.forearm.rotation.x-=wind*.6;});d.body.rotation.x-=wind*.08;d.body.position.y-=swing*.12;d.body.rotation.x+=swing*.4;}
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
 if(mood.dead){const u=ease((mood.deathTime||0)/1.1);g.position.y=.10*u;g.rotation.x=-Math.PI*.47*u;d.heads.forEach(h=>h.rotation.x=.3*u);d.arms.forEach((arm,i)=>{arm.rotation.x=.26*u;arm.rotation.z=(i%2?1:-1)*.38*u;});d.legs.forEach(l=>l.userData.calf.rotation.x=.42*u);}
 d.mouthCovers.forEach((cover,i)=>cover.visible=d.jaws[i].rotation.x<.13);return g;
}
