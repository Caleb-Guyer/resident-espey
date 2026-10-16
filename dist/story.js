import {directStoryScenes} from './cinematic-edits.js?v=5.4.2';
// Original screen adaptation of the Chapa stories. Timings are seconds.
const actor=(id,kind,color,path)=>({id,kind,color,path});
const shot=(at,from,to,look,end=look,fov=52)=>({at,from,to,look,end,fov});
const line=(at,to,speaker,text)=>({at,to,speaker,text});
const ethan=p=>actor('ethan','player',0x465440,p);
const joel=p=>actor('joel','npc',0x6c644c,p);
const hall=p=>actor('hall','npc',0x3e6554,p);
const landon=p=>actor('landon','npc',0x6b7971,p);
// Actor keys: time, x, z, facing, height, pose. Actors face +Z at zero.
export const SCENES={
 opening:{duration:34,stage:'school',label:'Smithson Valley High School',when:'Three days earlier · 3:04 AM',
  actors:[ethan([[0,-.7,-5,0],[5,-.7,.8,0],[12,-.7,1.5,2.4],[22,-.7,1.5,2.4,0,'kneel']]),joel([[0,.8,-5.8,0],[5,.8,.1,0],[12,.8,.5,-1,0,'hurt'],[30,.8,.5,-1,0,'hurt']]),hall([[0,1.7,1.4,-2],[10,1.3,.8,-2],[12,1.2,.7,-2,0,'reach'],[20,1.2,.7,-2,0,'reach']]),actor('infected','walker',0x556350,[[0,0,-7,0],[5,0,-4,0],[34,0,-3.3,0]])],
  shots:[shot(0,[0,1.1,4.8],[0,1.5,3.5],[0,1,-3]),shot(6,[2.9,1.6,2.8],[2.3,1.55,2.3],[0,1.2,.5]),shot(14,[-2.5,1.5,1.9],[-1.7,1.35,1.9],[.8,1.1,.5]),shot(23,[-.7,1.3,2.7],[-.7,.8,2.2],[1.1,1.2,.5]),shot(28,[0,1.7,4],[0,1.7,3.5],[0,1.2,0])],
  lines:[line(1,5,'Coach Hall','Inside! Ethan, get Joel through the door!'),line(7,11,'Joel','My arm... Ethan, something is moving in my arm.'),line(12,16,'Coach Hall','This will hide you from it. Hold still.'),line(17,21,'Joel','Who... who are you?'),line(22,27,'Ethan','Ethan. Your friend. Joel Honeycutt. Stay with me.'),line(28,33,'Coach Hall','Room 204 controls the bell. Restore the three fuses. Then find me.')],
  events:[{at:0,sound:'boss'},{at:5,door:0},{at:6,sound:'slam'},{at:12.2,prepareSerum:true},{at:16,serum:true,sound:'heartbeat'},{at:27,sound:'bell'}],goal:'Restore power. Find Room 204.'},
 descent:{duration:25,stage:'maze',label:'Room 204',when:'Present day · Somewhere underneath the school',
  actors:[ethan([[0,-.9,2.8,Math.PI],[6,-.9,1,Math.PI],[25,-.9,1,2.2]]),landon([[0,.8,-.3,0],[25,.8,-.3,-.8]]),actor('birdy','birdy',0xab291e,[[0,0,-8,0],[25,0,-7,0]])],
  shots:[shot(0,[0,1.7,5],[0,1.7,3.7],[0,1.5,-3],undefined,64),shot(7,[-2.8,1.55,2.9],[-2.4,1.5,2.4],[.8,1.5,-.3]),shot(15,[.5,1.6,2.3],[.3,1.6,1.9],[0,1.2,-5]),shot(21,[-2,1.4,2],[-1.8,1.4,2],[.8,1.4,-.3])],
  lines:[line(2,6,'Ethan','This was a classroom. Where is the school?'),line(8,12,'Landon','Under us. Around us. It keeps changing.'),line(13,17,'Luke’s voice','Landon. I found the way out.'),line(18,21,'Landon','That is not Luke. Follow my chalk, never the voice.'),line(22,25,'Landon','Find the three seal fragments. We bring everyone home.')],events:[{at:0,sound:'bell'},{at:13,sound:'whisper'}],goal:'Follow the chalk. Rebuild the seal.'},
 return:{duration:25,stage:'breach',label:'Room 204 · The breach',when:'The last night',
  actors:[ethan([[0,-1,3,Math.PI],[5,-1,1.8,2.5]]),hall([[0,1,-.5,0],[25,1,-.5,-.7]]),actor('gent','gentleman',0x171c1b,[[0,0,-5,0],[25,0,-5,0]])],
  shots:[shot(0,[0,1.5,5.5],[0,1.5,4.5],[0,1.4,-2]),shot(7,[-2,1.6,2.2],[-1.8,1.5,2],[1,1.4,-.5]),shot(16,[1.8,1.65,2],[1.8,1.65,1.5],[0,1.7,-5]),shot(21,[-1,1.4,3],[-1,1.4,2.7],[1,1.2,-.5])],
  lines:[line(2,6,'Ethan','Hall. You knew the serum would take their memories.'),line(7,12,'Coach Hall','Every dose. I thought hiding us was enough.'),line(13,17,'Coach Hall','It needs us forgotten. That is how the school feeds.'),line(18,21,'The Gentleman','One door. One survivor. A fair trade.'),line(22,25,'Ethan','No. Restore the anchors. Put their names on the PA.')],events:[{at:0,sound:'boss'},{at:18,sound:'whisper'}],goal:'Restore the anchors. Reach the PA.'},
 closet:{duration:26,stage:'closet',label:'The survivors’ closet',when:'Memory · The first night',
  actors:[ethan([[0,-.8,.7,Math.PI],[6,-.8,-.1,1.8],[26,-.8,-.1,1.8]]),joel([[0,.5,-.8,0,0,'hurt'],[26,.5,-.8,-.6,0,'hurt']]),hall([[0,1.6,-.3,-1.4],[13,1.1,-.5,-1.4,0,'reach']]),actor('earl','npc',0x433d32,[[0,0,2.8,Math.PI],[7,0,2.2,0,0,'brace'],[26,0,2.2,0,0,'brace']])],
  shots:[shot(0,[-2.5,1.7,1.3],[-2.2,1.6,1],[0,1.1,-.5]),shot(8,[1.6,1.55,.9],[1.5,1.4,.7],[0,1.1,-.5]),shot(17,[-1.8,1.45,.6],[-1.5,1.45,.6],[.5,1.3,-.8]),shot(22,[-1.8,1.6,-.1],[-1.8,1.6,-.1],[0,1.3,1.8])],
  lines:[line(1,5,'Earl Britt','They followed us. I can hold this door.'),line(6,10,'Coach Hall','Joel, one dose. Ethan, keep saying his name.'),line(11,15,'Joel','The lights... where did everyone go?'),line(16,20,'Ethan','We are here. Joel. Earl. Hall. I wrote every name.'),line(21,26,'Earl Britt','Fuses: the north classroom, east utility, east hall. Go!')],events:[{at:1,door:0,sound:'slam'},{at:6.2,prepareSerum:true},{at:10,serum:true,sound:'heartbeat'},{at:22,sound:'slam'}],goal:'Fuse locations remembered. Check the map.'},
 serum:{duration:20,stage:'serum',label:'Joel’s empty chair',when:'Memory · One dose later',
  actors:[ethan([[0,-.8,1.2,2.3],[20,-.8,1.2,2.3]]),joel([[0,.5,0,-.9,0,'sit'],[20,.5,0,-.9,0,'sit']]),hall([[0,1.6,-.5,-1.2,0,'reach'],[20,1.6,-.5,-1.2]])],
  shots:[shot(0,[1.5,1.8,2.8],[1.2,1.5,2.3],[.5,1,0]),shot(8,[-1.8,1.4,1.8],[-1.5,1.4,1.7],[.5,1.1,0]),shot(15,[0,1.2,2.4],[0,1.2,2.1],[1.2,1,-.4])],
  lines:[line(1,5,'Joel','We took geometry together, right? Who taught it?'),line(6,9,'Ethan','Mr. Orloski. You made him laugh every day.'),line(10,14,'Joel','I know the name. I cannot see his face.'),line(15,20,'Ethan','The serum hides us by erasing us. I will keep your name safe.')],events:[{at:0,serum:true},{at:10,sound:'heartbeat'}],goal:'A name can outlast the infection.'},
 road:{duration:28,stage:'road',label:'Oak Village North',when:'Memory · Before the school',
  actors:[ethan([[0,-1.6,-5,0],[10,-1.6,0,0],[12,-1.6,0,0,-4]]),joel([[0,-.5,-5.5,0],[10,-.5,-.2,0],[12,-.5,-.2,0,-4]]),landon([[0,.7,-5,0],[10,.7,0,0],[12,.7,0,0,-4]]),actor('luke','npc',0x514d6c,[[0,1.8,-5.4,0],[10,1.8,0,0],[12,1.8,0,0,-4]])],
  shots:[shot(0,[3.8,1.6,2.8],[3.6,1.5,1.5],[0,1,-3],undefined,60),shot(7,[0,4.8,4],[0,5.8,3.7],[0,0,0],undefined,66),shot(12,[0,6,3.5],[0,5.5,3],[0,-2,0]),shot(16,[2.2,1.6,3],[1.8,1.6,2.5],[.7,1.3,0])],
  lines:[line(1,5,'Luke','One more lap. Last one home buys breakfast.'),line(6,9,'Landon','Wait. That circle was not here yesterday.'),line(10,14,'Ethan','Luke! Grab my hand!'),line(17,21,'Luke’s voice','Come on, Landon. I know the way.'),line(22,28,'Landon','The road took us. Then a voice took Luke. He never came back.')],events:[{at:10,collapse:true,sound:'collapse'},{at:16,maze:true,sound:'whisper'}],goal:'The voice borrowed Luke. His name is still his.'},
 seal:{duration:22,stage:'seal',label:'The Geographer’s Seal',when:'Memory · A route home',
  actors:[actor('paul','npc',0x456477,[[0,-1.4,.2,2.2,0,'kneel'],[22,-1.4,.2,2.2]]),actor('johnson','npc',0x685842,[[0,1.3,-.5,-.5,0,'reach'],[22,1.3,-.5,-.5]]),landon([[0,-.6,2,Math.PI],[22,-.6,2,Math.PI]])],
  shots:[shot(0,[-2.8,1.9,3],[-2.5,1.6,2.5],[0,.8,0]),shot(7,[1.8,1.6,2.1],[1.6,1.6,1.9],[1.3,1.4,-.5]),shot(13,[0,3.2,2.7],[0,2.8,2.5],[0,.4,0]),shot(18,[-1.8,1.6,3],[-1.8,1.6,2.8],[-.6,1.4,2])],
  lines:[line(1,6,'Paul Cauley','The water moves. There is a current under the carpet.'),line(7,12,'Mr. Johnson','North. Every compass down here points to that wall.'),line(13,17,'Landon','Current. North. Home.'),line(18,22,'Ethan','A route, a direction, a name. I can open the seal.')],events:[{at:2,ring:0,sound:'pickup'},{at:9,ring:1,sound:'pickup'},{at:16,ring:2,sound:'bell'}],goal:'Seal order learned: Current → North → Home.'},
 sacrifice:{duration:24,stage:'breach',label:'A coach’s last promise',when:'Memory · Minutes before the breach',
  actors:[hall([[0,0,-1,Math.PI],[8,0,-2,Math.PI,0,'brace'],[24,0,-2,Math.PI,0,'brace']]),actor('zeb','zeb',0x677343,[[0,0,-6,0],[12,0,-3.9,0],[24,0,-3.3,0]]),joel([[0,1.7,.5,0],[12,1.7,3.5,0],[24,1.7,5.5,0]])],
  shots:[shot(0,[-3,1.6,2],[-2.5,1.6,1.7],[0,1.3,-2]),shot(8,[2.6,1.6,-.3],[2.4,1.6,-.6],[0,1.6,-3]),shot(15,[-1.5,1.3,.5],[-1.3,1.3,.5],[0,1.2,-2]),shot(20,[0,1.7,4],[0,1.7,3.5],[0,1.3,-2])],
  lines:[line(1,5,'Coach Hall','Zebene Martine. I remember you.'),line(6,10,'Joel','He is Stage Four. Hall, get away from him!'),line(11,15,'Coach Hall','He was a student before he was a stage.'),line(16,20,'Coach Hall','Get Ethan to the microphone. I will hold the door.'),line(21,24,'Ethan','No one gets left out of the last page.')],events:[{at:0,sound:'boss'},{at:8,sound:'slam'},{at:18,sound:'heartbeat'}],goal:'Zebene was a person. The PA can reach him.'},
 promise:{duration:20,stage:'breach',label:'The unwritten page',when:'A possible future',
  actors:[ethan([[0,-1,2.4,Math.PI],[20,-1,2.4,Math.PI]]),joel([[0,1,.3,0,0,'hurt'],[20,1,.3,-.5,0,'hurt']]),actor('gent','gentleman',0x171c1b,[[0,0,-4,0],[20,0,-4,0]])],
  shots:[shot(0,[0,1.6,4],[0,1.6,3.6],[0,1.3,-2]),shot(7,[-2.3,1.5,2.6],[-2,1.5,2.4],[1,1.2,.3]),shot(14,[1.8,1.6,2.5],[1.6,1.6,2.3],[-1,1.4,2.4])],
  lines:[line(1,6,'The Gentleman','Take the door. Let the last name disappear.'),line(7,12,'Joel','If I forget you... do you still know me?'),line(13,20,'Ethan','Joel Honeycutt. I know you. A story ends when no one adds a sentence.')],events:[{at:0,sound:'whisper'},{at:13,sound:'bell'}],goal:'Reach the microphone. Choose who comes home.'},
 home:{duration:30,stage:'dawn',label:'The last bell',when:'Sunrise',
  actors:[ethan([[0,-.8,1.8,Math.PI,0,'reach'],[12,-.8,1.8,Math.PI],[19,-.8,1.8,0],[30,-.8,5,0]]),joel([[0,.8,-3,0],[12,.8,-1,0],[19,.8,1.6,-1],[30,.8,5,0]]),hall([[0,2,-5,0],[30,2,3.8,0]]),landon([[0,-2,-5,0],[30,-2,3.8,0]]),actor('luke','npc',0x514d6c,[[0,0,-6,0],[30,0,3.8,0]])],
  shots:[shot(0,[-2.5,1.5,3.5],[-2.3,1.5,3],[-.8,1.3,1.8]),shot(9,[0,1.6,4.5],[0,1.6,4],[.8,1.4,-1]),shot(18,[-2.5,1.5,3],[-2.3,1.5,3],[0,1.4,1.8]),shot(24,[0,2.5,-3],[0,3.4,-5],[0,1.1,4],undefined,65)],
  lines:[line(1,8,'Ethan','Joel Honeycutt. Landon Chapa. Luke. Zebene Martine. Coach Hall.'),line(10,15,'Joel','Ethan? I remember. I remember all of it.'),line(17,22,'Ethan','We are going home. All of us.'),line(24,29,'Joel','You wrote us a way home.')],events:[{at:0,sound:'bell'},{at:16,sound:'resolve'}]},
 echoes:{duration:23,stage:'dawn',label:'The names that remain',when:'Sunrise',
  actors:[ethan([[0,-.8,1.8,Math.PI,0,'reach'],[15,-.8,1.8,0],[23,-.8,4,0]]),joel([[0,.8,-3,0],[15,.8,1.6,-1],[23,.8,4,0]])],
  shots:[shot(0,[-2.5,1.5,3.5],[-2.3,1.5,3],[-.8,1.3,1.8]),shot(8,[0,1.6,4],[0,1.6,3.8],[.8,1.4,0]),shot(17,[0,2.5,-3],[0,3,-4],[0,1.1,3],undefined,65)],
  lines:[line(1,7,'Ethan','Joel. Landon. Luke... there are names missing.'),line(9,14,'Joel','Some of us heard you. The others are still inside.'),line(16,22,'Ethan','Then this is not the last page. I am coming back.')],events:[{at:0,sound:'bell'},{at:15,sound:'resolve'}]},
 alone:{duration:22,stage:'dawn',label:'One survivor',when:'Sunrise',
  actors:[ethan([[0,0,-1,0],[22,0,5,0]]),actor('gent','gentleman',0x171c1b,[[0,2,-3,0],[22,2,-3,0]])],
  shots:[shot(0,[2.5,1.5,2],[2.3,1.5,2],[0,1.3,0]),shot(8,[0,1.5,5],[0,1.5,5.5],[0,1.2,2]),shot(15,[0,2.5,-3],[0,3.5,-5],[0,1.1,4],undefined,65)],
  lines:[line(1,6,'The Gentleman','One survivor. As promised.'),line(9,14,'Ethan','Joel? Anyone?'),line(16,21,'Ethan','The names are still here. There is no one left to answer.')],events:[{at:0,sound:'slam'},{at:18,sound:'bell'}]}
};
export const MEMORY_IDS=['closet','serum','road','seal','sacrifice','promise'];
SCENES.choice={...SCENES.promise,duration:16,label:'The microphone',when:'Room 204 · Now',lines:[line(1,6,'The Gentleman','Take my door. Seal this place. The bell will stop.'),line(7,11,'Joel','Ethan. Please do not let us disappear.'),line(12,16,'Ethan','I can call them home. Or end it here.')]};
SCENES.closet.actors.find(a=>a.id==='earl').path=[[0,0,2.8,Math.PI],[1.5,0,2.2,Math.PI],[5,0,2.2,Math.PI],[6.5,0,2.2,0,0,'brace'],[26,0,2.2,0,0,'brace']];
SCENES.closet.actors.find(a=>a.id==='hall').path=[[0,1.6,-.3,-1.4],[5.8,1.2,-.45,-1.4],[10,1.1,-.55,-1.4,0,'reach'],[26,1.1,-.55,-1.4,0,'reach']];
SCENES.serum.actors.find(a=>a.id==='hall').path=[[0,1.05,.05,-1.2,0,'reach'],[5,1.05,.05,-1.2],[20,1.05,.05,-1.2]];
directStoryScenes(SCENES);
export const MEMORY_LABELS=['Open survivor closet','Examine Joel’s chair','Touch the running shoes','Inspect the Geographer’s Seal','Listen to Hall’s whistle','Open the unwritten notebook'];
export function sceneSample(scene,time){
 const t=Math.max(0,Math.min(time,scene.duration));
 const index=Math.max(0,scene.shots.findLastIndex(s=>s.at<=t)),s=scene.shots[index],end=scene.shots[index+1]?.at??scene.duration;
 const u=Math.max(0,Math.min(1,(t-s.at)/(end-s.at))),ease=u*u*(3-2*u);
 const mix=(a,b,k)=>a.map((v,i)=>v+(b[i]-v)*k);
 return {shot:index,position:mix(s.from,s.to,ease),look:mix(s.look,s.end||s.look,ease),fov:s.fov+(s.endFov===undefined?0:(s.endFov-s.fov)*ease),coverage:s.coverage||null,progress:ease,
  line:scene.lines.find(l=>t>=l.at&&t<l.to)||null,
  fade:Math.max(0,1-t/.8,1-(scene.duration-t)/.9),
  actors:scene.actors.map(a=>{const i=Math.max(0,a.path.findLastIndex(p=>p[0]<=t)),p=a.path[i],q=a.path[i+1]||p,k=p===q?0:Math.min(1,(t-p[0])/(q[0]-p[0]));let delta=(q[3]-p[3]+Math.PI*3)%(Math.PI*2)-Math.PI;return{id:a.id,x:p[1]+(q[1]-p[1])*k,z:p[2]+(q[2]-p[2])*k,yaw:p[3]+delta*k,y:(p[4]||0)+((q[4]||0)-(p[4]||0))*k,pose:p[5]||'',previousPose:(a.path[i-1]||p)[5]||'',poseMix:i===0?1:Math.max(0,Math.min(1,(t-p[0])/.5)),moveBlend:Math.min(1,Math.max(0,(t-p[0])/.25),Math.max(0,(q[0]-t)/.35)),moving:p[1]!==q[1]||p[2]!==q[2]};})};
}
// Event consumption remains deterministic even when a slow frame crosses several cues.
export function poseWeight(actor,pose){const x=actor.poseMix??1,w=x*x*(3-2*x);return (actor.pose===pose?w:0)+(actor.previousPose===pose?1-w:0);}
export class StoryClock{
 constructor(scene){this.scene=scene;this.time=0;this.cursor=0;this.done=false;}
 tick(dt){if(this.done)return{events:[],sample:sceneSample(this.scene,this.time),done:true};this.time=Math.min(this.scene.duration,this.time+Math.max(0,dt));const events=[];while(this.cursor<(this.scene.events?.length||0)&&this.scene.events[this.cursor].at<=this.time)events.push(this.scene.events[this.cursor++]);this.done=this.time>=this.scene.duration;return{events,sample:sceneSample(this.scene,this.time),done:this.done};}
}
