import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENES,StoryClock,sceneSample,MEMORY_IDS} from '../dist/story.js';
import {Cinematics} from '../dist/cinematics.js';
import {Game} from '../dist/game.js';

test('Every story scene has usable camera framing, ordered cues and readable dialogue',()=>{
 for(const [id,s]of Object.entries(SCENES)){
  assert.ok(s.duration>=16,id);assert.equal(s.shots[0].at,0,id);let prior=-1;
  for(const shot of s.shots){assert.ok(shot.at>prior&&shot.at<s.duration,id);prior=shot.at;for(const v of[shot.from,shot.to,shot.look])assert.ok(v.length===3&&v.every(Number.isFinite),id);}
  prior=-1;for(const cue of s.events){assert.ok(cue.at>=prior&&cue.at<s.duration,id);prior=cue.at;}
  for(const l of s.lines){assert.ok(l.to>l.at&&l.to<=s.duration,id);assert.ok(l.text.length<=150,id);assert.ok((l.to-l.at)>=l.text.split(' ').length/4,id+' caption is too fast');}
  for(let t=0;t<=s.duration;t+=.25){const v=sceneSample(s,t);assert.ok(v.position.every(Number.isFinite)&&v.look.every(Number.isFinite),id);assert.ok(v.fade>=0&&v.fade<=1,id);assert.equal(v.actors.length,s.actors.length,id);}
 }
 assert.equal(new Set(MEMORY_IDS).size,6);MEMORY_IDS.forEach(id=>assert.ok(SCENES[id].goal));
});
test('Cinematic cues fire exactly once across slow frames and completion',()=>{
 const clock=new StoryClock(SCENES.opening),heard=[];
 for(const dt of[0,0,6,0,11,7,20,20])heard.push(...clock.tick(dt).events);
 assert.deepEqual(heard,SCENES.opening.events);assert.equal(clock.time,34);assert.equal(clock.done,true);assert.deepEqual(clock.tick(100).events,[]);
 const paused=new StoryClock(SCENES.road);paused.tick(9);paused.tick(0);assert.equal(paused.time,9);assert.equal(paused.tick(2).events[0].collapse,true);
});
test('Skipping completes story progression once; cancellation never completes it',()=>{
 const cinema=Object.create(Cinematics.prototype);let restored=0,completed=0;
 cinema.active=true;cinema.finished=false;cinema.release=()=>{restored++;cinema.active=false;};cinema.complete=()=>completed++;
 cinema.finish();cinema.finish();assert.equal(restored,1);assert.equal(completed,1);
 cinema.active=true;cinema.finished=false;cinema.cancel();cinema.finish();assert.equal(restored,2);assert.equal(completed,1);
});
test('Flashbacks have visible actions beyond captions: sheltering, collapse, seal and escape',()=>{
 assert.ok(SCENES.closet.actors.some(a=>a.path.some(k=>k[5]==='brace')));
 const before=sceneSample(SCENES.road,9),after=sceneSample(SCENES.road,12);assert.ok(after.actors.every(a=>a.y<before.actors.find(b=>b.id===a.id).y));
 assert.deepEqual(SCENES.seal.events.filter(e=>e.ring!==undefined).map(e=>e.ring),[0,1,2]);
 assert.ok(sceneSample(SCENES.home,29).actors.every(a=>a.z>sceneSample(SCENES.home,0).actors.find(b=>b.id===a.id).z));
});
test('A cinematic frame advances the director without running combat or overwriting its camera',()=>{
 const prior=globalThis.requestAnimationFrame;let frames=0,ticks=0;globalThis.requestAnimationFrame=()=>frames++;
 try{const game=Object.create(Game.prototype);game.last=984;game.time=0;game.cinemaLast=990;game.running=true;game.stats={seconds:0};game.cinema={active:true,update(dt){ticks++;assert.ok(Math.abs(dt-.01)<1e-9);}};game.world={update(){throw Error('Gameplay camera overwrote cinematic');}};game.updateEnemies=()=>{throw Error('Combat ran during scene');};game.frame(1000);assert.equal(ticks,1);assert.equal(frames,1);assert.equal(game.stats.seconds,0);}finally{globalThis.requestAnimationFrame=prior;}
});
