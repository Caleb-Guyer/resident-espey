import {crowdSteering,segmentDistanceSq,damageDirection} from './combat-space.js?v=5.4.0';
import {RenderBudget} from './render-budget.js?v=5.4.0';
import {GraphicsRecovery} from './graphics-recovery.js?v=5.4.0';
import {REGIONS,isZombie,initializeZombie,damageZombie,saveZombie,restoreZombie} from './zombie-damage.js?v=5.4.0';
import {syncZombieInjuries,detachZombieRegion,zombieHitParts,configureZombieLook} from './zombie-art.js?v=5.4.0';
import {WEAPONS,WEAPON_ORDER,weaponFor,ensureInventory,restoreInventory,inventorySave,switchWeapon,giveWeapon,giveAmmo,pelletDirection,bulletDamage} from './weapons.js?v=5.4.0';
import {BOSS_FIGHTS,isBoss,encounterDamage,saveBossProgress,restoreBossProgress,phaseRule} from './boss-fights.js?v=5.4.0';
import {BOSS_NAMES,BOSS_INTROS,displayName} from './boss-introductions.js?v=5.4.0';
import {prepareTasks,painted} from './loading.js?v=5.4.0';
import {ATTACKS,stepEnemy,damageScale,interruptAttack,enemyRadius,navigationGoal} from './enemy-director.js?v=5.4.0';
import {settleWeapon,shotDirection,applyRecoil} from './gunplay.js?v=5.4.0';
import {recordImpact,settleImpact} from './combat-motion.js?v=5.4.0';
import {CAMPAIGN_REVISION,roomAt,stageFor} from './levels.js?v=5.4.0';
import {beginReload,advanceReload,cancelReload,reloadProgress} from './reload.js?v=5.4.0';
import {World} from './world.js?v=5.4.0';
import {EYE_HEIGHT,viewDirection,relativeMove,traceShot} from './fps.js?v=5.4.0';
import {Sound} from './audio.js?v=5.4.0';
import {CHAPTERS,ENEMY_STATS,TILE,SAVE_KEY,DIFFICULTIES,makeGrid,solid,sight,findPath,distance,validSave,normalizeSave,endingFor} from './data.js?v=5.4.0';
import {Cinematics} from './cinematics.js?v=5.4.0';
import {MEMORY_LABELS,SCENES} from './story.js?v=5.4.0';
import {Voice} from './voice.js?v=5.4.0';
import {RADIO,characterId,voiceKey} from './dialogue.js?v=5.4.0';
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Game{
 constructor(ui,settings){this.ui=ui;this.settings=settings;this.debugSnapshots=document.documentElement?.hasAttribute('data-qa')||false;this.world=new World($('#world'),settings);this.sound=new Sound();this.sound.setVolume(settings.volume);this.voice=new Voice(this.sound,settings);this.running=false;this.paused=true;this.time=0;this.last=0;this.keys=new Set();this.mouse={x:0,y:0,down:false,aiming:false,drag:false};this.pointerLocked=false;this.touch={x:0,z:0,fire:false};this.aim={x:10,z:10};this.pages=new Set();this.allies=new Set();this.stats={kills:0,shots:0,hits:0,deaths:0,seconds:0};this.difficulty='survivor';this.chapter=0;this.dialogue=[];this.nextRadio=0;this.seenScenes=new Set();this.cinema=new Cinematics(this);this.setupInput();this.setupGraphicsRecovery($('#world'));addEventListener('beforeunload',()=>this.flushSave());addEventListener('pagehide',()=>this.flushSave());this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);}
 setupInput(){
  const canvas=$('#world');canvas.tabIndex=0;
  addEventListener('resize',()=>this.world.resize());
  addEventListener('keydown',e=>{
   if(e.code!=='Escape'&&['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(this.loading||this.applyingGraphics||this.graphicsUnavailable)return;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft'].includes(e.code))e.preventDefault();
   if(e.repeat)return;this.keys.add(e.code);
   if(this.cinema?.active){if(e.code==='Escape')this.cinema.togglePause();return;}
   if(e.code==='Escape'&&this.running){if(this.ui.isOpen())this.ui.close();else this.ui.pause();return;}
   if(!this.running||this.paused||this.loading)return;
   const actions={KeyE:'interact',KeyR:'reload',KeyQ:'heal',KeyF:'melee',Space:'dash',KeyM:'map',KeyJ:'journal',KeyP:'pause'};
   if(actions[e.code])this.action(actions[e.code]);
   if(['Digit1','Digit2','Digit3'].includes(e.code))this.equip(WEAPON_ORDER[Number(e.code.slice(-1))-1]);
   if(e.code==='KeyG'){this.settings.flashlight=this.settings.flashlight===false;this.toast(this.settings.flashlight?'Flashlight on':'Flashlight off');}
   if(e.code==='KeyX'){this.player.yaw+=Math.PI;this.player.pitch=0;}
  });
  addEventListener('keyup',e=>this.keys.delete(e.code));
  addEventListener('blur',()=>{if(this.cinema?.active)this.cinema.pause(true);this.keys.clear();this.mouse.down=this.mouse.aiming=this.mouse.drag=false;if(this.running&&!this.paused)this.ui.pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.flushSave();if(this.cinema?.active)this.cinema.pause(true);}if(document.hidden&&this.running&&!this.paused)this.ui.pause();});
  document.addEventListener('pointerlockchange',()=>{
   const was=this.pointerLocked;this.pointerLocked=document.pointerLockElement===canvas;
   document.body.classList.toggle('pointer-locked',this.pointerLocked);
   if(was&&!this.pointerLocked&&this.running&&!this.paused)this.ui.pause();
  });
  const look=(dx,dy,scale=1)=>{
   if(!this.running||this.paused||this.loading)return;
   const sensitivity=(this.settings.sensitivity||1)*.0022*scale*(this.mouse.aiming?.65:1);
   this.player.yaw-=dx*sensitivity;this.player.pitch=clamp(this.player.pitch-dy*sensitivity,-1.35,1.35);
  };
  addEventListener('pointermove',e=>{
   if(e.pointerType!=='mouse')return;
   if(this.pointerLocked)look(e.movementX,e.movementY);
   else if(this.mouse.drag)look(e.clientX-this.mouse.x,e.clientY-this.mouse.y);
   this.mouse.x=e.clientX;this.mouse.y=e.clientY;
  });
  const mouseButtons=buttons=>{
   this.mouse.down=!!(buttons&1);this.mouse.aiming=!!(buttons&2);this.mouse.drag=!this.pointerLocked&&(this.mouse.down||this.mouse.aiming);
   if(this.player)this.player.aiming=this.mouse.aiming||!!this.touch.aiming;
  };
  // Unlike pointerdown, mousedown fires when a second mouse button is pressed.
  canvas.addEventListener('mousedown',e=>{
   if(e.sourceCapabilities?.firesTouchEvents||!this.running||this.paused||this.loading||e.button!==0&&e.button!==2)return;
   this.sound.init();this.mouse.x=e.clientX;this.mouse.y=e.clientY;mouseButtons(e.buttons);this.capturePointer();
   if(e.button===0)this.shoot();
  });
  addEventListener('mouseup',e=>{if(!e.sourceCapabilities?.firesTouchEvents)mouseButtons(e.buttons);});
  addEventListener('pointercancel',e=>{if(e.pointerType==='mouse')mouseButtons(0);});
  canvas.addEventListener('wheel',e=>{if(!this.running||this.paused||this.loading)return;e.preventDefault();this.nextWeapon(e.deltaY>0?1:-1);},{passive:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const joy=$('#joystick'),knob=joy.querySelector('i');
  const move=e=>{if(!this.running||this.paused||this.loading)return;const b=joy.getBoundingClientRect(),dx=e.clientX-(b.x+b.width/2),dz=e.clientY-(b.y+b.height/2),len=Math.hypot(dx,dz),scale=Math.min(1,len/35);this.touch.x=len?dx/len*scale:0;this.touch.z=len?dz/len*scale:0;knob.style.transform='translate('+this.touch.x*32+'px,'+this.touch.z*32+'px)';};
  joy.addEventListener('pointerdown',e=>{if(!this.running||this.paused||this.loading)return;joy.setPointerCapture(e.pointerId);move(e);});
  joy.addEventListener('pointermove',e=>{if(joy.hasPointerCapture(e.pointerId))move(e);});
  const end=()=>{this.touch.x=this.touch.z=0;knob.style.transform='';};joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);joy.addEventListener('lostpointercapture',end);
  const pad=$('#look-pad');let lastTouch=null;
  pad.addEventListener('pointerdown',e=>{if(!this.running||this.paused||this.loading)return;pad.setPointerCapture(e.pointerId);lastTouch=[e.clientX,e.clientY];});
  pad.addEventListener('pointermove',e=>{if(pad.hasPointerCapture(e.pointerId)&&lastTouch){look(e.clientX-lastTouch[0],e.clientY-lastTouch[1],1.7);lastTouch=[e.clientX,e.clientY];}});
  pad.addEventListener('pointerup',()=>lastTouch=null);pad.addEventListener('pointercancel',()=>lastTouch=null);pad.addEventListener('lostpointercapture',()=>lastTouch=null);this.touch.firePointers=new Set();
  document.querySelectorAll('[data-action]').forEach(b=>{
   b.addEventListener('pointerdown',e=>{if(!this.running||this.paused||this.loading)return;e.preventDefault();b.setPointerCapture(e.pointerId);const action=b.dataset.action;
    if(action==='fire'){this.touch.firePointers.add(e.pointerId);this.touch.fire=true;if(this.running&&!this.paused)this.shoot();}
    else if(action==='aim'){this.touch.aiming=!this.touch.aiming;if(this.player)this.player.aiming=this.mouse.aiming||this.touch.aiming;}else this.action(action);
   });
   const end=e=>{if(b.dataset.action==='fire'){this.touch.firePointers.delete(e.pointerId);this.touch.fire=this.touch.firePointers.size>0;}};b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',end);
  });
 }
 setupGraphicsRecovery(canvas){
  this.renderBudget=new RenderBudget(this.world.renderer.getContext());
  const panel=$('#graphics-recovery'),heading=$('#graphics-recovery-title'),detail=$('#graphics-recovery-message'),reload=$('#reload-graphics');
  this.graphicsRecovery=new GraphicsRecovery({
   lost:()=>{this.graphicsUnavailable=true;this.renderBudget.clear();if(this.cinema?.active)this.cinema.pause(true);else this.setPaused(true);if(this.running&&this.player)this.save();if(panel)panel.hidden=false;if(heading)heading.textContent='Restoring graphics…';if(detail)detail.textContent='Your progress is held. Please wait.';if(reload)reload.hidden=true;clearTimeout(this.graphicsRecoveryTimer);this.graphicsRecoveryTimer=setTimeout(()=>{if(this.graphicsUnavailable){if(detail)detail.textContent='Graphics are taking longer than expected. You can reload your latest checkpoint.';if(reload)reload.hidden=false;}},15000);},
   warm:async()=>{await this.world.ready;await painted();if(this.world.root)await this.world.prepareCombatAsync();if(this.cinema?.active&&this.cinema.scene)await this.world.prepareSceneGPU(this.cinema.scene,this.world.camera);},
   ready:()=>{clearTimeout(this.graphicsRecoveryTimer);this.graphicsUnavailable=false;this.renderBudget=new RenderBudget(this.world.renderer.getContext());this.last=performance.now();this.cinemaLast=this.last;this.lastPausedRender=null;this.world.needsPausedRender=true;if(panel)panel.hidden=true;if(this.running&&!this.cinema?.active){if(!this.ui.isOpen?.())this.ui.pause?.();this.setPaused(true);}},
   failed:()=>{clearTimeout(this.graphicsRecoveryTimer);if(heading)heading.textContent='Graphics could not recover.';if(detail)detail.textContent='Reload the game to return to your latest checkpoint.';if(reload)reload.hidden=false;}
  });
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.graphicsRecovery.lose();});
  canvas.addEventListener('webglcontextrestored',()=>{this.graphicsRecovery.restore();});
  if(reload)reload.onclick=()=>{this.flushSave();location.reload();};
 }
 capturePointer(){
  if(matchMedia('(pointer: coarse)').matches||this.pointerLocked||this.paused||!this.running)return;
  try{const promise=$('#world').requestPointerLock?.();promise?.catch(()=>{});}catch{}
 }
 action(a){if(this.paused||!this.running||this.loading)return;if(a==='weapon')this.nextWeapon();else if(a==='map')this.ui.map();else if(a==='journal')this.ui.journal();else if(a==='pause')this.ui.pause();else this[a]?.();}
 async prepareRun(n,run,progress=()=>{}){
  if(this.loading)return false;this.loading=true;this.preparing=true;this.renderBudget?.clear();this.setPaused(true);const started=performance.now();
  try{
   await Promise.all([this.world.ready,this.sound?.ready]);this.cinema.cancel();this.cinema.clearPrepared?.();progress(.1);const c=CHAPTERS[n],recipes=[...new Map([...c.enemies.map(([kind])=>[kind,ENEMY_STATS[kind].color,kind]),[c.boss.kind,ENEMY_STATS[c.boss.kind].color,c.boss.kind],['npc',n===0?0x6c644c:n===1?0x6b7971:0x3e6554,['joel','landon','hall'][n]],...(['opening','closet','serum','descent','road','seal','return','sacrifice','promise','home','echoes','alone'].filter(id=>({opening:0,closet:0,serum:0,descent:1,road:1,seal:1,return:2,sacrifice:2,promise:2,home:2,echoes:2,alone:2})[id]===n).flatMap(id=>SCENES[id].actors.map(a=>[a.kind,a.color,a.id])))].map(a=>[a.join('/'),a])).values()];
   await prepareTasks(recipes.map(a=>()=>{const g=this.world.character(...a);this.world.disposeObject(g);}),p=>progress(.1+p*.45));
   this.audioPreparationFailed=false;if(this.voice)try{this.voice.init();await Promise.allSettled([c.boss.kind,...(n===1?['birdy']:[])].flatMap(kind=>BOSS_INTROS[kind].lines.map(l=>this.voice.load(voiceKey(l.speaker,l.text)))));}catch{this.audioPreparationFailed=true;}
   await this.cinema.prewarm?.((['opening','closet','serum','descent','road','seal','return','sacrifice','promise','choice','home','echoes','alone']).filter(id=>({opening:0,closet:0,serum:0,descent:1,road:1,seal:1,return:2,sacrifice:2,promise:2,choice:2,home:2,echoes:2,alone:2})[id]===n));await painted();run();progress(.7);this.world.setView(this.player,this.player.yaw,this.player.pitch,this.time);await this.world.prepareCombatAsync();this.world.update(0,this.time,this.player,this.aim,0);
   if(this.cinema.active){if(this.world.renderer.compileAsync)await this.world.renderer.compileAsync(this.cinema.scene,this.world.camera);this.cinema.update(0);}
   progress(1);await painted();this.preparation={chapter:n,models:recipes.length,ms:Math.round(performance.now()-started)};
  }finally{this.preparing=false;this.loading=false;this.last=performance.now();this.cinemaLast=null;}
 }
 equip(id){if(!switchWeapon(this.player,id))return false;this.world.setWeapon?.(id);this.sound.play('magOut');this.setHUD();return true;}
 nextWeapon(direction=1){const p=this.player;ensureInventory(p);const owned=WEAPON_ORDER.filter(id=>p.inventory[id]),index=owned.indexOf(p.weapon);return this.equip(owned[(index+direction+owned.length)%owned.length]);}
 newGame(difficulty){this.cinema?.cancel();this.seenScenes=new Set();this.difficulty=difficulty;this.pages=new Set();this.allies=new Set();this.stats={kills:0,shots:0,hits:0,deaths:0,seconds:0};this.player={x:0,z:0,hp:100,stamina:100,ammo:12,reserve:60,meds:3,inv:0,dash:0,cooldown:0,melee:0,reloading:0};ensureInventory(this.player);this.running=true;this.chapter=0;this.loadChapter(0);this.save();this.ui.intro(CHAPTERS[0]);}
 continueGame(){const v=this.readSave();if(!v)return false;this.restore(v);this.running=true;this.setPaused(false);if(!this.seenScenes.has(['opening','descent','return'][this.chapter]))this.ui.intro(this.config);else this.radio(...this.level.cues[this.objectives],7);return true;}
 readSave(){if(this.pendingSave)return this.pendingSave;try{const v=JSON.parse(localStorage.getItem(SAVE_KEY));return validSave(v)?normalizeSave(v):null;}catch{return null;}}
 restore(v){v=normalizeSave(v);this.cinema?.cancel();this.seenScenes=new Set((Array.isArray(v.scenes)?v.scenes:[]).filter(x=>typeof x==='string'));this.difficulty=v.difficulty;this.pages=new Set(v.pages);this.allies=new Set(v.allies);this.stats={kills:0,shots:0,hits:0,deaths:0,seconds:0,...v.stats};this.player={x:0,z:0,hp:100,stamina:100,ammo:v.ammo,reserve:v.reserve,meds:v.meds,inv:2,dash:0,cooldown:0,melee:0,reloading:0};restoreInventory(this.player,v.arsenal,v.chapter);const migrated=v.campaign!==CAMPAIGN_REVISION;
 const routeSave=migrated?{...v,position:null,collected:[],killed:[],bossSpawned:false,bossDead:false,puzzle:false,beats:[]}:v;
 this.loadChapter(v.chapter,routeSave);if(migrated)this.toast('New routes installed. Your chapter, memories and supplies are preserved.');}
 save(){if(!this.player)return;const p=this.player,arsenal=inventorySave(p),sidearm=arsenal.slots.sidearm;const v={version:1,campaign:CAMPAIGN_REVISION,beats:[...(this.beats||[])],chapter:this.chapter,difficulty:this.difficulty,pages:[...this.pages],allies:[...this.allies],scenes:[...(this.seenScenes||[])],ammo:sidearm.ammo,reserve:sidearm.reserve,arsenal,meds:p.meds,position:[p.x,p.z],yaw:p.yaw,pitch:p.pitch,hp:p.hp,collected:this.items.filter(i=>i.used).map(i=>i.id),killed:this.enemies.filter(e=>e.dead).map(e=>e.id),bossSpawned:this.bossSpawned,bossDead:this.bossDead,puzzle:this.puzzleSolved,stats:{...this.stats},zombieProgress:this.enemies.filter(e=>e.zombie&&!e.dead).map(saveZombie),bossProgress:this.enemies.filter(e=>!e.dead&&isBoss(e.kind)).map(saveBossProgress),time:Date.now()};this.checkpoint=structuredClone(v);this.pendingSave=v;if(!this.saveTicket){const write=()=>{this.saveTicket=null;this.flushSave();};this.saveTicket=typeof requestIdleCallback==='function'?requestIdleCallback(write,{timeout:900}):setTimeout(write,120);}this.ui.updateContinue();}
 flushSave(){if(!this.pendingSave)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.pendingSave));this.pendingSave=null;this.storageFailed=false;}catch{this.storageFailed=true;}}
 retry(){const deaths=this.stats.deaths+1;const v=this.checkpoint||this.readSave();if(v){this.restore(v);this.player.hp=100;this.stats.deaths=deaths;this.running=true;this.setPaused(false);this.radio(...RADIO.retry,4);this.save();}}
 loadChapter(n,saved){this.voice?.stop();if(!this.preparing&&this.chapter!==n)this.cinema?.clearPrepared?.();this.chapter=n;this.restoringBossProgress=Array.isArray(saved?.bossProgress)?saved.bossProgress.slice(0,4):[];this.restoringZombies=Array.isArray(saved?.zombieProgress)?saved.zombieProgress.slice(0,64):[];this.config=CHAPTERS[n];this.level=this.config.level;this.beats=new Set(saved?.beats||[]);this.grid=makeGrid(this.config.theme);this.diff=DIFFICULTIES[this.difficulty];this.world.load(this.config,this.grid);this.world.syncGates?.(stageFor(saved?.collected||[]),true);const p=this.player;ensureInventory(p);this.world.setWeapon?.(p.weapon);const start=this.config.start;p.x=(start[0]+.5)*TILE;p.z=(start[1]+.5)*TILE;if(saved&&Array.isArray(saved.position)&&saved.position.length===2&&saved.position.every(Number.isFinite)&&!solid(this.grid,saved.position[0],saved.position[1])&&!this.world.blocked(saved.position[0],saved.position[1],.32)){[p.x,p.z]=saved.position;p.hp=clamp(saved.hp||100,1,100);}p.stamina=100;p.inv=2;p.dash=0;p.reloading=0;p.yaw=Number.isFinite(saved?.yaw)?saved.yaw:0;p.pitch=Number.isFinite(saved?.pitch)?clamp(saved.pitch,-1.35,1.35):0;p.aiming=false;p.crouching=false;p.eyeHeight=EYE_HEIGHT;this.aim={x:p.x,z:p.z-10};this.model=this.world.character('player');this.world.root.add(this.model);this.model.position.set(p.x,0,p.z);this.model.visible=false;this.items=this.config.items.map((i,id)=>{const item={...i,id,x:(i.at[0]+.5)*TILE,z:(i.at[1]+.5)*TILE,used:saved?.collected?.includes(id)||i.kind==='page'&&this.pages.has(i.page)};if(i.kind==='page')item.model=this.world.memoryObject(i.page,item.x,item.z,item.used);else if(!item.used||i.kind==='anchor'||i.appearance==='switch'){item.model=this.world.object(i.appearance==='switch'?'anchor':i.kind,item.x,item.z,i.weapon);if(item.used)this.world.activateObjective?.(item.model);}return item;});this.enemies=[];this.boss=null;this.config.enemies.forEach(([kind,x,z,stage],id)=>{if(!saved?.killed?.includes(id)){const e=this.spawn(kind,x,z,false,id);e.unlock=stage;e.dormant=true;e.model.visible=false;}else this.enemies.push({id,dead:true});});this.bossSpawned=!!saved?.bossSpawned;this.bossDead=!!saved?.bossDead;this.puzzleSolved=!!saved?.puzzle;this.objectives=stageFor(this.items.filter(i=>i.used).map(i=>i.id));
 this.warmedBoss=null;this.warmedBossMarker=null;if(this.bossSpawned&&!this.bossDead)this.spawnBoss(false);else if(!this.bossDead){this.warmedBoss=this.world.character(this.config.boss.kind,ENEMY_STATS[this.config.boss.kind].color);this.warmedBoss.position.set((this.config.boss.at[0]+.5)*TILE,0,(this.config.boss.at[1]+.5)*TILE);this.warmedBoss.visible=false;this.world.root.add(this.warmedBoss);this.warmedBossMarker=this.world.attackMarker?.();}const npc=this.config.npc;this.npc={name:npc.name,x:(npc.at[0]+.5)*TILE,z:(npc.at[1]+.5)*TILE,line:0};this.npc.model=this.world.character('npc',n===0?0x6c644c:n===1?0x6b7971:0x3e6554,['joel','landon','hall'][n]);this.npc.model.position.set(this.npc.x,0,this.npc.z);this.npc.model.rotation.y=Math.atan2(p.x-this.npc.x,p.z-this.npc.z);this.world.root.add(this.npc.model);this.reinforcements=new Map();if(n===2)for(const [kind,id]of [['crawler',101],['spitter',102]]){const model=this.world.character(kind,ENEMY_STATS[kind].color),warning=this.world.attackMarker?.();model.visible=false;this.world.root.add(model);this.reinforcements.set(id,{kind,model,warning});}if(this.boss?.kind==='zeb'&&this.boss.summoned)for(const[kind,id,x]of [['crawler',101,14],['spitter',102,19]])if(!saved?.killed?.includes(id))this.spawn(kind,x,5,false,id);this.syncStage(true);this.world.setView(p,p.yaw,p.pitch,this.time);if(!this.preparing)this.world.prepareCombat?.();this.encounterKinds=new Set();this.shake=0;this.flash=0;this.radioUntil=0;this.toastUntil=0;this.birdySpoke=false;this.specialRadio=false;this.nextRadio=this.time+14;this.nearest=null;this.sound.play('bell');this.setHUD();this.ui.showGame();this.chapterStart=this.time;this.objectiveKey='';this.objectiveUntil=this.time+8;$('#tutorial').textContent='WASD  Move   ·   Mouse  Look   ·   E  Interact';}
 spawn(kind,cx,cz,boss=false,id){const stat=ENEMY_STATS[kind],max=stat.hp*(this.difficulty==='story'?.85:1),reserved=this.reinforcements?.get(id);const e={id:id??this.enemies.length,kind,x:(cx+.5)*TILE,z:(cz+.5)*TILE,hp:max,max,speed:stat.speed*this.diff.enemySpeed,damage:stat.damage*this.diff.damage,range:stat.range,boss,dead:false,alert:boss,cool:1.5,path:[],pathTimer:0,stagger:0,windup:0,charge:0,phase:0};initializeZombie(e,this.chapter);e.model=reserved?.kind===kind?reserved.model:boss&&this.warmedBoss?.userData?.kind===kind?this.warmedBoss:this.world.character(kind,stat.color);if(boss&&e.model===this.warmedBoss)this.warmedBoss=null;e.model.visible=true;e.model.position.set(e.x,0,e.z);this.world.root.add(e.model);e.pathTimer=(e.id%11)*.08;
  e.warning=reserved?.kind===kind?reserved.warning:boss&&this.warmedBossMarker?this.warmedBossMarker:this.world.attackMarker?.();if(boss)this.warmedBossMarker=null;if(e.warning)e.warning.visible=false;
  this.reinforcements?.delete(id);if(e.zombie){restoreZombie(e,this.restoringZombies?.find(s=>s.id===e.id),(x,z)=>!solid(this.grid,x,z,enemyRadius(e))&&!this.world.blocked?.(x,z,enemyRadius(e)));configureZombieLook(e.model,e);syncZombieInjuries(e.model,e);e.model.position.set(e.x,0,e.z);e.blindTarget={x:e.x+Math.sin(e.model.rotation.y)*5,z:e.z+Math.cos(e.model.rotation.y)*5};}if(isBoss(kind)){e.beatsDone=new Set();restoreBossProgress(e,this.restoringBossProgress?.find(s=>s.id===e.id),(x,z)=>!solid(this.grid,x,z,enemyRadius(e))&&!this.world.blocked?.(x,z,enemyRadius(e)));e.model.position.set(e.x,0,e.z);}e.reactionMaterials=this.world.reactionMaterials?.(e.model)||[];e.hitDataDirty=true;this.enemies.push(e);return e;}
 spawnBoss(announce=true){if(this.chapter===1&&!this.bossSpawned&&this.enemies.some(e=>e.kind==='birdy'&&!e.dead)){this.toast('Defeat Lil Birdy first.');return false;}const b=this.config.boss;this.boss=this.spawn(b.kind,...b.at,true,99);this.bossSpawned=true;this.boss.introduced=!announce;if(announce){this.save();if(!this.introduceBoss(this.boss)){this.sound.play('boss');this.radio(...RADIO.bosses[this.chapter],6);}}}
 introduceBoss(e){
  const id='encounter-'+e.kind;if(!this.cinema?.playEncounter||this.seenScenes?.has(id)){e.introduced=true;return false;}
  e.introduced=true;this.world?.bossArena?.update(this,0);this.cinema.playEncounter(e,()=>{this.seenScenes?.add(id);if(e.kind==='birdy')this.birdySpoke=true;e.cool=Math.max(1.6,e.cool);this.player.inv=Math.max(2,this.player.inv);this.save();this.ui.showGame();this.setPaused(false);this.setHUD();});return true;
 }
 setPaused(p){
  p=!!(p||this.graphicsUnavailable);
  this.paused=p;this.renderBudget?.clear();this.lastPausedRender=null;this.cinematicHeld=false;this.keys.clear();this.mouse.down=this.mouse.aiming=this.mouse.drag=false;this.touch.fire=this.touch.aiming=false;this.touch.firePointers?.clear();this.touch.x=this.touch.z=0;if(this.player)this.player.aiming=false;const knob=$('#joystick')?.querySelector('i');if(knob?.style)knob.style.transform='';
  this.sound.pause(p);this.voice?.pause(p);$('#crosshair').hidden=p;$('#look-hint').hidden=p;
  if(p&&this.player&&this.config&&this.level)this.setHUD();
  if(p&&document.pointerLockElement)document.exitPointerLock?.();else if(!p)this.capturePointer();
 }
 move(o,dx,dz,r){
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.25));
  const blocked=(x,z)=>solid(this.grid,x,z,r)||this.world.blocked?.(x,z,r);
  for(let i=0;i<steps;i++){if(!blocked(o.x+dx/steps,o.z))o.x+=dx/steps;if(!blocked(o.x,o.z+dz/steps))o.z+=dz/steps;}
 }
 shoot(){
  const p=this.player,w=weaponFor(p);if(p.cooldown>0||p.equipping>0||p.dash>0||p.melee>0)return;
  if(p.reloading>0){if(w.id==='shotgun'&&p.ammo>0)cancelReload(p);else return;}
  if(p.ammo<=0){p.cooldown=.3;this.sound.play('empty');if(p.reserve)this.reload();else this.toast('No rounds. Use the knife, then dodge.');return;}
  p.ammo--;p.cooldown=w.interval;this.stats.shots++;this.sound.fire?.(w.id);this.shake=.025*w.recoil;this.world.fireWeapon?.(p.aiming,w.id);
  const yaw=Number.isFinite(p.yaw)?p.yaw:Math.atan2(p.x-this.aim.x,p.z-this.aim.z),center=shotDirection(p,yaw,p.pitch||0),origin={x:p.x,y:Number.isFinite(p.eyeHeight)?p.eyeHeight:p.crouching?1.14:EYE_HEIGHT,z:p.z};this.prepareEnemyHits();
  const tracerStart=this.world.muzzleOrigin?.(p)||origin;let anyHit=false;this.headshot=false;const impacts=this.shotImpacts||=([]),pool=this.shotImpactPool||=Array.from({length:8},()=>({}));impacts.length=0;
  for(let i=0;i<w.pellets;i++){
   const direction=pelletDirection(center,i,w.pellets,w.spread*(p.aiming?.72:1),this.stats.shots*.41),hit=traceShot(this.grid,origin,this.enemies,direction,this.world.obstacles||[],w.range);
   this.world.tracer(tracerStart,hit.end);
   if(hit.enemy){let impact=impacts.find(v=>v.enemy===hit.enemy);if(!impact){impact=pool[impacts.length];impact.regions??=new Float32Array(6);impact.regions.fill(0);Object.assign(impact,{enemy:hit.enemy,damage:0,bodyDamage:0,headshot:false,headIndex:null});impacts.push(impact);}const damage=bulletDamage(w,hit)*this.diff.power;impact.regions[Math.max(0,REGIONS.indexOf(hit.hitPart))]+=damage;if(hit.headshot)impact.damage+=damage;else impact.bodyDamage+=damage;impact.headshot||=hit.headshot;if(hit.headshot)impact.headIndex=hit.headIndex;anyHit=true;if(this.world.zombieGore)this.world.zombieGore.burst(hit.end,direction);else this.world.effect(hit.end.x,hit.end.z,0x81392b,w.pellets>1?3:8,hit.end.y);this.hitUntil=this.time+.18;this.headshot||=hit.headshot;}
   else this.world.effect(hit.end.x,hit.end.z,0xc2b59c,w.pellets>1?2:4,hit.end.y);
  }
  for(const hit of impacts)this.hurtEnemy(hit.enemy,hit.damage,center.x,center.z,hit.headshot,hit.headIndex,hit.bodyDamage,hit.regions);if(anyHit){this.stats.hits++;this.sound.impact?.(this.headshot);}if(w.id!=='shotgun')this.world.ejectCasing?.(origin,yaw,p);applyRecoil(p);
  this.enemies.forEach(e=>{if(!e.dead&&!e.dormant&&distance(e,p)<(w.id==='shotgun'?24:17))e.alert=true;});
 }
 prepareEnemyHits(){for(const e of this.enemies){if(e.dead||e.dormant||!e.model||distance(e,this.player)>weaponFor(this.player).range)continue;if(e.model.userData?.bossRig||e.model.userData?.licensedActor||e.kind==='crawler'){e.hitHeads=this.world.headPositions(e.model);if(e.model.userData?.bossRig)e.hitParts=this.world.bossHitParts(e.model,false);else if(e.model.userData?.licensedActor)e.hitParts=zombieHitParts(e.model,false);}e.hitDataDirty=false;}}
 playBossBeat(e,id,after=()=>{}){
  e.beatsDone||=new Set();if(e.beatsDone.has(id)){after();return;}e.beatsDone.add(id);e.windup=e.charge=0;e.attack=null;e.comboPattern=null;this.save();
  const done=()=>{after();e.recover=Math.max(2,e.recover||0);e.cool=Math.max(2.3,e.cool||0);e.hitDataDirty=true;this.player.inv=Math.max(2,this.player.inv);this.save();this.ui.showGame();this.setPaused(false);this.setHUD();};
  if(this.cinema?.playEncounter)this.cinema.playEncounter(e,done,id);else done();
 }
 hurtEnemy(e,damage,nx=0,nz=0,headshot=false,head=null,bodyDamage=0,regions=null){
  if(e.dead)return;damage=damage*damageScale(e,headshot)+bodyDamage*damageScale(e,false);
  recordImpact(e,damage,nx,nz,headshot,head,regions);
  if(interruptAttack(e,headshot,head)){if(e.warning)e.warning.visible=false;this.toast(e.kind==='jakob'?'The speaking head falls silent.':'Attack interrupted.');}
  const applied=encounterDamage(e,damage);if(applied<damage&&!e.guardNotified){e.guardNotified=true;this.toast(e.kind==='jakob'&&e.phase===2?'Lure them beneath the press.':'Bait an attack.');}if(applied===0){e.alert=true;return;}damage=applied;
  const injury=damageZombie(e,regions,damage);e.hp-=damage;if(injury.fatal)e.hp=0;
  for(const region of injury.severed){const piece=detachZombieRegion(e.model,region);this.world.zombieGore?.detach(piece,{x:nx,z:nz});const point=piece?.getWorldPosition?.(this.world.gorePoint);if(point)this.world.zombieGore?.burst(point,{x:nx,z:nz},true);}
  if(injury.severed.includes('head')){e.blindTarget={x:e.x+Math.sin(e.model.rotation.y)*5,z:e.z+Math.cos(e.model.rotation.y)*5};e.path=[];}
  if(e.zombie)syncZombieInjuries(e.model,e);
  e.alert=true;e.stagger=Math.max(e.stagger||0,isBoss(e.kind)?.1:headshot?.45:e.kind==='brute'||e.kind==='bulwark'?.08:.16);e.hitSide=nx*Math.cos(e.model.rotation.y||0)-nz*Math.sin(e.model.rotation.y||0)||1;
  const push=isBoss(e.kind)?.12:e.kind==='brute'||e.kind==='bulwark'?.06:.18;this.move(e,nx*push,nz*push,enemyRadius(e));e.reactionMaterials??=this.world.reactionMaterials?.(e.model)||[];for(const m of e.reactionMaterials)m.emissive.setHex(0x180304);
  if(e.hp<=0){e.dead=true;this.stats.kills++;e.deathTime=0;this.world.bossArena?.defeated(this,e);if(isBoss(e.kind))this.world.enemyEffects?.clearHazards();if(e.zombie)this.world.zombieGore?.stain(e.x,e.z,.85);else this.world.effect(e.x,e.z,0xb79760,10);if(e.warning)e.warning.visible=false;
   giveAmmo(this.player,'sidearm',e.boss||isBoss(e.kind)?30:4);if(isBoss(e.kind)){for(const id of ['shotgun','carbine'])if(this.player.inventory[id])giveAmmo(this.player,id,id==='shotgun'?6:18);}
   if(e.boss){this.bossDead=true;this.sound.play('bell');this.toast('The way is open. +30 rounds');this.radio(...(this.chapter===2?RADIO.remembered:RADIO.fallen),5);this.save();}else if(isBoss(e.kind)){this.sound.play('bell');this.toast('Lil Birdy is down. +30 rounds');this.save();}
  }
 }

 reload(){if(this.player.melee>0||this.player.dash>0)return;if(beginReload(this.player))this.sound.play('reload');}
 melee(){const p=this.player;if(p.melee>0||p.dash>0)return;cancelReload(p);p.melee=.6;p.cooldown=Math.max(p.cooldown,.18);this.sound.play('knife');this.world.swingKnife?.();p.inv=Math.max(p.inv,.2);this.shake=.08;let hit=false;const dx=this.aim.x-p.x,dz=this.aim.z-p.z,len=Math.hypot(dx,dz)||1;for(const e of this.enemies){if(e.dead||e.dormant||distance(e,p)>2.35||!this.canSee(p,e))continue;const ex=e.x-p.x,ez=e.z-p.z;if((ex*dx+ez*dz)/(Math.hypot(ex,ez)*len||1)>-.2){const nx=ex/(Math.hypot(ex,ez)||1),nz=ez/(Math.hypot(ex,ez)||1);this.hurtEnemy(e,40*this.diff.power,nx,nz);this.world.effect(e.x,e.z,0x530c08,8,1.25);this.hitUntil=this.time+.18;this.headshot=false;hit=true;}}if(hit)this.sound.impact?.();}
 dash(){
  const p=this.player;if(p.stamina<32||p.dash>0)return;cancelReload(p);p.stamina-=32;p.dash=.24;p.inv=.32;
  const strafe=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'))+this.touch.x,backward=Number(this.keys.has('KeyS'))-Number(this.keys.has('KeyW'))+this.touch.z;
  let {x:dx,z:dz}=relativeMove(strafe,backward,p.yaw||0),len=Math.hypot(dx,dz);
  if(!len){const d=viewDirection(p.yaw||0,0);dx=d.x;dz=d.z;len=1;}p.dashX=dx/len;p.dashZ=dz/len;this.sound.play('dash');
 }
 heal(){const p=this.player;if(!p.meds){this.toast('No first aid. Search for green supplies.');return;}if(p.hp>=100){this.toast('Your vitals are stable.');return;}p.meds--;p.hp=clamp(p.hp+65,0,100);p.inv=.6;this.sound.play('heal');this.toast('First aid applied. +65 vitals');}
 hurt(damage,source=null){const p=this.player;if(!Number.isFinite(damage)||damage<=0||p.hp<=0||p.inv>0||this.paused)return false;p.hp=Math.max(0,p.hp-damage);p.inv=.8;this.flash=1;this.shake=.6;const direction=damageDirection(p,source,this.hurtDirection||=( {} )),overlay=$('#damage');overlay.style.setProperty('--hit-x',direction.x+'%');overlay.style.setProperty('--hit-y',direction.y+'%');this.sound.play('hit');if(p.hp<=0){this.setPaused(true);this.ui.death();}return true;}
 updateEnemies(dt){
  const p=this.player;if(p.hp<=0)return;this.world.bossArena?.update(this,dt);this.world.enemyEffects?.update(dt,this);this.world.zombieGore?.update(dt,this.grid,this.world.obstacles);let pathBudget=2;
  for(const e of this.enemies){
   settleImpact(e,dt);
   if(e.dead){if(e.model&&Number.isFinite(e.deathTime)){e.model.visible=distance(e,p)<24;if(e.deathTime<3){e.deathTime=Math.min(3,e.deathTime+dt);this.world.animateCharacter(e.model,this.time,false,e);this.world.zombieGore?.bleed?.(e.model,e,dt);}}continue;}
   if(e.dormant)continue;const dist=distance(e,p);e.model.visible=dist<30||e.boss;
   const headless=e.zombie?.severed[1],visible=dist<(headless?1.9:15)&&sight(this.grid,e,p)&&this.world.clearSight?.(e,p,e.kind==='crawler'?.6:e.kind==='zeb'||e.kind==='jakob'?2.2:1.6,p.crouching?1.14:1.64)!==false;if(dist<9&&visible)e.alert=true;
   if(!e.alert||dist>32){if(dist<22)this.world.animateCharacter(e.model,this.time,false,e);continue;}
   if(dist<13&&this.time>(e.nextGrowl||0)){e.nextGrowl=this.time+5+(e.id%5);const side=Math.cos(p.yaw||0)*(e.x-p.x)-Math.sin(p.yaw||0)*(e.z-p.z);this.sound.growl?.(side/(dist||1),Math.max(.12,1-dist/16));}
   if(e.kind==='birdy'&&!e.introduced&&visible&&dist<11&&this.introduceBoss(e))return;
   if(e.kind==='birdy'&&!this.birdySpoke){this.birdySpoke=true;this.radio(...RADIO.birdy,5);}
   const result=stepEnemy(e,dt,{player:p,visible,wallHit:e.wallHit});e.wallHit=false;
   for(const event of result.events)this.enemyEvent(e,event);if(this.cinema?.active||p.hp<=0)return;
   if(result.mode==='charge'){
    const ox=e.x,oz=e.z;this.move(e,e.chargeX*result.speed*dt,e.chargeZ*result.speed*dt,enemyRadius(e));
    e.wallHit=Math.abs(e.x-ox-e.chargeX*result.speed*dt)+Math.abs(e.z-oz-e.chargeZ*result.speed*dt)>1e-5;
    if(!e.hitCharge&&segmentDistanceSq(p.x,p.z,ox,oz,e.x,e.z)<ATTACKS[e.attack].radius**2&&this.canSee(e,p)){this.hurt(e.damage*ATTACKS[e.attack].damage,e);e.hitCharge=true;}
   }else if(result.mode!=='hold'){
    if(headless&&!visible&&(distance(e,e.blindTarget)<.45||(e.blindStuck||0)>.7)){const angle=e.model.rotation.y+.9;e.blindTarget={x:e.x+Math.sin(angle)*4,z:e.z+Math.cos(angle)*4};e.blindStuck=0;}
    let target=headless&&!visible?e.blindTarget:p;e.pathTimer-=dt;
    if(!headless&&(!visible||this.world.clearWalkPath?.(e,p,enemyRadius(e))===false)){
     if(e.pathTimer<=0&&pathBudget>0){const grid=this.navGrid||this.grid,goal=navigationGoal(grid,p,(a,b)=>!this.world.blocked?.(a.x,a.z,enemyRadius(e))&&this.world.clearWalkPath?.(a,b,enemyRadius(e))!==false);e.path=goal?findPath(grid,e,goal):[];e.pathTimer=.8+(e.id%7)*.08;pathBudget--;}
     while(e.path.length&&distance(e,e.path[0])<.45)e.path.shift();target=e.path[0];
    }
    if(target){let dx=target.x-e.x,dz=target.z-e.z,len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
     if(result.mode==='retreat'){dx=-dx;dz=-dz;}if(result.mode==='strafe'){const side=e.id%2?1:-1;[dx,dz]=[-dz*side,dx*side];}
     if(e.kind==='stalker'&&visible&&dist>3&&dist<8){const side=e.id%2?1:-1;[dx,dz]=[dx*.75-dz*.45*side,dz*.75+dx*.45*side];}
     const steering=crowdSteering(e,this.enemies,p,dx,dz,e.steering||=( {} )),ox=e.x,oz=e.z;this.move(e,steering.x*e.speed*dt*(result.speedScale||1),steering.z*e.speed*dt*(result.speedScale||1),enemyRadius(e));if(headless)e.blindStuck=Math.hypot(e.x-ox,e.z-oz)<.002?(e.blindStuck||0)+dt:0;
     this.world.faceCharacter(e.model,Math.atan2(target.x-e.x,target.z-e.z),dt);
    }
   }
   if(e.windup>0||e.charge>0)this.world.faceCharacter(e.model,Math.atan2(e.chargeX,e.chargeZ),dt);
   if(e.warning){e.warning.visible=e.windup>0;this.world.updateAttackMarker?.(e);}
   if(e.kind==='birdy'){const yaw=e.model.rotation.y,span=(e.model.userData.wingspan||6.8)/2+.15;e.wingSpace=!solid(this.grid,e.x+Math.cos(yaw)*span,e.z-Math.sin(yaw)*span,.1)&&!solid(this.grid,e.x-Math.cos(yaw)*span,e.z+Math.sin(yaw)*span,.1);}
   e.model.position.x=e.x;e.model.position.z=e.z;this.world.animateCharacter(e.model,this.time,result.mode==='chase'||result.mode==='charge',e);this.world.zombieGore?.bleed?.(e.model,e,dt);
   e.hitDataDirty=true;
   for(const m of e.reactionMaterials||[])m.emissive.multiplyScalar(Math.exp(-dt*7.67));
  }
 }
 enemyEvent(e,event){
  const fx=this.world.enemyEffects,a=event.attack;if(event.type==='release'&&event.name==='alarm'){for(const other of this.enemies)if(!other.dead&&!other.dormant&&distance(other,e)<18)other.alert=true;this.sound.growl?.(0,.8);}
  if(event.type==='tell'){if(e.kind==='birdy'&&e.phase>=3&&event.name==='groundRush')this.sound.scream?.('birdy');this.sound.tone?.(e.kind==='birdy'?390:e.kind==='zeb'?95:160,.35,'sawtooth',.08,60);if(e.warning)e.warning.visible=true;}
  if(event.type==='release'){
   this.sound.play(e.boss||e.kind==='birdy'?'boss':'knife');
   if(a.heal&&!(e.purged>0)){const cap=e.max*(BOSS_FIGHTS[e.kind]?.phases[e.phase]?.threshold||1);e.hp=Math.min(cap,e.hp+e.max*a.heal);}if(a.projectile)fx?.volley(e,a);
   else if(a.wave)fx?.wave(e,a.wave,e.damage*a.damage);
   else if(!a.dash&&distance(e,this.player)<a.radius&&this.canSee(e,this.player)){
    const dx=this.player.x-e.x,dz=this.player.z-e.z,len=Math.hypot(dx,dz)||1;
    if(!a.cone||(dx*e.chargeX+dz*e.chargeZ)/len>a.cone)this.hurt(e.damage*a.damage,e);
   }
   if(e.kind==='brute')this.world.effect(e.x,e.z,0xaaa18a,10);
  }
  if(event.type==='wall'){this.sound.play('slam');this.world.effect(e.x,e.z,0xb6ab88,12);if(e.kind==='chris')this.toast('Chris is stunned. Take the shot.');}
  if(event.type==='phase'){
   if(e.kind==='zeb'&&!e.summoned){e.summoned=true;this.spawn('crawler',14,5,false,101);this.spawn('spitter',19,5,false,102);giveAmmo(this.player,'sidearm',24);}
   if(e.kind==='jakob'&&e.phase===2)this.toast('The press can stop them. Lure them beneath it.');
   else if(e.kind==='birdy'&&e.phase===3)this.toast('Both wings are gone. Watch for the charge.');
   const beat=phaseRule(e)?.beat;if(beat)this.playBossBeat(e,beat);else this.save();
  }
 }
 interact(){const n=this.nearest;if(!n||n.used)return;if(n.kind==='bossMechanism'){this.world.bossArena?.interact(this,n);return;}if(n===this.npc){const line=this.config.npc.lines[n.line%3];n.line++;this.allies.add(this.chapter);this.radio(n.name.toUpperCase(),line,8);this.toast('Name anchored: '+n.name);this.save();return;}
 if(n.kind==='exit'){if(this.chapter===1&&this.objectives>=3&&this.enemies.some(e=>e.kind==='birdy'&&!e.dead)){this.toast('Defeat Lil Birdy before opening the seal.');return;}if(this.objectives<3){this.toast('Restore all three '+this.config.objectiveName.toLowerCase()+'.');return;}if(!this.bossDead){if(!this.bossSpawned)this.spawnBoss();else this.toast('The breach is guarded. Face what the bell called.');return;}if(this.chapter===1&&!this.puzzleSolved){this.ui.puzzle();return;}if(this.chapter===2){this.ui.finale();return;}this.nextChapter();return;}
 if(this.chapter===1&&n.stage===2&&this.enemies.some(e=>e.kind==='birdy'&&!e.dead)){this.toast('Defeat Lil Birdy first.');return;}
 if(Number.isInteger(n.stage)&&n.stage!==this.objectives){this.toast(this.level.tasks[this.objectives]);return;}
 if(n.kind==='save'){this.player.hp=100;this.save();this.sound.play('pickup');this.toast(this.storageFailed?'Checkpoint held for this session. Browser storage is unavailable.':'Checkpoint saved. Vitals restored.');return;}
 n.used=true;if(n.kind==='page')this.world.rememberMemory?.(n.model);else if(n.kind==='anchor'||n.appearance==='switch')this.world.activateObjective?.(n.model);else this.world.root.remove(n.model);this.sound.play('pickup');if(n.kind==='weapon'){const fresh=giveWeapon(this.player,n.weapon);this.toast(fresh?weaponFor({weapon:n.weapon}).name+' acquired · '+WEAPONS[n.weapon].slot+' to equip':'Extra ammunition');if(fresh){this.player.equipping=0;this.equip(n.weapon);}this.save();}else if(n.kind==='ammo'){giveAmmo(this.player,n.weapon||'sidearm',n.amount||24);this.toast('+'+(n.amount||24)+' '+(n.weapon==='shotgun'?'shells':n.weapon==='carbine'?'carbine rounds':'sidearm rounds'));this.save();}else if(n.kind==='med'){this.player.meds=Math.min(99,this.player.meds+1);this.toast('+1 first aid');}else if(n.kind==='page'){this.pages.add(n.page);this.save();this.ui.page(n.page);}else{this.objectives=stageFor(this.items.filter(i=>i.used).map(i=>i.id));this.syncStage();this.toast(this.level.tasks[this.objectives]);this.radio(...this.level.cues[this.objectives],7);this.save();}}
 syncStage(immediate=false){
  this.world.syncGates?.(this.objectives,immediate);
  for(const e of this.enemies)if(!e.dead&&e.unlock!==undefined){e.dormant=e.unlock>this.objectives;e.model.visible=!e.dormant;}
  this.rebuildNavigation();
 }
 rebuildNavigation(){this.world.navigationDirty=false;this.navGrid=this.grid.map(row=>[...row]);for(let z=1;z<this.grid.length-1;z++)for(let x=1;x<this.grid[0].length-1;x++)if(this.world.blocked((x+.5)*TILE,(z+.5)*TILE,.38))this.navGrid[z][x]=1;
 }
 canSee(a,b){if(b.kind==='bossMechanism')return this.world.bossArena?.canSeeControl(a,b)!==false;return sight(this.grid,a,b)&&this.world.clearWalkPath?.(a,b)!==false;}
 directRoute(){
  if(!this.level)return;
  for(const b of this.level.beats){if(this.beats.has(b.id)||this.objectives<b.stage||distance(this.player,{x:(b.at[0]+.5)*TILE,z:(b.at[1]+.5)*TILE})>TILE*1.4)continue;
   if(b.boss&&this.chapter===1&&this.enemies.some(e=>e.kind==='birdy'&&!e.dead))continue;this.beats.add(b.id);if(b.sound)this.sound.play(b.sound);if(b.blackout)this.world.blackoutUntil=this.time+b.blackout;
   if(b.line)this.radio(...b.line,7);if(b.boss&&!this.bossSpawned)this.spawnBoss();
  }
 }

 nextChapter(){const n=this.chapter+1,run=()=>{this.player.hp=100;this.player.ammo=12;this.player.reserve=Math.max(48,this.player.reserve);this.player.meds=Math.max(2,this.player.meds);this.loadChapter(n);this.save();this.ui.intro(this.config);};if(this.ui.load)return this.ui.load(n,run);run();}
 finish(choice){this.setPaused(true);const ending=endingFor([...this.pages],[...this.allies],choice);this.sound.play('bell');this.ui.ending(ending);this.running=false;try{localStorage.setItem('resident-espey-completed',JSON.stringify({ending,stats:this.stats,pages:this.pages.size}));}catch{}}
 radio(name,text,seconds=6){if(this.voice){const id=characterId(name),remote=id==='nathan'||id==='hall'&&!CHAPTERS.some(c=>c.npc.lines.includes(text));this.voice.say(name,text,{radio:remote});this.updateDialogue();}else if(this.settings.subtitles!==false){$('#speaker').textContent=name;$('#radio-text').textContent=text;$('#radio').style.opacity=1;this.radioUntil=this.time+seconds;}}
 updateDialogue(){if(!this.voice)return;const c=this.voice.current,show=c&&(this.settings.subtitles!==false||c.error);$('#radio').style.opacity=show?1:0;if(show){$('#speaker').textContent=displayName(c.entry.speaker);$('#radio-text').textContent=c.entry.text;}if(c?.error&&!c.notified){c.notified=true;this.toast('Dialogue audio could not load. Captions are shown.');}}

 toast(text){$('#toast').textContent=text;$('#toast').style.opacity=1;this.toastUntil=this.time+3.5;}
 proximity(){const p=this.player,candidates=this.items.filter(i=>!i.used&&(!Number.isInteger(i.stage)||i.stage===this.objectives));for(const c of this.world.bossArena?.interactables(this)||[])if(c.active)candidates.push(c);candidates.push(this.npc,{kind:'exit',x:(this.config.exit[0]+.5)*TILE,z:(this.config.exit[1]+.5)*TILE});let nearest=null,best=2.65;for(const c of candidates){const d=distance(p,c);const forward=viewDirection(p.yaw||0,0),angle=((c.x-p.x)*forward.x+(c.z-p.z)*forward.z)/(d||1);if(d<best&&(angle>.2||d<1.1)&&this.canSee(p,c)){nearest=c;best=d;}}this.nearest=nearest;const el=$('#interaction');el.hidden=!nearest;if(nearest){const names={weapon:'Take weapon',ammo:'Take ammunition',med:'Take first aid',page:MEMORY_LABELS[nearest?.page]||'Examine memory',fuse:'Recover power fuse',seal:'Recover seal fragment',anchor:'Restore anchor generator',save:'Save and recover',exit:this.config.exitLabel};el.querySelector('span').textContent=nearest===this.npc?'Talk to '+displayName(nearest.name):nearest.label||names[nearest.kind];}}
 setHUD(){const p=this.player;if(!p)return;$('#chapter-label').textContent=this.config.number;$('#location-label').textContent=roomAt(this.level,p.x,p.z)?.name||'Service passage';$('#objective').textContent=this.chapter===1&&this.objectives>=2&&(this.bossDead||!this.bossSpawned)&&this.enemies.some(e=>e.kind==='birdy'&&!e.dead)?'Defeat Lil Birdy.':this.bossDead?(this.chapter===2?'Reach the PA. Decide who gets to come home.':this.config.exitLabel+'.'):this.level.tasks[this.objectives];$('#health-fill').style.width=p.hp+'%';$('#health-fill').style.background=p.hp<30?'#b95b46':p.hp<60?'#c6a75d':'#87b2a2';$('#health-state').textContent=p.hp<30?'DANGER':p.hp<60?'CAUTION':'FINE';$('#health-state').style.color=p.hp<30?'#e07a62':p.hp<60?'#d5ba76':'#87b2a2';$('#stamina-fill').style.width=p.stamina+'%';if(this.debugSnapshots)$('#world').dataset.state=JSON.stringify(this.snapshot());if($('#weapon-name'))$('#weapon-name').textContent=weaponFor(p).name.toUpperCase();if($('#weapon-slot'))$('#weapon-slot').textContent=String(weaponFor(p).slot);$('#ammo').textContent=p.ammo;$('#reserve').textContent=' / '+p.reserve;$('#meds').textContent=p.meds;$('#reload-progress').hidden=p.reloading<=0;const progress=reloadProgress(p);$('#reload-progress').style.setProperty('--reload',progress*100+'%');$('#reload-progress').querySelector('span').textContent=p.weapon==='shotgun'?'Loading shells':progress<.63?'Changing magazine':progress<.88?'Seating magazine':'Chambering round';let threat=this.boss&&!this.boss.dead?this.boss:null;const birdy=this.enemies.find(e=>!e.dead&&!e.dormant&&e.kind==='birdy'&&distance(e,p)<14&&e.alert);if(birdy&&(!threat||distance(birdy,p)<distance(threat,p)))threat=birdy;$('#boss-hud').hidden=!threat;if(threat){$('#boss-name').textContent=threat.bobbyCrushed?'Jakob':BOSS_NAMES[threat.kind]||this.config.boss.name;const pips=$('#boss-phases');if(pips){pips.dataset.phase=String(threat.phase||0);pips.setAttribute?.('aria-label','Boss stage '+((threat.phase||0)+1)+' of 5');}const goal=this.world.bossArena?.objective(threat)||(threat.kind==='birdy'?'Defeat Lil Birdy.':null);if(goal)$('#objective').textContent=goal;$('#boss-fill').style.width=Math.max(0,threat.hp/threat.max*100)+'%';}}
 frame(now){
  if(this.graphicsUnavailable){this.last=now;this.voice?.update();requestAnimationFrame(this.frame);return;}
  const needsRender=this.cinema?.active?(!this.cinema.isPaused||!this.cinematicHeld||this.world.needsPausedRender):this.running&&(!this.paused||this.lastPausedRender!==this.time||this.world.needsPausedRender);
  const budgeted=!!(needsRender&&!this.loading&&!this.applyingGraphics&&this.renderBudget);
  if(budgeted&&!this.renderBudget.begin(now)){this.voice?.update();this.cinema?.refreshAudioState?.();requestAnimationFrame(this.frame);return;}
  const dt=Math.min((now-this.last)/1000||.016,.045);this.frameMs=now-this.last;this.last=now;const playing=this.running&&!this.paused&&!this.loading&&!this.applyingGraphics&&!this.cinema?.active;if(playing)this.time+=dt;this.voice?.update();
  if(this.loading||this.applyingGraphics){requestAnimationFrame(this.frame);return;}
  if(this.cinema?.active){this.cinema.refreshAudioState?.();if(!this.cinema.isPaused||!this.cinematicHeld||this.world.needsPausedRender)this.cinema.update(Math.min((now-(this.cinemaLast||now))/1000,.15));this.world.needsPausedRender=false;this.cinematicHeld=this.cinema.isPaused;this.cinemaLast=now;if(budgeted)this.renderBudget.end();requestAnimationFrame(this.frame);return;}this.cinemaLast=now;
  if(this.running){const p=this.player;
   if(!this.paused){
    if(this.world.navigationDirty)this.rebuildNavigation();this.stats.seconds+=dt;p.cooldown=Math.max(0,p.cooldown-dt);p.equipping=Math.max(0,(p.equipping||0)-dt);p.melee=Math.max(0,p.melee-dt);p.inv=Math.max(0,p.inv-dt);p.stamina=Math.min(100,p.stamina+22*dt);
    advanceReload(p,dt,cue=>this.sound.play(cue));
    p.yaw+=(Number(this.keys.has('ArrowLeft'))-Number(this.keys.has('ArrowRight')))*dt*1.7;
    p.pitch=clamp(p.pitch+(Number(this.keys.has('ArrowUp'))-Number(this.keys.has('ArrowDown')))*dt*1.3,-1.35,1.35);
    p.aiming=this.mouse.aiming||this.touch.aiming;p.crouching=this.keys.has('ControlLeft')||this.keys.has('KeyC');
    const strafe=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'))+this.touch.x,backward=Number(this.keys.has('KeyS'))-Number(this.keys.has('KeyW'))+this.touch.z;
    let {x:dx,z:dz}=relativeMove(strafe,backward,p.yaw),len=Math.hypot(dx,dz);
    p.sprinting=this.keys.has('ShiftLeft')&&p.stamina>4&&!p.aiming&&!p.crouching;let speed=p.crouching?2.15:p.aiming?2.8:p.sprinting?6:4.2;
    if(p.sprinting&&len)p.stamina=Math.max(0,p.stamina-37*dt);
    if(p.dash>0){p.dash-=dt;dx=p.dashX;dz=p.dashZ;len=1;speed=15;}
    if(len)this.move(p,dx/len*speed*dt,dz/len*speed*dt,.32);p.moving=len>0;
    settleWeapon(p,dt);const d=viewDirection(p.yaw,p.pitch);this.aim.x=p.x+d.x*12;this.aim.z=p.z+d.z*12;this.world.setView(p,p.yaw,p.pitch,this.time,p.aiming);
    if(this.mouse.down||this.touch.fire)this.shoot();this.updateEnemies(dt);if(!this.cinema.active&&!this.paused){this.proximity();this.directRoute();}if(this.cinema.active||this.paused){if(budgeted)this.renderBudget.end();requestAnimationFrame(this.frame);return;}
    if(len&&Math.floor(this.time*(p.sprinting?3.5:2.2))!==this.lastStep){this.lastStep=Math.floor(this.time*(p.sprinting?3.5:2.2));this.sound.play('step');}
    if(this.time>this.nextRadio&&!this.specialRadio&&this.chapter===1){this.specialRadio=true;this.radio(...RADIO.chalk,6);}
    for(const i of this.items)if(!i.used&&i.model?.userData.ring)i.model.userData.ring.material.opacity=.25+Math.sin(this.time*2+i.id)*.1;
   }else p.moving=p.sprinting=false;
   this.shake*=Math.exp(-dt*9);this.flash*=Math.exp(-dt*4);$('#damage').style.opacity=this.flash*.65+(p.hp<30?.15:0);$('#damage').style.setProperty('--hit-alpha',String(this.flash*.85));
   if(this.voice)this.updateDialogue();else if(this.time>this.radioUntil)$('#radio').style.opacity=0;if(this.time>this.toastUntil)$('#toast').style.opacity=0;
   $('#look-hint').hidden=this.paused||this.pointerLocked||matchMedia('(pointer: coarse)').matches||this.time-this.chapterStart>14;
   $('#tutorial').hidden=this.time-this.chapterStart>10;const objectiveKey=this.chapter+':'+this.objectives+':'+this.bossDead+':'+$('#objective').textContent;if(objectiveKey!==this.objectiveKey){this.objectiveKey=objectiveKey;this.objectiveUntil=this.time+8;}$('#hud').classList.toggle('quiet-hud',this.time>this.objectiveUntil);
   if(this.ui.updateStory)this.ui.updateStory(this.time);
   $('#crosshair').classList.toggle('hit',this.time<(this.hitUntil||0));$('#crosshair').classList.toggle('headshot',this.headshot);
   $('#crosshair').classList.toggle('aiming',!!p.aiming&&(this.world.ads??1)>.65);$('#crosshair').style.setProperty('--spread',String(1+(p.bloom||0)*.75+(p.moving?.2:0))); $('#flashlight-state').textContent=this.settings.flashlight===false?'LIGHT OFF':'LIGHT ON';
   if(!this.paused||this.lastPausedRender!==this.time||this.world.needsPausedRender){this.world.update(this.paused?0:dt,this.time,p,this.aim,this.settings.motion?0:this.shake);this.lastPausedRender=this.paused?this.time:null;this.world.needsPausedRender=false;}if(this.time>=(this.nextHud||0)){this.nextHud=this.time+.08;this.setHUD();}
  }if(budgeted)this.renderBudget.end();requestAnimationFrame(this.frame);
 }
 snapshot(){return{fps:Math.round(1000/(this.frameMs||16)),drawCalls:this.world?.worldCalls,perspective:'first-person',version:'5.4.0',voice:this.voice?.status,props:this.world?.obstacles?.length,pointerLocked:this.pointerLocked,running:this.running,paused:this.paused,loading:!!this.loading,preparation:this.preparation,chapter:this.chapter,player:this.player?{x:this.player.x,z:this.player.z,yaw:this.player.yaw,pitch:this.player.pitch,hp:this.player.hp,weapon:this.player.weapon,owned:Object.keys(this.player.inventory||{}),ammo:this.player.ammo,reserve:this.player.reserve,meds:this.player.meds}:null,objectives:this.objectives,pages:this.pages.size,allies:this.allies.size,scenes:[...(this.seenScenes||[])],bossDead:this.bossDead,enemies:this.enemies?.filter(e=>!e.dead&&!e.dormant).length,nearest:this.nearest?.kind||this.nearest?.name,route:this.level?.tasks?.[this.objectives],room:this.level?roomAt(this.level,this.player.x,this.player.z)?.name:null,gates:this.world?.gates?.filter(g=>g.obstacle.active).length,reloading:this.player?.reloading,beats:[...(this.beats||[])],stats:{...this.stats}};}
}
