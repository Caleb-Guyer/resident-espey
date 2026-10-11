import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {VOICE_ASSETS} from '../dist/voice-assets.js';
import {dialogueScript,voiceKey,RADIO} from '../dist/dialogue.js';
import {SCENES} from '../dist/story.js';
import {voicedScene} from '../dist/voice-timeline.js';
import {Voice} from '../dist/voice.js';
import {Game} from '../dist/game.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(fetcher){
 const sources=[],duck=[],gains=[];
 const node=()=>({connect(){},disconnect(){}});
 const context={currentTime:0,destination:{},createGain(){const n={...node(),gain:{setTargetAtTime(v){gains.push(v);}}};return n;},createBiquadFilter(){return{...node(),frequency:{value:0}};},createBufferSource(){const s={...node(),start(at,offset=0){this.at=at;this.offset=offset;},stop(){this.stopped=true;},end(){this.onended?.();}};sources.push(s);return s;},async decodeAudioData(){return{duration:3};}};
 const sound={context,init(){},duck(v){duck.push(v);}};
 const settings={volume:.6,dialogueVolume:1,subtitles:false};
 const voice=new Voice(sound,settings,{fetcher:fetcher||(async()=>({ok:true,async arrayBuffer(){return new ArrayBuffer(4);}}))});
 return{voice,context,sources,duck,gains,settings};
}
test('Every cutscene, NPC conversation and gameplay line ships a nonempty audio recording',async()=>{
 const script=dialogueScript();assert.equal(script.length,98);assert.equal(Object.keys(VOICE_ASSETS).length,script.length);
 for(const l of script){const a=VOICE_ASSETS[l.key];assert.equal(a.text,l.text);assert.equal(a.speaker,l.speaker);assert.ok(a.duration>.5&&a.duration<14);const bytes=await readFile(new URL('../dist/'+a.file,import.meta.url));assert.equal(bytes.length,a.bytes);assert.ok(bytes.length>1000);assert.ok(bytes.toString('ascii',0,3)==='ID3'||bytes[0]===255,'Invalid MP3: '+a.file);}
 assert.equal(voiceKey('ETHAN ESPEY',RADIO.retry[1]),voiceKey('Ethan',RADIO.retry[1]));
});
test('Recorded line durations fit all scenes, with camera, actors and prop cues kept in order',()=>{
 for(const original of Object.values(SCENES)){const scene=voicedScene(original);assert.ok(scene.duration>=original.duration);for(let i=0;i<scene.lines.length;i++){const l=scene.lines[i];assert.ok(l.to-l.at>=VOICE_ASSETS[l.key].duration+.24);assert.ok(!scene.lines[i+1]||scene.lines[i+1].at>=l.to);}for(const collection of [scene.shots,scene.events,...scene.actors.map(a=>a.path.map(k=>({at:k[0]})))])for(let i=1;i<collection.length;i++)assert.ok(collection[i].at>=collection[i-1].at);assert.ok(Math.abs(scene.sourceTime(scene.duration)-original.duration)<1e-8);}
 const opening=voicedScene(SCENES.opening);assert.ok(opening.duration>34,'Final Hall line needs more than its old five-second slot');assert.ok(opening.events.find(e=>e.serum).at>=opening.lines[2].to);
});
test('Cinematic audio follows the audio clock and resumes from the same position after pause',async()=>{
 const {voice,context,sources}=fixture(),scene=voicedScene(SCENES.opening);await voice.prepareScene(scene);assert.equal(sources.length,scene.lines.length);assert.ok(Math.abs(sources[1].at-(scene.lines[1].at+.06))<1e-8);
 context.currentTime=2.06;assert.ok(Math.abs(voice.sceneTime-2)<1e-8);voice.pause(true);assert.equal(voice.status.state,'paused');assert.ok(sources.every(s=>s.stopped));context.currentTime=40;assert.ok(Math.abs(voice.sceneTime-2)<1e-8);const prior=sources.length;voice.pause(false);assert.equal(voice.status.state,'playing');assert.ok(Math.abs(sources[prior].offset-1)<1e-8);context.currentTime=41.06;assert.ok(Math.abs(voice.sceneTime-3)<1e-8);voice.stop();assert.equal(voice.scene,null);assert.ok(sources.every(s=>s.stopped));
});
test('Dialogue still plays with subtitles disabled, and repeated interactions cannot overlap voices',async()=>{
 const {voice,context,sources,settings}=fixture();voice.pause(false);
 const nodes=new Map(),prior=globalThis.document;globalThis.document={querySelector(s){if(!nodes.has(s))nodes.set(s,{style:{},textContent:''});return nodes.get(s);}};
 try{const game=Object.create(Game.prototype);Object.assign(game,{voice,settings,toast(){}});game.radio(...RADIO.retry);game.radio(...RADIO.retry);await turn();assert.equal(sources.length,1);assert.equal(nodes.get('#radio').style.opacity,0);game.radio(...RADIO.continue);assert.equal(voice.queue.length,1);context.currentTime=1.4;voice.pause(true);context.currentTime=10;voice.pause(false);assert.ok(Math.abs(sources[1].offset-1.4)<1e-8,'A radio line resumes instead of restarting');sources[1].end();await turn();assert.equal(voice.current.entry.text,RADIO.continue[1]);assert.equal(sources.length,3);assert.equal(voice.queue.length,0);}finally{globalThis.document=prior;}
});
test('Skipping or replacing a scene cancels pending loads and scheduled audio',async()=>{
 let release;const hold=new Promise(r=>release=r),{voice,sources}=fixture(async()=>{await hold;return{ok:true,async arrayBuffer(){return new ArrayBuffer(4);}};});
 const job=voice.prepareScene(voicedScene(SCENES.closet));assert.equal(voice.status.state,'loading');voice.stop();release();await job;assert.equal(voice.scene,null);assert.equal(sources.length,0);await voice.prepareScene(voicedScene(SCENES.serum));assert.ok(sources.length>0);voice.stop();assert.ok(sources.every(s=>s.stopped));
});
test('Audio failure offers a recoverable scene state; master and dialogue muting restore the sound mix',async()=>{
 const {voice,gains,duck,context}=fixture(async()=>({ok:false}));await voice.prepareScene(voicedScene(SCENES.closet));assert.equal(voice.status.state,'error');assert.equal(voice.sceneTime,0);voice.stop();assert.equal(duck.at(-1),false);
 const working=fixture();await working.voice.prepareScene(voicedScene(SCENES.opening));working.context.currentTime=1.1;working.voice.update();assert.equal(working.duck.at(-1),true);working.voice.setVolume(0,1);working.voice.update();assert.equal(working.duck.at(-1),false);assert.equal(working.gains.at(-1),0);working.voice.setVolume(.6,0);assert.equal(working.gains.at(-1),0);working.voice.stop();
});
