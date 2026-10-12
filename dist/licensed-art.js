import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone} from './vendor/SkeletonUtils.js';

export const LICENSED_MATERIALS=['beige_wall_001','damaged_plaster','floor_tiles_06','old_linoleum_flooring_01','painted_plaster_wall'];
export const LICENSED_PROPS=['utility_box_01','metal_office_desk','fire_alarm','security_camera_01'];
const asset=(id,file)=>new URL('./assets/licensed/'+id+'/'+file,import.meta.url).href;
export async function loadLicensedArt(resources){
 const materials=new Map(),props=new Map(),textureLoader=new T.TextureLoader(),loader=new GLTFLoader();
 const track=o=>o.traverse(node=>{if(node.geometry)resources.add(node.geometry);for(const m of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){resources.add(m);for(const value of Object.values(m))if(value?.isTexture){value.anisotropy=8;resources.add(value);}}});
 await Promise.all([...LICENSED_MATERIALS.map(async id=>{const maps=await Promise.all(['color','normal','rough'].map(async name=>{const t=await textureLoader.loadAsync(asset(id,name+'.jpg'));t.colorSpace=name==='color'?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;resources.add(t);return t;}));materials.set(id,{color:maps[0],normal:maps[1],rough:maps[2]});}),...LICENSED_PROPS.map(async id=>{const gltf=await loader.loadAsync(asset(id,'model.gltf'));gltf.scene.updateMatrixWorld(true);track(gltf.scene);props.set(id,gltf.scene);})]);
 const character=await loader.loadAsync(asset('city-zombie','model.glb'));track(character.scene);
 const library={materials,props,character};library.head=extractArtistHead(character.scene);resources.add(library.head.geometry);return library;
}

export function extractArtistHead(scene){
 let skin;const extract=match=>{const position=[],normal=[],uv=[],indices=[];scene.traverse(mesh=>{if(!mesh.geometry||!match(mesh.material.name||''))return;if(mesh.material.name.includes('Body'))skin=mesh.material;const geo=mesh.geometry,p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv,lookup=new Map();for(let i=0;i<geo.index.count;i+=3){const ids=[0,1,2].map(k=>geo.index.getX(i+k));if(ids.some(id=>p.getY(id)<1.49||Math.abs(p.getX(id))>.16))continue;for(const id of ids){if(!lookup.has(id)){lookup.set(id,position.length/3);position.push(p.getX(id),p.getY(id)-1.65,p.getZ(id));normal.push(n.getX(id),n.getY(id),n.getZ(id));uv.push(u.getX(id),u.getY(id));}indices.push(lookup.get(id));}}});const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();g.userData.artist='Rikindle3D';return g;};
 const geometry=extract(name=>name.includes('Body')),detailGeometry=extract(name=>name==='artist detail');return {geometry,detailGeometry,material:skin};
}

export function artistHead(library,id){
 const scale=id==='zeb'?[1.72,1.6,1.45]:id==='birdy'?[1.36,1.65,1.2]:id==='bobby'?[1.5,1.5,1.27]:id==='chris'?[1.62,1.44,1.35]:[1.35,1.50,1.25],shape=source=>{const g=source.clone(),p=g.attributes.position;for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(id==='birdy')x*=1-.1*Math.exp(-((y/.08)**2));if(id==='chris')x+=.009*Math.exp(-(((y+.065)/.06)**2));p.setXYZ(i,x*scale[0],y*scale[1],z*scale[2]);}g.computeVertexNormals();g.computeBoundingSphere();const open=p.array.slice();for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),w=Math.max(0,Math.min(1,(-y-.06)/.12))*Math.max(0,Math.min(1,z/.08));open[i*3+1]-=.05*w;}g.morphAttributes.position=[new T.Float32BufferAttribute(open,3)];return g;};
 const mat=library.head.material.clone();mat.color.setHex(id==='zeb'?0x756353:0xd4c7b0);mat.roughness=.82;mat.normalScale.set(.35,.35);mat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat fleshLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(fleshLuma),diffuseColor.rgb,.52);');};mat.customProgramCacheKey=()=> 'artist-infected-head';const mesh=new T.Mesh(shape(library.head.geometry),mat);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.artist='Rikindle3D';const details=new T.Mesh(shape(library.head.detailGeometry),new T.MeshStandardMaterial({color:0xa2a093,roughness:.62}));details.castShadow=details.receiveShadow=true;mesh.add(details);mesh.userData.artistDetail=details;return mesh;
}

export function photographedMaterial(bundle,repeat=[1,1],color=0xffffff,world=false){
 const maps=Object.fromEntries(Object.entries(bundle).map(([key,t])=>{const map=t.clone();map.repeat.set(...repeat);map.needsUpdate=true;return [key,map];}));
 const material=new T.MeshStandardMaterial({color,map:maps.color,normalMap:maps.normal,normalScale:new T.Vector2(.55,.55),roughnessMap:maps.rough,roughness:.88});
 if(world){
  material.onBeforeCompile=s=>{
   s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 photoPosition;varying vec3 photoNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nphotoPosition=position;photoNormal=normal;\n#ifdef USE_INSTANCING\nphotoPosition=(instanceMatrix*vec4(photoPosition,1.)).xyz;\n#endif\nphotoPosition=(modelMatrix*vec4(photoPosition,1.)).xyz;');
   s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 photoPosition;varying vec3 photoNormal;');
   s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec3 photoWeight=pow(abs(normalize(photoNormal)),vec3(6.));photoWeight/=photoWeight.x+photoWeight.y+photoWeight.z;vec2 photoX=photoPosition.zy*${repeat[0].toFixed(3)};vec2 photoY=photoPosition.xz*${repeat[0].toFixed(3)};vec2 photoZ=photoPosition.xy*${repeat[0].toFixed(3)};diffuseColor.rgb*=texture2D(map,photoX).rgb*photoWeight.x+texture2D(map,photoY).rgb*photoWeight.y+texture2D(map,photoZ).rgb*photoWeight.z;`);
   s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=roughness*(texture2D(roughnessMap,photoX).g*photoWeight.x+texture2D(roughnessMap,photoY).g*photoWeight.y+texture2D(roughnessMap,photoZ).g*photoWeight.z);');
   s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','vec3 px=texture2D(normalMap,photoX).xyz*2.-1.,py=texture2D(normalMap,photoY).xyz*2.-1.,pz=texture2D(normalMap,photoZ).xyz*2.-1.;px.xy*=normalScale;py.xy*=normalScale;pz.xy*=normalScale;vec3 photoN=normalize(vec3(px.z*sign(photoNormal.x),px.y,px.x)*photoWeight.x+vec3(py.x,py.z*sign(photoNormal.y),py.y)*photoWeight.y+vec3(pz.x,pz.y,pz.z*sign(photoNormal.z))*photoWeight.z);normal=normalize(mat3(viewMatrix)*photoN);');
  };material.customProgramCacheKey=()=> 'photographed-wall-'+repeat[0];
 }
 return material;
}

export function fittedProp(template,width,height,depth){
 const visual=clone(template),g=new T.Group(),bounds=new T.Box3().setFromObject(visual),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=Math.min(width/size.x,height/size.y,depth/size.z);visual.scale.multiplyScalar(scale);visual.position.sub(center.multiplyScalar(scale));visual.position.y+=size.y*scale/2;
 visual.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});g.add(visual);g.userData.asset=template.name;g.userData.dimensions=[size.x*scale,size.y*scale,size.z*scale];return g;
}

export function createLicensedEnemy(library,kind='walker',color){
 const root=new T.Group(),visual=clone(library.character.scene),mats=new Map();
 visual.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.frustumCulled=false;const copy=m=>{if(!mats.has(m)){const own=m.clone();if(color&&m.name.includes('Outfit'))own.color.set(color).lerp(new T.Color(0xffffff),.5);mats.set(m,own);}return mats.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);});
 root.add(visual);const find=name=>{let result;visual.traverse(o=>{if(o.isBone&&o.name.endsWith(name))result=o;});return result;},head=find('Head'),hips=find('Hips'),anchor=new T.Object3D();anchor.position.set(0,.075,0);head.add(anchor);
 const mixer=new T.AnimationMixer(visual),actions=Object.fromEntries(library.character.animations.map(c=>[c.name,mixer.clipAction(c)]));
 root.userData={kind,human:false,head:anchor,body:hips,arms:[],legs:[],licensedActor:{visual,mixer,actions,state:'',time:null},detail:'Rikindle3D artist-authored character and animation'};animateLicensedEnemy(root,0,false,{});mixer.setTime(Math.random()*actions.idle.getClip().duration);return root;
}

export function animateLicensedEnemy(root,t,moving,mood={}){
 const d=root.userData.licensedActor,dt=d.time===null?0:Math.max(0,Math.min(.1,t-d.time));d.time=t;
 const attack=!!(mood.windup>0||mood.strike>0),state=mood.dead?'death':mood.stagger>0?'hit':attack?'attack'+(['','2','3'][(mood.attackCount||0)%3]):moving?(root.userData.kind==='runner'?'run':'walk'):'idle';
 const next=d.actions[state]||d.actions.idle;if(state!==d.state){const previous=d.current;next.reset().setEffectiveWeight(1).play();next.enabled=true;next.clampWhenFinished=['death','hit'].includes(state);next.setLoop(next.clampWhenFinished?T.LoopOnce:T.LoopRepeat,Infinity);if(previous&&previous!==next){previous.fadeOut(.16);next.fadeIn(.16);}d.current=next;d.state=state;}
 if(state==='death'){next.setEffectiveTimeScale(0);next.time=Math.min(next.getClip().duration-.001,(mood.deathTime||0)/2.8*next.getClip().duration);d.mixer.update(dt);}
 else if(attack&&state.startsWith('attack')){next.setEffectiveTimeScale(0);const duration=next.getClip().duration,progress=mood.windup>0?.12+.40*(1-(mood.windup/(mood.tellDuration||.65))):.52+.32*(1-Math.min(1,(mood.strike||0)/.4));next.time=duration*progress;d.mixer.update(dt);}
 else{next.setEffectiveTimeScale(state==='run'?1.2:state==='walk'?.95:1);d.mixer.update(dt);}
 root.updateMatrixWorld(true);return root;
}

export function dressLicensedRooms(w){
 if(!w.licensed)return;
 for(const room of w.level.rooms){
  for(const [id,y,width,height,depth,kinds]of[
   ['utility_box_01',1.1,.72,1.2,.48,['utility','relay','switchgear']],
   ['fire_alarm',1.55,.19,.28,.065,['computers','science','flood','assembly','finale','refuge']],
   ['security_camera_01',2.66,.35,.36,.55,['computers','utility','storage','infirmary','finale']]
  ])if(kinds.includes(room.kind))w.wallGroup(room,{kind:'licensed '+id,width,height,y,depth},g=>{const prop=fittedProp(w.licensed.props.get(id),width,height,depth-.01),size=prop.userData.dimensions;prop.position.set(0,y-size[1]/2,depth/2);g.add(prop);});
 }
}
