import {VOICE_ASSETS} from './voice-assets.js?v=4.0.0';
import {voiceKey} from './dialogue.js?v=4.0.0';

export class Voice{
 constructor(sound,settings,{fetcher=globalThis.fetch?.bind(globalThis)}={}){this.sound=sound;this.settings=settings;this.fetcher=fetcher;this.buffers=new Map();this.queue=[];this.epoch=0;this.paused=true;this.scene=null;this.current=null;}
 get context(){return this.sound.context;}
 init(){this.sound.init();if(!this.context)throw Error('Audio unavailable');if(!this.gain){this.gain=this.context.createGain();this.gain.connect(this.context.destination);}this.setVolume();}
 setVolume(master=this.settings.volume,dialogue=this.settings.dialogueVolume??1){this.master=Number.isFinite(master)?Math.max(0,Math.min(1,master)):.6;this.volume=Number.isFinite(dialogue)?Math.max(0,Math.min(1,dialogue)):1;if(this.gain)this.gain.gain.setTargetAtTime(this.master*this.volume*.9,this.context.currentTime,.03);}
 async load(key){
  const entry=VOICE_ASSETS[key];if(!entry)throw Error('Missing dialogue recording');
  if(!this.buffers.has(key)){const job=(async()=>{const response=await this.fetcher(new URL(entry.file,import.meta.url),{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Dialogue download failed');return this.context.decodeAudioData(await response.arrayBuffer());})();this.buffers.set(key,job);job.catch(()=>this.buffers.delete(key));}
  return this.buffers.get(key);
 }
 async prepareScene(scene){
  this.stop();this.paused=false;const epoch=this.epoch;
  const state={story:scene,offset:0,base:0,ready:false,error:false,paused:false,sources:[],buffers:[]};this.scene=state;
  try{this.init();state.buffers=await Promise.all(scene.lines.map(l=>this.load(l.key)));if(this.epoch!==epoch||this.scene!==state)return;state.ready=true;if(!state.paused)this.scheduleScene();}
  catch(error){if(this.epoch===epoch&&this.scene===state){state.error=true;state.errorReason=String(error.message).slice(0,120);console.warn('Story audio could not load:',state.errorReason);}}
 }
 get sceneTime(){const s=this.scene;if(!s?.ready)return 0;return Math.min(s.story.duration,Math.max(0,s.paused?s.offset:this.context.currentTime-s.base));}
 scheduleScene(){const s=this.scene;if(!s?.ready||s.paused)return;s.base=this.context.currentTime+.06-s.offset;
  s.story.lines.forEach((line,i)=>{const buffer=s.buffers[i],offset=Math.max(0,s.offset-line.at);if(offset>=buffer.duration)return;const source=this.source(buffer,false);source.start(Math.max(this.context.currentTime+.06,s.base+line.at),offset);s.sources.push(source);});
 }
 source(buffer,radio){const source=this.context.createBufferSource();source.buffer=buffer;
  if(radio){const high=this.context.createBiquadFilter(),low=this.context.createBiquadFilter();high.type='highpass';high.frequency.value=320;low.type='lowpass';low.frequency.value=3400;source.connect(high);high.connect(low);low.connect(this.gain);source.onended=()=>{high.disconnect();low.disconnect();source.disconnect();};source.cleanup=()=>{high.disconnect();low.disconnect();source.disconnect();};}else{source.connect(this.gain);source.onended=()=>source.disconnect();}return source;
 }
 pause(p){
  if(this.paused===p)return;const radioOffset=this.radioTime;this.paused=p;
  if(this.scene){const s=this.scene;if(p){s.offset=this.sceneTime;s.paused=true;this.clearSceneSources();}else{s.paused=false;this.scheduleScene();}}
  if(this.current){const c=this.current;if(p){c.offset=radioOffset;this.clearRadioSource();}else if(c.buffer)this.startRadio(c);else if(c.error)c.base=this.context.currentTime-c.offset;}
  this.update();
 }
 clearSceneSources(){for(const source of this.scene?.sources||[]){try{source.stop();}catch{}source.cleanup?.();}if(this.scene)this.scene.sources=[];}
 get radioTime(){const c=this.current;if(!c)return 0;return Math.max(0,this.paused?c.offset:(c.source||c.error)&&this.context?this.context.currentTime-c.base:c.offset);}
 clearRadioSource(){const c=this.current;if(c?.source){c.source.onended=null;try{c.source.stop();}catch{}c.source.cleanup?.();c.source.disconnect();c.source=null;}}
 say(speaker,text,{radio=false}={}){
  if(this.scene)return;const key=voiceKey(speaker,text),entry=VOICE_ASSETS[key];if(!entry)return;
  if(this.current?.key===key||this.queue.some(c=>c.key===key))return;
  if(this.queue.length>=4)this.queue.shift();this.queue.push({key,entry,radio,offset:0});this.next();
 }
 next(){
  if(this.current||!this.queue.length||this.scene)return;const c=this.current=this.queue.shift(),epoch=this.epoch;
  try{this.init();}catch{c.error=true;return;}
  this.load(c.key).then(buffer=>{if(this.epoch!==epoch||this.current!==c)return;c.buffer=buffer;if(!this.paused)this.startRadio(c);}).catch(()=>{if(this.epoch===epoch&&this.current===c){c.error=true;c.base=this.context.currentTime;}});
 }
 startRadio(c){if(this.current!==c||this.paused||!c.buffer)return;if(c.offset>=c.buffer.duration){this.current=null;this.next();return;}c.base=this.context.currentTime-c.offset;const source=c.source=this.source(c.buffer,c.radio);source.start(0,c.offset);source.onended=()=>{source.cleanup?.();source.disconnect();if(this.current!==c||c.source!==source)return;this.current=null;this.next();this.update();};}
 update(){if(this.current?.error&&!this.paused&&this.radioTime>this.current.entry.duration+1){this.current=null;this.next();}const t=this.sceneTime,speaking=this.scene?this.scene.ready&&!this.paused&&this.scene.story.lines.some((l,i)=>t>=l.at&&t<l.at+this.scene.buffers[i].duration):!!this.current?.source&&!this.paused;this.sound.duck?.(speaking&&this.volume>0&&this.master>0);}
 stop(){this.epoch++;this.clearSceneSources();this.clearRadioSource();this.scene=null;this.current=null;this.queue=[];this.sound.duck?.(false);}
 get status(){return {mode:this.scene?'scene':this.current?'dialogue':'idle',state:this.scene?(this.scene.error?'error':!this.scene.ready?'loading':this.paused?'paused':'playing'):this.current?(this.current.error?'error':!this.current.buffer?'loading':this.paused?'paused':'playing'):'idle',context:this.context?.state||'unavailable',error:this.scene?.errorReason||null,key:this.current?.key||null,elapsed:Math.round((this.scene?this.sceneTime:this.radioTime)*100)/100,queue:this.queue.length};}
}
