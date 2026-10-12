import {sceneContext,MEMORY_LEAD_IN} from './scene-context.js?v=4.4.0';
import {dialogueFrame,speakingActor,speechMotion} from './cinematic-direction.js?v=4.4.0';
import * as T from './vendor/three.module.js';
import {SCENES,StoryClock} from './story.js?v=4.4.0';
import {voicedScene} from './voice-timeline.js?v=4.4.0';
import {BossIntroduction,displayName} from './boss-introductions.js?v=4.4.0';
const $=s=>document.querySelector(s);

// A separate, lit stage prevents cinematic actors from touching combat or save state.
export class Cinematics{
 constructor(game){this.game=game;this.world=game.world;this.active=false;$('#skip-scene').onclick=()=>this.finish();$('#pause-scene').onclick=()=>this.togglePause();$('#retry-scene-audio').onclick=()=>{if(this.arena?.active){const e=this.arena.enemy,done=this.arena.complete;this.arena.cancel();this.arena.play(e,done);}else this.play(this.id,this.complete);};$('#caption-scene').onclick=()=>{this.game.voice?.stop();this.captionFallback=true;$('#scene-loading').hidden=true;};}
 play(id,complete=()=>{}){
  if(this.active)this.cancel();let story=SCENES[id];if(!story){complete();return;}story=voicedScene(story);
  this.id=id;this.story=story;this.complete=complete;this.clock=new StoryClock(story);this.active=true;this.paused=false;this.finished=false;this.context=sceneContext(id);this.leadIn=this.context.kind==='present'?1.5:MEMORY_LEAD_IN;this.returnTime=null;
  this.game.setPaused(true);this.game.sound.init();this.game.sound.pause(false);this.build(story.stage);this.captionFallback=false;this.game.voice?.prepareScene(story);this.game.voice?.pause(true);$('#scene-loading').hidden=!this.game.voice;
  this.savedFov=this.world.camera.fov;$('#overlay').hidden=true;$('#hud').hidden=true;$('#chapter-card').hidden=true;$('#touch-controls').hidden=true;$('#cinematic').hidden=false;
  $('#scene-location').textContent=story.label;$('#scene-time').textContent=story.when;$('#pause-scene').textContent='Pause';
  document.body.classList.toggle('memory-scene',this.context.kind==='flashback');
  document.body.classList.toggle('premonition-scene',this.context.kind==='premonition');$('#cinematic').dataset.period=this.context.kind;
  $('#scene-type').textContent=this.context.kind==='flashback'?'FLASHBACK':this.context.kind==='premonition'?'PREMONITION':'';
  $('#scene-transition-title').textContent=this.context.title||story.label;$('#scene-transition-place').textContent=this.context.place||story.when;$('#scene-transition-object').textContent=this.context.object||'';
  $('#scene-transition').hidden=false;$('#scene-transition').style.opacity=1;this.update(0);
 }
 playEncounter(enemy,complete){if(this.active)this.cancel();this.arena??=new BossIntroduction(this);this.arena.play(enemy,complete);}
 togglePause(){if(this.arena?.active){this.arena.togglePause();return;}if(!this.active)return;this.paused=!this.paused;$('#pause-scene').textContent=this.paused?'Resume':'Pause';this.game.sound.pause(this.paused);this.game.voice?.pause(this.paused||this.leadIn>0||this.returnTime!==null);}
 text(text,at,w=2,h=.35,color='#d4ceae',parent=this.stage){const prior=this.world.root;this.world.root=parent;const o=this.world.sign(text,at,w,h,color);this.world.root=prior;return o;}
 build(type){
  this.portal=this.endingMic=this.door=this.vial=this.crater=this.mazeStage=this.rings=null;this.doorTarget=undefined;this.footbeat=undefined;
  this.scene=new T.Scene();this.stage=new T.Group();this.scene.add(this.stage);this.actors=new Map();this.geometry=[this.world.stageBoxGeometry(),new T.CylinderGeometry(1,1,1,16),new T.SphereGeometry(1,16,12)];
  this.materials=[];const mat=(color,roughness=.8,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});this.materials.push(m);return m;};
  const box=(m,scale,at,parent=this.stage)=>{const o=new T.Mesh(this.geometry[0],m);o.scale.set(...scale);o.position.set(...at);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
  const cyl=(m,scale,at,parent=this.stage)=>{const o=new T.Mesh(this.geometry[1],m);o.scale.set(...scale);o.position.set(...at);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
  const yellow=['maze','seal'].includes(type),outside=['road','dawn'].includes(type),breach=type==='breach';
  this.scene.background=new T.Color(type==='dawn'?0x6e796f:outside?0x0d1820:yellow?0x252012:0x0a1518);this.scene.fog=new T.FogExp2(this.scene.background,outside?.04:.023);
  this.scene.add(new T.HemisphereLight(type==='dawn'?0xffe0ac:yellow?0xf5dba4:0xb0c8d0,0x22261c,outside?1.3:.9));
  this.key=new T.SpotLight(type==='dawn'?0xffdca3:yellow?0xffe1a3:0xd9f0ee,180,24,.8,.6,2);this.key.position.set(-2,4,4);this.key.target.position.set(0,1,0);this.key.castShadow=true;this.key.shadow.mapSize.set(1024,1024);this.key.shadow.normalBias=.035;this.scene.add(this.key,this.key.target);
  const rim=new T.PointLight(breach?0xe87043:yellow?0xe1a245:0x6b98c1,35,14,2);rim.position.set(2,2.8,-4);this.scene.add(rim);
  this.scene.environment=this.world.viewScene.environment;this.scene.environmentIntensity=.28;
  this.faceLight=new T.SpotLight(0xf4d8b8,18,8,.65,.95,2);this.scene.add(this.faceLight,this.faceLight.target);
  const metal=mat(0x394845,.4,.65),dark=mat(0x17201f),wood=mat(0x514836),paper=mat(0xcac1a5),red=mat(0x782d23,.4),paint=mat(yellow?0xafa16b:0x758783);
  wood.map=this.world.procedural('wood');wood.bumpMap=wood.map;wood.bumpScale=.005;metal.bumpMap=this.world.procedural('fabric');metal.bumpScale=.0015;paper.map=this.world.procedural('paper');
  const wall=this.world.surface('wall',yellow?0xc5af70:0x9ca9a0,[2,1],.032);this.materials.push(wall);if(yellow)wall.map=this.world.procedural('wallpaper');
  const floor=this.world.surface('floor',outside?0x4b5556:0xabb3ab,[6,8],.02,.48);this.materials.push(floor);
  box(floor,[outside?40:8,.12,outside?45:16],[0,-.08,0]);
  if(outside){
   const grass=mat(type==='dawn'?0x606445:0x182c26);for(const x of[-10,10])box(grass,[13,.12,45],[x,-.07,0]);
   const marking=mat(type==='dawn'?0xccb396:0x8e937a);for(let z=-18;z<20;z+=3)box(marking,[.1,.005,1.6],[0,.006,z]);
   for(const x of[-1,1])for(let z=-15;z<18;z+=5){cyl(wood,[.16,5,.16],[x*9,2.5,z]);const foliage=mat(type==='dawn'?0x47513a:0x10221e);for(let i=0;i<3;i++){const leaf=new T.Mesh(this.geometry[2],foliage);leaf.scale.set(1.7,2,1.6);leaf.position.set(x*9+i*.25,5+i*.6,z);this.stage.add(leaf);}}
   for(const x of[-1,1])for(let z=-12;z<16;z+=10){box(paint,[5,3.5,6],[x*15,1.7,z]);box(wood,[5.5,.25,6.5],[x*15,3.6,z]);for(let j=-1;j<=1;j++)box(dark,[.8,1,.05],[x*15+j*1.35,1.9,z+3.04]);}
   if(type==='road'){
    this.crater=new T.Group();this.stage.add(this.crater);const hole=new T.Mesh(new T.CircleGeometry(3.1,64),new T.MeshBasicMaterial({color:0x000000}));hole.rotation.x=-Math.PI/2;hole.position.y=.018;this.crater.add(hole);this.crater.visible=false;
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const p=box(dark,[.8,.12,.7],[Math.cos(a)*3.1,.04,Math.sin(a)*3.1],this.crater);p.rotation.set(.2*Math.sin(i),a,.1*Math.cos(i));}
    this.mazeStage=new T.Group();this.mazeStage.visible=false;this.stage.add(this.mazeStage);box(wall,[8,3.3,.15],[0,1.6,-2.5],this.mazeStage);box(floor,[8,.12,10],[0,0,0],this.mazeStage);this.text('LUKE?', [0,1.8,-2.4],2,.5,'#d2c19a',this.mazeStage);
   }else{
    const sun=new T.DirectionalLight(0xffd695,3.2);sun.position.set(-7,4,-8);this.scene.add(sun);this.text('SMITHSON VALLEY',[0,2.6,-8],5,.6,'#cfbd98');
    if(this.id!=='alone'){
     const mic=new T.Group();this.stage.add(mic);cyl(metal,[.022,1.3,.022],[-.8,.65,1.3],mic);box(dark,[.09,.17,.08],[-.8,1.37,1.3],mic);box(metal,[.3,.035,.3],[-.8,.018,1.3],mic);this.endingMic=mic;
     this.portal=new T.Mesh(new T.TorusGeometry(2.5,.055,8,64),new T.MeshBasicMaterial({color:0xe0ca94}));this.portal.position.set(0,2.5,-4);this.stage.add(this.portal);
    }
   }
  }else{
   for(const x of[-4,4]){box(wall,[.16,3.3,16],[x,1.65,0]);box(metal,[.04,.12,16],[x*.978,.14,0]);box(wood,[.05,.055,16],[x*.978,1,0]);}
   box(wall,[8,3.3,.16],[0,1.65,-7.5]);box(paint,[8,.1,16],[0,3.34,0]);
   for(let z=-6;z<8;z+=3){box(metal,[1.8,.08,.3],[0,3.15,z]);const glow=new T.MeshBasicMaterial({color:yellow?0xffe2a8:0xd6e6d7});box(glow,[1.65,.025,.2],[0,3.09,z]);}
   for(let z=-6;z<6;z+=2){box(metal,[.04,.04,2],[3.87,2.6,z]);box(metal,[.08,.12,.16],[3.84,2.6,z]);}
   if(yellow){
    for(const [x,z]of[[-2,-4],[2,-5],[2.7,-.7]])box(wall,[.8,3.3,2.8],[x,1.65,z]);
    for(let z=-5;z<4;z+=2){const arrow=this.text('↑',[0,.018,z],.7,.8,'#dfd7b4');arrow.rotation.x=-Math.PI/2;}
    this.text('DO NOT ANSWER IT',[0,2.2,-7.39],3,.35,'#67583e');
   }else{
    // Supply shelves, individual binders, dented lockers and emergency equipment.
    for(let z=-4;z<4;z+=1.6){box(metal,[.62,2.25,.48],[-3.65,1.12,z]);box(paint,[.56,2.16,.04],[-3.65,1.12,z+.27]);for(let y=.4;y<2;y+=.32)box(dark,[.34,.025,.02],[-3.65,y,z+.298]);box(metal,[.07,.12,.035],[-3.46,1.15,z+.3]);}
    for(let y=.3;y<2.7;y+=.55){box(metal,[1.1,.055,2.8],[3.2,y,-.7]);for(let i=0;i<5;i++)box(i%2?wood:paper,[.18,.28,.3],[3+(i%2)*.25,y+.16,-1.7+i*.45]);}
    for(const x of[2.68,3.72])for(const z of[-2, .6])box(metal,[.035,2.8,.035],[x,1.4,z]);
    box(red,[.28,.65,.2],[3.85,1.1,2.7]);cyl(metal,[.06,.2,.06],[3.85,1.48,2.7]);
    this.text(breach?'ROOM 204':type==='closet'?'SUPPLIES':'CS SANCTUARY',[0,2.85,-2.05],2.5,.3);
   }
   if(['school','closet'].includes(type)){
    const z=type==='closet'?2.8:-2.4;for(const x of[-2.7,2.7])box(wall,[2.6,3.3,.14],[x,1.65,z]);box(wall,[2.8,.55,.15],[0,3.02,z]);
    this.door=new T.Group();this.door.position.set(-1.35,0,z);this.stage.add(this.door);box(wood,[2.65,2.75,.11],[1.35,1.38,0],this.door);box(metal,[.2,.035,.05],[2.45,1.25,.09],this.door);this.door.rotation.y=-1.5;
   }
   if(type==='serum'||type==='closet'||type==='school'){
    box(metal,[1.6,.08,.65],[1.9,.85,-.7]);for(const x of[1.25,2.55])for(const z of[-.95,-.45])box(metal,[.05,.85,.05],[x,.43,z]);
    this.vial=new T.Group();this.vial.position.set(1.85,.94,-.65);this.stage.add(this.vial);const liquid=mat(0x76bb8d,.18,.3);cyl(liquid,[.045,.15,.045],[0,0,0],this.vial);cyl(metal,[.047,.035,.047],[0,.095,0],this.vial);box(paper,[.28,.01,.22],[.2,-.045,0],this.vial);
    this.text('HALL',[1.85,1.05,-.64],.3,.09,'#d8dfbf');box(wood,[.6,.06,.55],[.5,.5,0]);box(wood,[.6,.6,.05],[.5,.82,-.23]);for(const x of[.27,.73])for(const z of[-.2,.2])box(metal,[.04,.5,.04],[x,.25,z]);
   }
   if(type==='seal'){
    this.rings=[];for(let i=0;i<3;i++){const ring=new T.Mesh(new T.TorusGeometry(.45+i*.24,.025,8,64),new T.MeshStandardMaterial({color:0x726445,emissive:0x000000,metalness:.75,roughness:.35}));ring.rotation.x=Math.PI/2;ring.position.set(0,.35+i*.035,0);this.stage.add(ring);this.rings.push(ring);}
    for(let i=0;i<3;i++)this.text(['CURRENT','NORTH','HOME'][i],[-1.4+i*1.4,.7,-.8],1.1,.2,'#c2b188');
   }
   if(breach){
    this.portal=new T.Mesh(new T.TorusGeometry(1.45,.055,8,64),new T.MeshBasicMaterial({color:0xe79864}));this.portal.position.set(0,1.5,-5.3);this.stage.add(this.portal);
    const black=new T.Mesh(new T.CircleGeometry(1.44,64),new T.MeshBasicMaterial({color:0x000101}));black.position.set(0,1.5,-5.35);this.stage.add(black);
    box(metal,[1.2,.12,.7],[-1.1,1,1.5]);for(const x of[-1.5,-.7])box(metal,[.045,1,.045],[x,.5,1.5]);cyl(metal,[.025,.3,.025],[-1.1,1.2,1.5]);box(dark,[.12,.16,.09],[-1.1,1.42,1.5]);this.text('ALL CALL',[-1.1,1.07,1.86],.8,.16,'#b5bea8');
    for(let i=0;i<15;i++){const vein=box(red,[.05,1.2,.06],[(i%2?1:-1)*3.88,.4+i%4*.65,-6+i*.7]);vein.rotation.z=Math.sin(i)*.9;}
   }
  }
  for(const a of this.story.actors){const g=this.world.character(a.kind,a.color,a.id);this.stage.add(g);this.actors.set(a.id,g);}
 }
 event(e){if(e.sound)this.game.sound.play(e.sound);if(e.door!==undefined&&this.door)this.doorTarget=e.door;if(e.serum&&this.vial){const fore=this.actors.get('hall')?.userData.arms?.[0]?.userData.forearm;if(fore){fore.add(this.vial);this.vial.position.set(0,-.39,.03);this.vial.rotation.z=.7;}else this.vial.visible=false;}if(e.collapse&&this.crater)this.crater.visible=true;
  if(e.maze&&this.mazeStage){this.mazeStage.visible=true;for(const g of this.actors.values())g.visible=false;const landon=this.actors.get('landon');if(landon){landon.visible=true;landon.position.set(.7,0,0);}this.key.color.set(0xffe0a1);}
  if(e.ring!==undefined&&this.rings?.[e.ring])this.rings[e.ring].material.emissive.set(0x725525);
 }
 update(dt){
  if(this.arena?.active){this.arena.update(dt);return;}
  if(!this.active)return;
  if(this.leadIn>0&&!this.paused){this.leadIn=Math.max(0,this.leadIn-dt);if(this.leadIn===0)this.game.voice?.pause(false);}
  if(this.returnTime!==null&&!this.paused){this.returnTime+=dt;if(this.returnTime>=1.65){this.finish();return;}}
  const transition=this.leadIn>0||this.returnTime!==null;
  $('#scene-transition').hidden=!transition;$('#scene-transition').style.opacity=this.leadIn>0?Math.min(1,this.leadIn/.35):this.returnTime!==null?Math.min(1,this.returnTime/.3):0;
  const voice=this.game.voice,state=voice?.scene;const advance=transition||this.paused?0:state?Math.max(0,voice.sceneTime-this.clock.time):dt;const {events,sample,done}=this.clock.tick(advance);for(const e of events)this.event(e);const t=this.clock.time,originalTime=this.story.sourceTime(t);
  $('#scene-loading').hidden=transition||!state||state.ready;$('#scene-loading-message').textContent=state?.error?'Dialogue could not load.':'Preparing audio…';$('#scene-audio-actions').hidden=!state?.error;
  for(const a of sample.actors){const g=this.actors.get(a.id);if(!g||this.mazeStage?.visible)continue;g.position.set(a.x,a.y,a.z);g.rotation.y=a.yaw;this.world.animateCharacter(g,t,a.moving);
   const d=g.userData;if(a.pose==='hurt'){d.body.rotation.z=.10;d.head.rotation.z=.15;d.arms[0].rotation.x=-.4;if(d.arms[0].userData.forearm)d.arms[0].userData.forearm.rotation.x=-1.5;}
   if(a.pose==='kneel'||a.pose==='sit'){g.position.y-=.42;d.legs.forEach(l=>{l.rotation.x=-1.1;if(l.userData.calf)l.userData.calf.rotation.x=1.6;});d.body.rotation.x=.10;}
   if(a.pose==='reach'||a.pose==='brace'){d.arms.forEach((arm,i)=>{arm.rotation.x=a.pose==='brace'?-.85:i===0?-.65:-.1;if(arm.userData.forearm)arm.userData.forearm.rotation.x=a.pose==='brace'?-.6:i===0?-.7:-.15;});d.head.rotation.x=-.1;}
  }
  if(this.door&&this.doorTarget!==undefined)this.door.rotation.y+=(this.doorTarget-this.door.rotation.y)*Math.min(1,dt*7);
  const frame=dialogueFrame(this.story,sample,t),camera=this.world.camera;camera.position.fromArray(frame.position);if(camera.aspect<1.25){const target=new T.Vector3(...frame.look);camera.position.sub(target).multiplyScalar(1.22).add(target);}camera.lookAt(...frame.look);camera.fov=Math.min(100,T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(frame.fov)/2)*Math.max(1,1/camera.aspect))));camera.updateProjectionMatrix();
  this.faceLight.position.copy(camera.position);this.faceLight.position.y+=.45;this.faceLight.target.position.fromArray(frame.look);this.faceLight.intensity=frame.subject?16:4;
  const footbeat=Math.floor(t*2.5);if(!this.paused&&footbeat!==this.footbeat&&sample.actors.some(a=>a.moving)){this.game.sound.play('step');this.footbeat=footbeat;}
  if(this.endingMic)this.endingMic.visible=originalTime<12;
  if(!this.game.settings.motion&&this.story.stage==='road'&&originalTime>10&&originalTime<12)camera.position.y+=Math.sin(t*41)*.045;
  if(this.portal)this.portal.rotation.z=t*.09;this.key.intensity=180*(.98+Math.sin(t*2.1)*.02);
  $('#scene-speaker').textContent=sample.line?displayName(sample.line.speaker):'';$('#scene-subtitle').textContent=sample.line?.text||'';$('#scene-captions').hidden=transition||!sample.line||(!this.captionFallback&&this.game.settings.subtitles===false);
  const speakerId=speakingActor(this.story,sample.line),speaker=this.actors.get(speakerId),mouth=speechMotion(sample.line,t);
  for(const [id,g]of this.actors){const d=g.userData;if(d.face)d.face.morphTargetInfluences[0]=id===speakerId?mouth:0;if(!d.human)continue;
   d.head.rotation.x+=Math.sin(t*2.8+(d.phase||0))*.012;d.body.rotation.y=Math.sin(t*.7+(d.phase||0))*.008;
   if(id===speakerId){d.head.rotation.x+=Math.sin(t*4.1)*.02;d.head.rotation.z+=Math.sin(t*2.6)*.018;if(!sample.actors.find(a=>a.id===id)?.pose){d.arms[1].rotation.x-=mouth*.12;d.arms[1].userData.forearm.rotation.x-=mouth*.17;}}
  }
  $('#scene-fade').style.opacity=transition?1:sample.fade;$('#scene-progress').style.width=t/this.story.duration*100+'%';$('#scene-location').style.opacity=t<5?1:0;$('#scene-time').style.opacity=t<5?1:0;
  this.world.renderer.autoClear=true;this.world.renderer.render(this.scene,camera);this.world.worldCalls=this.world.renderer.info.render.calls;
  $('#world').dataset.state=JSON.stringify({...this.game.snapshot(),cinematic:this.id,sceneTime:Math.round(t*10)/10,scenePaused:this.paused,voice:voice?.status});
  if(done&&this.returnTime===null){
   if(this.context.return){this.returnTime=0;this.game.voice?.pause(true);$('#scene-transition-title').textContent=this.context.return;$('#scene-transition-place').textContent=this.game.config?.place||'Smithson Valley';$('#scene-transition-object').textContent=this.context.kind==='premonition'?'The future is unwritten.':'Ethan Espey · The last night';}
   else this.finish();
  }
 }
 release(){
  this.game.voice?.stop();this.active=false;$('#cinematic').hidden=true;$('#scene-loading').hidden=true;document.body.classList.remove('memory-scene','premonition-scene');$('#scene-transition').hidden=true;this.world.camera.fov=this.savedFov;this.world.camera.updateProjectionMatrix();
  this.world.disposeObject(this.scene);this.scene=null;this.actors.clear();this.game.sound.pause(true);
 }
 finish(){if(this.arena?.active){this.arena.finish();return;}if(!this.active||this.finished)return;this.finished=true;const complete=this.complete;this.release();complete();}
 cancel(){if(this.arena?.active){this.arena.cancel();return;}if(!this.active)return;this.finished=true;this.release();}
}
