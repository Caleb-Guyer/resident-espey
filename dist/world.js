import './direct-lighting.js?v=5.2.1';
import {duringGPUWork,finishGPUWarmup} from './render-budget.js?v=5.2.1';
import {mergeRigidParts} from './rigid-batch.js?v=5.2.1';
import {warmRaster} from './warm-raster.js?v=5.2.1';
import {uploadSceneTextures} from './texture-warmup.js?v=5.2.1';
import {isZombie} from './zombie-damage.js?v=5.2.1';
import {ZombieGore} from './zombie-gore.js?v=5.2.1';
import {WEAPONS,weaponFor} from './weapons.js?v=5.2.1';
import {createLongGun} from './longguns.js?v=5.2.1';
import {scannedMaterial,microTexture} from './surface-materials.js?v=5.2.1';
import {surfaceMaterial} from './material-surfaces.js?v=5.2.1';
import {addEnvironmentDetail} from './environment-detail.js?v=5.2.1';
import {loadLicensedArt,photographedMaterial,createLicensedEnemy,animateLicensedEnemy,dressLicensedRooms,fittedProp} from './licensed-art.js?v=5.2.1';
import {painted} from './loading.js?v=5.2.1';
import {BossArena} from './boss-arena.js?v=5.2.1';
import {createAnatomy,animateCollapse} from './anatomy.js?v=5.2.1';
import {reloadProgress} from './reload.js?v=5.2.1';
import {ATTACKS,enemyRadius} from './enemy-director.js?v=5.2.1';
import * as T from './vendor/three.module.js?v=5.2.1';
import {TILE,seeded,solid,findPath} from './data.js?v=5.2.1';
import {EYE_HEIGHT,CEILING,BODY_SCALE,viewDirection,propsBlock,propsOcclude,environmentDistance} from './fps.js?v=5.2.1';
import {CombatEffects} from './combat-effects.js?v=5.2.1';
import {WallPlacement} from './wall-placement.js?v=5.2.1';
import {createViewModel,createHands,updateSleeveAnchors,loadHandSurfaces} from './viewmodel.js?v=5.2.1';
import {createWeaponMotion,kickWeapon,stepWeaponMotion} from './weapon-motion.js?v=5.2.1';
import {CHARACTER_DESIGNS,characterHair,dressBirdy,dressArchetype,cloneCharacter} from './creature-design.js?v=5.2.1';
import {EnemyEffects} from './enemy-effects.js?v=5.2.1';
import {BOSS_PROFILES,createBossModel} from './boss-models.js?v=5.2.1';
import {animateBoss} from './boss-animation.js?v=5.2.1';
import {loadPreparedGeometry} from './prepared-geometry.js?v=5.2.1';

const BOX=bevelBox(1,1,1,.014),WALLBOX=new T.BoxGeometry(1,1,1),SPHERE=new T.SphereGeometry(1,20,14),CYL=new T.CylinderGeometry(1,1,1,16);
const SHARED=new Set([BOX,WALLBOX,SPHERE,CYL]);
// Keep beveled furniture inside the dimensions used by placement and collision.
{BOX.computeBoundingBox();const size=BOX.boundingBox.getSize(new T.Vector3());BOX.scale(1/size.x,1/size.y,1/size.z);}
// Extrusion UVs are in model units; furniture faces need a complete texture.
{const a=BOX.attributes.position,n=BOX.attributes.normal,u=BOX.attributes.uv;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));u.setXY(i,nz>nx&&nz>ny?x+.5:nx>ny?z+.5:x+.5,ny>nx&&ny>nz?z+.5:y+.5);}}
const material=(color,roughness=.82,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function mesh(geo,mat,scale,at,parent){const o=new T.Mesh(geo,mat);o.scale.set(...scale);o.position.set(...at);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function link(parent,mat,a,b,r=.025){const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from);const o=mesh(CYL,mat,[r,delta.length(),r],from.add(to).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
function tube(parent,mat,points,r=.012){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,Math.max(8,points.length*4),r,5,false),mat,[1,1,1],[0,0,0],parent);}
function canvasTexture(draw,size=512){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
function bevelBox(w,h,d,r=.003){
 const s=new T.Shape(),x=w/2,y=h/2;s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.quadraticCurveTo(x,-y,x,-y+r);s.lineTo(x,y-r);s.quadraticCurveTo(x,y,x-r,y);s.lineTo(-x+r,y);s.quadraticCurveTo(-x,y,-x,y-r);s.lineTo(-x,-y+r);s.quadraticCurveTo(-x,-y,-x+r,-y);
 return new T.ExtrudeGeometry(s,{depth:d-r*2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r,bevelThickness:r,curveSegments:3}).translate(0,0,-d/2+r);
}

// Each limb keeps its own animation pivot; rigid details share a merged mesh.
const mergeParts=g=>mergeRigidParts(g,SHARED);

function resetWeaponParts(m){
 m.magazine.position.set(...(m.magazine.userData.rest||[0,-.06,0]));m.magazine.rotation.set(0,0,0);m.magazine.visible=true;m.slide.position.z=0;m.trigger.rotation.x=m.hammer.rotation.x=0;if(m.pump)m.pump.position.z=0;
 m.leftHand.position.set(...m.leftHand.userData.rest);m.leftHand.rotation.set(...(m.leftHand.userData.restRotation||[0,0,0]));m.leftSkin.morphTargetInfluences[0]=m.rightSkin.morphTargetInfluences[0]=0;if(m.muzzle)m.muzzle.visible=false;if(m.root.userData.shell)m.root.userData.shell.visible=false;
}
export class World{
 constructor(canvas,settings){
  this.settings=settings;this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='high'?1.65:1));this.renderer.shadowMap.enabled=settings.quality==='high';this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.28;
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(settings.fov||76,1,.06,85);this.camera.rotation.order='YXZ';
  this.lamps=[];this.obstacles=[];this.recoil=0;this.ads=0;this.walk=0;this.assets={};this.characterTemplates=new Map();this.characterResources=new Set();
  const loader=new T.TextureLoader();this.ready=Promise.all([['floor','floor'],['wall','plaster'],['skin','infected-skin'],['face','infected-face'],['ethan','ethan-face'],['survivor','survivor-face']].map(([name,file])=>new Promise((resolve,reject)=>{
   const t=loader.load(new URL(`./assets/${file}.webp`,import.meta.url).href,resolve,undefined,reject);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;this.assets[name]=t;
  })));const portrait=new Promise((resolve,reject)=>{const t=loader.load(new URL('./assets/boss-faces-v2.png',import.meta.url).href,resolve,undefined,reject);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;this.assets.boss=t;});const scans=new Promise((resolve,reject)=>{const t=loader.load(new URL('./assets/material-scans.png',import.meta.url).href,resolve,undefined,reject);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;this.assets.scans=t;});const surfaces=new Promise((resolve,reject)=>{const t=loader.load(new URL('./assets/material-surfaces-v3.png',import.meta.url).href,resolve,undefined,reject);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;this.assets.surfaces=t;});this.ready=Promise.all([this.ready,portrait,scans,surfaces,loadHandSurfaces(),loadPreparedGeometry()]);this.ready.catch(()=>{});
  // Let the title paint and textures arrive before the detailed hands are built.
  this.ready=Promise.all([this.ready,loadLicensedArt(this.characterResources).then(library=>{this.licensed=library;})]).then(async()=>{await painted();await this.prepareWeapons();this.resize();});this.ready.catch(()=>{});this.resize();
 }
 resize(){this.needsPausedRender=true;this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();if(this.viewCamera){this.viewCamera.aspect=this.camera.aspect;this.viewCamera.updateProjectionMatrix();}}
 stageBoxGeometry(){return BOX.clone();}
 surface(asset,color,repeat=[1,1],bump=.02,roughness=.9){if(asset==='floor'&&this.licensed){const m=photographedMaterial(this.licensed.materials.get('floor_tiles_06'),repeat,color);m.roughness=roughness;return m;}const map=this.assets[asset].clone();map.needsUpdate=true;map.repeat.set(...repeat);const height=map.clone();height.colorSpace=T.NoColorSpace;height.needsUpdate=true;return new T.MeshStandardMaterial({color,map,bumpMap:height,bumpScale:bump,roughness});}
 procedural(kind){
  this.proceduralCache??=new Map();if(this.proceduralCache.has(kind)){const t=this.proceduralCache.get(kind).clone();t.needsUpdate=true;return t;}
  const rnd=seeded(kind.length*87);const source=canvasTexture((ctx,s)=>{
   ctx.fillStyle=kind==='paper'?'#bdb4a1':kind==='carpet'?'#81704a':kind==='wallpaper'?'#aa9659':kind==='ceiling'?'#9b9c88':'#949b8b';ctx.fillRect(0,0,s,s);
   for(let i=0;i<22000;i++){ctx.fillStyle=rnd()>.5?'rgba(232,222,186,.08)':'rgba(9,12,8,.14)';ctx.fillRect(rnd()*s,rnd()*s,1+rnd()*3,1+rnd()*3);}
   if(kind==='wallpaper'){
    ctx.strokeStyle='#75643b';ctx.lineWidth=1.3;for(let x=0;x<=s;x+=32)for(let y=0;y<=s;y+=64){ctx.beginPath();ctx.ellipse(x,y,11,26,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y-22);ctx.quadraticCurveTo(x+18,y,x,y+22);ctx.quadraticCurveTo(x-18,y,x,y-22);ctx.stroke();}
    for(let i=0;i<18;i++){const x=rnd()*s,y=rnd()*s,r=12+rnd()*65,d=ctx.createRadialGradient(x,y,0,x,y,r);d.addColorStop(0,'#23291755');d.addColorStop(1,'#23291700');ctx.fillStyle=d;ctx.fillRect(x-r,y-r,r*2,r*2);}
   }
   if(kind==='ceiling'){ctx.strokeStyle='#464c3b';ctx.lineWidth=3;for(let v=0;v<=s;v+=128){ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,s);ctx.moveTo(0,v);ctx.lineTo(s,v);ctx.stroke();}}
   if(kind==='paper'){ctx.fillStyle='#454b43';for(let y=65;y<s-50;y+=17)ctx.fillRect(35,y,Math.min(400,80+rnd()*370),2);}
   if(kind==='fabric'){ctx.strokeStyle='#71806425';ctx.lineWidth=.6;for(let i=0;i<s;i+=3){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,s);ctx.moveTo(0,i);ctx.lineTo(s,i);ctx.stroke();}}
   if(kind==='infectedcloth'){for(let i=0;i<45;i++){const x=rnd()*s,y=rnd()*s,r=8+rnd()*70,d=ctx.createRadialGradient(x,y,0,x,y,r);d.addColorStop(0,i%3?'#171c18c0':'#361713bb');d.addColorStop(1,'#171c1800');ctx.fillStyle=d;ctx.fillRect(x-r,y-r,r*2,r*2);}ctx.strokeStyle='#ddd2bb33';ctx.lineWidth=1;for(let i=0;i<45;i++){const x=rnd()*s,y=rnd()*s;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+10+rnd()*30);ctx.stroke();}}
   if(kind==='wood'){ctx.fillStyle='#a29377';ctx.fillRect(0,0,s,s);for(let i=0;i<750;i++){const x=rnd()*s;ctx.strokeStyle=i%3?'#33261b25':'#cfbea82a';ctx.lineWidth=.3+rnd()*1.2;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+Math.sin(i)*10,s*.3,x+Math.sin(i+1)*14,s*.7,x,s);ctx.stroke();}}
  });this.proceduralCache.set(kind,source);this.characterResources?.add(source);this.renderer?.initTexture?.(source);const t=source.clone();t.needsUpdate=true;return t;
 }
 optimizeStatic(){
  this.root.updateMatrixWorld(true);const buckets=new Map();this.root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||!SHARED.has(o.geometry)||Array.isArray(o.material)||o.material.transparent)return;const key=o.geometry.uuid+'/'+o.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});
  for(const objects of buckets.values()){if(objects.length<3)continue;const first=objects[0],batch=new T.InstancedMesh(first.geometry,first.material,objects.length);objects.forEach((o,i)=>batch.setMatrixAt(i,o.matrixWorld));batch.castShadow=true;batch.receiveShadow=true;this.root.add(batch);for(const o of objects)o.parent.remove(o);}
  this.root.updateMatrixWorld(true);const moving=new Set([this.portal,this.gent,this.dust,...this.mist||[]].filter(Boolean));
  this.root.traverse(o=>{if(o===this.root)return;for(let p=o;p&&p!==this.root;p=p.parent)if(moving.has(p))return;o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
 }
 reactionMaterials(g){const materials=new Set();g.traverse(o=>{if(o.parent?.userData?.gorePiece)return;for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])if(m.emissive&&!this.characterResources?.has(m))materials.add(m);});return [...materials];}
 disposeLevel(){
  this.zombieGore?.dispose();this.zombieGore=null;this.combatEffects?.dispose();this.combatEffects=null;this.enemyEffects?.dispose();this.enemyEffects=null;
  if(!this.root)return;const geos=new Set(),mats=new Set(),textures=new Set(),skeletons=new Set(),keep=new Set(Object.values(this.assets));
  this.scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.isSkinnedMesh)skeletons.add(o.skeleton);if(o.geometry&&!SHARED.has(o.geometry))geos.add(o.geometry);if(o.material)for(const m of [...(Array.isArray(o.material)?o.material:[o.material]),o.customDepthMaterial,o.customDistanceMaterial].filter(Boolean)){if(!this.characterResources?.has(m))mats.add(m);for(const key of ['map','bumpMap','roughnessMap','normalMap','alphaMap'])if(m[key]&&!keep.has(m[key]))textures.add(m[key]);}});
  for(const g of geos)if(!this.characterResources?.has(g))g.dispose();for(const m of mats)if(!this.characterResources?.has(m))m.dispose();for(const t of textures)if(!this.characterResources?.has(t))t.dispose();for(const s of skeletons)s.dispose();this.flashlight?.shadow?.dispose();this.scene.clear();this.decalMaps={};
 }
 disposeObject(root){
  const geos=new Set(),mats=new Set(),textures=new Set(),skeletons=new Set(),keep=new Set(Object.values(this.assets));
  root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.isSkinnedMesh)skeletons.add(o.skeleton);if(o.geometry&&!SHARED.has(o.geometry))geos.add(o.geometry);if(o.material)for(const m of [...(Array.isArray(o.material)?o.material:[o.material]),o.customDepthMaterial,o.customDistanceMaterial].filter(Boolean)){mats.add(m);for(const key of ['map','bumpMap','roughnessMap','normalMap','alphaMap'])if(m[key]&&!keep.has(m[key]))textures.add(m[key]);}if(o.isLight)o.shadow?.dispose();});
  for(const g of geos)if(!this.characterResources?.has(g))g.dispose();for(const m of mats)m.dispose();for(const t of textures)if(!this.characterResources?.has(t))t.dispose();for(const s of skeletons)s.dispose();root.clear();
 }
 load(chapter,grid){
  for(const m of this.weaponModels?.values()||[])resetWeaponParts(m);this.weaponMotion=createWeaponMotion();this.ads=this.recoil=this.walk=this.flashTimer=this.knifeTimer=0;this.currentAds=false;
  this.disposeLevel();this.finisherHands?.forEach(h=>{h.visible=false;this.scene.add(h);});this.bossArena=null;this.grid=grid;this.config=chapter;this.theme=chapter.theme;this.level=chapter.level;this.gates=[];this.blackoutUntil=0;this.protectedCells=new Set();for(const route of [this.level.route,...chapter.items.map(i=>[chapter.start,i.at])])for(let i=1;i<route.length;i++)for(const p of findPath(grid,{x:(route[i-1][0]+.5)*TILE,z:(route[i-1][1]+.5)*TILE},{x:(route[i][0]+.5)*TILE,z:(route[i][1]+.5)*TILE}))this.protectedCells.add(Math.floor(p.x/TILE)+","+Math.floor(p.z/TILE));this.lamps=[];this.nearestLamps=null;this.obstacles=[];this.portal=null;this.gent=null;this.mist=[];
  const yellow=this.theme==='backrooms',breach=this.theme==='breach';this.scene.background=new T.Color(yellow?0x1b1910:0x090e11);this.scene.fog=new T.FogExp2(yellow?0x25231a:0x0c1419,yellow?.026:.032);this.root=new T.Group();this.scene.add(this.root);
  this.scene.environment=this.viewScene.environment;this.scene.environmentIntensity=.16;
  this.scene.add(new T.HemisphereLight(yellow?0xc4b98d:0xa7b6bd,0x151b1c,yellow?.31:.25));
  this.palette={metal:material(0x424c4a,.42,.66),black:material(0x151c1c,.65,.25),wood:material(yellow?0x766447:0x665b49),paper:material(0xc9bea5),rust:material(0x593b2d),glass:material(0x1a3839,.13,.5),bone:material(0xaaa18a),blood:material(0x36140e,.35)};
  this.palette.wood.map=this.procedural('wood');this.palette.wood.bumpMap=this.palette.wood.map;this.palette.wood.bumpScale=.008;this.palette.metal.bumpMap=this.procedural('fabric');this.palette.metal.bumpScale=.002;this.palette.paper.map=this.procedural('paper');
  const floor=yellow&&this.licensed?photographedMaterial(this.licensed.materials.get('old_linoleum_flooring_01'),[36,28.8],0xb5a378):yellow?material(0xffffff,.98):this.surface('floor',0xc2c7c2,[36,28.8],.018,.65);if(yellow&&!this.licensed){floor.map=this.procedural('carpet');floor.map.repeat.set(36,28.8);floor.bumpMap=floor.map;floor.bumpScale=.014;}
  mesh(new T.PlaneGeometry(72,57.6),floor,[1,1,1],[36,0,28.8],this.root).rotation.x=-Math.PI/2;
  const ceiling=material(yellow?0xb4ae87:0x89938b,.93);ceiling.map=this.procedural('ceiling');ceiling.map.repeat.set(18,14.4);mesh(new T.PlaneGeometry(72,57.6),ceiling,[1,1,1],[36,CEILING,28.8],this.root).rotation.x=Math.PI/2;
  const wall=this.licensed?photographedMaterial(this.licensed.materials.get(breach?'painted_plaster_wall':yellow?'beige_wall_001':'damaged_plaster'),[.45,.45],yellow?0xd4bb70:breach?0x8b9790:0xd7d7c9,true):yellow?material(0xffffff,.96):this.assets.surfaces?surfaceMaterial(this.assets.surfaces,'wall',{color:breach?0xaaa59b:0xe7e4d5,roughness:.94}):this.surface('wall',breach?0x858e7c:0xb5c1b5,[1,1],.034);if(yellow&&!this.licensed){wall.map=this.procedural('wallpaper');wall.bumpMap=wall.map;wall.bumpScale=.012;}
  const coords=[];grid.forEach((row,z)=>row.forEach((v,x)=>{if(v)coords.push([x,z]);}));const walls=new T.InstancedMesh(WALLBOX,wall,coords.length),dummy=new T.Object3D();
  coords.forEach(([x,z],i)=>{dummy.position.set((x+.5)*TILE,CEILING/2,(z+.5)*TILE);dummy.scale.set(TILE,CEILING,TILE);dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);walls.setColorAt(i,new T.Color().setScalar(.83+(i%5)*.035));});walls.castShadow=true;walls.receiveShadow=true;this.root.add(walls);
  for(const [height,thick]of [[.09,.16],[1.02,.035],[3.17,.1]]){const trim=new T.InstancedMesh(BOX,material(yellow?0x594a2c:height===1.02?0x596860:0x313e3c,.72,.12),coords.length);coords.forEach(([x,z],i)=>{dummy.position.set((x+.5)*TILE,height,(z+.5)*TILE);dummy.scale.set(TILE+.025,thick,TILE+.025);dummy.updateMatrix();trim.setMatrixAt(i,dummy.matrix);});trim.receiveShadow=true;this.root.add(trim);}
  this.lightPool=[];for(let i=0;i<6;i++){const l=new T.PointLight(0xffffff,0,12,2);this.scene.add(l);this.lightPool.push(l);}
  for(const r of this.level.rooms){const [a,b,c,d]=r.bounds;for(const x of[a+1,c-1])for(const z of[b+1,d-1])this.addLamp((x+.5)*TILE,(z+.5)*TILE,r.kind==='flood'?0x82a5c8:r.kind==='finale'||r.kind==='relay'?0xd36d51:yellow?0xffdd8d:0xdbefd8);}
  for(const [a,b]of this.level.corridors){this.addLamp(((a[0]+b[0])/2+.5)*TILE,((a[1]+b[1])/2+.5)*TILE,breach?0xdb7455:yellow?0xf7d789:0xc5dcd8);}
  this.flashlight=new T.SpotLight(0xffead2,115,27,.48,.72,2);this.flashlight.castShadow=true;this.flashlight.shadow.mapSize.set(1024,1024);this.flashlight.shadow.camera.near=.08;this.flashlight.shadow.camera.far=28;this.flashlight.shadow.bias=-.00035;this.flashlight.shadow.normalBias=.035;this.scene.add(this.flashlight,this.flashlight.target);
  this.playerLight=new T.PointLight(0xd6e2d2,2.8,3.4,2);this.scene.add(this.playerLight);this.shotLight=new T.PointLight(0xffbf65,0,5,2);this.scene.add(this.shotLight);
  this.wallPlacement=new WallPlacement(grid,TILE,this.level.rooms);this.wallMounts=this.wallPlacement.mounts;
  this.dressDirectedRooms(chapter);this.dressArchitecture();addEnvironmentDetail(this);dressLicensedRooms(this);const rnd=seeded(52+chapter.number.length),cells=[];grid.forEach((row,z)=>row.forEach((v,x)=>{if(!v)cells.push([x,z]);}));
  for(let i=0;i<180;i++){const [x,z]=cells[Math.floor(rnd()*cells.length)],px=(x+.1+rnd()*.8)*TILE,pz=(z+.1+rnd()*.8)*TILE;if(i%3===0){const p=mesh(BOX,this.palette.paper,[.22+rnd()*.15,.003,.3+rnd()*.13],[px,.013,pz],this.root);p.rotation.y=rnd()*6;}else if(i%3===1)this.decal('stain',[px,.015,pz],.4+rnd()*1.3,true);}
  const pos=new Float32Array(500*3);for(let i=0;i<pos.length;i+=3){pos[i]=rnd()*72;pos[i+1]=rnd()*CEILING;pos[i+2]=rnd()*57.6;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));this.dust=new T.Points(geo,new T.PointsMaterial({color:0xc6cfad,size:.022,transparent:true,opacity:.3,depthWrite:false}));this.root.add(this.dust);
  const [ex,ez]=chapter.exit;this.exit=group(this.root,(ex+.5)*TILE,0,(ez+.5)*TILE);mesh(BOX,this.palette.black,[2.15,2.9,.18],[0,1.45,0],this.exit);mesh(BOX,this.palette.wood,[1.85,2.65,.16],[0,1.33,.12],this.exit);mesh(BOX,this.palette.metal,[.16,.035,.03],[.7,1.12,.23],this.exit);
  this.sign(breach?'P.A. / 204':'204',[this.exit.position.x,2.85,this.exit.position.z+.23],1.2,.3,'#cabaa0','#171d19');this.sign('EXIT',[this.exit.position.x,3.05,this.exit.position.z+.22],.7,.23,'#f4ceaa','#572c20');
  this.exitLight=new T.PointLight(0xbd5840,12,7,2);this.exitLight.position.set(this.exit.position.x,2.7,this.exit.position.z+.7);this.scene.add(this.exitLight);
  if(breach){this.portal=mesh(new T.TorusGeometry(1.65,.055,8,64),new T.MeshBasicMaterial({color:0xb6583c}),[1,1,1],[(chapter.boss.at[0]+.5)*TILE,1.8,(chapter.exit[1]+.5)*TILE-1.2],this.root);mesh(new T.CircleGeometry(1.63,48),new T.MeshBasicMaterial({color:0x010202}),[1,1,1],[(chapter.boss.at[0]+.5)*TILE,1.8,(chapter.exit[1]+.5)*TILE-1.22],this.root);this.gent=this.character('gentleman');this.gent.position.set((chapter.boss.at[0]+.5)*TILE,0,(chapter.exit[1]+.5)*TILE-.8);this.root.add(this.gent);}
  this.optimizeStatic();this.createGates();this.view.visible=true;this.combatEffects=new CombatEffects(this.root);this.enemyEffects=new EnemyEffects(this.root);this.zombieGore=new ZombieGore(this.root);this.gorePoint=new T.Vector3();this.bossArena=new BossArena(this,chapter);
 }
 blocked(x,z,r){return propsBlock(this.obstacles,x,z,r);}
 clearSight(a,b,ay=1.5,by=1.5){return !propsOcclude(this.obstacles,a,b,ay,by);}
 clearWalkPath(a,b,r=.38){const len=Math.hypot(b.x-a.x,b.z-a.z);for(let t=.3;t<len;t+=.45)if(this.blocked(a.x+(b.x-a.x)*t/len,a.z+(b.z-a.z)*t/len,r))return false;return true;}
 canPlace(x,z,w,d){
  for(const dx of[-w/2,0,w/2])for(const dz of[-d/2,0,d/2])if(solid(this.grid,x+dx,z+dz,.08)||this.protectedCells?.has(Math.floor((x+dx)/TILE)+","+Math.floor((z+dz)/TILE)))return false;
  const cells=[this.config.start,this.config.npc.at,this.config.exit,this.config.boss.at,...this.config.items.map(i=>i.at),...this.config.enemies.map(e=>e.slice(1))];return !cells.some(([cx,cz])=>Math.abs((cx+.5)*TILE-x)<w/2+1.7&&Math.abs((cz+.5)*TILE-z)<d/2+1.7);
 }
 prop(x,z,w,d,h,build){if(!this.canPlace(x,z,w,d))return;const g=group(this.root,x,0,z);build(g);this.obstacles.push({x,z,w,d,h});return g;}
 addLamp(x,z,color){const g=group(this.root,x,CEILING-.11,z),m=this.palette.metal;mesh(BOX,m,[1.65,.1,.34],[0,0,0],g);const glow=new T.MeshBasicMaterial({color});for(const a of[-.1,.1])mesh(CYL,glow,[.035,1.43,.035],[0,-.07,a],g).rotation.z=Math.PI/2;for(const a of[-.68,.68])mesh(BOX,m,[.045,.04,.34],[a,-.1,0],g);this.lamps.push({x,z,color,base:this.theme==='backrooms'?28:32,offset:x*.4+z});}
 sign(text,at,w=2,h=.45,color='#b8bba9',background=null,rotation=0){
  const c=document.createElement('canvas');c.width=1024;c.height=Math.max(96,Math.round(1024*h/w));const ctx=c.getContext('2d');
  if(background){ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(8,8,c.width-16,c.height-16);}
  const lines=text.split('\n'),size=Math.min(c.height/(lines.length+1)*.92,180);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+size+'px Arial';lines.forEach((line,i)=>ctx.fillText(line,c.width/2,c.height/2+(i-(lines.length-1)/2)*size*1.2,c.width-50));
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
  const o=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:!background,side:T.DoubleSide,depthWrite:!!background}),[1,1,1],at,this.root);o.rotation.y=rotation;o.castShadow=false;return o;
 }
 decal(kind,at,size=1,floor=false,rotation=0){
  this.decalMaps??={};if(!this.decalMaps[kind])this.decalMaps[kind]=canvasTexture((ctx,s)=>{const rnd=seeded(kind.length*54);ctx.clearRect(0,0,s,s);if(kind==='hand'){ctx.fillStyle='#4b1710bb';ctx.beginPath();ctx.ellipse(s*.5,s*.57,s*.16,s*.2,.1,0,Math.PI*2);ctx.fill();for(let i=0;i<5;i++){ctx.lineWidth=22+rnd()*8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(s*(.34+i*.07),s*.5);ctx.lineTo(s*(.25+i*.12),s*(.12+rnd()*.15));ctx.strokeStyle='#4b1710ba';ctx.stroke();}}else for(let i=0;i<150;i++){ctx.fillStyle=kind==='blood'?'#3a100d33':'#12180d12';ctx.beginPath();ctx.ellipse(s/2+(rnd()-.5)*s*.75,s/2+(rnd()-.5)*s*.6,15+rnd()*65,8+rnd()*45,rnd()*3,0,Math.PI*2);ctx.fill();}});
  const o=mesh(new T.PlaneGeometry(size,size),new T.MeshBasicMaterial({map:this.decalMaps[kind],transparent:true,opacity:kind==='stain'?.6:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),[1,1,1],at,this.root);if(floor)o.rotation.x=-Math.PI/2;else o.rotation.y=rotation;o.castShadow=false;return o;
 }
 createGates(){
  for(const gate of this.level.gates){
   const x=(gate.at[0]+.5)*TILE,z=(gate.at[1]+.5)*TILE,g=group(this.root,x,0,z);g.rotation.y=gate.axis==='x'?Math.PI/2:0;
   for(const side of[-1,1])mesh(BOX,this.palette.metal,[.14,3.2,.24],[side*1.12,1.6,0],g);
   mesh(BOX,this.palette.metal,[2.35,.15,.26],[0,3.12,0],g);
   const shutter=group(g);mesh(BOX,this.palette.black,[2.15,2.96,.18],[0,1.48,0],shutter);
   for(let y=.15;y<2.95;y+=.18)mesh(BOX,this.palette.metal,[2.12,.025,.03],[0,y,.12],shutter);
   const lampMaterial=new T.MeshBasicMaterial({color:0xbc5038});mesh(BOX,lampMaterial,[.16,.08,.025],[-.87,2.65,.16],shutter);
   this.sign(gate.label,[x,2.85,z],1.75,.22,'#d2c9aa',null,g.rotation.y);
   const obstacle={x,z,w:gate.axis==='x'?.28:2.35,d:gate.axis==='x'?2.35:.28,h:3.2,active:true};this.obstacles.push(obstacle);
   mergeParts(shutter);mergeParts(g);this.gates.push({...gate,shutter,lampMaterial,obstacle,target:0});
  }
 }
 syncGates(stage,immediate=false){for(const g of this.gates){const open=stage>=g.requires&&!g.forcedClosed;g.target=open?3.18:0;g.lampMaterial.color.setHex(open?0x77ad94:0xbc5038);if(immediate)g.shutter.position.y=g.target;this.gateCollision(g);}}
 gateCollision(g){const before=g.obstacle.active;g.obstacle.minY=g.shutter.position.y;g.obstacle.blocksShots=true;g.obstacle.active=g.shutter.position.y<1.95;if(before!==g.obstacle.active)this.navigationDirty=true;}
 advanceGates(dt){if(!(dt>0))return;for(const g of this.gates){g.shutter.position.y+=(g.target-g.shutter.position.y)*(1-Math.exp(-dt*5));if(Math.abs(g.target-g.shutter.position.y)<.005)g.shutter.position.y=g.target;this.gateCollision(g);}}

 wallLabel(m,text,y,w,h,color,background=null,dx=0,depth=.018){return this.sign(text,[m.x+m.nz*dx+m.nx*depth,y,m.z-m.nx*dx+m.nz*depth],w,h,color,background,m.yaw);}
 wallSign(room,text,y,width,height,color,background=null,options={}){
  const m=this.wallPlacement.place(room.bounds,{kind:'sign',room:room.name,width,height,y,depth:.02,...options});
  if(m)this.wallLabel(m,text,y,m.width,height,color,background);return m;
 }
 wallGroup(room,options,build){
  const m=this.wallPlacement.place(room.bounds,{room:room.name,...options});if(!m)return;
  const g=group(this.root,m.x,0,m.z);g.rotation.y=m.yaw;build(g,m);return g;
 }
 dressDirectedRooms(chapter){
  const p=this.palette,yellow=this.theme==='backrooms',rnd=seeded(970+chapter.number.length);
  const fabric=material(yellow?0x746449:0x40544c);fabric.map=this.procedural('fabric');
  const screen=canvasTexture((ctx,n)=>{ctx.fillStyle='#071919';ctx.fillRect(0,0,n,n);ctx.fillStyle='#709b8a';ctx.font='24px monospace';['SMITHSON VALLEY','QUARANTINE / 03:04','NETWORK FAILURE','','ROOM 204: ONLINE','REMEMBER EVERY NAME'].forEach((t,i)=>ctx.fillText(t,20,55+i*48));for(let y=0;y<n;y+=4){ctx.fillStyle='#0005';ctx.fillRect(0,y,n,1);}});
  const glow=new T.MeshBasicMaterial({map:screen}),water=new T.MeshStandardMaterial({color:0x1a383e,roughness:.09,metalness:.7,transparent:true,opacity:.72});
  const chalk=material(0xffffff,.98);chalk.map=canvasTexture((ctx,n)=>{ctx.canvas.width=n*4;ctx.fillStyle='#172721';ctx.fillRect(0,0,n*4,n);ctx.strokeStyle='#b4c6b155';ctx.lineWidth=2;ctx.font='28px cursive';ctx.fillStyle='#c0c9b1aa';ctx.fillText('SMITHSON VALLEY  /  NIGHT SHIFT',40,58);ctx.fillText('NETWORK OFFLINE',40,110);ctx.fillText('HALL  -  03:04',40,410);for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(40,155+i*25);ctx.lineTo(720+(i%3)*65,155+i*25);ctx.stroke();}ctx.strokeRect(1260,120,400,155);ctx.strokeRect(1380,275,220,95);ctx.beginPath();ctx.moveTo(1460,135);ctx.lineTo(1460,240);ctx.lineTo(1650,240);ctx.stroke();ctx.fillText('204',1420,190);ctx.fillText('KEEP DOOR CLOSED',1250,435);});
  const bed=(x,z)=>this.prop(x,z,1.0,2.1,.85,g=>{mesh(BOX,p.metal,[.95,.12,2],[0,.58,0],g);mesh(BOX,fabric,[.84,.16,1.85],[0,.72,0],g);mesh(BOX,p.paper,[.7,.14,.4],[0,.88,-.68],g);for(const dx of[-.4,.4])for(const dz of[-.84,.84])link(g,p.metal,[dx,.62,dz],[dx,.05,dz],.03);for(const dz of[-.95,.95])link(g,p.metal,[-.45,1,dz],[.45,1,dz],.035);});
  const shelf=(x,z)=>this.prop(x,z,1.4,.6,2.3,g=>{for(const dx of[-.67,.67])mesh(BOX,p.metal,[.05,2.3,.6],[dx,1.15,0],g);for(let y=.2;y<2.3;y+=.5){mesh(BOX,p.metal,[1.4,.04,.6],[0,y,0],g);for(let i=0;i<4;i++)mesh(BOX,i%2?p.wood:p.paper,[.16,.26,.36],[-.45+i*.3,y+.15,0],g);}});
  const terminal=(x,z)=>this.prop(x,z,1.5,1.0,1.3,g=>{
   let height=.79;if(this.licensed){const desk=fittedProp(this.licensed.props.get('metal_office_desk'),1.5,.82,.7);height=desk.userData.dimensions[1];g.add(desk);}else{mesh(BOX,p.wood,[1.5,.09,.7],[0,.79,0],g);for(const dx of[-.65,.65])for(const dz of[-.27,.27])link(g,p.metal,[dx,.75,dz],[dx,.03,dz],.03);}
   mesh(BOX,p.black,[.6,.42,.07],[0,height+.23,-.18],g);mesh(new T.PlaneGeometry(.55,.35),glow,[1,1,1],[0,height+.23,-.138],g);mesh(BOX,p.black,[.45,.025,.17],[0,height+.064,.16],g);mesh(BOX,fabric,[.48,.1,.5],[0,.47,.8],g);mesh(BOX,fabric,[.48,.45,.07],[0,.74,1],g);
  });
  for(const r of this.level.rooms){
   const [a,b,c,d]=r.bounds,x=(a+c+1)*TILE/2,z=(b+d+1)*TILE/2,w=(c-a+1)*TILE,depth=(d-b+1)*TILE;
   const north=b*TILE+.015,south=(d+1)*TILE-.015,left=(a+.5)*TILE,right=(c+.5)*TILE;
   this.wallSign(r,r.name.toUpperCase(),2.8,Math.min(5,w-1),.4,yellow?'#9d865d':'#bac7b6','#16231e');
   const industrial=['utility','switchgear','relay','catwalk'].includes(r.kind),patch=yellow?material(0xc5b88e,.97):this.surface('floor',industrial?0x758380:['closet','storage'].includes(r.kind)?0xb7ad98:0xb8c3b8,[w/3,depth/3],.023,industrial?.52:.38);
   if(yellow&&this.licensed){const photographed=photographedMaterial(this.licensed.materials.get('old_linoleum_flooring_01'),[w/2,depth/2],0xb5a378);patch.copy(photographed);photographed.dispose();}else if(yellow){patch.map=this.procedural('carpet');patch.map.repeat.set(w/2,depth/2);patch.bumpMap=patch.map;patch.bumpScale=.012;}
   const plane=mesh(new T.PlaneGeometry(w-.05,depth-.05),patch,[1,1,1],[x,.004,z],this.root);plane.rotation.x=-Math.PI/2;
   if(['computers','science'].includes(r.kind)){
    const desks=[];for(const px of[left+.6,right-.6])for(let pz=b+1;pz<d;pz+=2){const desk=terminal(px,(pz+.5)*TILE);if(desk)desks.push(desk);}
    this.wallGroup(r,{kind:'chalkboard',width:w*.56,minWidth:4,height:1.72,y:1.9,depth:.09},(g,m)=>{
     mesh(BOX,p.wood,[m.width,1.36,.07],[0,1.9,.035],g);mesh(BOX,chalk,[m.width-.08,1.3,.025],[0,1.9,.075],g);
     this.wallLabel(m,'EVACUATION / NORTH HALL',2.67,Math.min(3,m.width-.2),.17,'#bac2ad',null,0,.078);
    });
    if(r.kind==='science'&&desks.length)for(let i=0;i<6;i++){const vial=group(desks[0],-.45+i*.18,.96,.12);mesh(CYL,p.glass,[.06,.25,.06],[0,0,0],vial);mesh(CYL,p.metal,[.063,.025,.063],[0,.14,0],vial);}
   }
   if(['closet','storage','refuge'].includes(r.kind)){
    for(let pz=b+1;pz<d;pz+=2){shelf(left+.3,(pz+.5)*TILE);shelf(right-.3,(pz+.5)*TILE);}
    for(let i=0;i<3;i++)mesh(BOX,fabric,[.7,.08,1.8],[left+2+i*.85,.04,south-1.3],this.root);
    this.wallSign(r,r.kind==='closet'?'JOEL · EARL · ANTHONY\nKEEP THE DOOR CLOSED':r.kind==='storage'?'NORTH\nTHE NEEDLE STILL KNOWS':'LANDON · LUKE\nDO NOT ANSWER THE WALLS',1.5,Math.min(3,w-1),.65,'#c2b69b');
   }
   if(['utility','switchgear','relay'].includes(r.kind)){
    for(let px=a+1;px<c;px+=2)this.prop((px+.5)*TILE,north+.65,1.2,.8,2.45,g=>{mesh(BOX,p.metal,[1.15,2.45,.65],[0,1.23,0],g);for(let j=0;j<4;j++){mesh(BOX,p.black,[.8,.13,.025],[0,.75+j*.4,.34],g);mesh(BOX,new T.MeshBasicMaterial({color:j%2?0x746844:0x759988}),[.055,.055,.026],[.35,.76+j*.4,.36],g);}for(let j=0;j<5;j++)link(g,p.black,[-.5+j*.23,2.4,0],[-.5+j*.23,3.2,0],.028);});
    for(const side of['west','east'])this.wallGroup(r,{kind:'service pipe',width:2,height:3.12,y:1.56,depth:.2,preferred:[side,'south','north',side==='west'?'east':'west']},g=>{
     link(g,p.rust,[-.7,.07,.1],[-.7,2.88,.1],.07);link(g,p.rust,[-.7,2.88,.1],[.7,2.88,.1],.07);mesh(SPHERE,p.rust,[.075,.075,.075],[-.7,2.88,.1],g);
     for(const y of[.4,1.4,2.5]){mesh(BOX,p.metal,[.22,.05,.035],[-.7,y,.018],g);link(g,p.metal,[-.7,y,.025],[-.7,y,.13],.02);}link(g,p.metal,[.65,2.88,.025],[.65,2.88,.13],.02);
    });
    if(r.kind==='relay')this.wallSign(r,'ANCHOR / 03\nDO NOT LEAVE HIM BEHIND',1.7,3,.8,'#bd9180');
   }
   if(['flood','current'].includes(r.kind)){
    const flood=mesh(new T.PlaneGeometry(w-.15,depth*.72),water,[1,1,1],[x,.016,z],this.root);flood.rotation.x=-Math.PI/2;
    for(const px of[left+.25,right-.25])for(let pz=b+1;pz<d;pz+=2)this.prop(px,(pz+.5)*TILE,.6,.6,2.25,g=>{mesh(BOX,p.metal,[.55,2.2,.5],[0,1.1,0],g);mesh(BOX,p.wood,[.48,2.1,.025],[0,1.1,.27],g);for(let i=0;i<4;i++)mesh(BOX,p.black,[.3,.02,.02],[0,1.9-i*.1,.285],g);mesh(BOX,p.metal,[.025,.12,.03],[.17,1.1,.3],g);});
    this.wallSign(r,r.kind==='current'?'CURRENT → NORTH → HOME':'HIGH WATER / KEEP RIGHT',2.2,3,.45,'#bbba91');
    for(let i=0;i<12;i++){const m=this.wallPlacement.place(r.bounds,{kind:'handprint',room:r.name,width:.6,height:.6,y:1+i%3*.15,depth:.004,preferred:i%2?['west','east','north','south']:['east','west','north','south']});if(m)this.decal('hand',[m.x+m.nx*.004,m.y,m.z+m.nz*.004],.6,false,m.yaw);}
   }
   if(['triage','infirmary'].includes(r.kind)){
    for(const px of[left+.6,right-.6])for(let pz=b+1;pz<d;pz+=2)bed(px,(pz+.5)*TILE);
    for(let i=0;i<4;i++)this.wallSign(r,['ZEBENE MARTINE','EARL BRITT','CALEN / BENNY','JOEL HONEYCUTT'][i],2,1.6,.2,'#c2b99d',null,{preferred:['west','east','north','south']});
    this.wallSign(r,'SERUM MASKS THE SIGNAL\nIT DOES NOT CURE THE PATIENT',1.7,3,.75,'#bd9180');
   }
   if(r.kind==='catwalk'){
    const pit=mesh(new T.PlaneGeometry(w-.1,depth-.1),new T.MeshBasicMaterial({color:0x010505}),[1,1,1],[x,.009,z],this.root);pit.rotation.x=-Math.PI/2;
    mesh(BOX,p.metal,[TILE*1.35,.05,depth],[25.5*TILE,.04,z],this.root);
    mesh(BOX,p.metal,[w,.05,TILE],[x,.04,12.5*TILE],this.root);
    for(const px of[24.8*TILE,26.2*TILE])for(const [from,to]of[[b,12],[13,d+1]]){link(this.root,p.metal,[px,.8,from*TILE],[px,.8,to*TILE],.035);for(let pz=from;pz<=to;pz++)link(this.root,p.metal,[px,0,pz*TILE],[px,.8,pz*TILE],.025);}
    // Bound the void with the railing, leaving the cross bridge as the entrance.
    for(const [from,to]of[[b,12],[13,d+1]])for(const [left,right]of[[a,24.8],[26.2,c+1]])this.obstacles.push({x:(left+right)*TILE/2,z:(from+to)*TILE/2,w:(right-left)*TILE,d:(to-from)*TILE,h:.8});
   }
   if(r.kind==='mimic'){
    this.wallSign(r,'LUKE?',1.8,2,.5,'#693d30');for(let i=0;i<5;i++)this.prop(left+2+i*1.2,south-.8,.85,.75,1,g=>{mesh(BOX,fabric,[.75,.1,.65],[0,.5,0],g);mesh(BOX,fabric,[.75,.65,.07],[0,.82,-.27],g);for(const dx of[-.3,.3])for(const dz of[-.25,.25])link(g,p.wood,[dx,.5,dz],[dx,.03,dz],.03);});
    this.decal('blood',[x,.016,z],2.5,true);
   }
   if(['assembly','seal','finale'].includes(r.kind)){
    for(let i=0;i<3;i++){const ring=mesh(new T.TorusGeometry(1.3+i*.55,.025,8,64),p.metal,[1,1,1],[x,.03+i*.005,z],this.root);ring.rotation.x=-Math.PI/2;}
    if(r.kind==='assembly')for(let i=0;i<7;i++)this.wallGroup(r,{kind:'trophy shelf',width:.72,height:.95,y:1.36,depth:.41,preferred:['west','east','north','south']},g=>{mesh(BOX,p.wood,[.65,.12,.4],[0,1.1,.2],g);for(const dx of[-.24,.24]){link(g,p.metal,[dx,.87,.02],[dx,1.09,.02],.018);link(g,p.metal,[dx,.87,.02],[dx,1.07,.34],.018);}mesh(CYL,p.bone,[.09,.5,.09],[0,1.4,.2],g);mesh(SPHERE,p.bone,[.15,.12,.15],[0,1.66,.2],g);});
    if(r.kind==='finale')for(const side of['west','east'])for(let i=0;i<14;i++)this.wallGroup(r,{kind:'wall growth',width:.65,height:2.96,y:1.48,depth:.22,preferred:[side,...['north','south',side==='west'?'east':'west']]},g=>{tube(g,p.blood,[[-.2,.1,.065],[0,1.4,.14],[.2,2.8,.07]],.04+i%3*.012);});
   }
   // Distinct room thresholds and sparse damage tell the route without text panels.
   for(let i=0;i<5;i++)this.decal(i%2?'blood':'stain',[left+rnd()*(w-2),.014,north+rnd()*(depth-1)],.4+rnd()*.7,true);
  }
  for(let i=1;i<this.level.route.length;i++){
   const [ax,az]=this.level.route[i-1],[bx,bz]=this.level.route[i],x=(ax+bx+1)*TILE/2,z=(az+bz+1)*TILE/2;
   const arrow=this.sign(yellow?'↑':'→',[x,.024,z],.9,1.1,yellow?'#e1d7b2':'#97ada2');arrow.rotation.x=-Math.PI/2;arrow.rotation.z=yellow?Math.atan2(ax-bx,az-bz):Math.atan2(az-bz,bx-ax);
  }
 }
 dressArchitecture(){
  const p=this.palette,yellow=this.theme==='backrooms',rnd=seeded(473),windowMap=canvasTexture((ctx,s)=>{const g=ctx.createLinearGradient(0,0,s,s);g.addColorStop(0,'#162934');g.addColorStop(.5,'#536671');g.addColorStop(1,'#09141c');ctx.fillStyle=g;ctx.fillRect(0,0,s,s);for(let i=0;i<180;i++){ctx.fillStyle='#111b2055';ctx.fillRect(rnd()*s,rnd()*s,2,10+rnd()*60);}for(let i=0;i<5;i++){ctx.fillStyle='#070f14';ctx.fillRect(i*110,310+rnd()*80,80,240);}});
  const glass=new T.MeshStandardMaterial({map:windowMap,color:0x8eacba,roughness:.18,metalness:.48,emissive:0x273944,emissiveIntensity:.25}),chipped=this.surface('wall',yellow?0x766c49:0x768478,[1,.5],.03,.94);
  this.grid.forEach((row,z)=>row.forEach((v,x)=>{if(!v)return;for(const[nx,nz]of[[0,1],[1,0],[0,-1],[-1,0]]){
   if(this.grid[z+nz]?.[x+nx]!==0)continue;
   const px=(x+.5)*TILE+nx*TILE/2,pz=(z+.5)*TILE+nz*TILE/2,rot=Math.atan2(nx,nz),k=Math.abs(x*37+z*19+nx*3+nz);
   const at=(y,depth=0)=>[px+nx*depth,y,pz+nz*depth];
   const reserve=(kind,width,height,y,depth=.12,dx=0)=>this.wallPlacement.reserve({x:px+nz*dx,z:pz-nx*dx,nx,nz},{kind,width,height,y,depth});
   if(k%13===0&&reserve(yellow?'noticeboard':'window',yellow?.8:1.87,yellow?.9:1.56,yellow?1.65:1.93,.21)){const g=group(this.root,...at(0,yellow?.016:.021));g.rotation.y=rot;
    if(!yellow){mesh(BOX,p.black,[1.7,1.47,.04],[0,1.95,0],g);mesh(BOX,glass,[1.56,1.32,.025],[0,1.95,.03],g);for(const dx of[-.82,0,.82])mesh(BOX,p.metal,[.045,1.48,.09],[dx,1.95,.06],g);for(const y of[1.23,1.97,2.68])mesh(BOX,p.metal,[1.7,.04,.09],[0,y,.06],g);mesh(BOX,p.wood,[1.87,.065,.19],[0,1.19,.09],g);
     tube(g,p.black,[[-.35,2.59,.085],[-.12,2.28,.085],[-.18,2.09,.085],[.17,1.93,.085]],.003);tube(g,p.black,[[-.12,2.28,.086],[.17,2.4,.086],[.4,2.37,.086]],.002);
    }else{mesh(BOX,p.wood,[.8,.9,.03],[0,1.65,0],g);mesh(BOX,p.black,[.7,.8,.012],[0,1.65,.021],g);const paper=mesh(new T.PlaneGeometry(.55,.62),p.paper,[1,1,1],[0,1.65,.031],g);paper.rotation.z=.06;}
    mergeParts(g);
   }
   if(k%11===0&&reserve('conduit',.15,2.84,1.55,.1,.6)){const g=group(this.root,...at(0,.019));g.rotation.y=rot;link(g,p.metal,[.6,.15,0],[.6,2.95,0],.018);mesh(BOX,p.black,[.13,.19,.055],[.6,.89,.035],g);for(const dx of[.575,.625])mesh(BOX,p.bone,[.011,.035,.008],[dx,.9,.068],g);mergeParts(g);}
   if(k%17===0&&!yellow&&reserve('radiator',1.1,.54,.42,.18)){const g=group(this.root,...at(0,.005));g.rotation.y=rot;for(let i=0;i<10;i++)mesh(BOX,p.metal,[.055,.51,.12],[-.4+i*.085,.42,.08],g);for(const y of[.21,.63])link(g,p.rust,[-.52,y,.09],[.49,y,.09],.023);for(const dx of[-.32,.32])link(g,p.metal,[dx,.25,.007],[dx,.25,.12],.02);mergeParts(g);}
   if(k%5===0&&reserve('plaster damage',TILE-.12,.55,.38,.003)){const o=mesh(new T.PlaneGeometry(TILE-.12,.55),chipped,[1,1,1],at(.38,.002),this.root);o.rotation.y=rot;}
   if(k%5===0&&reserve('wall stain',1.4,1.4,.8,.004))this.decal('stain',at(.8,.003),1.4,false,rot);
   if(k%9===0&&reserve('handprint',.38,.38,1.25,.004))this.decal('hand',at(1.25,.003),.38,false,rot);
   if(k%19===0&&reserve('cable',1.43,.56,2.96,.24)){const g=group(this.root,...at(0));g.rotation.y=rot;tube(g,p.black,[[-.7,3.2,.01],[-.25,2.72,.22],[.3,2.9,.21],[.7,3.2,.01]],.01);mergeParts(g);}
  }}));
  // Exposed ceiling services and damaged acoustic panels break up the grid.
  for(const r of this.level.rooms){const[a,b,c,d]=r.bounds,x=(a+c+1)*TILE/2,z=(b+d+1)*TILE/2;
   for(const side of[-1,1]){link(this.root,p.metal,[x+side*1.5,3.14,b*TILE],[x+side*1.5,3.14,(d+1)*TILE],.028);for(let pz=b+1;pz<=d;pz+=2)mesh(BOX,p.metal,[.07,.18,.08],[x+side*1.5,3.23,(pz+.5)*TILE],this.root);}
   const panel=mesh(BOX,chipped,[1.1,.035,.65],[x-.9,3.08,z],this.root);panel.rotation.set(.15,0,-.18);tube(this.root,p.black,[[x-.4,3.3,z],[x-.4,2.95,z+.2],[x-.15,2.83,z+.28]],.006);
   for(let i=0;i<7;i++){const fragment=mesh(BOX,i%2?p.bone:p.rust,[.06+rnd()*.15,.03+rnd()*.07,.05+rnd()*.13],[(a+.25)*TILE+rnd()*.3,.04,b*TILE+.4+rnd()*((d-b)*TILE)],this.root);fragment.rotation.set(rnd(),rnd()*6,rnd());}
  }
 }
 dressRooms(chapter){
  const p=this.palette,rnd=seeded(684),yellow=this.theme==='backrooms';
  const screenTex=canvasTexture((ctx,s)=>{ctx.fillStyle='#091e1d';ctx.fillRect(0,0,s,s);ctx.fillStyle='#558d7a';ctx.font='20px monospace';['SMITHSON VALLEY // CS LAB','QUARANTINE NETWORK','03:04:00 / SIGNAL LOST','','> ROOM 204 : ACTIVE','> PATIENT RECORD : MISSING','','DO NOT FORGET YOUR NAME'].forEach((t,i)=>ctx.fillText(t,30,55+i*40));for(let y=0;y<s;y+=4){ctx.fillStyle='#0004';ctx.fillRect(0,y,s,1);}});
  const monitor=new T.MeshBasicMaterial({map:screenTex,color:0xb4d1c0}),upholstery=material(yellow?0x78674e:0x344b49);upholstery.map=this.procedural('fabric');
  const chair=(g,x,z,rotate=0)=>{
   const c=group(g,x,0,z);c.rotation.y=rotate;mesh(BOX,upholstery,[.5,.09,.51],[0,.47,0],c);mesh(BOX,upholstery,[.49,.46,.08],[0,.76,.23],c);
   for(const dx of[-.21,.21])for(const dz of[-.2,.2])link(c,p.metal,[dx,.44,dz],[dx,.03,dz],.019);
   for(const dx of[-.23,.23])link(c,p.metal,[dx,.43,.2],[dx,.92,.2],.017);
  };
  if(!yellow){
   for(const z of[4.7,10,13.4,17.4,21.7])for(const x of[3.3,8.8,21,26.4])this.prop(x*TILE,z*TILE,1.65,1.7,1.3,g=>{
    mesh(BOX,p.wood,[1.4,.075,.72],[0,.79,0],g);mesh(BOX,p.black,[1.45,.023,.75],[0,.74,0],g);
    for(const dx of[-.61,.61])for(const dz of[-.28,.28])link(g,p.metal,[dx,.73,dz],[dx,.03,dz],.029);
    mesh(BOX,p.black,[.57,.37,.055],[0,1.08,-.16],g);mesh(new T.PlaneGeometry(.515,.29),monitor,[1,1,1],[0,1.09,-.128],g);
    link(g,p.black,[0,.86,-.17],[0,1,-.17],.035);mesh(BOX,p.black,[.3,.018,.18],[0,.842,-.17],g);
    mesh(BOX,p.black,[.46,.025,.15],[0,.845,.16],g);for(let j=0;j<10;j++)for(let k=0;k<3;k++)mesh(BOX,p.metal,[.028,.007,.028],[-.2+j*.044,.863,.12+k*.04],g);
    mesh(SPHERE,p.black,[.044,.02,.065],[.37,.855,.14],g);mesh(BOX,p.paper,[.18,.003,.27],[-.4,.836,.08],g);
    tube(g,p.black,[[0,1,-.2],[.12,.85,-.29],[.3,.5,-.35],[.5,.1,-.3]],.008);chair(g,0,.87,.08);
   });
  }else{
   for(const[x,z]of[[3,17],[9.5,9],[20.5,9],[26.5,17]])this.prop(x*TILE,z*TILE,2.7,1.25,.86,g=>{
    mesh(BOX,p.wood,[2.5,.72,.72],[0,.37,0],g);mesh(BOX,upholstery,[2.48,.15,.74],[0,.76,0],g);
    for(const dx of[-1.05,1.05])mesh(BOX,p.wood,[.12,.95,.85],[dx,.48,0],g);mesh(BOX,upholstery,[2.5,.58,.12],[0,.95,-.33],g);
   });
   for(const[x,z]of[[4,5],[25,18],[4,13]]){
    const puddle=mesh(new T.CircleGeometry(1.6,32),new T.MeshStandardMaterial({color:0x181e13,roughness:.07,metalness:.65,transparent:true,opacity:.88}),[1.2,1,1],[x*TILE,.018,z*TILE],this.root);puddle.rotation.x=-Math.PI/2;
   }
  }
  // Dress exposed wall faces rather than scattering furniture into walkways.
  const normals=[[0,1],[1,0],[0,-1],[-1,0]];
  this.grid.forEach((row,z)=>row.forEach((v,x)=>{if(!v)return;for(const[nx,nz]of normals){
   if(this.grid[z+nz]?.[x+nx]!==0)continue;
   const px=(x+.5)*TILE+nx*(TILE/2+.018),pz=(z+.5)*TILE+nz*(TILE/2+.018),rot=Math.atan2(nx,nz),index=x*31+z*7+nx*2+nz;
   if(!yellow&&index%7===0){
    const cx=px+nx*.29,cz=pz+nz*.29;
    if(!this.canPlace(cx,cz,nx?.55:1.65,nz?.55:1.65))continue;
    const g=group(this.root,px,0,pz);g.rotation.y=rot;
    for(let i=0;i<3;i++){
     const dx=(i-1)*.54;mesh(BOX,p.metal,[.52,1.94,.48],[dx,.97,.24],g);mesh(BOX,p.black,[.49,1.84,.015],[dx,.97,.49],g);
     mesh(BOX,p.metal,[.475,1.82,.02],[dx,.97,.504],g);mesh(BOX,p.black,[.032,.11,.029],[dx+.15,1.02,.531],g);
     for(let j=0;j<5;j++)mesh(BOX,p.black,[.28,.015,.009],[dx,1.52+j*.048,.519],g);
     mesh(BOX,p.paper,[.08,.04,.01],[dx,1.36,.526],g);
    }
    this.obstacles.push({x:cx,z:cz,w:nx?.6:1.66,d:nz?.6:1.66,h:1.95});
   }else if(index%11===0){
    const g=group(this.root,px,1.6,pz);g.rotation.y=rot;mesh(BOX,p.wood,[1.27,.82,.033],[0,0,0],g);
    for(let i=0;i<5;i++){const paper=mesh(BOX,p.paper,[.21,.29,.008],[(i%3-1)*.31,Math.floor(i/3)*.33-.18,.025],g);paper.rotation.z=(rnd()-.5)*.22;}
   }else if(index%13===0){
    this.sign(yellow?'DO NOT\nANSWER IT':index%2?'QUARANTINE\nKEEP DOORS CLOSED':'SMITHSON VALLEY\nEMERGENCY ROUTE',[px+nx*.01,1.9,pz+nz*.01],1.4,.65,yellow?'#6b4425':'#bfc5b0',yellow?null:'#293c36',rot);
   }
   if(index%19===0)this.decal('hand',[px+nx*.025,1.45,pz+nz*.025],.6,false,rot);
   if(index%9===0){const g=group(this.root,px,0,pz);g.rotation.y=rot;mesh(BOX,p.metal,[.3,.42,.06],[0,1.1,.03],g);for(const a of[-.08,.08])mesh(CYL,p.black,[.014,.035,.014],[a,1.1,.07],g).rotation.x=Math.PI/2;link(g,p.rust,[0,1.33,.07],[0,3.25,.07],.013);}
  }}));
  const windowMat=new T.MeshBasicMaterial({map:canvasTexture((ctx,s)=>{
   const bg=ctx.createLinearGradient(0,0,0,s);bg.addColorStop(0,'#233c45');bg.addColorStop(1,'#101d22');ctx.fillStyle=bg;ctx.fillRect(0,0,s,s);
   ctx.fillStyle='#5a7471';ctx.beginPath();ctx.arc(390,88,36,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#0a1317';ctx.lineWidth=8;
   for(let i=0;i<8;i++){const x=rnd()*s;ctx.beginPath();ctx.moveTo(x,s);ctx.lineTo(x-15,s*.4);ctx.lineTo(x-40,s*.23);ctx.moveTo(x-12,s*.55);ctx.lineTo(x+75,s*.4);ctx.stroke();}
   for(let i=0;i<800;i++){ctx.fillStyle='#a9c0b215';ctx.fillRect(rnd()*s,rnd()*s,1,5+rnd()*25);}
  }),color:0xa4bfcb});
  if(!yellow)for(const z of[5,12,19]){
   const g=group(this.root,TILE+.027,1.9,z*TILE);g.rotation.y=Math.PI/2;
   mesh(BOX,p.black,[3.5,1.65,.09],[0,0,0],g);mesh(new T.PlaneGeometry(3.32,1.49),windowMat,[1,1,1],[0,0,.051],g);
   for(const x of[-1.68,-.55,.55,1.68])mesh(BOX,p.metal,[.042,1.61,.04],[x,0,.076],g);mesh(BOX,p.metal,[3.45,.04,.04],[0,0,.076],g);mesh(BOX,p.wood,[3.58,.06,.24],[0,-.85,.08],g);
  }
  for(const[x,z]of[[10.7,17],[27,10],[27,21]])this.prop(x*TILE,z*TILE,.8,.8,.8,g=>{mesh(CYL,p.black,[.29,.65,.29],[0,.325,0],g);mesh(CYL,p.metal,[.31,.035,.31],[0,.67,0],g);for(let i=0;i<6;i++)mesh(BOX,p.paper,[.17,.08,.12],[(rnd()-.5)*.3,.67+rnd()*.1,(rnd()-.5)*.3],g);});
  for(const[x,z]of[[10,10],[20.5,17]])this.prop(x*TILE,z*TILE,1.2,.65,2,g=>{
   for(const dx of[-.52,.52])mesh(BOX,p.metal,[.045,2,.55],[dx,1,0],g);
   for(let h=0;h<5;h++){mesh(BOX,p.metal,[1.1,.045,.57],[0,.2+h*.42,0],g);for(let i=0;i<6;i++)mesh(BOX,p.wood,[.1,.23,.22],[-.42+i*.17,.33+h*.42,.01],g);}
  });
  for(const x of[13.15,17.8]){link(this.root,p.metal,[x*TILE,3.05,2.6],[x*TILE,3.05,54.8],.04);for(const z of[5,11,19]){link(this.root,p.rust,[x*TILE,3.05,z*TILE],[x*TILE,2.7,z*TILE],.027);mesh(BOX,p.black,[.15,.21,.3],[x*TILE,2.75,z*TILE],this.root);}}
  this.sign(yellow?'FOLLOW THE CHALK':'CS / SANCTUARY',[10.8,2.6,16*TILE+.025],2.7,.4,yellow?'#c6b782':'#b7c3b6',yellow?null:'#283b35');
  for(const z of[19,11,4]){const a=this.sign('↑',[15.5*TILE,.025,(z+.5)*TILE],1.4,1.2,yellow?'#dfce95':'#c5cab2');a.rotation.x=-Math.PI/2;}
  for(const[kind,x,z]of this.config.enemies)if(kind==='walker'||kind==='runner')this.decal('blood',[(x+.5)*TILE,.02,(z+.5)*TILE],1.5,true);
  if(this.theme==='breach'){
   for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=1.8+rnd()*2;const growth=mesh(SPHERE,this.surface('skin',0x677155),[.18+rnd()*.3,.3+rnd(),.2+rnd()*.3],[36+Math.cos(a)*r,.5+rnd()*1.5,6+Math.sin(a)*r],this.root);growth.rotation.z=rnd();}
   for(let i=0;i<9;i++)tube(this.root,p.blood,[[28+i*2,3.2,16],[29+i*2,2.7,12],[30+i*2,3.1,8]],.055);
  }
 }
 character(kind,color,identity=kind==='player'?'ethan':kind){
  if(this.licensed&&isZombie(kind))return createLicensedEnemy(this.licensed,kind,color);
  const key=[kind,color??'',identity].join('/');if(!this.characterTemplates.has(key)){
   const template=this.buildCharacter(kind,color,identity);this.characterTemplates.set(key,template);
   template.traverse(o=>{if(o.geometry)this.characterResources.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])for(const k of ['map','bumpMap','roughnessMap','alphaMap'])if(m[k])this.characterResources.add(m[k]);});
  }
  return cloneCharacter(this.characterTemplates.get(key));
 }
 buildCharacter(kind,color,identity=kind){
  if(BOSS_PROFILES[kind])return createBossModel(this,kind);
  const human=kind==='npc'||kind==='player',player=kind==='player',gent=kind==='gentleman',bare=['zsiga','jakobHalf','zeb','crawler','stalker'].includes(kind),design=CHARACTER_DESIGNS[identity];
  const skin=human?material(design?.skin??0xc2a68c,.78):this.surface('skin',design?.skin??(kind==='zsiga'?0x899b94:0xadb3a0),[2,2],.006,.68);
  const cloth=material(color??(player?0x495b43:0x46574f),.96);cloth.map=this.procedural(human?'fabric':'infectedcloth');cloth.bumpMap=cloth.map;cloth.bumpScale=.0015;
  const dark=material(0x272c29,.91),bone=material(0xaaa08a,.73),raw=material(0x25110e,.53);dark.map=this.procedural('fabric');dark.bumpMap=dark.map;dark.bumpScale=.002;
  const g=createAnatomy(kind,[skin,cloth,dark]),{body,head,jaw,arms,legs}=g.userData;
  // Finger phalanges and tendons stay attached to the articulated wrists.
  for(const [i,arm]of arms.entries()){const side=i?1:-1,fore=arm.userData.forearm,long=kind==='jakob'?1.28:kind==='zsiga'?1.12:1,hand=-.36-(long-1)*.3;
   for(let f=0;f<4;f++){const x=(f-1.5)*.022,len=(human?.083:.12)+(f===1||f===2?.025:0);tube(fore,skin,[[x,hand,.04],[x,hand-len*.55,.06],[x*.9,hand-len,.075]],human?.008:.009);if(!human)link(fore,bone,[x*.9,hand-len,.075],[x*.8,hand-len-.023,.087],.005);}
   tube(fore,skin,[[side*-.035,hand+.025,.04],[side*-.055,hand-.018,.065],[side*-.049,hand-.04,.083]],.011);
   for(let f=0;f<3;f++)tube(fore,human?skin:raw,[[(f-1)*.02,-.14,.075],[(f-1)*.017,-.24,.064],[(f-1)*.015,hand+.025,.07]],.002);
   if(human||!bare)mesh(new T.CylinderGeometry(.070,.066,.075,24),cloth,[1,1,1],[0,-.005,.006],fore);
   mergeParts(fore);
  }
  if(human){
   for(const side of[-1,1]){tube(body,dark,[[side*.055,.40,.087],[side*.11,.33,.15],[side*.06,.27,.148]],.008);tube(body,dark,[[side*.2,.30,.108],[side*.18,.1,.132],[side*.16,-.18,.11]],.003);mesh(bevelBox(.103,.117,.01,.003),cloth,[1,1,1],[side*.105,.12,.141],body);}
   for(let i=0;i<5;i++)mesh(SPHERE,bone,[.005,.005,.004],[0,-.12+i*.07,.137],body);
   tube(body,dark,[[-.175,-.25,.08],[0,-.26,.137],[.175,-.25,.08]],.013);mesh(bevelBox(.045,.028,.012,.003),bone,[1,1,1],[0,-.26,.15],body);
  }else if(bare){
   for(const side of[-1,1])for(let i=0;i<6;i++)tube(body,bone,[[side*.025,.28-i*.055,.14],[side*.13,.27-i*.052,.165],[side*.2,.23-i*.05,.10]],.007);
   for(let i=0;i<9;i++)tube(body,raw,[[Math.sin(i*3)*.17,.25-i*.04,.13],[Math.sin(i*3+.3)*.18,.2-i*.04,.163],[Math.sin(i*3+.5)*.14,.12-i*.04,.14]],.0035);
   if(kind==='zeb')for(let i=0;i<15;i++){const a=i*2.4;mesh(SPHERE,i%3?skin:raw,[.035,.065,.028],[Math.cos(a)*.31,Math.sin(a)*.19+.12,Math.sin(a)*.22],body);}
  }else if(!gent){
   const shape=new T.Shape();shape.moveTo(-.025,.11);shape.lineTo(.045,.08);shape.lineTo(.031,.027);shape.lineTo(.05,-.058);shape.lineTo(.012,-.115);shape.lineTo(-.038,-.065);shape.lineTo(-.045,.03);shape.closePath();const wound=mesh(new T.ShapeGeometry(shape),raw,[1,1,1],[-.12,.19,.157],body);wound.rotation.z=-.15;
  }
  if(kind==='birdy')dressBirdy(g,skin,raw);
  if(!human&&!gent){
   const skull=head.children[0];for(const o of[...head.children])if(o!==skull&&o!==jaw){head.remove(o);if(o.geometry&&!SHARED.has(o.geometry))o.geometry.dispose();}jaw.clear();
   const face=new T.SphereGeometry(1,32,28),a=face.getAttribute('position'),uv=face.getAttribute('uv');
   for(let i=0;i<a.count;i++){const x=a.getX(i)*.172,y=a.getY(i)*.225;let z=a.getZ(i)*.149;if(z>0)z+=.02*Math.exp(-((x/.038)**2)-((y+.02)/.05)**2);a.setXYZ(i,x,y,z);uv.setXY(i,x/.39+.5,y/.47+.5);}face.computeVertexNormals();
   const faceMat=new T.MeshStandardMaterial({map:this.assets.face,color:design?.face??(kind==='zsiga'?0x9daba2:0xb5ac98),roughness:.89});
   faceMat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHeadPos;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHeadPos = position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHeadPos;').replace('#include <map_fragment>','vec4 faceColor = texture2D(map, vMapUv); float frontBlend = smoothstep(0.01, 0.065, vHeadPos.z); diffuseColor.rgb *= mix(vec3(0.28,0.32,0.25), faceColor.rgb, faceColor.a * frontBlend);');
   };
   const open=a.array.slice();for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),w=Math.exp(-((x/.11)**2))*Math.max(0,Math.min(1,(-y-.035)/.12))*Math.max(0,Math.min(1,z/.08));open[i*3+1]-=.043*w;}face.morphAttributes.position=[new T.Float32BufferAttribute(open,3)];g.userData.face=mesh(face,faceMat,[1,1,1],[0,.024,0],head);
   // Silhouette damage stays visible when the face turns away from the flashlight.
   for(const side of[-1,1])mesh(SPHERE,raw,[.032,.085,.025],[side*.15,-.05,.015],head);
   g.userData.texturedFace=true;
  }
  if(human){
   // Project facial albedo onto the actual head volume, blending into the sides.
   for(const o of[...head.children])if(o!==jaw){head.remove(o);if(o.geometry&&!SHARED.has(o.geometry))o.geometry.dispose();}jaw.clear();
   const face=new T.SphereGeometry(1,40,36),a=face.getAttribute('position'),uv=face.getAttribute('uv');
   for(let i=0;i<a.count;i++){const rawX=a.getX(i)*.17,y=a.getY(i)*.235,x=rawX*(y<-.055?1-Math.min(.34,(-y-.055)*1.7):1);let z=a.getZ(i)*.145;if(z>0){z+=.028*Math.exp(-((x/.033)**2)-((y+.035)/.05)**2);z+=.008*Math.exp(-(((y+.045)/.05)**2))*Math.exp(-(((Math.abs(x)-.075)/.04)**2));}a.setXYZ(i,x,y,z);uv.setXY(i,rawX/.39+.5,y/.48+.5);}face.computeVertexNormals();
   const faceMat=new T.MeshStandardMaterial({map:player?this.assets.ethan:this.assets.survivor,color:design?.face??0xffffff,roughness:.86});
   faceMat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHeadPos;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHeadPos = position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHeadPos;').replace('#include <map_fragment>','vec4 faceColor = texture2D(map, vMapUv); float frontBlend = smoothstep(-0.015, 0.065, vHeadPos.z); vec3 baseSkin = vec3(0.53,0.38,0.27); diffuseColor.rgb *= mix(baseSkin, faceColor.rgb, faceColor.a * frontBlend);');
   };
   const closed=a.array.slice(),open=closed.slice();for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),w=Math.exp(-((x/.075)**2))*Math.max(0,Math.min(1,(-y-.06)/.08))*Math.max(0,Math.min(1,z/.08));open[i*3+1]-=.022*w;open[i*3+2]+=.004*w;}face.morphAttributes.position=[new T.Float32BufferAttribute(open,3)];
   const facial=mesh(face,faceMat,[1,1,1],[0,.018,0],head);g.userData.face=facial;
   characterHair(head,design??{hair:0x302a22,style:'curly'});
   head.scale.setScalar(.9);head.position.y=.6;g.userData.texturedFace=true;
   if(color===0x3e6554){tube(body,dark,[[-.1,.38,.15],[0,.04,.20],[.1,.38,.15]],.004);mesh(SPHERE,material(0xaeb4a4,.35,.7),[.035,.02,.018],[0,.04,.22],body);}
  }

  if(!human&&design)characterHair(head,design);
  dressArchetype(g,kind,skin,raw);
  g.userData.identity=identity;g.userData.design=design?{...design}:null;
  if(gent){mesh(CYL,dark,[.18,.28,.18],[0,.30,-.015],head);mesh(CYL,dark,[.29,.023,.24],[0,.18,0],head);g.scale.y=1.55;mesh(SPHERE,material(0xb0b6a3,.94),[.15,.21,.14],[0,.02,0],head);for(const side of[-1,1]){mesh(SPHERE,dark,[.04,.029,.018],[side*.055,.045,.127],head);mesh(SPHERE,material(0xd0cba4,.21),[.006,.006,.004],[side*.055,.04,.146],head);}tube(head,dark,[[-.092,-.055,.116],[-.055,-.096,.14],[0,-.116,.144],[.055,-.096,.14],[.092,-.055,.116]],.006);for(let i=0;i<9;i++)mesh(SPHERE,bone,[.004,.008,.006],[(i-4)*.014,-.11+Math.abs(i-4)*.006,.144],head);}
  if(BODY_SCALE[kind]){const[w,h]=BODY_SCALE[kind];g.scale.set(w,h,w);}
  mergeParts(body);mergeParts(head);mergeParts(jaw);return g;
 }
 animateCharacter(g,t,moving,mood={}){
  if(g.userData.licensedActor)return animateLicensedEnemy(g,t,moving,mood);
  if(g.userData.bossRig){animateBoss(g,t,moving,mood);if(g.userData.kind==='birdy'&&!mood.beat&&this.root){g.updateMatrixWorld(true);for(const wing of g.userData.detachedWings)if(wing.visible&&!wing.userData.landed){this.root.attach(wing);wing.position.y=.055;wing.userData.landed=true;}}return g;}
  const kind=g.userData.kind,phase=g.userData.phase||0;if(mood.dead){animateCollapse(g,mood.deathTime||0);return;}
  g.userData.body.rotation.set(0,0,0);g.userData.head.rotation.set(0,0,0);if(g.userData.face)g.userData.face.morphTargetInfluences[0]=0;
  if(g.userData.twins){g.userData.twins.forEach((half,i)=>{this.animateCharacter(half,t+i*.7,moving,{...mood,windup:mood.activeHead===i?mood.windup:0});half.userData.head.rotation.y+=(i?-.25:.25);});return;}
  if(kind==='zsiga'){g.position.y=.04+Math.sin(t*1.5+phase)*.035;g.rotation.z=Math.sin(t*.9+phase)*.018;}
  const stride=kind==='runner'||kind==='chris'?7.5:kind==='zeb'?3:4.6;
  g.userData.legs?.forEach((leg,i)=>{leg.rotation.x=moving&&kind!=='zsiga'?Math.sin(t*stride+phase+i*Math.PI)*.30:0;if(leg.userData.calf)leg.userData.calf.rotation.x=moving?Math.max(0,-Math.sin(t*stride+phase+i*Math.PI))*.42:0;});
  g.userData.arms?.forEach((arm,i)=>{arm.rotation.x=arm.userData.base+(moving?Math.sin(t*stride*.7+i*2+phase)*.12:Math.sin(t*.65+i)*.025);if(arm.userData.forearm)arm.userData.forearm.rotation.x=arm.userData.forearm.userData.base;});
  g.userData.body.position.y=1.02+Math.sin(t*1.5+phase)*.004;
  if(kind==='birdy'){
   const flight=mood.charge>0?.35:mood.windup>0?.12:0;g.position.y=flight+Math.sin(t*1.8)*.045;
   const spread=mood.wingSpace===false?1.3:0;
   g.userData.wings.forEach((w,i)=>{const side=i?1:-1;w.rotation.y=side*(spread+(mood.recover>0?.55:.2));w.rotation.z=side*(Math.sin(t*(mood.charge>0?9:2.3))* (mood.charge>0?.26:.06)+(mood.windup>0?.2:0));});
   if(mood.charge>0){g.userData.legs.forEach(l=>{l.rotation.x=.9;l.userData.calf.rotation.x=1.1;});g.userData.arms.forEach(a=>a.rotation.x=-1.2);}
  }
  if(kind==='crawler'){g.userData.body.rotation.x=1;g.userData.body.position.y=.8;g.userData.arms.forEach((a,i)=>{a.rotation.x=-1.3+(moving?Math.sin(t*9+i*Math.PI)*.3:0);a.userData.forearm.rotation.x=-.75;});g.userData.legs.forEach((l,i)=>{l.rotation.x=-.8+(moving?Math.sin(t*9+i*Math.PI)*.25:0);l.userData.calf.rotation.x=1.2;});}
  if(g.userData.sac)g.userData.sac.scale.set(.15,.2*(1+Math.sin(t*(mood.windup>0?9:2))*.08),.14);
  if(!g.userData.human){if(kind!=='crawler')g.userData.body.rotation.x=kind==='zeb'?.10:.15+(mood.stagger>0?-.24:0);g.userData.head.position.z=.025+(moving?.012:0);if(mood.windup>0)g.userData.arms.forEach((a,i)=>a.rotation.x=-1.15+Math.sin(t*6+i)*.08);g.userData.head.rotation.x=-.08+Math.sin(t*.8+phase)*.055;g.userData.head.rotation.z=Math.sin(t*1.4+phase)*.09+(kind==='chris'?-.17:0);g.userData.jaw.rotation.x=.07+Math.max(0,Math.sin(t*1.8+phase))*.22;g.userData.body.rotation.z=moving?Math.sin(t*stride+phase)*.028:0;g.userData.head.rotation.y=Math.sin(t*.5+phase)*.065;
   if(g.userData.face)g.userData.face.morphTargetInfluences[0]=mood.windup>0?.9:.25+Math.max(0,Math.sin(t*1.8+phase))*.35;
   if(mood.stagger>0){g.userData.body.rotation.z=(mood.hitSide||1)*Math.min(.19,mood.stagger*.6);g.userData.head.rotation.x-=mood.stagger*.3;}if(mood.strike>0)g.userData.arms.forEach(a=>a.rotation.x=-.8-mood.strike*1.3);}
  if(kind==='chris'){
   if(mood.charge>0){g.userData.body.rotation.x=.48;g.userData.arms.forEach(a=>a.rotation.x=-1.1);g.userData.head.rotation.x=-.3;}
   else if(mood.windup>0){g.userData.body.rotation.x=-.14;g.userData.arms[1].rotation.x=-1.8;}
   else if(mood.recover>0){g.userData.body.rotation.x=.4;g.userData.head.rotation.x=.3;g.userData.arms[1].rotation.x=-.3;}
  }
  if(kind==='zeb'){
   g.userData.bileSacs?.forEach(s=>{const swell=mood.windup>0?1.2:mood.recover>0?.8:1;s.scale.set(.07,.11*swell,.065*swell);});
   if(mood.attack==='rupture'&&mood.windup>0){g.userData.body.position.y=.96;g.userData.body.rotation.x=.27;g.userData.arms.forEach(a=>a.rotation.x=.25);}
  }
  if(mood.recover>0&&g.userData.face)g.userData.face.material.emissive.setHex(0x291b0c);
 }
 weaponTexture(kind){
  const rnd=seeded(430+kind.length*29);return canvasTexture((ctx,s)=>{
   ctx.fillStyle=kind==='skin'?'#b99a81':kind==='rubber'?'#34372f':kind==='rough'?'#b5b5b5':'#7a8792';ctx.fillRect(0,0,s,s);
   for(let i=0;i<18000;i++){ctx.fillStyle=rnd()>.5?'rgba(232,222,201,.055)':'rgba(32,30,26,.065)';ctx.fillRect(rnd()*s,rnd()*s,1,1+rnd()*2);}
   if(kind==='metal'){for(let i=0;i<130;i++){const x=rnd()*s,y=rnd()*s;ctx.strokeStyle=i%4?'#c7c8b61c':'#0e191528';ctx.lineWidth=.3+rnd()*.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3+rnd()*26,y+(rnd()-.5)*2);ctx.stroke();}}
   if(kind==='rubber'){ctx.strokeStyle='#aaae8733';ctx.lineWidth=1;for(let n=-s;n<s*2;n+=9){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n+s,s);ctx.moveTo(n,0);ctx.lineTo(n-s,s);ctx.stroke();}}
   if(kind==='skin'){
    for(let i=0;i<1300;i++){ctx.fillStyle=i%3?'#5e403717':'#ead3b627';ctx.beginPath();ctx.ellipse(rnd()*s,rnd()*s,.5+rnd(),.8+rnd(),0,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#76534714';ctx.lineWidth=1;for(let i=0;i<35;i++){const x=rnd()*s,y=rnd()*s;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+5,y+3,x+10+rnd()*10,y-2);ctx.stroke();}
   }
  });
 }
 createWeapon(){for(const stage of this.weaponPreparation()){} }
 async prepareWeapons(yieldFrame=painted){for(const stage of this.weaponPreparation())await yieldFrame();}
 *weaponPreparation(){
  this.viewScene=new T.Scene();this.viewCamera=new T.PerspectiveCamera(62,1,.01,8);this.view=group(this.viewScene);this.view.scale.setScalar(1.02);this.weaponMotion=createWeaponMotion();
  const faces=[];for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),d=ctx.createLinearGradient(0,0,0,128);d.addColorStop(0,i===2?'#c9c7b7':'#3d4d52');d.addColorStop(.38,'#233138');d.addColorStop(1,'#0b1115');ctx.fillStyle=d;ctx.fillRect(0,0,128,128);if(i!==3){ctx.fillStyle=i===2?'#e9e4ce':'#c2cfd0';ctx.fillRect(20+i*3,16,7,74);ctx.fillStyle='#7d8f93';ctx.fillRect(29+i*3,17,3,73);ctx.fillRect(98-i*3,33,4,56);}faces.push(c);}const env=new T.CubeTexture(faces);env.needsUpdate=true;env.colorSpace=T.SRGBColorSpace;this.viewScene.environment=env;this.viewScene.environmentIntensity=.42;
  this.viewAmbient=new T.HemisphereLight(0xe1dacf,0x202d32,.42);this.viewScene.add(this.viewAmbient);const key=this.viewKey=new T.DirectionalLight(0xffefd7,1.35);key.position.set(-1,3,2);this.viewScene.add(key);const rim=this.viewRim=new T.DirectionalLight(0xb8c7ca,.45);rim.position.set(2,0,-2);this.viewScene.add(rim);
  const metal=this.assets.surfaces?surfaceMaterial(this.assets.surfaces,'metal',{roughness:.36}):scannedMaterial(this.assets.scans,'metal',{color:0xffffff,roughness:.42,metalness:.68}),steel=this.assets.surfaces?surfaceMaterial(this.assets.surfaces,'metal',{color:0xd5d5ce,roughness:.24,metalness:.84}):scannedMaterial(this.assets.scans,'metal',{color:0xd9d5c7,roughness:.27}),frame=this.assets.surfaces?surfaceMaterial(this.assets.surfaces,'metal',{color:0xd7d8d0,roughness:.51,metalness:.62}):scannedMaterial(this.assets.scans,'metal',{color:0xb8bab4,roughness:.54,metalness:.55}),dark=material(0x111312,.77,.24),rubber=material(0x262822,.88),sleeve=material(0x494d42,.93);
  const metalNormal=microTexture('metal'),gripNormal=microTexture('grip'),skinNormal=microTexture('skin'),gripMap=this.weaponTexture('rubber'),skinMap=this.weaponTexture('skin');
  for(const m of[metal,steel,frame]){m.normalMap=metalNormal;m.normalScale.set(.18,.18);}
  rubber.map=gripMap;rubber.normalMap=gripNormal;rubber.normalScale.set(.6,.6);sleeve.map=this.procedural('fabric');sleeve.normalMap=microTexture('cloth');sleeve.normalScale.set(.45,.45);
  const skin=this.assets.surfaces?surfaceMaterial(this.assets.surfaces,'hand',{color:0xf4e8df,normalMap:skinNormal,normalScale:new T.Vector2(.14,.14),roughness:.57,clearcoat:.02,sheen:.12}):new T.MeshPhysicalMaterial({color:0xe7c5ae,map:skinMap,normalMap:skinNormal,normalScale:new T.Vector2(.24,.24),roughness:.64,clearcoat:.035,clearcoatRoughness:.8,sheen:.16,sheenColor:0xb57f65});
  const marking=canvasTexture((ctx,s)=>{ctx.canvas.width=1024;ctx.canvas.height=128;ctx.clearRect(0,0,1024,128);ctx.fillStyle='#e5ddc044';ctx.font='28px monospace';ctx.textAlign='center';ctx.fillText('ESPEY · 9mm',512,76);});
  const materials={metal,steel,frame,dark,rubber,skin,sleeve,magazine:scannedMaterial(this.assets.scans,'metal',{color:0x9ca194,roughness:.45}),nail:new T.MeshPhysicalMaterial({color:0xb5a491,roughness:.6,clearcoat:.08}),sight:new T.MeshBasicMaterial({color:0xd2c9a0}),shell:material(0x793421,.58),marking:new T.MeshBasicMaterial({map:marking,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})};
  this.weaponModels=new Map();yield;for(const id of Object.keys(WEAPONS)){
   const model=id==='sidearm'?createViewModel(materials):createLongGun(materials,id);model.magazine.userData.rest=model.magazine.position.toArray();this.view.add(model.root);this.weaponModels.set(id,model);
   for(const g of[model.slide,model.grip,model.gun,model.rightHand,model.leftHand,model.trigger,model.hammer,model.pump].filter(Boolean))mergeParts(g);
   model.root.traverse(o=>{if(o.geometry)this.characterResources.add(o.geometry);for(const m of[o.material].flat().filter(Boolean)){this.characterResources.add(m);for(const key of ['map','bumpMap','roughnessMap','normalMap'])if(m[key])this.characterResources.add(m[key]);}});
   yield;
  }
  const finish=createHands(materials,this.viewScene);this.finisherHands=finish.hands;finish.hands.forEach((h,i)=>{this.viewScene.remove(h);h.visible=false;h.userData.skin=finish.skins[i];for(const child of [...h.children])if(child!==finish.skins[i]&&child.isMesh&&child.material===sleeve)child.visible=false;h.traverse(o=>{if(o.geometry)this.characterResources.add(o.geometry);});});
  this.setWeapon('sidearm');
  const flashMap=canvasTexture((ctx,s)=>{const d=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s*.5);d.addColorStop(0,'#fffff0');d.addColorStop(.12,'#ffe9b8');d.addColorStop(.32,'#ffaa4433');d.addColorStop(1,'#ff991100');ctx.fillStyle=d;ctx.fillRect(0,0,s,s);},128);
  for(const [id,model]of this.weaponModels){model.muzzle=mesh(new T.PlaneGeometry(.09,.09),new T.MeshBasicMaterial({map:flashMap,transparent:true,blending:T.AdditiveBlending,depthWrite:false}),[id==='shotgun'?1.5:1,1,1],WEAPONS[id].muzzle,model.gun);model.muzzle.visible=false;}this.setWeapon('sidearm');
  // A persistent light keeps firing and knife attacks on the same compiled shaders.
  this.viewFlash=new T.PointLight(0xffc879,0,2,2);this.viewScene.add(this.viewFlash);
  this.knife=group(this.viewScene,.31,-.33,-.52);const blade=material(0x9ca9a2,.23,.84);
  mesh(BOX,rubber,[.042,.15,.033],[0,-.07,0],this.knife);mesh(BOX,steel,[.095,.013,.025],[0,.013,0],this.knife);mesh(BOX,blade,[.046,.20,.008],[0,.12,0],this.knife);mesh(new T.ConeGeometry(.024,.085,3),blade,[1,1,.18],[0,.26,0],this.knife);this.knife.visible=false;mergeParts(this.knife);
  this.flashTimer=0;this.knifeTimer=0;
 }
 setWeapon(id){if(!this.weaponModels?.has(id))return;for(const [key,m]of this.weaponModels)m.root.visible=key===id;const model=this.weaponModels.get(id);resetWeaponParts(model);const {root,...parts}=model;this.pump=null;Object.assign(this,parts);this.hands=root;this.weaponId=id;this.weaponMotion=createWeaponMotion();this.flashTimer=0;}
 fireWeapon(aiming=false,id=this.weaponId||'sidearm'){this.weaponMotion??=createWeaponMotion();kickWeapon(this.weaponMotion,aiming,WEAPONS[id]?.recoil||1);this.pumpEjected=false;this.flashTimer=.045;if(this.muzzle)this.muzzle.rotation.z=this.weaponMotion.shots*2.399963;}
 weaponPoint(p,at){
  this.view.updateMatrixWorld(true);this.weaponVector??=new T.Vector3();this.weaponEuler??=new T.Euler(0,0,0,'YXZ');
  const v=this.weaponVector.set(...at).applyMatrix4(this.gun.matrixWorld),scale=Math.tan(T.MathUtils.degToRad(this.camera.fov/2))/Math.tan(T.MathUtils.degToRad(this.viewCamera.fov/2));
  v.x*=scale;v.y*=scale;v.applyEuler(this.weaponEuler.set(p.pitch||0,p.yaw||0,0,'YXZ'));
  return {x:p.x+v.x,y:(Number.isFinite(p.eyeHeight)?p.eyeHeight:p.crouching?1.14:EYE_HEIGHT)+v.y,z:p.z+v.z};
 }
 muzzleOrigin(p){return this.weaponPoint(p,weaponFor(p).muzzle);}
 ejectCasing(origin,yaw,p){if(p&&this.gun)this.combatEffects?.eject(this.weaponPoint(p,weaponFor(p).port),yaw,true);else this.combatEffects?.eject(origin,yaw);}
 swingKnife(){this.knifeTimer=.46;}
 async prepareCombatAsync(){
  await uploadSceneTextures(this.renderer,[this.scene,this.viewScene]);
  if(this.renderer.compileAsync){
   const hidden=[],target=this.renderer.getRenderTarget();for(const h of this.finisherHands||[])if(!h.visible){hidden.push(h);h.visible=true;}
   this.root?.traverse(o=>{if(!o.visible){hidden.push(o);o.visible=true;}});this.viewScene.traverse(o=>{if(!o.visible){hidden.push(o);o.visible=true;}});
   try{this.renderer.setRenderTarget(null);await duringGPUWork(this.renderer.getContext?.(),()=>this.renderer.compileAsync(this.scene,this.camera));await duringGPUWork(this.renderer.getContext?.(),()=>this.renderer.compileAsync(this.viewScene,this.viewCamera));}
   finally{for(const o of hidden)o.visible=false;this.renderer.setRenderTarget(target);}
  }
  await painted();this.prepareCombat();await finishGPUWarmup(this.renderer.getContext?.());await painted();
 }
 async prepareSceneGPU(scene,camera){
  const r=this.renderer,hidden=[],culling=[],target=r.getRenderTarget(),auto=r.autoClear,raster=warmRaster(r);
  scene.traverse(o=>{if(!o.visible){hidden.push(o);o.visible=true;}if(o.isMesh||o.isPoints){culling.push([o,o.frustumCulled]);o.frustumCulled=false;}});
  try{await uploadSceneTextures(r,[scene]);r.setRenderTarget(null);if(r.compileAsync)await duringGPUWork(r.getContext?.(),()=>r.compileAsync(scene,camera));r.autoClear=true;raster.output();r.render(scene,camera);await finishGPUWarmup(r.getContext?.());}
  finally{for(const o of hidden)o.visible=false;for(const [o,value]of culling)o.frustumCulled=value;r.setRenderTarget(target);r.autoClear=auto;raster.restore();}
 }
 headPositions(g,refresh=true){
  if(refresh)g.updateMatrixWorld(true);this.headVector??=new T.Vector3();const d=g.userData,heads=d.heads||[d.head],out=d.hitHeadsCache||=([]);let count=0;
  for(let i=0;i<heads.length;i++){if(i===1&&d.crushedBobby)continue;if(d.licensedActor?.anatomy?.headless)continue;const h=heads[i];if(!h)continue;const v=this.headVector.set(0,.02,0).applyMatrix4(h.matrixWorld),point=out[count]||=( {} );point.x=v.x;point.y=v.y;point.z=v.z;count++;}out.length=count;return out;
 }
 faceCharacter(g,yaw,dt){if(g.userData?.bossRig||g.userData?.licensedActor){const delta=Math.atan2(Math.sin(yaw-g.rotation.y),Math.cos(yaw-g.rotation.y));g.rotation.y+=delta*(1-Math.exp(-dt*8));}else g.rotation.y=yaw;}
 bossHitParts(g,refresh=true){
  if(refresh)g.updateMatrixWorld(true);const d=g.userData,p=BOSS_PROFILES[d.kind],parts=d.hitPartsCache||=([]);this.hitVector??=new T.Vector3();let count=0;
  const point=(out,bone,x=0,y=0,z=0)=>{const v=this.hitVector.set(x,y,z).applyMatrix4(bone.matrixWorld);out.x=v.x;out.y=v.y;out.z=v.z;},part=(a,b,r,ax=0,ay=0,az=0,bx=0,by=0,bz=0)=>{const q=parts[count]||=( {a:{},b:{}} );q.r=r;point(q.a,a,ax,ay,az);point(q.b,b,bx,by,bz);count++;};
  for(const spine of d.spines){const cy=spine===d.body?p.spine:p.spine+.08;part(spine,spine,d.kind==='zeb'?.34:d.kind==='birdy'?.18:.24,0,p.hip-cy,0,0,p.shoulder-.1-cy,0);}
  d.arms.forEach((arm,i)=>{const fore=arm.userData.forearm;part(arm,fore,d.kind==='zeb'?.15:.09);part(fore,fore,d.kind==='chris'&&i===1?.14:d.kind==='zeb'?.11:.075,0,0,0,...fore.userData.wrist);});
  d.legs.forEach(l=>{const calf=l.userData.calf;part(l,calf,d.kind==='zeb'?.16:.1);part(calf,calf,.085,0,0,0,0,-p.hip*.43,0);});
  if(d.wings)d.wings.forEach((w,i)=>{if(!w.visible)return;part(w,d.wingWrists[i],.085);part(d.wingWrists[i],d.wingWrists[i],.085,0,0,0,(i?1:-1)*1.8,-.18,0);});parts.length=count;return parts;
 }
 prepareCombat(){
  // Upload every weapon and effect during loading using the actual output
  // shaders, bounded to a small viewport under the loading cover.
  const target=this.renderer.getRenderTarget(),autoClear=this.renderer.autoClear;
  const raster=warmRaster(this.renderer);
  const gun=this.view.visible,knife=this.knife.visible,muzzle=this.muzzle.visible;
  const enemyBatches=this.enemyEffects?[this.enemyEffects.projectiles,this.enemyEffects.stains,this.enemyEffects.rings,...(this.zombieGore?[this.zombieGore.droplets,this.zombieGore.splats]:[])]:[],enemyCounts=enemyBatches.map(m=>m.count);
  const particles=this.combatEffects.particles.count,tracers=this.combatEffects.tracers.geometry.drawRange.count,casings=this.combatEffects.casings.count;
  const hidden=[],culling=[];for(const h of this.finisherHands||[])if(!h.visible){hidden.push(h);h.visible=true;}this.scene?.traverse(o=>{
   if(!o.visible){hidden.push(o);o.visible=true;}
   // Upload the entire authored level. The cinematic camera can be nowhere
   // near the player, and later rooms must not allocate buffers during a fight.
   if(o.isMesh||o.isPoints){culling.push([o,o.frustumCulled]);o.frustumCulled=false;}
  });
  this.viewScene.traverse(o=>{if(!o.visible){hidden.push(o);o.visible=true;}if(o.isMesh){culling.push([o,o.frustumCulled]);o.frustumCulled=false;}});
  try{
   this.renderer.setRenderTarget(null);raster.output();this.renderer.autoClear=true;
   enemyBatches.forEach(m=>m.count=1);this.combatEffects.particles.count=1;this.combatEffects.casings.count=1;this.combatEffects.tracers.geometry.setDrawRange(0,2);
   // The first shadow pass can see the previous lighting state. Repeat once
   // after scene lights are established to prepare the final depth variants.
   this.renderer.render(this.scene,this.camera);
   this.renderer.render(this.scene,this.camera);
   raster.reuseShadow();
   this.view.visible=this.knife.visible=this.muzzle.visible=true;
   this.renderer.render(this.viewScene,this.viewCamera);
  }finally{
   enemyBatches.forEach((m,i)=>m.count=enemyCounts[i]);this.combatEffects.particles.count=particles;this.combatEffects.casings.count=casings;this.combatEffects.tracers.geometry.setDrawRange(0,tracers);
   this.view.visible=gun;this.knife.visible=knife;this.muzzle.visible=muzzle;
   for(const o of hidden)o.visible=false;for(const[o,value]of culling)o.frustumCulled=value;this.renderer.setRenderTarget(target);this.renderer.autoClear=autoClear;
   raster.restore();
  }
 }
 setView(p,yaw,pitch,t,ads=false){
  this.yaw=yaw;this.pitch=pitch;const bob=this.settings.motion?0:Math.sin(this.walk*7)*(this.weaponMotion?.move.x||0)*.009*(1-(this.ads||0)*.8);
  const eye=Number.isFinite(p.eyeHeight)?p.eyeHeight:p.crouching?1.14:EYE_HEIGHT;this.camera.position.set(p.x,eye+bob,p.z);
  this.camera.rotation.set(pitch,yaw,0,'YXZ');this.currentAds=ads;
 }
 updateViewLighting(p,t){
  if(!this.viewKey)return;const lamp=this.nearestLamps?.[0]||this.lamps?.[0],dark=t<(this.blackoutUntil||0),distance=lamp?Math.hypot(lamp.x-p.x,lamp.z-p.z):12,illumination=dark?0:Math.min(1.15,(lamp?.base||0)/(distance*distance+5));
  this.viewAmbient.intensity=.24+illumination*.13;this.viewKey.intensity=(this.settings.flashlight===false?.18:.42)+illumination*.95;this.viewRim.intensity=.15+illumination*.30;
  if(lamp&&!dark){const dx=lamp.x-p.x,dz=lamp.z-p.z,yaw=p.yaw||0;this.viewKey.color.set(lamp.color).lerp(this.viewRim.color,.12);this.viewKey.position.set(dx*Math.cos(yaw)-dz*Math.sin(yaw),CEILING-(p.eyeHeight||EYE_HEIGHT),dx*Math.sin(yaw)+dz*Math.cos(yaw)).normalize().multiplyScalar(3);}else{this.viewKey.color.setHex(0xd7d4c4);this.viewKey.position.set(-1,2.5,1.5);}
 }
 updateWeapon(dt,t,p){
  dt=Number.isFinite(dt)?Math.max(0,dt):0;this.weaponMotion??=createWeaponMotion();
  const w=weaponFor(p),reach=.45+Math.abs(w.muzzle[2])*this.view.scale.x,origin=this.clearanceOrigin||=( {} );origin.x=p.x;origin.y=Number.isFinite(p.eyeHeight)?p.eyeHeight:p.crouching?1.14:EYE_HEIGHT;origin.z=p.z;
  const clearance=this.grid?environmentDistance(this.grid,origin,viewDirection(p.yaw||0,p.pitch||0),this.obstacles||[],reach+.16):reach+.16,obstruction=Math.max(0,Math.min(1,(reach+.12-clearance)/.4));
  const progress=reloadProgress(p),pose=stepWeaponMotion(this.weaponMotion,dt,p,{reduced:this.settings.motion,walk:this.walk||0,aspect:this.camera.aspect,progress,viewScale:this.view.scale.x,obstruction});this.weaponPose=pose;this.ads=pose.ads;this.recoil=this.weaponMotion.kick.x;
  this.flashTimer=Math.max(0,this.flashTimer-dt);this.knifeTimer=Math.max(0,this.knifeTimer-dt);
  this.view.position.set(...pose.position);this.view.rotation.set(...pose.rotation);
  const magRest=this.magazine.userData.rest||[0,-.06,0];this.magazine.position.set(...magRest.map((v,i)=>v+pose.reload.magazine[i]));this.magazine.rotation.set(0,0,pose.reload.magazine[0]*1.1);this.magazine.visible=pose.reload.magazineVisible;
  if(this.leftHand){const rest=this.leftHand.userData.rest;this.leftHand.position.set(...rest.map((v,i)=>v+pose.reload.hand[i]));this.leftHand.rotation.set(...pose.reload.handRotation.map((v,i)=>v+(this.leftHand.userData.restRotation?.[i]||0)));this.leftSkin.morphTargetInfluences[0]=pose.reload.grasp;this.rightSkin.morphTargetInfluences[0]=pose.trigger;this.trigger.rotation.x=-pose.trigger*.15;this.hammer.rotation.x=-pose.trigger*.22;}
  this.slide.position.z=pose.slide;if(this.pump){this.pump.position.z=pose.pump||0;if(this.weaponId==='shotgun'){this.leftHand.position.z+=(pose.pump||0);if(!this.pumpEjected&&this.weaponMotion.shotAge>.34&&this.weaponMotion.shotAge<.7){this.pumpEjected=true;this.ejectCasing({x:p.x,y:EYE_HEIGHT,z:p.z},p.yaw,p);this.combatEffects?.shellLast?.();}}}if(this.hands?.userData.shell){const shell=this.hands.userData.shell;shell.visible=!!pose.shell;const rest=this.leftHand.position;shell.position.set(rest.x+.04,rest.y+.055,rest.z-.01);}this.muzzle.visible=this.flashTimer>0;this.viewFlash.intensity=this.flashTimer>0?6:0;
  this.view.updateMatrixWorld(true);updateSleeveAnchors(this.rightHand,this.leftHand);this.viewFlash.position.set(...w.muzzle).applyMatrix4((this.gun||this.view).matrixWorld);
  this.knife.visible=this.knifeTimer>0;this.view.visible=this.knifeTimer<=0;this.knife.rotation.z=-1.25+Math.sin((.46-this.knifeTimer)/.46*Math.PI)*2;this.knife.rotation.x=-.4;
  const fov=(this.settings.fov||76)+pose.fovOffset;if(Math.abs(this.camera.fov-fov)>.001){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
 }
 // EFFECT_METHODS
 memoryObject(n,x,z,spent=false){
  const mx=n===2?x:x-1.1,mz=n===2?z-.9:z;
  const g=group(this.root,mx,0,mz),p=this.palette;
  if(n===0){
   mesh(BOX,p.wood,[1.12,2.35,.52],[0,1.17,0],g);mesh(BOX,p.black,[.97,2.15,.025],[0,1.18,.275],g);
   const door=group(g,-.52,0,.3);mesh(BOX,p.wood,[1.04,2.24,.07],[.52,1.16,0],door);mesh(BOX,p.metal,[.12,.025,.035],[.94,1.06,.06],door);g.userData.door=door;door.rotation.y=spent?-.95:-.08;
   for(const y of[.45,1,1.6]){mesh(BOX,p.metal,[.96,.035,.45],[0,y,.04],g);for(let i=0;i<3;i++)mesh(BOX,p.paper,[.2,.2,.23],[-.3+i*.3,y+.12,.03],g);}
   const tag=this.sign('SUPPLIES',[x-1.1,2.52,z+.28],1.1,.22,'#c9c9b0','#26342d');g.attach(tag);
  }else if(n===1){
   mesh(BOX,p.wood,[.6,.065,.6],[0,.52,0],g);mesh(BOX,p.wood,[.6,.66,.065],[0,.85,-.27],g);for(const a of[-.25,.25])for(const b of[-.25,.25])mesh(BOX,p.metal,[.045,.52,.045],[a,.26,b],g);mesh(CYL,p.glass,[.04,.15,.04],[.2,.63,0],g);mesh(BOX,p.paper,[.29,.006,.2],[0,.56,0],g);
  }else if(n===2){
   mesh(BOX,p.wood,[.9,.05,.5],[0,.35,0],g);for(const a of[-.35,.35])mesh(BOX,p.metal,[.04,.35,.04],[a,.175,0],g);for(const a of[-.2,.2]){mesh(SPHERE,p.black,[.1,.08,.23],[a,.47,0],g);mesh(SPHERE,p.paper,[.09,.045,.2],[a,.42,0],g);for(let i=0;i<4;i++)mesh(BOX,p.paper,[.14,.008,.015],[a,.52,-.05+i*.04],g);}
  }else if(n===3){
   mesh(BOX,p.wood,[.75,.12,.65],[0,.45,0],g);for(let i=0;i<3;i++)mesh(new T.TorusGeometry(.15+i*.065,.012,8,40),p.metal,[1,1,1],[0,.54+i*.016,0],g).rotation.x=Math.PI/2;
  }else if(n===4){
   mesh(BOX,p.metal,[.8,.045,.6],[0,.78,0],g);for(const a of[-.33,.33])mesh(BOX,p.metal,[.04,.78,.04],[a,.39,0],g);mesh(SPHERE,p.metal,[.09,.05,.04],[0,.85,0],g);tube(g,p.black,[[0,.85,0],[-.23,.8,.1],[-.3,.8,-.1],[0,.8,-.2]],.009);mesh(BOX,p.paper,[.3,.007,.22],[.15,.81,.1],g);
  }else{
   mesh(BOX,p.wood,[.7,.04,.6],[0,.8,0],g);for(const a of[-.28,.28])mesh(BOX,p.metal,[.04,.8,.04],[a,.4,0],g);mesh(BOX,p.black,[.35,.02,.44],[0,.84,0],g);mesh(BOX,p.paper,[.3,.006,.4],[.02,.856,.01],g);
  }
  const light=new T.PointLight(0xc5d4bf,spent?.25:2.5,3,2);light.position.set(0,1.7,.4);g.add(light);g.userData.memoryLight=light;
  this.obstacles.push({x:mx,z:mz,w:n===0?1.12:.8,d:n===0?.52:.6,h:n===0?2.35:.85});return g;
 }
 activateObjective(g){if(!g)return;g.traverse(o=>{if(o.material?.emissive&&o.material.emissiveIntensity>0){o.material.color.setHex(0x83bc9c);o.material.emissive.setHex(0x6eb58e);}});if(g.userData.ring)g.userData.ring.visible=false;}
 rememberMemory(g){if(g?.userData.door)g.userData.door.rotation.y=-.95;if(g?.userData.memoryLight)g.userData.memoryLight.intensity=.25;}
 object(kind,x,z,weapon){
  const g=group(this.root,x,0,z),color={fuse:0xd5b36a,seal:0xd5b36a,anchor:0xd5b36a,page:0xb7d8c7,ammo:0xc2a471,weapon:0xc2a471,med:0x79caaa,save:0x74a5ce}[kind];
  const glow=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.35,roughness:.65}),dark=this.palette.black,metal=this.palette.metal;
  if(kind==='weapon'){
   const model=this.weaponModels.get(weapon||'shotgun').gun.clone(true);model.traverse(o=>{if(o.material){const source=o.material;o.material=source.clone();o.material.onBeforeCompile=source.onBeforeCompile;o.material.customProgramCacheKey=source.customProgramCacheKey;}if(o.material?.blending===T.AdditiveBlending)o.visible=false;});model.position.set(0,.76,0);model.rotation.x=Math.PI/2;model.rotation.z=Math.PI/2;model.scale.setScalar(.8);g.add(model);mesh(BOX,this.palette.wood,[.7,.05,.90],[0,.55,0],g);
  }else if(kind==='anchor'){
   mesh(BOX,metal,[.7,1.18,.62],[0,.59,0],g);mesh(BOX,dark,[.59,.38,.026],[0,.91,.328],g);mesh(BOX,glow,[.49,.29,.01],[0,.91,.345],g);
   for(let i=0;i<4;i++)mesh(BOX,dark,[.5,.036,.03],[0,.2+i*.08,.328],g);for(const dx of[-.19,.19])mesh(CYL,glow,[.032,.14,.032],[dx,.55,.35],g).rotation.x=Math.PI/2;
  }else if(kind==='save'){
   mesh(BOX,metal,[.72,.74,.59],[0,.37,0],g);mesh(BOX,dark,[.63,.4,.065],[0,.94,0],g);mesh(BOX,glow,[.55,.3,.011],[0,.94,.04],g);mesh(BOX,dark,[.4,.025,.16],[0,.756,.11],g);
  }else if(kind==='seal'){mesh(new T.TorusGeometry(.19,.025,8,32),glow,[1,1,1],[0,.76,0],g);mesh(new T.CircleGeometry(.165,24),metal,[1,1,1],[0,.76,-.005],g);}
  else if(kind==='fuse'){mesh(CYL,metal,[.06,.31,.06],[0,.72,0],g);for(const y of[.61,.84])mesh(CYL,glow,[.075,.035,.075],[0,y,0],g);}
  else if(kind==='page'){mesh(BOX,this.palette.paper,[.28,.008,.4],[0,.62,0],g);}
  else{mesh(BOX,kind==='ammo'?this.palette.wood:glow,[.32,.15,.25],[0,.63,0],g);if(kind==='med'){mesh(BOX,this.palette.paper,[.21,.012,.06],[0,.713,0],g);mesh(BOX,this.palette.paper,[.06,.012,.18],[0,.715,0],g);}else for(let i=0;i<5;i++)mesh(CYL,glow,[.017,.07,.017],[-.10+i*.05,.73,0],g);}
  if(!['anchor','save'].includes(kind)){mesh(BOX,metal,[.58,.025,.55],[0,.54,0],g);link(g,metal,[0,.52,0],[0,.04,0],.028);mesh(BOX,metal,[.4,.027,.4],[0,.025,0],g);}
  const ring=mesh(new T.RingGeometry(.4,.42,32),new T.MeshBasicMaterial({color,transparent:true,opacity:.32,side:T.DoubleSide,depthWrite:false}),[1,1,1],[0,.025,0],g);ring.rotation.x=-Math.PI/2;g.userData.ring=ring;
  mergeParts(g);return g;
 }
 effect(x,z,color=0xe6b25e,count=8,y=1.1){
  this.combatEffects?.burst(x,z,color,count,y);
 }
 tracer(a,b){this.combatEffects?.tracer(a,b);}
 attackMarker(){
  const g=group(this.root);g.userData.kind='attack-marker';const mat=new T.MeshBasicMaterial({color:0xcf7953,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false});
  const ring=mesh(new T.RingGeometry(.94,1,48),mat,[1,1,1],[0,.038,0],g);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  const line=mesh(WALLBOX,mat,[.55,.015,1],[0,.04,0],g);line.castShadow=false;g.userData.ring=ring;g.userData.line=line;g.visible=false;return g;
 }
 updateAttackMarker(e){
  const g=e.warning,a=e.attack;if(!g||!a)return;g.position.set(e.x,0,e.z);g.rotation.y=Math.atan2(e.chargeX,e.chargeZ);
  const attack=ATTACKS[a]||{},dash=!!attack.dash,r=attack.wave||attack.radius||.85;
  g.userData.ring.scale.setScalar(r);g.userData.line.visible=dash;const d=g.userData,bucket=Math.floor((e.attackTime||0)/.15);let length=d.warningLength;
  if(d.warningAttack!==e.attackCount||d.warningName!==a||d.warningBucket!==bucket||d.warningX!==e.x||d.warningZ!==e.z){
   length=dash?attack.dash*attack.duration:Math.min(9,Math.hypot(e.targetX-e.x,e.targetZ-e.z)+1);
   if(dash&&this.grid)for(let t=.25;t<length;t+=.25)if(solid(this.grid,e.x+e.chargeX*t,e.z+e.chargeZ*t,enemyRadius(e))||this.blocked(e.x+e.chargeX*t,e.z+e.chargeZ*t,enemyRadius(e))){length=t;break;}
   d.warningLength=length;d.warningAttack=e.attackCount;d.warningName=a;d.warningBucket=bucket;d.warningX=e.x;d.warningZ=e.z;
  }
  g.userData.line.scale.z=length;g.userData.line.position.z=length/2;
  const progress=Math.max(0,Math.min(1,(e.attackTime||0)/(e.tellDuration||attack.tell||1))),mat=d.ring.material;mat.opacity=.18+progress*.28+Math.sin(progress*Math.PI*2)*.035;mat.color.setRGB(.62+progress*.18,.26-progress*.12,.10-progress*.035);
 }
 warning(x,z,r){const o=mesh(new T.RingGeometry(r-.12,r,48),new T.MeshBasicMaterial({color:0xd87748,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false}),[1,1,1],[x,.04,z],this.root);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;}
 selectLamps(x,z,t){
  if(this.nearestLamps&&t>=this.lampTime&&t-this.lampTime<.18&&(x-this.lampX)**2+(z-this.lampZ)**2<.16)return this.nearestLamps;
  const count=this.lightPool.length,chosen=this.nearestLamps||=(new Array(count)),scores=this.lampScores||=(new Float64Array(count));chosen.fill(null);scores.fill(Infinity);
  for(const lamp of this.lamps){const d=(lamp.x-x)**2+(lamp.z-z)**2;for(let i=0;i<count;i++)if(d<scores[i]){for(let j=count-1;j>i;j--){scores[j]=scores[j-1];chosen[j]=chosen[j-1];}scores[i]=d;chosen[i]=lamp;break;}}
  this.lampX=x;this.lampZ=z;this.lampTime=t;return chosen;
 }
 update(dt,t,p,aim,shake){
  this.setView(p,p.yaw||0,p.pitch||0,t,p.aiming);if(p.moving)this.walk+=dt*(p.sprinting?1.45:1);
  if(shake&&!this.settings.motion){const weight=shake*(p.aiming?.15:1);this.camera.position.y+=Math.sin(t*11)*weight*.006;this.camera.rotation.x+=Math.sin(t*17)*weight*.005;this.camera.rotation.z=Math.sin(t*13)*weight*.007;}
  const d=viewDirection(p.yaw||0,p.pitch||0);this.flashlight.position.copy(this.camera.position);this.flashlight.position.y-=.1;this.flashlight.target.position.copy(this.camera.position).add((this.flashTargetVector||=new T.Vector3()).set(d.x,d.y,d.z).multiplyScalar(12));this.flashlight.intensity=this.settings.flashlight===false?0:115;
  this.playerLight.position.copy(this.camera.position);this.shotLight.position.copy(this.camera.position);this.shotLight.intensity=this.flashTimer>0?28:0;
  this.advanceGates(dt);
  const dark=t<this.blackoutUntil,lamps=this.selectLamps(p.x,p.z,t);
  for(let i=0;i<this.lightPool.length;i++){const l=this.lightPool[i],v=lamps[i];if(!v){l.intensity=0;continue;}l.position.set(v.x,CEILING-.33,v.z);l.color.set(v.color);l.intensity=(dark?0:v.base)*(Math.sin(t*1.3+v.offset)>-.995?1:.12);}
  if(this.dust)this.dust.position.y=Math.sin(t*.13)*.08;if(this.portal){this.portal.rotation.z=t*.14;this.portal.material.color.setHSL(.025,.6,.36+Math.sin(t)*.06);}
  for(const o of this.mist){o.quaternion.copy(this.camera.quaternion);o.material.opacity=.13+Math.sin(t+o.position.y)*.06;}
  this.combatEffects?.update(dt);
  this.updateViewLighting(p,t);this.updateWeapon(dt,t,p);this.renderer.autoClear=true;this.renderer.render(this.scene,this.camera);this.worldCalls=this.renderer.info.render.calls;
  this.renderer.autoClear=false;this.renderer.clearDepth();this.renderer.render(this.viewScene,this.viewCamera);this.worldCalls+=this.renderer.info.render.calls;
 }
}
