import * as T from './vendor/three.module.js';
import {StoryClock} from './story.js?v=5.1.1';
import {voicedScene} from './voice-timeline.js?v=5.1.1';
import {fitEncounterCamera} from './combat-space.js?v=5.1.1';
import {speechMotion} from './cinematic-direction.js?v=5.1.1';
export const BOSS_NAMES=Object.freeze({chris:'Chris',jakob:'Jakob & Bobby',zeb:'Zeb',birdy:'Lil Birdy'});
export function displayName(name){return ({'Coach Hall':'Hall','Joel Honeycutt':'Joel','Landon Chapa':'Landon','Earl Britt':'Earl','Nathan Nunley':'Nathan','Zebene Martine':'Zeb'})[name]||name;}
const shot=(at,from,to,look,fov=54)=>({at,from,to,look,end:look,fov});
// Local camera coordinates are anchored to the creature in the actual arena.
// Introductions reveal its movement and weak points before handing back control.
export const BOSS_INTROS=Object.freeze({
 chris:{duration:13,stage:'encounter',actors:[],lines:[{at:4,to:12,speaker:'Coach Hall',text:'Chris hears the shots. Dodge his rush, then take your shot.',radio:true}],
  shots:[shot(0,[-.75,.32,3.5],[-.6,.48,3.1],[.45,.65,0],50),shot(3,[-1.35,1.35,2.8],[-1.1,1.48,2.7],[.55,1.25,0],48),shot(6,[.45,1.8,3.4],[.35,1.82,3.1],[0,1.92,.06],44),shot(9,[0,1.2,4.1],[0,1.4,4.3],[0,1.15,0],60)],events:[{at:1,sound:'step'},{at:3,sound:'slam'},{at:8,sound:'boss'}]},
 jakob:{duration:13,stage:'encounter',actors:[],lines:[{at:6,to:11,speaker:'Jakob',text:'BOBBY! ... BOBBY!'}],
  shots:[shot(0,[0,.65,3.3],[0,1,3.0],[0,1.42,.10],50),shot(3,[-.6,2.2,1.9],[-.5,2.25,1.8],[-.28,2.30,.04],44),shot(6,[.6,2.23,1.9],[.5,2.27,1.8],[.28,2.32,.04],44),shot(9,[0,1.55,4.5],[0,1.6,4.3],[0,1.45,0],58)],events:[{at:2,sound:'heartbeat'},{at:5,sound:'whisper'},{at:9,sound:'boss'}]},
 zeb:{duration:14,stage:'encounter',actors:[],lines:[{at:4,to:12,speaker:'Coach Hall',text:'Zebene. That is your name. Ethan, get clear of the fog!',radio:true}],
  shots:[shot(0,[-1,.3,3.4],[-.8,.4,3.2],[0,.55,0],53),shot(3,[1.2,1.5,3.2],[1,1.6,3.1],[0,1.7,.16],52),shot(6,[.1,2.1,2.7],[.1,2.14,2.6],[0,2.28,.05],45),shot(9,[0,1.0,4.3],[0,1.3,4.4],[0,1.35,0],65)],events:[{at:1,sound:'step'},{at:3,sound:'heartbeat'},{at:8,sound:'slam',shockwave:true},{at:10,sound:'boss'}]},
 birdy:{duration:13,stage:'encounter',actors:[],lines:[{at:4,to:12,speaker:'Lil Birdy',text:'Ethan. Ethan. Did you really think the walls would let you leave?'}],
  shots:[shot(0,[.3,.55,2.4],[.2,.75,2.5],[0,2.2,.05],68),shot(3,[-.6,2.0,2.4],[-.5,2.03,2.5],[0,2.30,.05],50),shot(6,[0,1.6,6.0],[0,1.5,5.8],[0,1.4,-.1],68),shot(9,[.25,1.9,2.4],[.15,1.8,2.7],[0,2.12,.1],55)],events:[{at:1,sound:'whisper'},{at:6,sound:'dash'},{at:8,sound:'step'},{at:10,sound:'boss'}]}
});
export const BOSS_BEATS=Object.freeze({
 'chris-break':{duration:5.5,stage:'encounter',actors:[],lines:[],shots:[shot(0,[1,1.35,3.6],[.8,1.4,3.3],[.35,1.25,.05],50),shot(2.4,[0,1.7,3.5],[0,1.7,3.8],[0,1.65,0],52)],events:[{at:.8,sound:'collapse'},{at:2.4,sound:'boss'}]},
 'birdy-left':{duration:6.3,stage:'encounter',actors:[],lines:[],shots:[shot(0,[-1.1,1.5,1.7],[-.95,1.45,1.25],[-.33,1.54,-.08],66),shot(3.1,[-1.25,1.4,1.6],[-1.35,1.5,1.8],[-.65,1.5,-.1],69),shot(4.5,[0,1.5,4.8],[0,1.5,5],[0,1.6,0],68)],events:[{at:.4,sound:'dash'},{at:2.9,sound:'collapse'},{at:3.1,scream:'birdy'}]},
 'birdy-break':{duration:6.8,stage:'encounter',actors:[],lines:[],shots:[shot(0,[1.1,1.5,1.7],[.95,1.45,1.25],[.33,1.54,-.08],66),shot(3.1,[1.25,1.4,1.6],[1.35,1.5,1.8],[.65,1.5,-.1],69),shot(4.5,[0,1.6,4.4],[0,1.5,4.8],[0,1.8,.03],64)],events:[{at:.4,sound:'dash'},{at:2.9,sound:'collapse'},{at:3.2,scream:'birdy'}]},
 'zeb-rupture':{duration:5.8,stage:'encounter',actors:[],lines:[],shots:[shot(0,[.75,1.35,3.4],[.7,1.5,3.2],[0,1.55,.15],52),shot(2.8,[0,1.6,4],[0,1.6,4.2],[0,1.65,0],61)],events:[{at:1.6,sound:'collapse'},{at:2.8,scream:'zeb'}]},
 crusher:{duration:9,stage:'encounter',actors:[],lines:[{at:4.2,to:8,speaker:'Jakob',text:'BOBBY! ... BOBBY!'}],shots:[shot(0,[-.7,1.55,4],[-.6,1.5,3.8],[0,2.1,0],57),shot(2.3,[.9,2.1,2.5],[.8,2.15,2.5],[.28,2.35,0],46),shot(4.5,[-.8,2.1,2.8],[-.7,2.1,2.7],[-.28,2.3,0],46),shot(7,[0,1.4,4],[0,1.5,4.2],[0,1.6,0],59)],events:[{at:.5,sound:'slam'},{at:2,sound:'collapse'},{at:3.2,sound:'slam'},{at:6.5,scream:'jakob'}]}
});
const $=s=>document.querySelector(s);
export class BossIntroduction{
 constructor(cinema){this.cinema=cinema;this.game=cinema.game;this.world=cinema.world;this.active=false;}
 play(enemy,complete,beat=null){
  const {game,world,cinema}=this;this.enemy=enemy;this.complete=complete;this.beat=beat;this.origin={x:enemy.x,z:enemy.z};this.saved={position:enemy.model.position.clone(),rotation:enemy.model.rotation.clone(),fov:world.camera.fov,yaw:game.player.yaw,pitch:game.player.pitch};
  this.story=voicedScene(beat?BOSS_BEATS[beat]:BOSS_INTROS[enemy.kind]);this.clock=new StoryClock(this.story);this.active=cinema.active=true;this.paused=false;this.finished=false;cinema.id=beat?'beat-'+beat:'encounter-'+enemy.kind;cinema.story=this.story;cinema.captionFallback=false;enemy.introActive=true;enemy.model.visible=true;enemy.model.rotation.y=0;
  game.setPaused(true);world.enemyEffects?.clearHazards();game.sound.init();game.sound.pause(false);game.voice?.prepareScene(this.story);game.voice?.pause(false);
  $('#overlay').hidden=true;$('#hud').hidden=true;$('#touch-controls').hidden=true;$('#chapter-card').hidden=true;$('#cinematic').hidden=false;$('#scene-transition').hidden=true;$('#scene-type').textContent='';$('#scene-time').textContent='';$('#scene-location').textContent='';$('#pause-scene').textContent='Pause';
  document.body.classList.remove('memory-scene','premonition-scene');$('#cinematic').dataset.period='present';world.finisherHands?.forEach(h=>h.visible=false);this.update(0);
 }
 togglePause(){this.paused=!this.paused;$('#pause-scene').textContent=this.paused?'Resume':'Pause';this.game.sound.pause(this.paused);this.game.voice?.pause(this.paused);}
 update(dt){
  if(!this.active)return;const {game,world,enemy,cinema}=this,voice=game.voice,state=voice?.scene;
  const advance=this.paused?0:cinema.captionFallback?dt:state?Math.max(0,voice.sceneTime-this.clock.time):dt,{sample,events,done}=this.clock.tick(advance),t=this.story.sourceTime(this.clock.time);
  for(const e of events){if(e.sound)game.sound.play(e.sound);if(e.scream)game.sound.scream?.(e.scream);if(e.shockwave)world.enemyEffects?.wave(enemy,5.6,0);}
  world.advanceGates?.(this.paused?0:advance);world.enemyEffects?.update(advance,game);world.combatEffects?.update(advance);
  enemy.model.position.x=this.origin.x;enemy.model.position.z=this.origin.z;world.animateCharacter(enemy.model,t,false,this.beat?{...enemy,beat:{id:this.beat,time:t},wingSpace:true}:{intro:{time:t},wingSpace:true});world.bossArena?.updateBeat(enemy,this.beat,t);
  const local=sample.position,desired=(this.desiredCamera||=new T.Vector3()).set(this.origin.x+local[0],local[1],this.origin.z+local[2]),pos=fitEncounterCamera(game.grid,world.obstacles||[],desired,game.player,this.fittedCamera||=new T.Vector3());
  // Refit obstructed shots toward the entry side while retaining their height.
  this.updateTearHands(t);world.camera.position.copy(pos);world.camera.lookAt(this.origin.x+sample.look[0],sample.look[1],this.origin.z+sample.look[2]);world.camera.fov=sample.fov;world.camera.updateProjectionMatrix();
  world.flashlight.position.copy(pos).add(new T.Vector3(-.9,.55,0));world.flashlight.target.position.set(this.origin.x,1.8,this.origin.z);world.flashlight.intensity=enemy.kind==='birdy'?33:38;
  const line=sample.line;if(line&&(enemy.kind==='birdy'||enemy.kind==='jakob')){const mouth=speechMotion(line,this.clock.time),d=enemy.model.userData,artist=!!d.faces[0].userData.artist;d.jaws[0].rotation.x=.045+mouth*.25;d.faces[0].morphTargetInfluences[0]=mouth*.7;if(d.faces[0].userData.artistDetail)d.faces[0].userData.artistDetail.morphTargetInfluences[0]=mouth*.7;d.mouthCovers[0].visible=!artist&&mouth<.34;d.jaws[0].visible=!artist&&mouth>=.34;d.oralParts?.[0]?.forEach(o=>o.visible=!artist&&mouth>=.34);}
  $('#scene-speaker').textContent=line?displayName(line.speaker):'';$('#scene-subtitle').textContent=line?.text||'';$('#scene-captions').hidden=(!cinema.captionFallback&&game.settings.subtitles===false)||!line;
  $('#scene-loading').hidden=!state||state.ready||cinema.captionFallback;$('#scene-loading-message').textContent=state?.error?'Dialogue could not load.':'Preparing audio…';$('#scene-audio-actions').hidden=!state?.error;
  $('#scene-location').textContent=!this.beat&&t>9?BOSS_NAMES[enemy.kind]:'';$('#scene-location').style.opacity=!this.beat&&t>9?'1':'0';$('#scene-time').style.opacity=0;$('#scene-progress').style.width=this.clock.time/this.story.duration*100+'%';$('#scene-fade').style.opacity=sample.fade;
  world.renderer.autoClear=true;world.renderer.render(world.scene,world.camera);world.worldCalls=world.renderer.info.render.calls;
  if(game.debugSnapshots)$('#world').dataset.state=JSON.stringify({...game.snapshot(),cinematic:cinema.id,sceneTime:Math.round(t*10)/10,scenePaused:this.paused});
  if(done)this.finish();
 }
 updateTearHands(t){
  const {world,enemy}=this,hands=world.finisherHands;if(!hands)return;
  const tearing=this.beat==='birdy-left'||this.beat==='birdy-break',side=this.beat==='birdy-left'?0:1,sign=side?1:-1,reach=Math.max(0,Math.min(1,(t-.4)/1.15)),pull=Math.max(0,Math.min(1,(t-2.65)/.65)),release=Math.max(0,Math.min(1,(t-3.4)/.55));
  if(!tearing){hands.forEach(h=>h.visible=false);return;}
  enemy.model.updateMatrixWorld(true);const joint=new T.Vector3(sign*.48,.14,.025).applyMatrix4(enemy.model.userData.wings[side].matrixWorld);
  hands.forEach((h,i)=>{h.visible=t>.4&&t<4;h.position.set(joint.x+sign*(i*.09+.015+pull*.18),joint.y-.32*(1-reach)-i*.12-release*.32,joint.z+.18+pull*.14);h.rotation.set(-.22,sign*.60,(i?-.38:.38)*sign);if(h.userData.skin)h.userData.skin.morphTargetInfluences[0]=reach*(1-release);});
 }
 release(){
  if(!this.active)return;this.world.finisherHands?.forEach(h=>h.visible=false);this.game.voice?.stop();this.active=this.cinema.active=false;this.enemy.introActive=false;this.enemy.model.position.copy(this.saved.position);this.enemy.model.rotation.copy(this.saved.rotation);this.world.camera.fov=this.saved.fov;this.world.camera.updateProjectionMatrix();this.game.player.yaw=this.saved.yaw;this.game.player.pitch=this.saved.pitch;this.world.animateCharacter(this.enemy.model,this.game.time,false,this.enemy);$('#cinematic').hidden=true;$('#scene-loading').hidden=true;$('#scene-captions').hidden=false;this.game.sound.pause(true);
 }
 finish(){if(!this.active||this.finished)return;this.finished=true;const done=this.complete;this.release();done?.();}
 cancel(){this.finished=true;this.release();}
}
