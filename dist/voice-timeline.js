import {voiceKey} from './dialogue.js?v=5.5.0';
import {VOICE_ASSETS} from './voice-assets.js?v=5.5.0';

// Expand a dialogue beat when its performed line needs more time. Camera cuts,
// actors and props move together, so an injection or door slam keeps its meaning.
export function voicedScene(scene,assets=VOICE_ASSETS){
 const beats=scene.lines.map(l=>({...l,key:voiceKey(l.speaker,l.text),extra:Math.max(0,(assets[voiceKey(l.speaker,l.text)]?.duration||0)+.25-(l.to-l.at))}));
 const map=t=>{let shift=0;for(const b of beats){if(t>=b.to)shift+=b.extra;else if(t>b.at){shift+=(t-b.at)/(b.to-b.at)*b.extra;break;}else break;}return t+shift;};
 const inverse=t=>{let shift=0;for(const b of beats){const start=b.at+shift,end=b.to+shift+b.extra;if(t>=end)shift+=b.extra;else if(t>start)return b.at+(t-start)*(b.to-b.at)/(end-start);else break;}return t-shift;};
 return {...scene,duration:map(scene.duration),sourceTime:inverse,lines:beats.map(l=>({...l,at:map(l.at),to:map(l.to)})),
  shots:scene.shots.map(s=>({...s,at:map(s.at)})),events:scene.events.map(e=>({...e,at:map(e.at)})),
  actors:scene.actors.map(a=>({...a,path:a.path.map(k=>[map(k[0]),...k.slice(1)])}))};
}
