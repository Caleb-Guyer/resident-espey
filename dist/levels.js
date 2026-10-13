// Authored room sequences. Door cells are the only connections between stages.
const room=(name,kind,bounds,stage=0)=>({name,kind,bounds,stage});
const gate=(at,axis,requires,label)=>({at,axis,requires,label});
export const CAMPAIGN_REVISION=4;
export const LEVELS={
 school:{
  start:[4,20],npc:[5,20],exit:[25,3],boss:[24,4],
  rooms:[room('CS sanctuary','computers',[2,18,7,22]),room('Survivors’ shelter','closet',[3,9,7,14]),room('North classroom','science',[2,2,7,6]),room('East utility','utility',[12,2,17,7],1),room('Flooded east hall','flood',[21,9,27,16],2),room('Room 204','assembly',[21,2,27,6],3)],
  corridors:[[[5,18],[5,14]],[[5,9],[5,6]],[[7,4],[12,4]],[[15,7],[15,12]],[[15,12],[21,12]],[[25,9],[25,6]]],
  gates:[gate([10,4],'x',1,'EAST UTILITY'),gate([15,9],'z',2,'EAST HALL'),gate([25,7],'z',3,'ROOM 204')],
  tasks:['Find the classroom fuse.','Restore utility power.','Recover the east hall fuse.','Face Chris.'],
  objectives:[[4,3],[15,5],[25,13]],pages:[[4,11],[16,4]],ammo:[[6,19],[6,4],[15,11],[26,15]],meds:[[3,12],[22,15]],save:[[3,20],[13,6]],
  enemies:[['walker',5,13,0],['walker',4,5,0],['runner',15,6,1],['walker',24,13,2],['walker',26,11,2],["crawler",6,12,0],['feral',6,5,0],["spitter",3,2,0],['screamer',3,9,0],["brute",16,3,1],['bulwark',13,7,1],["spitter",22,10,2],["runner",27,14,2],['screamer',22,16,2]],
  route:[[4,20],[5,13],[5,4],[15,4],[15,12],[25,12],[25,3]],
  beats:[{id:'shelter',at:[5,13],stage:0,sound:'slam',line:['Ethan','The closet. This is where we hid on the first night.']},{id:'utility',at:[14,4],stage:1,sound:'heartbeat',line:['Coach Hall','Keep moving, Ethan. The utility switch opens the east hall.']},{id:'flood',at:[22,12],stage:2,sound:'whisper',line:['Ethan','Water on the floor. Something is moving at the far end.']},{id:'chris',at:[25,5],stage:3,boss:true}],
  cues:[['Joel','North classroom first. The fuse will open the service shutter.'],['Ethan','One fuse. The shutter is lifting. East utility next.'],['Coach Hall','The east hall is open. One more fuse, then Room 204.'],['Ethan','Room 204. I can hear him on the other side.']]
 },
 backrooms:{
  start:[4,20],npc:[5,20],exit:[7,4],boss:[9,5],
  rooms:[room('Landon’s refuge','refuge',[2,18,7,22]),room('The water current','current',[10,16,16,22]),room('Compass store','storage',[21,12,27,22],1),room('North hall','mimic',[17,2,27,8],2),room('The Geographer’s chamber','seal',[4,2,12,8],3)],
  corridors:[[[7,20],[10,20]],[[16,19],[21,19]],[[25,12],[25,8]],[[17,5],[12,5]]],
  gates:[gate([19,19],'x',1,'THE NORTH PASSAGE'),gate([25,10],'z',2,'DO NOT ANSWER'),gate([15,5],'x',3,'THE GEOGRAPHER')],
  tasks:['Follow the current.','Search the compass store.','Find the last fragment.','Face Jakob & Bobby.'],
  objectives:[[14,18],[25,14],[20,4]],pages:[[11,20],[23,18]],ammo:[[6,19],[15,21],[24,17],[18,6]],meds:[[12,17],[26,20]],save:[[3,20],[22,20]],
  enemies:[['walker',12,19,0],['zsiga',24,20,1],['walker',26,15,1],['birdy',25,7,2],['zsiga',19,4,2],["crawler",11,17,0],["stalker",16,21,0],["walker",10,22,0],["spitter",22,13,1],["crawler",27,18,1],["brute",24,22,1],['feral',21,16,1],["stalker",18,8,2],["spitter",27,3,2]],
  route:[[4,20],[14,20],[14,19],[25,19],[25,5],[9,5],[7,4]],
  beats:[{id:'current',at:[12,20],stage:0,sound:'whisper',line:['Landon','The carpet is wet here. Follow the current, just like Paul did.']},{id:'blackout',at:[24,17],stage:1,sound:'slam',blackout:1.8,line:['Nathan Nunley','The lights can fail. The chalk does not. Keep north.']},{id:'mimic',at:[25,7],stage:2,sound:'whisper',line:['Luke’s voice','Landon. This way. I have been waiting for you.']},{id:'jakob',at:[11,5],stage:3,boss:true}],
  cues:[['Landon','The water current first. That fragment opens the north passage.'],['Ethan','Current. The north passage is open. Find the compass store.'],['Nathan Nunley','North is marked. Keep to the chalk when the voices start.'],['Ethan','Current. North. Home. The Geographer’s chamber is open.']]
 },
 breach:{
  start:[5,20],npc:[6,20],exit:[16,3],boss:[16,5],
  rooms:[room('Triage shelter','triage',[2,17,9,22]),room('The infirmary','infirmary',[3,9,9,15]),room('The switchgear','switchgear',[13,9,20,15],1),room('Relay catwalk','catwalk',[23,9,27,14],2),room('The last anchor','relay',[23,16,27,22],2),room('Room 204','finale',[12,2,21,7],3)],
  corridors:[[[6,17],[6,15]],[[9,12],[13,12]],[[20,12],[23,12]],[[25,14],[25,16]],[[25,9],[25,5]],[[25,5],[21,5]]],
  gates:[gate([11,12],'x',1,'SWITCHGEAR'),gate([22,12],'x',2,'RELAY CATWALK'),gate([23,5],'x',3,'ROOM 204')],
  tasks:['Restore the infirmary anchor.','Restore the switchgear anchor.','Restore the last anchor.','Face Zeb.'],
  objectives:[[6,12],[17,12],[25,18]],pages:[[4,13],[26,19]],ammo:[[8,20],[8,10],[19,14],[25,10],[24,21]],meds:[[4,10],[24,17]],save:[[3,20],[14,14]],
  enemies:[['runner',6,14,0],['walker',7,10,0],['zsiga',16,13,1],['runner',25,13,2],['walker',26,19,2],["crawler",3,14,0],["spitter",9,9,0],["brute",8,13,0],["stalker",14,10,1],["crawler",19,11,1],["spitter",20,14,1],['bulwark',14,15,1],["stalker",24,11,2],["brute",24,20,2]],
  route:[[5,20],[6,12],[17,12],[25,12],[25,18],[25,5],[16,5],[16,3]],
  beats:[{id:'infirmary',at:[6,14],stage:0,sound:'heartbeat',line:['Coach Hall','Their names are on the beds. I thought I could hide what happened here.']},{id:'switchgear',at:[16,12],stage:1,sound:'slam',line:['Ethan','The walls are moving with the wires. The school is one body.']},{id:'catwalk',at:[25,12],stage:2,sound:'boss',line:['Coach Hall','The last anchor is beyond the catwalk. I will hold the door.']},{id:'zebene',at:[20,5],stage:3,boss:true}],
  cues:[['Coach Hall','Infirmary. Switchgear. Relay. Restore the anchors in that order.'],['Ethan','The infirmary anchor is alive. I can reach the switchgear.'],['Coach Hall','Two anchors. Take the relay catwalk to the last one.'],['Ethan','The anchors are holding. Get to the microphone. Say every name.']]
 }
};

export function makeLevelGrid(theme,stage=3){
 const level=LEVELS[theme];if(!level)throw Error('Unknown level: '+theme);
 const grid=Array.from({length:24},()=>Array(30).fill(1));
 const carve=(x,z)=>{if(x>0&&z>0&&x<29&&z<23)grid[z][x]=0;};
 for(const {bounds:[x1,z1,x2,z2]}of level.rooms)for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++)carve(x,z);
 for(const [a,b]of level.corridors){let [x,z]=a;carve(x,z);while(x!==b[0]||z!==b[1]){if(x!==b[0])x+=Math.sign(b[0]-x);else z+=Math.sign(b[1]-z);carve(x,z);}}
 for(const g of level.gates)if(stage<g.requires)grid[g.at[1]][g.at[0]]=1;
 return grid;
}
export function roomAt(level,x,z,tile=2.4){const cx=x/tile,cz=z/tile;return level.rooms.find(r=>cx>=r.bounds[0]&&cx<r.bounds[2]+1&&cz>=r.bounds[1]&&cz<r.bounds[3]+1);}
export function stageFor(collected){let n=0;while(n<3&&collected.includes(n))n++;return n;}
