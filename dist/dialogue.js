import {LEVELS} from './levels.js?v=5.3.0';
import {SCENES} from './story.js?v=5.3.0';
import {CHAPTERS} from './data.js?v=5.3.0';

// The same script drives production audio and gameplay; keys survive timing edits.
export const RADIO={
 continue:['Ethan','Find the way forward. Keep their names safe.'],
 retry:['Ethan','One more page. One more try.'],
 bosses:[['Coach Hall','Chris hears the shots. Dodge his rush, then take your shot.'],['Jakob','BOBBY! ... BOBBY!'],['Coach Hall','Zebene. That is your name. Ethan, get clear of the fog!']],
 remembered:['Ethan','Zebene Martine. I remember you.'],
 fallen:['Ethan','That was a person. I will remember that.'],
 birdy:['Lil Birdy','Ethan. Ethan. Did you really think the walls would let you leave?'],
 bargain:['The Gentleman','One door. One name. Why keep carrying the others?'],
 light:['Ethan','The light came back. Something heard it.'],
 seal:['Nathan Nunley','The seal is whole. But something is standing between you and home.'],
 power:['Coach Hall','Power is restored. Get to Room 204. Keep your guard up.'],
 chalk:['Nathan Nunley','If you hear me twice, follow the chalk. Trust what you can see.']
};
export function characterId(speaker){
 const s=speaker.toLowerCase().replace(/[’']/g,'');
 if(s.startsWith('ethan'))return 'ethan';if(s.startsWith('joel'))return 'joel';if(s.startsWith('landon'))return 'landon';
 if(s==='lukes voice')return 'mimic';if(s==='luke')return 'luke';if(s.includes('hall'))return 'hall';
 if(s.includes('gentleman'))return 'gent';if(s.includes('birdy'))return 'birdy';if(s.includes('nathan'))return 'nathan';
 if(s.includes('earl'))return 'earl';if(s.includes('paul'))return 'paul';if(s.includes('johnson'))return 'johnson';return s.replace(/[^a-z]/g,'');
}
export function voiceKey(speaker,text){let h=2166136261;for(const c of text.normalize('NFC'))h=Math.imul(h^c.charCodeAt(0),16777619);return characterId(speaker)+'-'+(h>>>0).toString(16).padStart(8,'0');}
export function dialogueScript(){
 const lines=new Map(),add=(speaker,text,scene)=>{const key=voiceKey(speaker,text);if(!lines.has(key))lines.set(key,{key,speaker,text,scenes:[]});lines.get(key).scenes.push(scene);};
 for(const [id,s]of Object.entries(SCENES))for(const l of s.lines)add(l.speaker,l.text,id);
 for(const c of CHAPTERS)for(const text of c.npc.lines)add(c.npc.name,text,'conversation');
 for(const [id,entry]of Object.entries(RADIO))for(const [speaker,text]of id==='bosses'?entry:[entry])add(speaker,text,'radio');
 for(const level of Object.values(LEVELS))for(const [speaker,text]of [...level.cues,...level.beats.filter(b=>b.line).map(b=>b.line)])add(speaker,text,'route');
 return [...lines.values()];
}
