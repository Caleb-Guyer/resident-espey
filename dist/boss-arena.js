import * as T from './vendor/three.module.js?v=5.1.2';
import {TILE,solid,sight} from './data.js?v=5.1.2';
import {mergeRigid} from './sculpt-surface.js?v=5.1.2';
import {crushBobby,phaseRule} from './boss-fights.js?v=5.1.2';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const piece=(g,geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
const box=(g,m,w,h,d,x,y,z)=>piece(g,new T.BoxGeometry(w,h,d,2,2,2),m,x,y,z);
const inside=(bounds,p)=>{const[a,b,c,d]=bounds;return p.x>(a+.15)*TILE&&p.x<(c+.85)*TILE&&p.z>(b+.15)*TILE&&p.z<(d+.85)*TILE;};
// Machines, damaged variants and controls are constructed during loading. Every
// phase reuses their geometry and materials, including the failed press stroke.
export class BossArena{
 constructor(world,chapter){
  this.world=world;this.controls=[];this.sealed=new Map();this.materials=[];this.press=null;this.baseFog=world.scene.fog?.density||.032;
  const metal=new T.MeshStandardMaterial({color:0x394542,roughness:.64,metalness:.6}),rust=new T.MeshStandardMaterial({color:0x4b3726,roughness:.85,metalness:.4}),yellow=new T.MeshStandardMaterial({color:0x918252,roughness:.8});
  this.materials=[metal,rust,yellow];
  if(chapter.theme==='backrooms'){
   const x=9.5*TILE,z=4.5*TILE,g=new T.Group();g.position.set(x,0,z);g.userData.kind='boss-machine';world.root.add(g);
   for(const side of [-1,1])for(const depth of [-.65,.65]){box(g,metal,.18,3.13,.18,side*1.15,1.565,depth);world.obstacles.push({x:x+side*1.15,z:z+depth,w:.18,d:.18,h:3.13});}
   box(g,metal,2.5,.24,1.6,0,3.15,0);const platen=new T.Group();g.add(platen);platen.position.y=2.95;box(platen,rust,1.9,.18,1.28,0,0,0);for(let i=0;i<9;i++)box(platen,yellow,.075,.025,1.25,-.85+i*.21,-.106,0);mergeRigid(platen);
   const pistons=[];for(const side of [-1,1]){const piston=new T.Group();piston.position.set(side*.68,3.05,0);g.add(piston);box(piston,metal,.11,.42,.11,0,-.12,0);pistons.push(piston);}
   const floor=new T.Mesh(new T.RingGeometry(.75,1.13,48),new T.MeshBasicMaterial({color:0x9ca677,transparent:true,opacity:.26,side:T.DoubleSide,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=.028;g.add(floor);
   this.press={x,z,g,platen,pistons,floor,stroke:0,broken:false};this.control('crusher','Drop the press',[[x+3.15,z+.75],[x-3.15,z+.75]],metal,yellow);
   const tag=world.sign('EMERGENCY PRESS',[x,3.0,z+.83],1.7,.19,'#d9c98c','#1c2825');g.attach(tag);mergeRigid(g);
  }
  if(chapter.theme==='school')this.control('steam','Open steam vent',[[22.5*TILE,3.5*TILE],[26.5*TILE,3.5*TILE]],metal,yellow);
  if(chapter.theme==='breach')this.control('purge','Purge the room',[[13.5*TILE,6.5*TILE],[20.5*TILE,6.5*TILE]],metal,yellow);
 }
 control(kind,label,candidates,metal,yellow){
  const w=this.world,at=candidates.find(([x,z])=>!solid(w.grid,x,z,.5)&&!w.blocked(x,z,.65))||candidates[0],[x,z]=at,g=new T.Group();g.position.set(x,0,z);g.userData.kind='boss-machine';w.root.add(g);
  box(g,metal,.44,.97,.36,0,.485,0);box(g,yellow,.40,.05,.34,0,1,0);const lamp=new T.MeshBasicMaterial({color:0x76c698});piece(g,new T.SphereGeometry(.043,12,8),lamp,.13,1.07,.14);
  const handle=new T.Group();g.add(handle);handle.position.set(-.08,1.03,0);box(handle,metal,.022,.17,.025,0,.09,0);box(handle,yellow,.14,.025,.034,0,.18,0);handle.rotation.x=-.3;
  const tag=w.sign(kind==='crusher'?'PRESS':kind==='steam'?'STEAM':'PURGE',[x,1.42,z+.09],.63,.17,'#d7c7a0','#202e29');g.attach(tag);mergeRigid(g);
  const item={kind:'bossMechanism',mechanism:kind,label,x,z,model:g,lamp,handle,used:false};this.controls.push(item);item.obstacle={x,z,w:.44,d:.36,h:1};w.obstacles.push(item.obstacle);return item;
 }
 canSeeControl(a,c){if(!sight(this.world.grid,a,c))return false;const len=Math.hypot(c.x-a.x,c.z-a.z);for(let t=.1;t<len;t+=.2){const x=a.x+(c.x-a.x)*t/len,z=a.z+(c.z-a.z)*t/len;for(const o of this.world.obstacles)if(o!==c.obstacle&&o.active!==false&&x>o.x-o.w/2-.08&&x<o.x+o.w/2+.08&&z>o.z-o.d/2-.08&&z<o.z+o.d/2+.08)return false;}return true;}
 enemy(game,kind){return game.enemies.find(e=>!e.dead&&e.kind===kind&&!e.dormant);}
 interactables(game){
  for(const c of this.controls){const e=this.enemy(game,c.mechanism==='crusher'?'jakob':c.mechanism==='steam'?'chris':'zeb');c.active=!!e&&e.alert&&(c.mechanism!=='crusher'||e.phase===2&&!e.bobbyCrushed);c.label=e?.ventCool>0?'Vent resetting':c.mechanism==='crusher'?'Drop the press':c.mechanism==='steam'?'Open steam vent':'Purge the room';}
  return this.controls;
 }
 interact(game,c){
  const e=this.enemy(game,c.mechanism==='crusher'?'jakob':c.mechanism==='steam'?'chris':'zeb');if(!e||!c.active)return false;
  if(c.mechanism==='crusher'){
   const p=this.press;if(Math.hypot(e.x-p.x,e.z-p.z)>1.65){game.toast('Lure them beneath the press.');return false;}
   if(!crushBobby(e))return false;e.x=p.x;e.z=p.z;e.model.position.set(e.x,0,e.z);this.breakPress(0);game.playBossBeat(e,'crusher',()=>this.breakPress(1));return true;
  }
  if(e.ventCool>0){game.toast('The vent is resetting.');return false;}e.ventCool=14;c.handle.rotation.x=.65;
  if(c.mechanism==='steam'){
   if(Math.hypot(e.x-c.x,e.z-c.z)<8){e.stageResolved=(e.stageResolved||0)+1;e.windup=e.charge=0;e.attack=null;e.comboPattern=null;e.recover=e.exposed=3.4;e.cool=4;e.stagger=1.0;game.world.effect(e.x,e.z,0xd1e0da,26,1.1);game.toast('Chris is exposed.');}else game.toast('Lure Chris toward the steam.');
  }else {e.stageResolved=(e.stageResolved||0)+1;e.purged=14;e.windup=e.charge=0;e.attack=null;e.comboPattern=null;e.recover=e.exposed=4.2;e.cool=4.5;game.world.enemyEffects?.clearHazards();game.world.effect(c.x,c.z,0xbddac6,22,1.4);game.toast('The purge exposes Zeb.');}
  game.sound.play('slam');game.save();return true;
 }
 breakPress(u){
  if(!this.press)return;const p=this.press;p.stroke=u;p.broken=u>=1;p.platen.position.y=2.95-.38*ease((u-.15)/.50);p.platen.rotation.z=-.55*ease((u-.35)/.4);p.pistons[0].rotation.z=-.8*ease((u-.35)/.4);p.pistons[1].scale.y=1+u*.85;p.floor.material.color.setHex(u>=1?0x7a5544:0xbab286);
 }
 updateBeat(e,id,t){if(id==='crusher')this.breakPress(Math.min(1,t/4.5));}
 update(game,dt){
  this.interactables(game);for(const c of this.controls){const e=this.enemy(game,c.mechanism==='crusher'?'jakob':c.mechanism==='steam'?'chris':'zeb'),ready=c.active&&!(e?.ventCool>0);c.lamp.color.setHex(ready?0x76c698:0x88503b);if(c.mechanism!=='crusher')c.handle.rotation.x=e?.ventCool>0?.65:-.3;}
  if(this.press&&this.enemy(game,'jakob')?.bobbyCrushed&&!game.cinema?.active)this.breakPress(1);
  const zeb=this.enemy(game,'zeb'),fog=this.world.scene.fog;if(fog)fog.density+=(this.baseFog+(zeb?.phase>=2&&!(zeb.purged>0)?.022:0)-fog.density)*(1-Math.exp(-dt*2));
  for(const e of game.enemies){if(e.dead||!e.alert||!e.model?.userData.bossRig)continue;
   const r=this.world.level.rooms.find(r=>r.kind===(e.kind==='birdy'?'mimic':e.kind==='jakob'?'seal':e.kind==='zeb'?'finale':'assembly'));if(!r||!inside(r.bounds,game.player)||!inside(r.bounds,e)||this.sealed.has(e.kind))continue;
   const gate=this.world.gates[e.kind==='birdy'?1:2];if(gate){gate.forcedClosed=true;this.sealed.set(e.kind,gate);game.syncStage();}
  }
 }
 defeated(game,e){const g=this.sealed.get(e.kind);if(g){g.forcedClosed=false;this.sealed.delete(e.kind);game.syncStage();}}
 objective(e){if(e.kind==='jakob'&&e.phase===2&&!e.bobbyCrushed)return 'Lure them beneath the press. Pull the lever.';if(e.kind==='birdy'&&e.phase>=3)return 'Dodge the charge. Strike when he falls.';if(e.kind==='zeb'&&e.phase>=2)return 'Use the purge switch to clear the room.';if(e.kind==='chris'&&e.phase>=1)return 'Lure Chris into steam or a wall.';return null;}
}
