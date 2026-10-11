import {World} from './world.js?v=2.0.0';
import {EYE_HEIGHT,viewDirection,relativeMove,traceShot} from './fps.js?v=2.0.0';
import {Sound} from './audio.js?v=2.0.0';
import {CHAPTERS,ENEMY_STATS,TILE,SAVE_KEY,DIFFICULTIES,makeGrid,solid,sight,findPath,distance,validSave,endingFor} from './data.js?v=2.0.0';
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Game{
 constructor(ui,settings){this.ui=ui;this.settings=settings;this.world=new World($('#world'),settings);this.sound=new Sound();this.sound.setVolume(settings.volume);this.running=false;this.paused=true;this.time=0;this.last=0;this.keys=new Set();this.mouse={x:0,y:0,down:false,aiming:false,drag:false};this.pointerLocked=false;this.touch={x:0,z:0,fire:false};this.aim={x:10,z:10};this.pages=new Set();this.allies=new Set();this.stats={kills:0,shots:0,hits:0,deaths:0,seconds:0};this.difficulty='survivor';this.chapter=0;this.dialogue=[];this.nextRadio=0;this.setupInput();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);}
 setupInput(){
  const canvas=$('#world');canvas.tabIndex=0;
  addEventListener('resize',()=>this.world.resize());
  addEventListener('keydown',e=>{
   if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft'].includes(e.code))e.preventDefault();
   if(e.repeat)return;this.keys.add(e.code);
   if(e.code==='Escape'&&this.running){if(this.ui.isOpen())this.ui.close();else this.ui.pause();return;}
   if(!this.running||this.paused)return;
   const actions={KeyE:'interact',KeyR:'reload',KeyQ:'heal',KeyF:'melee',Space:'dash',KeyM:'map',KeyJ:'journal',KeyP:'pause'};
   if(actions[e.code])this.action(actions[e.code]);
   if(e.code==='KeyG'){this.settings.flashlight=this.settings.flashlight===false;this.toast(this.settings.flashlight?'Flashlight on':'Flashlight off');}
   if(e.code==='KeyX'){this.player.yaw+=Math.PI;this.player.pitch=0;}
  });
  addEventListener('keyup',e=>this.keys.delete(e.code));
  addEventListener('blur',()=>{this.keys.clear();this.mouse.down=this.mouse.aiming=this.mouse.drag=false;if(this.running&&!this.paused)this.ui.pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.running&&!this.paused)this.ui.pause();});
  document.addEventListener('pointerlockchange',()=>{
   const was=this.pointerLocked;this.pointerLocked=document.pointerLockElement===canvas;
   document.body.classList.toggle('pointer-locked',this.pointerLocked);
   if(was&&!this.pointerLocked&&this.running&&!this.paused)this.ui.pause();
  });
  const look=(dx,dy,scale=1)=>{
   if(!this.running||this.paused)return;
   const sensitivity=(this.settings.sensitivity||1)*.0022*scale*(this.mouse.aiming?.65:1);
   this.player.yaw-=dx*sensitivity;this.player.pitch=clamp(this.player.pitch-dy*sensitivity,-1.35,1.35);
  };
  addEventListener('pointermove',e=>{
   if(e.pointerType!=='mouse')return;
   if(this.pointerLocked)look(e.movementX,e.movementY);
   else if(this.mouse.drag)look(e.clientX-this.mouse.x,e.clientY-this.mouse.y);
   this.mouse.x=e.clientX;this.mouse.y=e.clientY;
  });
  canvas.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='mouse'||!this.running||this.paused)return;
   this.sound.init();this.mouse.x=e.clientX;this.mouse.y=e.clientY;
   if(e.button===0){this.mouse.down=true;this.mouse.drag=!this.pointerLocked;this.capturePointer();this.shoot();}
   if(e.button===2){this.mouse.aiming=true;this.mouse.drag=!this.pointerLocked;this.capturePointer();}
  });
  addEventListener('pointerup',e=>{if(e.button===0)this.mouse.down=this.mouse.drag=false;if(e.button===2)this.mouse.aiming=this.mouse.drag=false;});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const joy=$('#joystick'),knob=joy.querySelector('i');
  const move=e=>{const b=joy.getBoundingClientRect(),dx=e.clientX-(b.x+b.width/2),dz=e.clientY-(b.y+b.height/2),len=Math.hypot(dx,dz),scale=Math.min(1,len/35);this.touch.x=len?dx/len*scale:0;this.touch.z=len?dz/len*scale:0;knob.style.transform='translate('+this.touch.x*32+'px,'+this.touch.z*32+'px)';};
  joy.addEventListener('pointerdown',e=>{joy.setPointerCapture(e.pointerId);move(e);});
  joy.addEventListener('pointermove',e=>{if(joy.hasPointerCapture(e.pointerId))move(e);});
  const end=()=>{this.touch.x=this.touch.z=0;knob.style.transform='';};joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);
  const pad=$('#look-pad');let lastTouch=null;
  pad.addEventListener('pointerdown',e=>{pad.setPointerCapture(e.pointerId);lastTouch=[e.clientX,e.clientY];});
  pad.addEventListener('pointermove',e=>{if(pad.hasPointerCapture(e.pointerId)&&lastTouch){look(e.clientX-lastTouch[0],e.clientY-lastTouch[1],1.7);lastTouch=[e.clientX,e.clientY];}});
  pad.addEventListener('pointerup',()=>lastTouch=null);pad.addEventListener('pointercancel',()=>lastTouch=null);
  document.querySelectorAll('[data-action]').forEach(b=>{
   b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);const action=b.dataset.action;
    if(action==='fire'){this.touch.fire=true;if(this.running&&!this.paused)this.shoot();}
    else if(action==='aim')this.touch.aiming=!this.touch.aiming;else this.action(action);
   });
   const end=()=>this.touch.fire=false;b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
  });
 }
 capturePointer(){
  if(matchMedia('(pointer: coarse)').matches||this.pointerLocked||this.paused||!this.running)return;
  try{const promise=$('#world').requestPointerLock?.();promise?.catch(()=>{});}catch{}
 }
 action(a){if(this.paused||!this.running)return;if(a==='map')this.ui.map();else if(a==='journal')this.ui.journal();else if(a==='pause')this.ui.pause();else this[a]?.();}
 newGame(difficulty){this.difficulty=difficulty;this.pages=new Set();this.allies=new Set();this.stats={kills:0,shots:0,hits:0,deaths:0,seconds:0};this.player={x:0,z:0,hp:100,stamina:100,ammo:12,reserve:60,meds:3,inv:0,dash:0,cooldown:0,melee:0,reloading:0};this.running=true;this.chapter=0;this.loadChapter(0);this.save();this.ui.intro(CHAPTERS[0]);}
 continueGame(){const v=this.readSave();if(!v)return false;this.restore(v);this.running=true;this.setPaused(false);this.radio('ETHAN ESPEY','The bell is still ringing. I still have pages left.',5);return true;}
 readSave(){try{const v=JSON.parse(localStorage.getItem(SAVE_KEY));return validSave(v)?v:null;}catch{return null;}}
 restore(v){this.difficulty=v.difficulty;this.pages=new Set(v.pages);this.allies=new Set(v.allies);this.stats={kills:0,shots:0,hits:0,deaths:0,seconds:0,...v.stats};this.player={x:0,z:0,hp:100,stamina:100,ammo:v.ammo,reserve:v.reserve,meds:v.meds,inv:2,dash:0,cooldown:0,melee:0,reloading:0};this.loadChapter(v.chapter,v);}
 save(){if(!this.player)return;const p=this.player;const v={version:1,chapter:this.chapter,difficulty:this.difficulty,pages:[...this.pages],allies:[...this.allies],ammo:p.ammo,reserve:p.reserve,meds:p.meds,position:[p.x,p.z],yaw:p.yaw,pitch:p.pitch,hp:p.hp,collected:this.items.filter(i=>i.used).map(i=>i.id),killed:this.enemies.filter(e=>e.dead).map(e=>e.id),bossSpawned:this.bossSpawned,bossDead:this.bossDead,puzzle:this.puzzleSolved,stats:{...this.stats},time:Date.now()};this.checkpoint=structuredClone(v);try{localStorage.setItem(SAVE_KEY,JSON.stringify(v));this.storageFailed=false;}catch{this.storageFailed=true;}this.ui.updateContinue();}
 retry(){const deaths=this.stats.deaths+1;const v=this.checkpoint||this.readSave();if(v){this.restore(v);this.player.hp=100;this.stats.deaths=deaths;this.running=true;this.setPaused(false);this.radio('ETHAN ESPEY','One more page. One more try.',4);}}
 loadChapter(n,saved){this.chapter=n;this.config=CHAPTERS[n];this.grid=makeGrid(this.config.theme);this.diff=DIFFICULTIES[this.difficulty];this.world.load(this.config,this.grid);const p=this.player;const start=this.config.start;p.x=(start[0]+.5)*TILE;p.z=(start[1]+.5)*TILE;if(saved&&Array.isArray(saved.position)&&saved.position.length===2&&saved.position.every(Number.isFinite)&&!solid(this.grid,saved.position[0],saved.position[1])&&!this.world.blocked(saved.position[0],saved.position[1],.32)){[p.x,p.z]=saved.position;p.hp=clamp(saved.hp||100,1,100);}p.stamina=100;p.inv=2;p.dash=0;p.reloading=0;p.yaw=Number.isFinite(saved?.yaw)?saved.yaw:0;p.pitch=Number.isFinite(saved?.pitch)?clamp(saved.pitch,-1.35,1.35):0;p.aiming=false;p.crouching=false;this.aim={x:p.x,z:p.z-10};this.model=this.world.character('player');this.world.root.add(this.model);this.model.position.set(p.x,0,p.z);this.model.visible=false;this.items=this.config.items.map((i,id)=>{const item={...i,id,x:(i.at[0]+.5)*TILE,z:(i.at[1]+.5)*TILE,used:saved?.collected?.includes(id)||i.kind==='page'&&this.pages.has(i.page)};if(!item.used)item.model=this.world.object(i.kind,item.x,item.z);return item;});this.enemies=[];this.boss=null;this.config.enemies.forEach(([kind,x,z],id)=>{if(!saved?.killed?.includes(id))this.spawn(kind,x,z,false,id);else this.enemies.push({id,dead:true});});this.bossSpawned=!!saved?.bossSpawned;this.bossDead=!!saved?.bossDead;this.puzzleSolved=!!saved?.puzzle;this.objectives=this.items.filter(i=>['fuse','seal','anchor'].includes(i.kind)&&i.used).length;
 if(this.bossSpawned&&!this.bossDead)this.spawnBoss(false);const npc=this.config.npc;this.npc={name:npc.name,x:(npc.at[0]+.5)*TILE,z:(npc.at[1]+.5)*TILE,line:0};this.npc.model=this.world.character('npc',n===0?0x6c644c:n===1?0x6b7971:0x3e6554);this.npc.model.position.set(this.npc.x,0,this.npc.z);this.world.root.add(this.npc.model);this.navGrid=this.grid.map(row=>[...row]);for(let z=1;z<this.grid.length-1;z++)for(let x=1;x<this.grid[0].length-1;x++)if(this.world.blocked((x+.5)*TILE,(z+.5)*TILE,.38))this.navGrid[z][x]=1;this.world.setView(p,p.yaw,p.pitch,this.time);this.shake=0;this.flash=0;this.radioUntil=0;this.toastUntil=0;this.birdySpoke=false;this.specialRadio=false;this.nextRadio=this.time+14;this.nearest=null;this.sound.play('bell');this.setHUD();this.ui.showGame();$('#tutorial').textContent='WASD move · Mouse look · Click fire\nRight click aim · F knife · E use\nG flashlight · X quick turn · M map';}
 spawn(kind,cx,cz,boss=false,id){const stat=ENEMY_STATS[kind],max=stat.hp*(this.difficulty==='story'?.85:1);const e={id:id??this.enemies.length,kind,x:(cx+.5)*TILE,z:(cz+.5)*TILE,hp:max,max,speed:stat.speed*this.diff.enemySpeed,damage:stat.damage*this.diff.damage,range:stat.range,boss,dead:false,alert:boss,cool:1.5,path:[],pathTimer:0,stagger:0,windup:0,charge:0,phase:0};e.model=this.world.character(kind,stat.color);e.model.position.set(e.x,0,e.z);this.world.root.add(e.model);this.enemies.push(e);return e;}
 spawnBoss(announce=true){const b=this.config.boss;this.boss=this.spawn(b.kind,...b.at,true,99);this.bossSpawned=true;if(announce){this.sound.play('boss');this.toast('The bell has called something back.');const speech=[['COACH HALL','Chris hears the shots. Dodge his rush, then take your shot.'],['JAKOB','BOBBY! ... BOBBY!'],['COACH HALL','Zebene. That is your name. Ethan, get clear of the fog!']][this.chapter];this.radio(...speech,6);this.save();}}
 setPaused(p){
  this.paused=p;this.keys.clear();this.mouse.down=this.mouse.aiming=this.mouse.drag=false;this.touch.fire=this.touch.aiming=false;
  this.sound.pause(p);$('#crosshair').hidden=p;$('#look-hint').hidden=p;
  if(p&&document.pointerLockElement)document.exitPointerLock?.();else if(!p)this.capturePointer();
 }
 move(o,dx,dz,r){
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.25));
  const blocked=(x,z)=>solid(this.grid,x,z,r)||this.world.blocked?.(x,z,r);
  for(let i=0;i<steps;i++){if(!blocked(o.x+dx/steps,o.z))o.x+=dx/steps;if(!blocked(o.x,o.z+dz/steps))o.z+=dz/steps;}
 }
 shoot(){
  const p=this.player;if(p.cooldown>0||p.reloading>0||p.dash>0)return;
  if(p.ammo<=0){p.cooldown=.3;this.sound.play('empty');if(p.reserve)this.reload();else this.toast('No rounds. Use F / KNIFE, then dodge.');return;}
  p.ammo--;p.cooldown=.28;this.stats.shots++;this.sound.play('shot');this.shake=.18;this.world.fireWeapon?.();
  const yaw=Number.isFinite(p.yaw)?p.yaw:Math.atan2(p.x-this.aim.x,p.z-this.aim.z),direction=viewDirection(yaw,p.pitch||0);
  const origin={x:p.x,y:p.crouching?1.14:EYE_HEIGHT,z:p.z};const hit=traceShot(this.grid,origin,this.enemies,direction,this.world.obstacles||[]);
  this.world.tracer(origin,hit.end);
  if(hit.enemy){this.hurtEnemy(hit.enemy,(hit.headshot?68:34)*this.diff.power,direction.x,direction.z);this.stats.hits++;this.world.effect(hit.end.x,hit.end.z,0x81392b,8,hit.end.y);this.hitUntil=this.time+.18;this.headshot=hit.headshot;}
  else this.world.effect(hit.end.x,hit.end.z,0xc2b59c,4,hit.end.y);
  this.enemies.forEach(e=>{if(!e.dead&&distance(e,p)<17)e.alert=true;});
 }
 hurtEnemy(e,damage,nx=0,nz=0){if(e.dead)return;e.hp-=damage;e.alert=true;e.stagger=e.boss?.1:.38;this.move(e,nx*(e.boss?.12:.5),nz*(e.boss?.12:.5),.38);e.model.traverse(o=>{if(o.material?.emissive)o.material.emissive.setHex(0x422412);});if(e.hp<=0){e.dead=true;this.stats.kills++;e.model.rotation.z=Math.PI/2;e.model.position.y=.18;e.model.scale.multiplyScalar(.75);this.world.effect(e.x,e.z,0xb79760,10);if(e.warning)this.world.root.remove(e.warning);this.player.reserve=clamp(this.player.reserve+(e.boss?30:4),0,999);if(e.boss){this.bossDead=true;this.sound.play('bell');this.toast('The way is open. +30 rounds');this.radio('ETHAN ESPEY',this.chapter===2?'Zebene Martine. I remember you.':'That was a person. I will remember that.',5);this.save();}}}
 reload(){const p=this.player;if(p.reloading||p.ammo===12||p.reserve<=0)return;p.reloading=1.35;this.sound.play('reload');}
 melee(){const p=this.player;if(p.melee>0||p.dash>0)return;p.melee=.6;p.cooldown=Math.max(p.cooldown,.18);this.sound.play('knife');this.world.swingKnife?.();p.inv=Math.max(p.inv,.2);this.shake=.08;this.world.effect(p.x,p.z,0xa8c5b0,6);const dx=this.aim.x-p.x,dz=this.aim.z-p.z,len=Math.hypot(dx,dz)||1;for(const e of this.enemies){if(e.dead||distance(e,p)>2.35||!sight(this.grid,p,e))continue;const ex=e.x-p.x,ez=e.z-p.z;if((ex*dx+ez*dz)/(Math.hypot(ex,ez)*len||1)>-.2)this.hurtEnemy(e,40*this.diff.power,ex/Math.hypot(ex,ez),ez/Math.hypot(ex,ez));}}
 dash(){
  const p=this.player;if(p.stamina<32||p.dash>0)return;p.stamina-=32;p.dash=.24;p.inv=.32;
  const strafe=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'))+this.touch.x,backward=Number(this.keys.has('KeyS'))-Number(this.keys.has('KeyW'))+this.touch.z;
  let {x:dx,z:dz}=relativeMove(strafe,backward,p.yaw||0),len=Math.hypot(dx,dz);
  if(!len){const d=viewDirection(p.yaw||0,0);dx=d.x;dz=d.z;len=1;}p.dashX=dx/len;p.dashZ=dz/len;this.sound.play('dash');
 }
 heal(){const p=this.player;if(!p.meds){this.toast('No first aid. Search for green supplies.');return;}if(p.hp>=100){this.toast('Your vitals are stable.');return;}p.meds--;p.hp=clamp(p.hp+65,0,100);p.inv=.6;this.sound.play('heal');this.toast('First aid applied. +65 vitals');}
 hurt(damage){const p=this.player;if(p.inv>0||this.paused)return;p.hp=Math.max(0,p.hp-damage);p.inv=.8;this.flash=1;this.shake=.6;this.sound.play('hit');if(p.hp<=0){this.setPaused(true);this.ui.death();}}
 updateEnemies(dt){const p=this.player;for(const e of this.enemies){if(e.dead)continue;const dist=distance(e,p);e.cool-=dt;e.stagger=Math.max(0,e.stagger-dt);if(dist<9&&sight(this.grid,e,p))e.alert=true;if(!e.alert||dist>32){this.world.animateCharacter(e.model,this.time,false);continue;}if(dist<13&&this.time>(e.nextGrowl||0)){e.nextGrowl=this.time+5+Math.random()*5;const side=Math.cos(p.yaw||0)*(e.x-p.x)-Math.sin(p.yaw||0)*(e.z-p.z);this.sound.growl?.(side/(dist||1),Math.max(.12,1-dist/16));}if(e.kind==='birdy'&&!this.birdySpoke){this.birdySpoke=true;this.radio('LIL BIRDY','Ethan. Ethan. Did you really think the walls would let you leave?',5);}
 if(e.windup>0){e.windup-=dt;e.model.rotation.y=Math.atan2(p.x-e.x,p.z-e.z);if(e.warning)e.warning.material.opacity=.13+Math.sin(this.time*20)*.08;if(e.windup<=0){if(e.warning){this.world.root.remove(e.warning);e.warning.geometry.dispose();e.warning.material.dispose();e.warning=null;}this.sound.play('boss');if(e.kind==='zeb'||e.kind==='birdy'){if(distance(e,p)<e.attackRadius&&sight(this.grid,e,p))this.hurt(e.damage*1.25);this.world.effect(e.x,e.z,0xa1b066,24);this.shake=.3;}else{const len=Math.hypot(e.targetX-e.x,e.targetZ-e.z)||1;e.chargeX=(e.targetX-e.x)/len;e.chargeZ=(e.targetZ-e.z)/len;e.charge=.7;}}continue;}
 if(e.charge>0){e.charge-=dt;this.move(e,e.chargeX*10*dt,e.chargeZ*10*dt,.45);if(distance(e,p)<e.range+.3)this.hurt(e.damage*1.4);}
 else if(e.stagger<=0){if((e.boss||e.kind==='birdy')&&e.cool<=0&&dist<10){e.cool=e.kind==='zeb'?4.5:3.8;e.windup=e.kind==='zeb'?1.1:.9;e.attackRadius=e.kind==='zeb'?5.3:e.kind==='birdy'?3.4:2.3;e.targetX=p.x;e.targetZ=p.z;e.warning=this.world.warning(e.x,e.z,e.attackRadius);this.sound.tone(160,.6,'sawtooth',.15,60);}
 else if(dist>e.range*.75){let target=p;e.pathTimer-=dt;if(!sight(this.grid,e,p)||this.world.clearWalkPath?.(e,p)===false){if(e.pathTimer<=0){e.path=findPath(this.navGrid||this.grid,e,p);e.pathTimer=.9;}while(e.path.length&&distance(e,e.path[0])<.45)e.path.shift();target=e.path[0]||p;}const dx=target.x-e.x,dz=target.z-e.z,len=Math.hypot(dx,dz)||1;this.move(e,dx/len*e.speed*dt,dz/len*e.speed*dt,.38);e.model.rotation.y=Math.atan2(dx,dz);}
 if(dist<e.range&&e.cool<=0&&sight(this.grid,e,p)){this.hurt(e.damage);e.cool=1.2;}}
 if(e.kind==='zeb'&&e.hp<e.max*.5&&e.phase===0){e.phase=1;this.spawn('walker',14,10,false,101);this.spawn('walker',16,10,false,102);this.radio('THE GENTLEMAN','One door. One name. Why keep carrying the others?',5);this.player.reserve+=12;}
 e.model.position.x=e.x;e.model.position.z=e.z;this.world.animateCharacter(e.model,this.time,e.alert&&e.stagger<=0);e.model.traverse(o=>{if(o.material?.emissive)o.material.emissive.multiplyScalar(.88);});}}
 interact(){const n=this.nearest;if(!n||n.used)return;if(n===this.npc){const line=this.config.npc.lines[n.line%3];n.line++;this.allies.add(this.chapter);this.radio(n.name.toUpperCase(),line,8);this.toast('Name anchored: '+n.name);this.save();return;}
 if(n.kind==='exit'){if(this.objectives<3){this.toast('Restore all three '+this.config.objectiveName.toLowerCase()+'.');return;}if(!this.bossDead){if(!this.bossSpawned)this.spawnBoss();else this.toast('The breach is guarded. Face what the bell called.');return;}if(this.chapter===1&&!this.puzzleSolved){this.ui.puzzle();return;}if(this.chapter===2){this.ui.finale();return;}this.nextChapter();return;}
 if(n.kind==='save'){this.player.hp=100;this.save();this.sound.play('pickup');this.toast(this.storageFailed?'Checkpoint held for this session. Browser storage is unavailable.':'Checkpoint saved. Vitals restored.');return;}
 n.used=true;this.world.root.remove(n.model);this.sound.play('pickup');if(n.kind==='ammo'){this.player.reserve=clamp(this.player.reserve+24,0,999);this.toast('+24 sidearm rounds');}else if(n.kind==='med'){this.player.meds=Math.min(99,this.player.meds+1);this.toast('+1 first aid');}else if(n.kind==='page'){this.pages.add(n.page);this.ui.page(n.page);this.save();}else{this.objectives++;this.toast(`${this.config.objectiveName}: ${this.objectives} / 3`);if(this.objectives===1)this.radio('ETHAN ESPEY','The light came back. Something heard it.',4);if(this.objectives===3){this.radio(this.chapter===1?'NATHAN NUNLEY':'COACH HALL',this.chapter===1?'The seal is whole. But something is standing between you and home.':'Power is restored. Get to Room 204. Keep your guard up.',6);if(!this.bossSpawned)this.spawnBoss();}this.save();}}
 nextChapter(){this.player.hp=100;this.player.ammo=12;this.player.reserve=Math.max(48,this.player.reserve);this.player.meds=Math.max(2,this.player.meds);this.loadChapter(this.chapter+1);this.save();this.ui.intro(this.config);}
 finish(choice){this.setPaused(true);const ending=endingFor([...this.pages],[...this.allies],choice);this.sound.play('bell');this.ui.ending(ending);this.running=false;try{localStorage.setItem('resident-espey-completed',JSON.stringify({ending,stats:this.stats,pages:this.pages.size}));}catch{}}
 radio(name,text,seconds=6){if(this.settings.subtitles!==false){$('#speaker').textContent=name;$('#radio-text').textContent=text;$('#radio').style.opacity=1;this.radioUntil=this.time+seconds;}}
 toast(text){$('#toast').textContent=text;$('#toast').style.opacity=1;this.toastUntil=this.time+3.5;}
 proximity(){const p=this.player,candidates=this.items.filter(i=>!i.used);candidates.push(this.npc,{kind:'exit',x:(this.config.exit[0]+.5)*TILE,z:(this.config.exit[1]+.5)*TILE});let nearest=null,best=2.65;for(const c of candidates){const d=distance(p,c);const forward=viewDirection(p.yaw||0,0),angle=((c.x-p.x)*forward.x+(c.z-p.z)*forward.z)/(d||1);if(d<best&&(angle>.2||d<1.1)&&sight(this.grid,p,c)){nearest=c;best=d;}}this.nearest=nearest;const el=$('#interaction');el.hidden=!nearest;if(nearest){const names={ammo:'Take sidearm rounds',med:'Take first aid',page:'Read notebook page',fuse:'Recover power fuse',seal:'Recover seal fragment',anchor:'Restore anchor generator',save:'Save / restore vitals',exit:this.config.exitLabel};el.querySelector('span').textContent=nearest===this.npc?'Talk to '+nearest.name:names[nearest.kind];}}
 setHUD(){const p=this.player;if(!p)return;$('#chapter-label').textContent=`CHAPTER ${this.config.number} / ${this.config.name}`;$('#location-label').textContent=this.config.place;$('#objective').textContent=this.objectives<3?`${this.config.objectiveName}: ${this.objectives} / 3 — ${this.config.objective}`:!this.bossDead?'The breach is guarded. Defeat '+this.config.boss.name.split(' / ')[0]+'.':this.chapter===2?'Reach the PA in Room 204. Decide who gets to come home.':'The way is open. '+this.config.exitLabel+'.';$('#health-fill').style.width=p.hp+'%';$('#health-fill').style.background=p.hp<30?'#b95b46':p.hp<60?'#c6a75d':'#87b2a2';$('#health-state').textContent=p.hp<30?'DANGER':p.hp<60?'CAUTION':'FINE';$('#health-state').style.color=p.hp<30?'#e07a62':p.hp<60?'#d5ba76':'#87b2a2';$('#stamina-fill').style.width=p.stamina+'%';$('#world').dataset.state=JSON.stringify(this.snapshot());$('#ammo').textContent=p.ammo;$('#reserve').textContent=' / '+p.reserve;$('#meds').textContent=p.meds;$('#reload-progress').hidden=p.reloading<=0;$('#boss-hud').hidden=!this.boss||this.boss.dead;if(this.boss&&!this.boss.dead){$('#boss-name').textContent=this.config.boss.name;$('#boss-fill').style.width=Math.max(0,this.boss.hp/this.boss.max*100)+'%';}}
 frame(now){
  const dt=Math.min((now-this.last)/1000||.016,.045);this.frameMs=now-this.last;this.last=now;this.time+=dt;
  if(this.running){const p=this.player;
   if(!this.paused){
    this.stats.seconds+=dt;p.cooldown=Math.max(0,p.cooldown-dt);p.melee=Math.max(0,p.melee-dt);p.inv=Math.max(0,p.inv-dt);p.stamina=Math.min(100,p.stamina+22*dt);
    if(p.reloading>0){p.reloading-=dt;if(p.reloading<=0){const n=Math.min(12-p.ammo,p.reserve);p.ammo+=n;p.reserve-=n;this.sound.play('reload');}}
    p.yaw+=(Number(this.keys.has('ArrowLeft'))-Number(this.keys.has('ArrowRight')))*dt*1.7;
    p.pitch=clamp(p.pitch+(Number(this.keys.has('ArrowUp'))-Number(this.keys.has('ArrowDown')))*dt*1.3,-1.35,1.35);
    p.aiming=this.mouse.aiming||this.touch.aiming;p.crouching=this.keys.has('ControlLeft')||this.keys.has('KeyC');
    const strafe=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'))+this.touch.x,backward=Number(this.keys.has('KeyS'))-Number(this.keys.has('KeyW'))+this.touch.z;
    let {x:dx,z:dz}=relativeMove(strafe,backward,p.yaw),len=Math.hypot(dx,dz);
    p.sprinting=this.keys.has('ShiftLeft')&&p.stamina>4&&!p.aiming&&!p.crouching;let speed=p.crouching?2.15:p.aiming?2.8:p.sprinting?6:4.2;
    if(p.sprinting&&len)p.stamina=Math.max(0,p.stamina-37*dt);
    if(p.dash>0){p.dash-=dt;dx=p.dashX;dz=p.dashZ;len=1;speed=15;}
    if(len)this.move(p,dx/len*speed*dt,dz/len*speed*dt,.32);p.moving=len>0;
    const d=viewDirection(p.yaw,p.pitch);this.aim={x:p.x+d.x*12,z:p.z+d.z*12};this.world.setView(p,p.yaw,p.pitch,this.time,p.aiming);
    if(this.mouse.down||this.touch.fire)this.shoot();this.updateEnemies(dt);this.proximity();
    if(len&&Math.floor(this.time*(p.sprinting?3.5:2.2))!==this.lastStep){this.lastStep=Math.floor(this.time*(p.sprinting?3.5:2.2));this.sound.play('step');}
    if(this.time>this.nextRadio&&!this.specialRadio&&this.chapter===1){this.specialRadio=true;this.radio('NATHAN NUNLEY','If you hear me twice, follow the chalk. Trust what you can see.',6);}
    for(const i of this.items)if(!i.used&&i.model?.userData.ring)i.model.userData.ring.material.opacity=.25+Math.sin(this.time*2+i.id)*.1;
   }else p.moving=p.sprinting=false;
   this.shake*=Math.exp(-dt*9);this.flash*=Math.exp(-dt*4);$('#damage').style.opacity=this.flash*.65+(p.hp<30?.15:0);
   if(this.time>this.radioUntil)$('#radio').style.opacity=0;if(this.time>this.toastUntil)$('#toast').style.opacity=0;
   $('#look-hint').hidden=this.paused||this.pointerLocked||matchMedia('(pointer: coarse)').matches;
   $('#crosshair').classList.toggle('hit',this.time<(this.hitUntil||0));$('#crosshair').classList.toggle('headshot',this.headshot);
   $('#crosshair').classList.toggle('aiming',!!p.aiming);$('#flashlight-state').textContent=this.settings.flashlight===false?'LIGHT OFF':'LIGHT ON';
   this.world.update(dt,this.time,p,this.aim,this.settings.motion?0:this.shake);this.setHUD();
  }requestAnimationFrame(this.frame);
 }
 snapshot(){return{fps:Math.round(1000/(this.frameMs||16)),drawCalls:this.world?.worldCalls,perspective:'first-person',version:'2.0.0',props:this.world?.obstacles?.length,pointerLocked:this.pointerLocked,running:this.running,paused:this.paused,chapter:this.chapter,player:this.player?{x:this.player.x,z:this.player.z,yaw:this.player.yaw,pitch:this.player.pitch,hp:this.player.hp,ammo:this.player.ammo,reserve:this.player.reserve,meds:this.player.meds}:null,objectives:this.objectives,pages:this.pages.size,allies:this.allies.size,bossDead:this.bossDead,enemies:this.enemies?.filter(e=>!e.dead).length,nearest:this.nearest?.kind||this.nearest?.name,stats:{...this.stats}};}
}
