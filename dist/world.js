import {createAnatomy,animateCollapse} from './anatomy.js?v=4.1.0';
import {reloadProgress} from './reload.js?v=4.1.0';
import * as T from './vendor/three.module.js';
import {TILE,seeded,solid,findPath} from './data.js?v=4.1.0';
import {EYE_HEIGHT,CEILING,BODY_SCALE,viewDirection,propsBlock} from './fps.js?v=4.1.0';
import {CombatEffects} from './combat-effects.js?v=4.1.0';

const BOX=bevelBox(1,1,1,.014),WALLBOX=new T.BoxGeometry(1,1,1),SPHERE=new T.SphereGeometry(1,20,14),CYL=new T.CylinderGeometry(1,1,1,16);
const SHARED=new Set([BOX,WALLBOX,SPHERE,CYL]);
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
function mergeParts(g){
 const buckets=new Map();for(const o of [...g.children])if(o.isMesh&&!Array.isArray(o.material)&&!o.material.transparent){const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);}
 for(const objects of buckets.values()){
  if(objects.length<2)continue;
  const parts=objects.map(o=>{o.updateMatrix();const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return geo.applyMatrix4(o.matrix);}),geo=new T.BufferGeometry();
  for(const attr of ['position','normal','uv']){
   if(parts.some(p=>!p.getAttribute(attr)))continue;const data=new Float32Array(parts.reduce((n,p)=>n+p.getAttribute(attr).array.length,0));let offset=0;
   for(const p of parts){const arr=p.getAttribute(attr).array;data.set(arr,offset);offset+=arr.length;}geo.setAttribute(attr,new T.BufferAttribute(data,attr==='uv'?2:3));
  }
  geo.computeBoundingSphere();const o=new T.Mesh(geo,objects[0].material);o.castShadow=true;o.receiveShadow=true;g.add(o);
  for(const p of parts)p.dispose();for(const old of objects){g.remove(old);if(!SHARED.has(old.geometry))old.geometry.dispose();}
 }
}

export class World{
 constructor(canvas,settings){
  this.settings=settings;this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='high'?1.65:1));this.renderer.shadowMap.enabled=settings.quality==='high';this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.45;
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(settings.fov||76,1,.06,85);this.camera.rotation.order='YXZ';
  this.lamps=[];this.obstacles=[];this.recoil=0;this.ads=0;this.walk=0;this.assets={};
  const loader=new T.TextureLoader();this.ready=Promise.all([['floor','floor'],['wall','plaster'],['skin','infected-skin'],['face','infected-face'],['ethan','ethan-face'],['survivor','survivor-face']].map(([name,file])=>new Promise((resolve,reject)=>{
   const t=loader.load(new URL(`./assets/${file}.webp`,import.meta.url).href,resolve,undefined,reject);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;this.assets[name]=t;
  })));this.ready.catch(()=>{});
  this.createWeapon();this.resize();
 }
 resize(){this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.viewCamera.aspect=this.camera.aspect;this.viewCamera.updateProjectionMatrix();}
 stageBoxGeometry(){return BOX.clone();}
 surface(asset,color,repeat=[1,1],bump=.02,roughness=.9){const map=this.assets[asset].clone();map.needsUpdate=true;map.repeat.set(...repeat);const height=map.clone();height.colorSpace=T.NoColorSpace;height.needsUpdate=true;return new T.MeshStandardMaterial({color,map,bumpMap:height,bumpScale:bump,roughness});}
 procedural(kind){
  const rnd=seeded(kind.length*87);return canvasTexture((ctx,s)=>{
   ctx.fillStyle=kind==='paper'?'#bdb4a1':kind==='carpet'?'#81704a':kind==='wallpaper'?'#aa9659':kind==='ceiling'?'#9b9c88':'#384138';ctx.fillRect(0,0,s,s);
   for(let i=0;i<22000;i++){ctx.fillStyle=rnd()>.5?'rgba(232,222,186,.08)':'rgba(9,12,8,.14)';ctx.fillRect(rnd()*s,rnd()*s,1+rnd()*3,1+rnd()*3);}
   if(kind==='wallpaper'){
    ctx.strokeStyle='#75643b';ctx.lineWidth=1.3;for(let x=0;x<=s;x+=32)for(let y=0;y<=s;y+=64){ctx.beginPath();ctx.ellipse(x,y,11,26,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y-22);ctx.quadraticCurveTo(x+18,y,x,y+22);ctx.quadraticCurveTo(x-18,y,x,y-22);ctx.stroke();}
    for(let i=0;i<18;i++){const x=rnd()*s,y=rnd()*s,r=12+rnd()*65,d=ctx.createRadialGradient(x,y,0,x,y,r);d.addColorStop(0,'#23291755');d.addColorStop(1,'#23291700');ctx.fillStyle=d;ctx.fillRect(x-r,y-r,r*2,r*2);}
   }
   if(kind==='ceiling'){ctx.strokeStyle='#464c3b';ctx.lineWidth=3;for(let v=0;v<=s;v+=128){ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,s);ctx.moveTo(0,v);ctx.lineTo(s,v);ctx.stroke();}}
   if(kind==='paper'){ctx.fillStyle='#454b43';for(let y=65;y<s-50;y+=17)ctx.fillRect(35,y,Math.min(400,80+rnd()*370),2);}
   if(kind==='fabric'){ctx.strokeStyle='#71806425';ctx.lineWidth=.6;for(let i=0;i<s;i+=3){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,s);ctx.moveTo(0,i);ctx.lineTo(s,i);ctx.stroke();}}
   if(kind==='wood'){ctx.fillStyle='#a29377';ctx.fillRect(0,0,s,s);for(let i=0;i<750;i++){const x=rnd()*s;ctx.strokeStyle=i%3?'#33261b25':'#cfbea82a';ctx.lineWidth=.3+rnd()*1.2;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+Math.sin(i)*10,s*.3,x+Math.sin(i+1)*14,s*.7,x,s);ctx.stroke();}}
  });
 }
 optimizeStatic(){
  this.root.updateMatrixWorld(true);const buckets=new Map();this.root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||!SHARED.has(o.geometry)||Array.isArray(o.material)||o.material.transparent)return;const key=o.geometry.uuid+'/'+o.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});
  for(const objects of buckets.values()){if(objects.length<3)continue;const first=objects[0],batch=new T.InstancedMesh(first.geometry,first.material,objects.length);objects.forEach((o,i)=>batch.setMatrixAt(i,o.matrixWorld));batch.castShadow=true;batch.receiveShadow=true;this.root.add(batch);for(const o of objects)o.parent.remove(o);}
 }
 disposeLevel(){
  this.combatEffects?.dispose();this.combatEffects=null;
  if(!this.root)return;const geos=new Set(),mats=new Set(),textures=new Set(),skeletons=new Set(),keep=new Set(Object.values(this.assets));
  this.scene.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);if(o.geometry&&!SHARED.has(o.geometry))geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const key of ['map','bumpMap','roughnessMap','alphaMap'])if(m[key]&&!keep.has(m[key]))textures.add(m[key]);}});
  for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const t of textures)t.dispose();for(const s of skeletons)s.dispose();this.flashlight?.shadow?.dispose();this.scene.clear();this.decalMaps={};
 }
 disposeObject(root){
  const geos=new Set(),mats=new Set(),textures=new Set(),skeletons=new Set(),keep=new Set(Object.values(this.assets));
  root.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);if(o.geometry&&!SHARED.has(o.geometry))geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const key of ['map','bumpMap','roughnessMap','alphaMap'])if(m[key]&&!keep.has(m[key]))textures.add(m[key]);}if(o.isLight)o.shadow?.dispose();});
  for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const t of textures)t.dispose();for(const s of skeletons)s.dispose();root.clear();
 }
 load(chapter,grid){
  this.disposeLevel();this.grid=grid;this.config=chapter;this.theme=chapter.theme;this.level=chapter.level;this.gates=[];this.blackoutUntil=0;this.protectedCells=new Set();for(const route of [this.level.route,...chapter.items.map(i=>[chapter.start,i.at])])for(let i=1;i<route.length;i++)for(const p of findPath(grid,{x:(route[i-1][0]+.5)*TILE,z:(route[i-1][1]+.5)*TILE},{x:(route[i][0]+.5)*TILE,z:(route[i][1]+.5)*TILE}))this.protectedCells.add(Math.floor(p.x/TILE)+","+Math.floor(p.z/TILE));this.lamps=[];this.obstacles=[];this.portal=null;this.gent=null;this.mist=[];
  const yellow=this.theme==='backrooms',breach=this.theme==='breach';this.scene.background=new T.Color(yellow?0x1b1910:0x090e11);this.scene.fog=new T.FogExp2(yellow?0x25231a:0x0c1419,yellow?.026:.032);this.root=new T.Group();this.scene.add(this.root);
  this.scene.environment=this.viewScene.environment;this.scene.environmentIntensity=.16;
  this.scene.add(new T.HemisphereLight(yellow?0xd5cba0:0x9fbab7,0x1a201d,yellow?.46:.36));
  this.palette={metal:material(0x424c4a,.42,.66),black:material(0x151c1c,.65,.25),wood:material(yellow?0x766447:0x665b49),paper:material(0xc9bea5),rust:material(0x593b2d),glass:material(0x1a3839,.13,.5),bone:material(0xaaa18a),blood:material(0x36140e,.35)};
  this.palette.wood.map=this.procedural('wood');this.palette.wood.bumpMap=this.palette.wood.map;this.palette.wood.bumpScale=.008;this.palette.metal.bumpMap=this.procedural('fabric');this.palette.metal.bumpScale=.002;this.palette.paper.map=this.procedural('paper');
  const floor=yellow?material(0xffffff,.98):this.surface('floor',0xc2c7c2,[24,19.2],.018,.33);if(yellow){floor.map=this.procedural('carpet');floor.map.repeat.set(36,28.8);floor.bumpMap=floor.map;floor.bumpScale=.014;}
  mesh(new T.PlaneGeometry(72,57.6),floor,[1,1,1],[36,0,28.8],this.root).rotation.x=-Math.PI/2;
  const ceiling=material(yellow?0xb4ae87:0x89938b,.93);ceiling.map=this.procedural('ceiling');ceiling.map.repeat.set(18,14.4);mesh(new T.PlaneGeometry(72,57.6),ceiling,[1,1,1],[36,CEILING,28.8],this.root).rotation.x=Math.PI/2;
  const wall=yellow?material(0xffffff,.96):this.surface('wall',breach?0x858e7c:0xb5c1b5,[1,1],.034);if(yellow){wall.map=this.procedural('wallpaper');wall.bumpMap=wall.map;wall.bumpScale=.012;}
  const coords=[];grid.forEach((row,z)=>row.forEach((v,x)=>{if(v)coords.push([x,z]);}));const walls=new T.InstancedMesh(WALLBOX,wall,coords.length),dummy=new T.Object3D();
  coords.forEach(([x,z],i)=>{dummy.position.set((x+.5)*TILE,CEILING/2,(z+.5)*TILE);dummy.scale.set(TILE,CEILING,TILE);dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);walls.setColorAt(i,new T.Color().setScalar(.83+(i%5)*.035));});walls.castShadow=true;walls.receiveShadow=true;this.root.add(walls);
  for(const [height,thick]of [[.09,.16],[1.02,.035],[3.17,.1]]){const trim=new T.InstancedMesh(BOX,material(yellow?0x594a2c:height===1.02?0x596860:0x313e3c,.72,.12),coords.length);coords.forEach(([x,z],i)=>{dummy.position.set((x+.5)*TILE,height,(z+.5)*TILE);dummy.scale.set(TILE+.025,thick,TILE+.025);dummy.updateMatrix();trim.setMatrixAt(i,dummy.matrix);});trim.receiveShadow=true;this.root.add(trim);}
  this.lightPool=[];for(let i=0;i<6;i++){const l=new T.PointLight(0xffffff,0,12,2);this.scene.add(l);this.lightPool.push(l);}
  for(const r of this.level.rooms){const [a,b,c,d]=r.bounds;for(const x of[a+1,c-1])for(const z of[b+1,d-1])this.addLamp((x+.5)*TILE,(z+.5)*TILE,r.kind==='flood'?0x82a5c8:r.kind==='finale'||r.kind==='relay'?0xd36d51:yellow?0xffdd8d:0xdbefd8);}
  for(const [a,b]of this.level.corridors){this.addLamp(((a[0]+b[0])/2+.5)*TILE,((a[1]+b[1])/2+.5)*TILE,breach?0xdb7455:yellow?0xf7d789:0xc5dcd8);}
  this.flashlight=new T.SpotLight(0xffead2,115,27,.48,.72,2);this.flashlight.castShadow=true;this.flashlight.shadow.mapSize.set(1024,1024);this.flashlight.shadow.camera.near=.08;this.flashlight.shadow.camera.far=28;this.flashlight.shadow.bias=-.00035;this.flashlight.shadow.normalBias=.035;this.scene.add(this.flashlight,this.flashlight.target);
  this.playerLight=new T.PointLight(0xd6e2d2,2.8,3.4,2);this.scene.add(this.playerLight);this.shotLight=new T.PointLight(0xffbf65,0,5,2);this.scene.add(this.shotLight);
  this.dressDirectedRooms(chapter);this.dressArchitecture();const rnd=seeded(52+chapter.number.length),cells=[];grid.forEach((row,z)=>row.forEach((v,x)=>{if(!v)cells.push([x,z]);}));
  for(let i=0;i<180;i++){const [x,z]=cells[Math.floor(rnd()*cells.length)],px=(x+.1+rnd()*.8)*TILE,pz=(z+.1+rnd()*.8)*TILE;if(i%3===0){const p=mesh(BOX,this.palette.paper,[.22+rnd()*.15,.003,.3+rnd()*.13],[px,.013,pz],this.root);p.rotation.y=rnd()*6;}else if(i%3===1)this.decal('stain',[px,.015,pz],.4+rnd()*1.3,true);}
  const pos=new Float32Array(500*3);for(let i=0;i<pos.length;i+=3){pos[i]=rnd()*72;pos[i+1]=rnd()*CEILING;pos[i+2]=rnd()*57.6;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));this.dust=new T.Points(geo,new T.PointsMaterial({color:0xc6cfad,size:.022,transparent:true,opacity:.3,depthWrite:false}));this.root.add(this.dust);
  const [ex,ez]=chapter.exit;this.exit=group(this.root,(ex+.5)*TILE,0,(ez+.5)*TILE);mesh(BOX,this.palette.black,[2.15,2.9,.18],[0,1.45,0],this.exit);mesh(BOX,this.palette.wood,[1.85,2.65,.16],[0,1.33,.12],this.exit);mesh(BOX,this.palette.metal,[.16,.035,.03],[.7,1.12,.23],this.exit);
  this.sign(breach?'P.A. / 204':'204',[this.exit.position.x,2.85,this.exit.position.z+.23],1.2,.3,'#cabaa0','#171d19');this.sign('EXIT',[this.exit.position.x,3.05,this.exit.position.z+.22],.7,.23,'#f4ceaa','#572c20');
  this.exitLight=new T.PointLight(0xbd5840,12,7,2);this.exitLight.position.set(this.exit.position.x,2.7,this.exit.position.z+.7);this.scene.add(this.exitLight);
  if(breach){this.portal=mesh(new T.TorusGeometry(1.65,.055,8,64),new T.MeshBasicMaterial({color:0xb6583c}),[1,1,1],[(chapter.boss.at[0]+.5)*TILE,1.8,(chapter.exit[1]+.5)*TILE-1.2],this.root);mesh(new T.CircleGeometry(1.63,48),new T.MeshBasicMaterial({color:0x010202}),[1,1,1],[(chapter.boss.at[0]+.5)*TILE,1.8,(chapter.exit[1]+.5)*TILE-1.22],this.root);this.gent=this.character('gentleman');this.gent.position.set((chapter.boss.at[0]+.5)*TILE,0,(chapter.exit[1]+.5)*TILE-.8);this.root.add(this.gent);}
  this.optimizeStatic();this.createGates();this.view.visible=true;this.combatEffects=new CombatEffects(this.root);
 }
 blocked(x,z,r){return propsBlock(this.obstacles,x,z,r);}
 clearWalkPath(a,b){const len=Math.hypot(b.x-a.x,b.z-a.z);for(let t=.3;t<len;t+=.45)if(this.blocked(a.x+(b.x-a.x)*t/len,a.z+(b.z-a.z)*t/len,.38))return false;return true;}
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
 syncGates(stage,immediate=false){for(const g of this.gates){const open=stage>=g.requires;g.obstacle.active=!open;g.target=open?3.18:0;g.lampMaterial.color.setHex(open?0x77ad94:0xbc5038);if(immediate)g.shutter.position.y=g.target;}}
 dressDirectedRooms(chapter){
  const p=this.palette,yellow=this.theme==='backrooms',rnd=seeded(970+chapter.number.length);
  const fabric=material(yellow?0x746449:0x40544c);fabric.map=this.procedural('fabric');
  const screen=canvasTexture((ctx,n)=>{ctx.fillStyle='#071919';ctx.fillRect(0,0,n,n);ctx.fillStyle='#709b8a';ctx.font='24px monospace';['SMITHSON VALLEY','QUARANTINE / 03:04','NETWORK FAILURE','','ROOM 204: ONLINE','REMEMBER EVERY NAME'].forEach((t,i)=>ctx.fillText(t,20,55+i*48));for(let y=0;y<n;y+=4){ctx.fillStyle='#0005';ctx.fillRect(0,y,n,1);}});
  const glow=new T.MeshBasicMaterial({map:screen}),water=new T.MeshStandardMaterial({color:0x1a383e,roughness:.09,metalness:.7,transparent:true,opacity:.72});
  const chalk=material(0xffffff,.98);chalk.map=canvasTexture((ctx,n)=>{ctx.fillStyle='#172721';ctx.fillRect(0,0,n,n);ctx.strokeStyle='#b4c6b155';ctx.lineWidth=2;ctx.font='18px Georgia';ctx.fillStyle='#c0c9b1aa';ctx.fillText('SMITHSON VALLEY  /  NIGHT SHIFT',25,43);ctx.fillText('NETWORK OFFLINE',25,93);ctx.fillText('HALL  -  03:04',25,390);for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(25,125+i*25);ctx.lineTo(205+(i%3)*35,125+i*25);ctx.stroke();}ctx.strokeRect(320,120,115,140);ctx.strokeRect(350,260,70,70);ctx.beginPath();ctx.moveTo(375,135);ctx.lineTo(375,230);ctx.lineTo(435,230);ctx.stroke();ctx.fillText('204',350,185);ctx.fillText('KEEP DOOR CLOSED',275,435);});
  const bed=(x,z)=>this.prop(x,z,1.0,2.1,.85,g=>{mesh(BOX,p.metal,[.95,.12,2],[0,.58,0],g);mesh(BOX,fabric,[.84,.16,1.85],[0,.72,0],g);mesh(BOX,p.paper,[.7,.14,.4],[0,.88,-.68],g);for(const dx of[-.4,.4])for(const dz of[-.84,.84])link(g,p.metal,[dx,.62,dz],[dx,.05,dz],.03);for(const dz of[-.95,.95])link(g,p.metal,[-.45,1,dz],[.45,1,dz],.035);});
  const shelf=(x,z)=>this.prop(x,z,1.4,.6,2.3,g=>{for(const dx of[-.67,.67])mesh(BOX,p.metal,[.05,2.3,.6],[dx,1.15,0],g);for(let y=.2;y<2.3;y+=.5){mesh(BOX,p.metal,[1.4,.04,.6],[0,y,0],g);for(let i=0;i<4;i++)mesh(BOX,i%2?p.wood:p.paper,[.16,.26,.36],[-.45+i*.3,y+.15,0],g);}});
  const terminal=(x,z)=>this.prop(x,z,1.5,1.0,1.3,g=>{mesh(BOX,p.wood,[1.5,.09,.7],[0,.79,0],g);for(const dx of[-.65,.65])for(const dz of[-.27,.27])link(g,p.metal,[dx,.75,dz],[dx,.03,dz],.03);mesh(BOX,p.black,[.6,.42,.07],[0,1.1,-.18],g);mesh(new T.PlaneGeometry(.55,.35),glow,[1,1,1],[0,1.1,-.138],g);mesh(BOX,p.black,[.45,.025,.17],[0,.85,.16],g);mesh(BOX,fabric,[.48,.1,.5],[0,.47,.8],g);mesh(BOX,fabric,[.48,.45,.07],[0,.74,1],g);});
  for(const r of this.level.rooms){
   const [a,b,c,d]=r.bounds,x=(a+c+1)*TILE/2,z=(b+d+1)*TILE/2,w=(c-a+1)*TILE,depth=(d-b+1)*TILE;
   const north=b*TILE+.015,south=(d+1)*TILE-.015,left=(a+.5)*TILE,right=(c+.5)*TILE;
   this.sign(r.name.toUpperCase(),[x,2.8,north+.02],Math.min(5,w-1),.4,yellow?'#9d865d':'#bac7b6','#16231e');
   const industrial=['utility','switchgear','relay','catwalk'].includes(r.kind),patch=yellow?material(0xc5b88e,.97):this.surface('floor',industrial?0x758380:['closet','storage'].includes(r.kind)?0xb7ad98:0xb8c3b8,[w/3,depth/3],.023,industrial?.52:.38);
   if(yellow){patch.map=this.procedural('carpet');patch.map.repeat.set(w/2,depth/2);patch.bumpMap=patch.map;patch.bumpScale=.012;}
   const plane=mesh(new T.PlaneGeometry(w-.05,depth-.05),patch,[1,1,1],[x,.004,z],this.root);plane.rotation.x=-Math.PI/2;
   if(['computers','science'].includes(r.kind)){
    for(const px of[left+.6,right-.6])for(let pz=b+1;pz<d;pz+=2)terminal(px,(pz+.5)*TILE);
    mesh(BOX,p.wood,[w*.56,1.36,.07],[x,1.9,north+.04],this.root);mesh(BOX,chalk,[w*.55,1.3,.025],[x,1.9,north+.09],this.root);this.sign('EVACUATION →',[x+1.7,2.65,north+.09],1.3,.17,'#bac2ad');
    if(r.kind==='science')for(let i=0;i<6;i++){const vial=group(this.root,right-.4,.9,(b+1.3)*TILE+i*.2);mesh(CYL,p.glass,[.06,.25,.06],[0,0,0],vial);mesh(CYL,p.metal,[.063,.025,.063],[0,.14,0],vial);}
   }
   if(['closet','storage','refuge'].includes(r.kind)){
    for(let pz=b+1;pz<d;pz+=2){shelf(left+.3,(pz+.5)*TILE);shelf(right-.3,(pz+.5)*TILE);}
    for(let i=0;i<3;i++)mesh(BOX,fabric,[.7,.08,1.8],[left+2+i*.85,.04,south-1.3],this.root);
    this.sign(r.kind==='closet'?'JOEL · EARL · ANTHONY\nKEEP THE DOOR CLOSED':r.kind==='storage'?'NORTH\nTHE NEEDLE STILL KNOWS':'LANDON · LUKE\nDO NOT ANSWER THE WALLS',[x,1.5,north+.09],Math.min(3,w-1),.65,'#c2b69b');
   }
   if(['utility','switchgear','relay'].includes(r.kind)){
    for(let px=a+1;px<c;px+=2)this.prop((px+.5)*TILE,north+.65,1.2,.8,2.45,g=>{mesh(BOX,p.metal,[1.15,2.45,.65],[0,1.23,0],g);for(let j=0;j<4;j++){mesh(BOX,p.black,[.8,.13,.025],[0,.75+j*.4,.34],g);mesh(BOX,new T.MeshBasicMaterial({color:j%2?0x746844:0x759988}),[.055,.055,.026],[.35,.76+j*.4,.36],g);}for(let j=0;j<5;j++)link(g,p.black,[-.5+j*.23,2.4,0],[-.5+j*.23,3.2,0],.028);});
    for(const px of[left,right])tube(this.root,p.rust,[[px,.3,south-.5],[px,2.8,south-.5],[px,2.8,north+.2],[x,2.8,north+.2]],.07);
    if(r.kind==='relay')this.sign('ANCHOR / 03\nDO NOT LEAVE HIM BEHIND',[x,1.7,north+.09],3,.8,'#bd9180');
   }
   if(['flood','current'].includes(r.kind)){
    const flood=mesh(new T.PlaneGeometry(w-.15,depth*.72),water,[1,1,1],[x,.016,z],this.root);flood.rotation.x=-Math.PI/2;
    for(const px of[left+.25,right-.25])for(let pz=b+1;pz<d;pz+=2)this.prop(px,(pz+.5)*TILE,.6,.6,2.25,g=>{mesh(BOX,p.metal,[.55,2.2,.5],[0,1.1,0],g);mesh(BOX,p.wood,[.48,2.1,.025],[0,1.1,.27],g);for(let i=0;i<4;i++)mesh(BOX,p.black,[.3,.02,.02],[0,1.9-i*.1,.285],g);mesh(BOX,p.metal,[.025,.12,.03],[.17,1.1,.3],g);});
    this.sign(r.kind==='current'?'CURRENT → NORTH → HOME':'HIGH WATER / KEEP RIGHT',[x,2.2,north+.09],3,.45,'#bbba91');
    for(let i=0;i<12;i++)this.decal('hand',[i%2?left-1.1:right+1.1,1+i%3*.15,north+1+i*.4],.6,false,i%2?-Math.PI/2:Math.PI/2);
   }
   if(['triage','infirmary'].includes(r.kind)){
    for(const px of[left+.6,right-.6])for(let pz=b+1;pz<d;pz+=2)bed(px,(pz+.5)*TILE);
    for(let i=0;i<4;i++)this.sign(['ZEBENE MARTINE','EARL BRITT','CALEN / BENNY','JOEL HONEYCUTT'][i],[left-.98,2,(b+1+i)*TILE],1.6,.2,'#c2b99d',null,Math.PI/2);
    this.sign('SERUM MASKS THE SIGNAL\nIT DOES NOT CURE THE PATIENT',[x,1.7,north+.09],3,.75,'#bd9180');
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
    this.sign('LUKE?', [x,1.8,north+.09],2,.5,'#693d30');for(let i=0;i<5;i++)this.prop(left+2+i*1.2,south-.8,.85,.75,1,g=>{mesh(BOX,fabric,[.75,.1,.65],[0,.5,0],g);mesh(BOX,fabric,[.75,.65,.07],[0,.82,-.27],g);for(const dx of[-.3,.3])for(const dz of[-.25,.25])link(g,p.wood,[dx,.5,dz],[dx,.03,dz],.03);});
    this.decal('blood',[x,.016,z],2.5,true);
   }
   if(['assembly','seal','finale'].includes(r.kind)){
    for(let i=0;i<3;i++){const ring=mesh(new T.TorusGeometry(1.3+i*.55,.025,8,64),p.metal,[1,1,1],[x,.03+i*.005,z],this.root);ring.rotation.x=-Math.PI/2;}
    if(r.kind==='assembly')for(let i=0;i<7;i++){const px=left-.65;mesh(BOX,p.wood,[.65,.12,.4],[px,1.1,north+1+i*.9],this.root);mesh(CYL,p.bone,[.09,.5,.09],[px,1.4,north+1+i*.9],this.root);mesh(SPHERE,p.bone,[.15,.12,.15],[px,1.66,north+1+i*.9],this.root);}
    if(r.kind==='finale')for(const px of[left-1.1,right+1.1])for(let i=0;i<14;i++){tube(this.root,p.blood,[[px,.1,north+i*.8],[px+.15,1.4,north+i*.8+.3],[px-.1,2.8,north+i*.8+.5]],.04+i%3*.012);}
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
   const px=(x+.5)*TILE+nx*(TILE/2+.025),pz=(z+.5)*TILE+nz*(TILE/2+.025),rot=Math.atan2(nx,nz),k=Math.abs(x*37+z*19+nx*3+nz);
   const at=(y,depth=0)=>[px+nx*depth,y,pz+nz*depth];
   if(k%5===0){const o=mesh(new T.PlaneGeometry(TILE,.55),chipped,[1,1,1],at(.38,.002),this.root);o.rotation.y=rot;this.decal('stain',at(.8,.007),1.4,false,rot);}
   if(k%13===0){const g=group(this.root,...at(0,.045));g.rotation.y=rot;
    if(!yellow){mesh(BOX,p.black,[1.7,1.47,.04],[0,1.95,0],g);mesh(BOX,glass,[1.56,1.32,.025],[0,1.95,.03],g);for(const dx of[-.82,0,.82])mesh(BOX,p.metal,[.045,1.48,.09],[dx,1.95,.06],g);for(const y of[1.23,1.97,2.68])mesh(BOX,p.metal,[1.7,.04,.09],[0,y,.06],g);mesh(BOX,p.wood,[1.87,.065,.19],[0,1.19,.09],g);
     tube(g,p.black,[[-.35,2.59,.085],[-.12,2.28,.085],[-.18,2.09,.085],[.17,1.93,.085]],.003);tube(g,p.black,[[-.12,2.28,.086],[.17,2.4,.086],[.4,2.37,.086]],.002);
    }else{mesh(BOX,p.wood,[.8,.9,.03],[0,1.65,0],g);mesh(BOX,p.black,[.7,.8,.012],[0,1.65,.021],g);const paper=mesh(new T.PlaneGeometry(.55,.62),p.paper,[1,1,1],[0,1.65,.031],g);paper.rotation.z=.06;}
    mergeParts(g);
   }
   if(k%11===0){const g=group(this.root,...at(0,.026));g.rotation.y=rot;link(g,p.metal,[.6,.15,0],[.6,2.95,0],.018);mesh(BOX,p.black,[.13,.19,.055],[.6,.89,.035],g);for(const dx of[.575,.625])mesh(BOX,p.bone,[.011,.035,.008],[dx,.9,.068],g);mergeParts(g);}
   if(k%17===0&&!yellow){const g=group(this.root,...at(0,.04));g.rotation.y=rot;for(let i=0;i<10;i++)mesh(BOX,p.metal,[.055,.51,.12],[-.4+i*.085,.42,.08],g);for(const y of[.21,.63])link(g,p.rust,[-.52,y,.09],[.49,y,.09],.023);mergeParts(g);}
   if(k%9===0)this.decal('hand',at(1.25,.011),.38,false,rot);
   if(k%19===0){const g=group(this.root,...at(0));g.rotation.y=rot;tube(g,p.black,[[-.7,3.2,.18],[-.25,2.72,.22],[.3,2.9,.21],[.7,3.2,.18]],.01);mergeParts(g);}
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
 character(kind,color){
  const human=kind==='npc'||kind==='player',player=kind==='player',gent=kind==='gentleman',bare=['zsiga','jakob','zeb'].includes(kind);
  const skin=human?material(0xc2a68c,.78):this.surface('skin',kind==='zsiga'?0x899b94:kind==='zeb'?0x889173:0xadb3a0,[2,2],.006,.68);
  const cloth=material(color??(player?0x495b43:0x46574f),.96);cloth.map=this.procedural('fabric');cloth.bumpMap=cloth.map;cloth.bumpScale=.0015;
  const dark=material(0x272c29,.91),bone=material(0xaaa08a,.73),raw=material(0x542522,.38);dark.map=this.procedural('fabric');dark.bumpMap=dark.map;dark.bumpScale=.002;
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
   if(kind==='jakob'){const extra=group(body,.11,-.08,.17);mesh(SPHERE,skin,[.075,.11,.062],[0,0,0],extra);for(const side of[-1,1])mesh(SPHERE,dark,[.013,.018,.009],[side*.028,.024,.056],extra);mesh(SPHERE,raw,[.028,.031,.009],[0,-.035,.06],extra);mergeParts(extra);}
   if(kind==='zeb')for(let i=0;i<15;i++){const a=i*2.4;mesh(SPHERE,i%3?skin:raw,[.035,.065,.028],[Math.cos(a)*.31,Math.sin(a)*.19+.12,Math.sin(a)*.22],body);}
  }else if(!gent){
   const shape=new T.Shape();shape.moveTo(-.025,.11);shape.lineTo(.045,.08);shape.lineTo(.031,.027);shape.lineTo(.05,-.058);shape.lineTo(.012,-.115);shape.lineTo(-.038,-.065);shape.lineTo(-.045,.03);shape.closePath();const wound=mesh(new T.ShapeGeometry(shape),raw,[1,1,1],[-.12,.19,.157],body);wound.rotation.z=-.15;
  }
  if(kind==='birdy'){
   g.clear();const center=group(g,0,1.5,0);mesh(SPHERE,dark,[.12,.22,.12],[0,0,0],center);
   const glow=new T.MeshStandardMaterial({color:0xbd3b22,emissive:0xc74022,emissiveIntensity:1.3,roughness:.2});mesh(SPHERE,glow,[.077,.11,.084],[0,.04,.085],center);
   for(const side of[-1,1])for(let i=0;i<5;i++)tube(center,bone,[[side*.025,.13-i*.08,.06],[side*(.18+i*.025),.08-i*.07,.03],[side*.26,-.05-i*.07,-.07]],.015);
   const limbs=[];for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const limb=group(center);tube(limb,raw,[[Math.cos(a)*.1,Math.sin(a)*.2,0],[Math.cos(a)*.5,Math.sin(a)*.6,-.04],[Math.cos(a)*.85,Math.sin(a)*.75,.17]],.016);link(limb,bone,[Math.cos(a)*.85,Math.sin(a)*.75,.17],[Math.cos(a)*.95,Math.sin(a)*.88,.34],.009);limbs.push(limb);mergeParts(limb);}
   g.add(new T.PointLight(0xbb2919,3.5,5,2));g.userData.tendrils=limbs;mergeParts(center);
  }
  if(!human&&!gent&&kind!=='birdy'){
   const skull=head.children[0];for(const o of[...head.children])if(o!==skull&&o!==jaw){head.remove(o);if(o.geometry&&!SHARED.has(o.geometry))o.geometry.dispose();}jaw.clear();
   const face=new T.SphereGeometry(1,32,28),a=face.getAttribute('position'),uv=face.getAttribute('uv');
   for(let i=0;i<a.count;i++){const x=a.getX(i)*.172,y=a.getY(i)*.225;let z=a.getZ(i)*.149;if(z>0)z+=.02*Math.exp(-((x/.038)**2)-((y+.02)/.05)**2);a.setXYZ(i,x,y,z);uv.setXY(i,x/.39+.5,y/.47+.5);}face.computeVertexNormals();
   const faceMat=new T.MeshStandardMaterial({map:this.assets.face,color:kind==='zsiga'?0x9daba2:0xb5ac98,roughness:.89});
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
   const faceMat=new T.MeshStandardMaterial({map:player?this.assets.ethan:this.assets.survivor,roughness:.86});
   faceMat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHeadPos;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHeadPos = position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHeadPos;').replace('#include <map_fragment>','vec4 faceColor = texture2D(map, vMapUv); float frontBlend = smoothstep(-0.015, 0.065, vHeadPos.z); vec3 baseSkin = vec3(0.53,0.38,0.27); diffuseColor.rgb *= mix(baseSkin, faceColor.rgb, faceColor.a * frontBlend);');
   };
   const closed=a.array.slice(),open=closed.slice();for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),w=Math.exp(-((x/.075)**2))*Math.max(0,Math.min(1,(-y-.06)/.08))*Math.max(0,Math.min(1,z/.08));open[i*3+1]-=.022*w;open[i*3+2]+=.004*w;}face.morphAttributes.position=[new T.Float32BufferAttribute(open,3)];
   const facial=mesh(face,faceMat,[1,1,1],[0,.018,0],head);g.userData.face=facial;
   const hairMap=canvasTexture((ctx,s)=>{ctx.fillStyle=player?'#8a7042':'#302a22';ctx.fillRect(0,0,s,s);const rnd=seeded(193);for(let i=0;i<9000;i++){ctx.strokeStyle=player?i%2?'#c5a46c55':'#40382b55':i%2?'#71604445':'#0f121145';ctx.lineWidth=.6+rnd();const x=rnd()*s,y=rnd()*s;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+9,y+3,x+5,y+14);ctx.stroke();}});
   const cap=material(0xffffff,.91);cap.map=hairMap;mesh(new T.SphereGeometry(.167,32,20,0,Math.PI*2,0,Math.PI*.57),cap,[1,.82,.94],[0,.09,-.027],head);
   for(let i=0;i<96;i++){const theta=i*2.4,phi=.13+(i%16)/16*1.50,cx=Math.sin(phi)*Math.cos(theta)*.165,cy=.09+Math.cos(phi)*.142,cz=Math.sin(phi)*Math.sin(theta)*.157-.027,points=[];for(let k=0;k<7;k++){const angle=k/6*Math.PI*1.5;points.push([cx+Math.cos(angle)*.012,cy+Math.sin(angle)*.013,cz+Math.sin(angle+.5)*.010]);}tube(head,cap,points,.0045);}
   head.scale.setScalar(.9);head.position.y=.6;g.userData.texturedFace=true;
   if(color===0x3e6554){tube(body,dark,[[-.1,.38,.15],[0,.04,.20],[.1,.38,.15]],.004);mesh(SPHERE,material(0xaeb4a4,.35,.7),[.035,.02,.018],[0,.04,.22],body);}
  }

  if(gent){mesh(CYL,dark,[.18,.28,.18],[0,.30,-.015],head);mesh(CYL,dark,[.29,.023,.24],[0,.18,0],head);g.scale.y=1.55;mesh(SPHERE,material(0xb0b6a3,.94),[.15,.21,.14],[0,.02,0],head);for(const side of[-1,1]){mesh(SPHERE,dark,[.04,.029,.018],[side*.055,.045,.127],head);mesh(SPHERE,material(0xd0cba4,.21),[.006,.006,.004],[side*.055,.04,.146],head);}tube(head,dark,[[-.092,-.055,.116],[-.055,-.096,.14],[0,-.116,.144],[.055,-.096,.14],[.092,-.055,.116]],.006);for(let i=0;i<9;i++)mesh(SPHERE,bone,[.004,.008,.006],[(i-4)*.014,-.11+Math.abs(i-4)*.006,.144],head);}
  if(BODY_SCALE[kind]){const[w,h]=BODY_SCALE[kind];g.scale.set(w,h,w);}
  mergeParts(body);mergeParts(head);mergeParts(jaw);return g;
 }
 animateCharacter(g,t,moving,mood={}){
  const kind=g.userData.kind,phase=g.userData.phase||0;if(mood.dead){animateCollapse(g,mood.deathTime||0);return;}
  g.userData.body.rotation.set(0,0,0);g.userData.head.rotation.set(0,0,0);if(g.userData.face)g.userData.face.morphTargetInfluences[0]=0;
  if(kind==='birdy'){g.position.y=Math.sin(t*1.7)*.19;g.rotation.z=Math.sin(t*.7)*.1;g.userData.tendrils?.forEach((a,i)=>a.rotation.z=Math.sin(t*1.5+i)*.06);return;}
  if(kind==='zsiga'){g.position.y=.04+Math.sin(t*1.5+phase)*.035;g.rotation.z=Math.sin(t*.9+phase)*.018;}
  const stride=kind==='runner'||kind==='chris'?7.5:kind==='zeb'?3:4.6;
  g.userData.legs?.forEach((leg,i)=>{leg.rotation.x=moving&&kind!=='zsiga'?Math.sin(t*stride+phase+i*Math.PI)*.30:0;if(leg.userData.calf)leg.userData.calf.rotation.x=moving?Math.max(0,-Math.sin(t*stride+phase+i*Math.PI))*.42:0;});
  g.userData.arms?.forEach((arm,i)=>{arm.rotation.x=arm.userData.base+(moving?Math.sin(t*stride*.7+i*2+phase)*.12:Math.sin(t*.65+i)*.025);if(arm.userData.forearm)arm.userData.forearm.rotation.x=arm.userData.forearm.userData.base;});
  g.userData.body.position.y=1.02+Math.sin(t*1.5+phase)*.004;
  if(!g.userData.human){g.userData.body.rotation.x=kind==='zeb'?.10:.15+(mood.stagger>0?-.24:0);g.userData.head.position.z=.025+(moving?.012:0);if(mood.windup>0)g.userData.arms.forEach((a,i)=>a.rotation.x=-1.15+Math.sin(t*6+i)*.08);g.userData.head.rotation.x=-.08+Math.sin(t*.8+phase)*.055;g.userData.head.rotation.z=Math.sin(t*1.4+phase)*.09+(kind==='chris'?-.17:0);g.userData.jaw.rotation.x=.07+Math.max(0,Math.sin(t*1.8+phase))*.22;g.userData.body.rotation.z=moving?Math.sin(t*stride+phase)*.028:0;g.userData.head.rotation.y=Math.sin(t*.5+phase)*.065;
   if(g.userData.face)g.userData.face.morphTargetInfluences[0]=mood.windup>0?.9:.25+Math.max(0,Math.sin(t*1.8+phase))*.35;
   if(mood.stagger>0){g.userData.body.rotation.z=(mood.hitSide||1)*Math.min(.19,mood.stagger*.6);g.userData.head.rotation.x-=mood.stagger*.3;}if(mood.strike>0)g.userData.arms.forEach(a=>a.rotation.x=-.8-mood.strike*1.3);}
 }
 createWeapon(){
  this.viewScene=new T.Scene();this.viewCamera=new T.PerspectiveCamera(62,1,.01,8);this.view=group(this.viewScene);this.view.scale.setScalar(.82);
  const faces=[];for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),d=ctx.createLinearGradient(0,0,0,64);d.addColorStop(0,'#c2cfc8');d.addColorStop(.25,'#536f72');d.addColorStop(.5,'#172b2d');d.addColorStop(.75,'#839486');d.addColorStop(1,'#141b17');ctx.fillStyle=d;ctx.fillRect(0,0,64,64);faces.push(c);}const env=new T.CubeTexture(faces);env.needsUpdate=true;env.colorSpace=T.SRGBColorSpace;this.viewScene.environment=env;this.viewScene.environmentIntensity=.55;
  this.viewScene.add(new T.HemisphereLight(0xf3e1c6,0x293a3c,1.4));const key=new T.DirectionalLight(0xe1e7db,3);key.position.set(-1,3,2);this.viewScene.add(key);const rim=new T.DirectionalLight(0x86afbd,1.1);rim.position.set(2,0,-2);this.viewScene.add(rim);
  const metal=material(0x424c4e,.3,.78),steel=material(0x6d7775,.27,.72),dark=material(0x111818,.47,.25),rubber=material(0x1f2624,.92),skin=material(0xba9e7d,.84),sleeve=material(0x3d4a3b,.94);
  sleeve.map=this.procedural('fabric');const noise=this.procedural('fabric');metal.bumpMap=noise;metal.bumpScale=.002;
  this.gun=group(this.view);this.slide=group(this.gun,0,.05,-.18);
  mesh(bevelBox(.086,.075,.32,.005),metal,[1,1,1],[0,0,0],this.slide);mesh(bevelBox(.073,.009,.31,.001),steel,[1,1,1],[0,.04,0],this.slide);
  mesh(BOX,dark,[.025,.028,.065],[.044,.012,.053],this.slide);mesh(BOX,steel,[.012,.018,.048],[.045,.014,.064],this.slide);
  for(const side of[-1,1])for(let i=0;i<9;i++)mesh(BOX,dark,[.003,.038,.002],[side*.044,-.006,.077+i*.006],this.slide);
  const sights=new T.MeshBasicMaterial({color:0xb4c6b6});mesh(BOX,dark,[.021,.024,.018],[0,.056,-.145],this.slide);mesh(BOX,sights,[.008,.006,.003],[0,.063,-.134],this.slide);
  for(const side of[-1,1]){mesh(BOX,dark,[.018,.027,.016],[side*.026,.055,.118],this.slide);mesh(BOX,sights,[.006,.005,.003],[side*.026,.061,.129],this.slide);}
  mesh(CYL,steel,[.018,.24,.018],[0,.02,-.235],this.gun).rotation.x=Math.PI/2;
  mesh(bevelBox(.021,.025,.018,.002),metal,[1,1,1],[0,.074,.003],this.gun);
  mesh(new T.TorusGeometry(.021,.003,6,20),steel,[1,1,1],[0,.02,-.354],this.gun);mesh(new T.CircleGeometry(.016,20),dark,[1,1,1],[0,.02,-.357],this.gun).rotation.y=Math.PI;
  mesh(bevelBox(.075,.043,.26,.004),dark,[1,1,1],[0,-.012,-.16],this.gun);
  const grip=group(this.gun,0,-.116,-.02);grip.rotation.x=-.18;mesh(bevelBox(.075,.16,.075,.008),rubber,[1,1,1],[0,0,0],grip);this.magazine=group(grip,0,-.06,0);mesh(bevelBox(.061,.10,.06,.002),steel,[1,1,1],[0,0,0],this.magazine);mesh(bevelBox(.078,.01,.079,.002),steel,[1,1,1],[0,-.03,0],this.magazine);
  for(const side of[-1,1]){
   mesh(BOX,dark,[.008,.13,.067],[side*.041,0,0],grip);for(let i=0;i<12;i++)link(grip,metal,[side*.046,-.06+i*.01,-.024],[side*.046,-.054+i*.01,.023],.0014);
   for(const y of[-.05,.05])mesh(CYL,steel,[.005,.004,.005],[side*.046,y,0],grip).rotation.z=Math.PI/2;
  }
  tube(this.gun,metal,[[-.031,-.035,-.11],[-.033,-.093,-.14],[0,-.116,-.13],[.033,-.093,-.14],[.031,-.035,-.11]],.007);
  tube(this.gun,dark,[[0,-.036,-.1],[0,-.068,-.112],[0,-.081,-.101]],.004);
  for(const side of[-1,1]){mesh(CYL,steel,[.008,.005,.008],[side*.046,-.026,-.04],this.gun).rotation.z=Math.PI/2;mesh(BOX,steel,[.009,.012,.039],[side*.045,-.005,-.063],this.gun);}
  this.hands=group(this.view);
  link(this.hands,sleeve,[.2,-.45,.18],[.065,-.22,.035],.077);link(this.hands,skin,[.066,-.21,.035],[.045,-.144,.002],.051);
  link(this.hands,sleeve,[-.23,-.44,.11],[-.083,-.215,-.04],.070);link(this.hands,skin,[-.081,-.21,-.04],[-.045,-.145,-.046],.047);
  for(const side of[-1,1]){
   mesh(SPHERE,skin,[.041,.068,.031],[side*.039,-.135,-.031],this.hands);
   for(let i=0;i<4;i++)tube(this.hands,skin,[[side*.051,-.10-i*.023,-.052],[side*.021,-.105-i*.023,-.073],[-side*.012,-.106-i*.023,-.056]],.01);
  }
  tube(this.hands,skin,[[-.05,-.105,-.035],[-.04,-.08,-.027],[-.012,-.073,-.046]],.014);
  const flashMap=canvasTexture((ctx,s)=>{const d=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s*.5);d.addColorStop(0,'#fffff0');d.addColorStop(.12,'#ffe9b8');d.addColorStop(.32,'#ffaa4433');d.addColorStop(1,'#ff991100');ctx.fillStyle=d;ctx.fillRect(0,0,s,s);},128);
  this.muzzle=mesh(new T.PlaneGeometry(.19,.19),new T.MeshBasicMaterial({map:flashMap,transparent:true,blending:T.AdditiveBlending,depthWrite:false}),[1,1,1],[0,.02,-.38],this.gun);this.muzzle.visible=false;
  // Keep the light in the scene when the gun is hidden for a knife swing. A
  // changing light count would invalidate every lit weapon material's shader.
  this.viewFlash=new T.PointLight(0xffc879,0,2,2);this.viewFlash.position.set(0,.06,-.4);this.viewScene.add(this.viewFlash);
  this.knife=group(this.viewScene,.31,-.33,-.52);const blade=material(0x9ca9a2,.23,.84);
  mesh(BOX,rubber,[.042,.15,.033],[0,-.07,0],this.knife);mesh(BOX,steel,[.095,.013,.025],[0,.013,0],this.knife);mesh(BOX,blade,[.046,.20,.008],[0,.12,0],this.knife);mesh(new T.ConeGeometry(.024,.085,3),blade,[1,1,.18],[0,.26,0],this.knife);this.knife.visible=false;
  mergeParts(this.slide);mergeParts(grip);mergeParts(this.gun);mergeParts(this.hands);mergeParts(this.knife);
  this.flashTimer=0;this.knifeTimer=0;
 }
 fireWeapon(aiming=false){this.recoil=Math.min(1.6,this.recoil+(aiming?.7:1));this.flashTimer=.065;}
 ejectCasing(origin,yaw){this.combatEffects?.eject(origin,yaw);}
 swingKnife(){this.knifeTimer=.46;}
 prepareCombat(){
  // Upload and render both weapons, the muzzle flash and both effect batches
  // offscreen during chapter loading, before the player can attack.
  const target=this.renderer.getRenderTarget(),autoClear=this.renderer.autoClear;
  const gun=this.view.visible,knife=this.knife.visible,muzzle=this.muzzle.visible;
  const particles=this.combatEffects.particles.count,tracers=this.combatEffects.tracers.geometry.drawRange.count,casings=this.combatEffects.casings.count;
  const hidden=[],culling=[];this.root?.traverse(o=>{if(o.userData?.kind){if(!o.visible){hidden.push(o);o.visible=true;}o.traverse(m=>{if(m.isMesh){culling.push([m,m.frustumCulled]);m.frustumCulled=false;}});}});
  const warm=new T.WebGLRenderTarget(16,16);
  try{
   this.renderer.setRenderTarget(warm);this.renderer.autoClear=true;
   this.combatEffects.particles.count=1;this.combatEffects.casings.count=1;this.combatEffects.tracers.geometry.setDrawRange(0,2);
   this.renderer.render(this.scene,this.camera);
   this.view.visible=this.knife.visible=this.muzzle.visible=true;
   this.renderer.render(this.viewScene,this.viewCamera);
  }finally{
   this.combatEffects.particles.count=particles;this.combatEffects.casings.count=casings;this.combatEffects.tracers.geometry.setDrawRange(0,tracers);
   this.view.visible=gun;this.knife.visible=knife;this.muzzle.visible=muzzle;
   for(const o of hidden)o.visible=false;for(const[o,value]of culling)o.frustumCulled=value;this.renderer.setRenderTarget(target);this.renderer.autoClear=autoClear;warm.dispose();
  }
 }
 setView(p,yaw,pitch,t,ads=false){
  this.yaw=yaw;this.pitch=pitch;const bob=this.settings.motion?0:Math.sin(this.walk*8)*.021;
  const eye=p.crouching?1.14:EYE_HEIGHT;this.camera.position.set(p.x,eye+bob,p.z);
  this.camera.rotation.set(pitch,yaw,0,'YXZ');this.currentAds=ads;
 }
 updateWeapon(dt,t,p){
  const blend=1-Math.exp(-dt*12);this.ads+=(Number(!!this.currentAds)-this.ads)*blend;
  this.recoil*=Math.exp(-dt*17);this.flashTimer=Math.max(0,this.flashTimer-dt);this.knifeTimer=Math.max(0,this.knifeTimer-dt);
  const bob=this.settings.motion?0:Math.sin(this.walk*8)*.008*(1-this.ads),progress=reloadProgress(p),reload=p.reloading>0?Math.sin(progress*Math.PI):0;
  this.view.position.set(.255*(1-this.ads)*Math.min(1,this.camera.aspect/1.3),-.235+.142*this.ads+bob-reload*.17-(p.sprinting?.075:0),-.52+.1*this.ads+this.recoil*.075);
  this.view.rotation.set(this.recoil*.17-reload*.35,.18*(1-this.ads),-reload*.5+(this.settings.motion?0:Math.sin(this.walk*4)*.012)*(1-this.ads));
  const eject=p.reloading>0?progress<.18?Math.max(0,(progress-.12)/.06):progress<.48?1:Math.max(0,1-(progress-.48)/.15):0;
  this.magazine.position.set(-eject*.025,-.06-eject*.23,eject*.08);this.magazine.rotation.z=eject*-.15;
  this.slide.position.z=-.18+this.recoil*.032+(p.ammo===0&&(!p.reloading||progress<.88)?.04:0);this.muzzle.visible=this.flashTimer>0;this.muzzle.rotation.z=Math.random()*Math.PI;this.viewFlash.intensity=this.flashTimer>0?6:0;
  this.view.updateMatrixWorld(true);this.viewFlash.position.set(0,.06,-.4).applyMatrix4(this.view.matrixWorld);
  this.knife.visible=this.knifeTimer>0;this.view.visible=this.knifeTimer<=0;this.knife.rotation.z=-1.25+Math.sin((.46-this.knifeTimer)/.46*Math.PI)*2;this.knife.rotation.x=-.4;
  const fov=(this.settings.fov||76)-this.ads*17+(p.sprinting&&!this.settings.motion?3:0);if(Math.abs(this.camera.fov-fov)>.01){this.camera.fov+=(fov-this.camera.fov)*blend;this.camera.updateProjectionMatrix();}
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
 object(kind,x,z){
  const g=group(this.root,x,0,z),color={fuse:0xd5b36a,seal:0xd5b36a,anchor:0xd5b36a,page:0xb7d8c7,ammo:0xc2a471,med:0x79caaa,save:0x74a5ce}[kind];
  const glow=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.35,roughness:.65}),dark=this.palette.black,metal=this.palette.metal;
  if(kind==='anchor'){
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
 warning(x,z,r){const o=mesh(new T.RingGeometry(r-.12,r,48),new T.MeshBasicMaterial({color:0xd87748,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false}),[1,1,1],[x,.04,z],this.root);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;}
 update(dt,t,p,aim,shake){
  this.setView(p,p.yaw||0,p.pitch||0,t,p.aiming);if(p.moving)this.walk+=dt*(p.sprinting?1.45:1);
  if(shake&&!this.settings.motion){this.camera.position.x+=(Math.random()-.5)*shake*.05;this.camera.position.y+=(Math.random()-.5)*shake*.05;this.camera.rotation.z=(Math.random()-.5)*shake*.02;}
  const d=viewDirection(p.yaw||0,p.pitch||0);this.flashlight.position.copy(this.camera.position);this.flashlight.position.y-=.1;this.flashlight.target.position.copy(this.camera.position).add(new T.Vector3(d.x,d.y,d.z).multiplyScalar(12));this.flashlight.intensity=this.settings.flashlight===false?0:115;
  this.playerLight.position.copy(this.camera.position);this.shotLight.position.copy(this.camera.position);this.shotLight.intensity=this.flashTimer>0?28:0;
  for(const g of this.gates)g.shutter.position.y+=(g.target-g.shutter.position.y)*Math.min(1,dt*3.5);
  const dark=t<this.blackoutUntil;const lamps=[...this.lamps].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  this.lightPool.forEach((l,i)=>{const v=lamps[i];if(!v)return;l.position.set(v.x,CEILING-.33,v.z);l.color.set(v.color);l.intensity=(dark?0:v.base)*(Math.sin(t*1.3+v.offset)>-.995?1:.12);});
  if(this.dust)this.dust.position.y=Math.sin(t*.13)*.08;if(this.portal){this.portal.rotation.z=t*.14;this.portal.material.color.setHSL(.025,.6,.36+Math.sin(t)*.06);}
  for(const o of this.mist){o.quaternion.copy(this.camera.quaternion);o.material.opacity=.13+Math.sin(t+o.position.y)*.06;}
  this.combatEffects?.update(dt);
  this.updateWeapon(dt,t,p);this.renderer.autoClear=true;this.renderer.render(this.scene,this.camera);this.worldCalls=this.renderer.info.render.calls;
  this.renderer.autoClear=false;this.renderer.clearDepth();this.renderer.render(this.viewScene,this.viewCamera);this.worldCalls+=this.renderer.info.render.calls;
 }
}
