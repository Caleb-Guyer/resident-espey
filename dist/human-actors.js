import * as T from './vendor/three.module.js?v=5.5.3';
import {GLTFLoader} from './vendor/GLTFLoader.js?v=5.5.3';
import {clone} from './vendor/SkeletonUtils.js?v=5.5.3';
import {poseWeight} from './story.js?v=5.5.3';

export const HUMAN_CAST=Object.freeze({ethan:'ethan',joel:'joel',hall:'hall',earl:'earl',landon:'landon',luke:'luke',paul:'landon',johnson:'hall',calen:'luke',benny:'joel'});
const asset=file=>new URL('./assets/licensed/humans/'+file,import.meta.url).href+'?v=5.5.3';
const vector=new T.Vector3(),worldQ=new T.Quaternion(),parentQ=new T.Quaternion(),offsetQ=new T.Quaternion();
const axes={x:new T.Vector3(1,0,0),y:new T.Vector3(0,1,0),z:new T.Vector3(0,0,1)};

export async function loadHumanArt(resources){
 const loader=new GLTFLoader(),avatars=new Map();
 const motion=loader.loadAsync(asset('motion.glb'));
 await Promise.all(['ethan','joel','earl','hall','landon','luke'].map(async id=>{
  const gltf=await loader.loadAsync(asset(id+'.glb'));
  gltf.scene.traverse(o=>{
   if(o.geometry)resources.add(o.geometry);
   for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){
    resources.add(m);m.envMapIntensity=.35;
    for(const value of Object.values(m))if(value?.isTexture){value.anisotropy=8;resources.add(value);}
   }
  });avatars.set(id,gltf.scene);
 }));
 const clips=prepareHumanClips(avatars,(await motion).animations);
 // The source clips share the same biped dimensions as the six avatars.
 // Keep vertical performance, but leave horizontal travel to the story path.
 return {avatars,clips,resources};
}

export function prepareHumanClips(avatars,clips){
 const source=avatars.get('ethan'),facial=new Set(),head=source.getObjectByName('Bip01_Head');head.traverse(o=>{if(o!==head)facial.add(o.name);});
 for(const clip of clips){clip.tracks=clip.tracks.filter(t=>{const name=t.name.split('.')[0];return source.getObjectByName(name)&&!facial.has(name);});for(const track of clip.tracks)if(track.name==='Bip01.position')for(let i=0;i<track.values.length;i+=3)track.values[i]=track.values[i+2]=0;}
 return clips;
}

export function createHumanActor(library,kind,identity,color){
 const id=HUMAN_CAST[identity]||'joel',root=new T.Group(),visual=clone(library.avatars.get(id)),bones=new Map(),faces=[],materials=new Map();
 let sharedSkeleton;
 visual.traverse(o=>{
  if(o.isBone)bones.set(o.name,o);
  if(!o.isMesh)return;
  o.castShadow=o.receiveShadow=true;o.frustumCulled=true;
  if(o.isSkinnedMesh){if(!sharedSkeleton)sharedSkeleton=o.skeleton;else if(o.skeleton.bones.every((b,i)=>b===sharedSkeleton.bones[i]))o.skeleton=sharedSkeleton;o.boundingSphere=new T.Sphere(new T.Vector3(0,0,.9),2.2);}
  const copy=m=>{if(!materials.has(m)){const own=m.clone();if(HUMAN_CAST[identity]!==identity&&m.name.endsWith('_body')&&color)own.color.set(color).lerp(new T.Color(0xffffff),.77);if(identity==='ethan'&&(m.name.endsWith('_head')||m.name.includes('curly_hair'))){
   const hairOnly=m.name.includes('curly_hair');if(hairOnly){own.transparent=true;own.depthWrite=false;o.castShadow=false;}
   own.onBeforeCompile=s=>{if(hairOnly){s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 hairBindPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nhairBindPosition=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 hairBindPosition;');}
   s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float actorLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
float hairRegion=${hairOnly?'1.':'0.'};
vec3 blonde=vec3(1.15,.91,.52)*pow(max(0.,actorLuma),.62)*1.45;
diffuseColor.rgb=mix(diffuseColor.rgb,blonde,hairRegion);
${hairOnly?'float forward=-hairBindPosition.y;float topFade=smoothstep(1.755,1.785,hairBindPosition.z);float sideFade=smoothstep(.073,.092,abs(hairBindPosition.x))*smoothstep(1.705,1.740,hairBindPosition.z)*(1.-smoothstep(.015,.045,forward));float backFade=(1.-smoothstep(-.060,-.032,forward))*smoothstep(1.676,1.725,hairBindPosition.z);diffuseColor.a*=max(topFade,max(sideFade,backFade));':''}
${hairOnly?'':'float iris=1.-smoothstep(.011,.017,distance(vMapUv,vec2(.264,.067)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.32,.61,.88)*actorLuma*1.55,iris*.83);'}`);};own.customProgramCacheKey=()=> 'ethan-identity-'+hairOnly;
  }materials.set(m,own);}return materials.get(m);};
  o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
  if(o.morphTargetInfluences?.length)faces.push(o);
 });root.add(visual);root.updateMatrixWorld(true);
 const bone=name=>bones.get('Bip01_'+name),headBone=bone('Head'),head=new T.Object3D(),eyes=[bone('REye'),bone('LEye')];
 eyes[0].getWorldPosition(vector);vector.add(eyes[1].getWorldPosition(new T.Vector3())).multiplyScalar(.5);head.position.copy(headBone.worldToLocal(vector));headBone.add(head);
 const arms=['R','L'].map(side=>{const arm=bone(side+'_UpperArm'),fore=bone(side+'_Forearm'),hand=bone(side+'_Hand'),palm=new T.Object3D();palm.position.set(.065,.006,0);hand.add(palm);arm.userData.forearm=fore;arm.userData.hand=hand;arm.userData.reachEnd=palm;return arm;});
 const propGrip=new T.Object3D();propGrip.position.set(.17,.006,0);arms[0].userData.hand.add(propGrip);if(identity==='hall')arms[0].userData.reachEnd=propGrip;
 const legs=['R','L'].map(side=>{const leg=bone(side+'_Thigh');leg.userData.calf=bone(side+'_Calf');return leg;});
 const mixer=new T.AnimationMixer(visual),actions=new Map();
 for(const clip of library.clips){const action=mixer.clipAction(clip);action.play();action.paused=true;action.setEffectiveWeight(0);actions.set(clip.name,action);}
 const phase=[...identity].reduce((n,c)=>n+c.charCodeAt(0)*.013,0);
 root.userData={kind,identity,human:true,head,body:bone('Spine1'),arms,legs,face:faces[0],phase,
  humanActor:{visual,bones,headBone,eyes,faces,mixer,actions,phase,weights:Object.fromEntries([...actions.keys()].map(k=>[k,0])),blended:Object.fromEntries([...actions.keys()].map(k=>[k,0])),basePose:[...bones.values()].map(bone=>({bone,p:bone.position.clone(),q:bone.quaternion.clone()})),lastTime:null},
  propGrip,detail:'Microsoft Rocketbox artist-authored human, UV skin, facial shapes and skeletal performance'};
 animateHumanActor(root,0,false,{});return root;
}

// Apply an offset in the actor's coordinate system. Imported bone axes are
// different from the procedural rig; writing Euler X directly twists limbs.
export function rotateHumanBone(root,bone,axis,angle){
 if(!bone||!angle)return;
 root.getWorldQuaternion(worldQ);bone.parent.getWorldQuaternion(parentQ).invert();
 vector.copy(axes[axis]).applyQuaternion(worldQ).applyQuaternion(parentQ).normalize();
 offsetQ.setFromAxisAngle(vector,angle);bone.quaternion.premultiply(offsetQ);bone.updateMatrixWorld(true);
}

export function animateHumanActor(root,time,moving,mood={}){
 const h=root.userData.humanActor,a=mood.performance,weights=h.weights;
 for(const name in weights)weights[name]=0;
 const sit=a?poseWeight(a,'sit'):0,kneel=a?poseWeight(a,'kneel'):0,hurt=a?poseWeight(a,'hurt'):0,reach=a?poseWeight(a,'reach'):0,brace=a?poseWeight(a,'brace'):0;
 const low=Math.min(1,sit+kneel),walk=moving?(a?.moveBlend??1)*(1-low):0,standing=(1-low)*(1-walk);
 weights.sit=sit;weights.kneel=kneel;weights[hurt?'limp':'walk']=walk;
 const constrained=Math.min(1,reach+brace+hurt),talk=mood.speaking&&!constrained;
 weights[talk?(mood.urgent?'urgent':'talk'):constrained?'breathe':'listen']=standing;
 const dt=h.lastTime===null?Infinity:time-h.lastTime,k=dt<0||dt>.15?1:1-Math.exp(-Math.max(0,dt)*11);
 for(const [name,action]of h.actions){h.blended[name]+=(weights[name]-h.blended[name])*k;action.setEffectiveWeight(h.blended[name]);action.time=(time+h.phase*(name==='breathe'?.6:2.3))%action.getClip().duration;}
 // PropertyMixer can skip an unchanged sampled value. Restore the unmodified
 // animation pose before evaluating, so IK and gaze never accumulate on pause.
 for(const pose of h.basePose){pose.bone.position.copy(pose.p);pose.bone.quaternion.copy(pose.q);}
 h.mixer.update(0);h.lastTime=time;
 for(const pose of h.basePose){pose.p.copy(pose.bone.position);pose.q.copy(pose.bone.quaternion);}
 for(const face of h.faces)face.morphTargetInfluences.fill(0);
 if(hurt){rotateHumanBone(root,root.userData.body,'z',.075*hurt);rotateHumanBone(root,h.headBone,'x',.14*hurt);rotateHumanBone(root,root.userData.arms[0],'x',-.22*hurt);}
 root.updateMatrixWorld(true);return root;
}

export function setHumanShape(root,name,weight){
 for(const face of root.userData.humanActor.faces){const index=face.morphTargetDictionary[name];if(index!==undefined)face.morphTargetInfluences[index]=T.MathUtils.clamp(weight,0,1);}
}

export function curlHumanHand(root,index,weight){
 const h=root.userData.humanActor;if(!h)return;const side=index?'L':'R';
 for(let finger=1;finger<=4;finger++)for(const [suffix,angle]of [['',.35],['1',.70],['2',.45]]){const bone=h.bones.get('Bip01_'+side+'_Finger'+finger+suffix);if(bone)bone.rotation.z+=angle*weight;}
 const thumb=h.bones.get('Bip01_'+side+'_Finger01');if(thumb)thumb.rotation.z+=weight*.30;
}

