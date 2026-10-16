import * as T from './vendor/three.module.js?v=5.2.0';
export const CHARACTER_DESIGNS=Object.freeze({
 ethan:{skin:0xc2a68c,hair:0x9b7943,style:'curly',eyes:'blue'},
 earl:{skin:0x76533d,face:0x91745b,hair:0x211c19,style:'close',ethnicity:'Black'},
 zeb:{skin:0x644739,face:0x8d6a53,hair:0x201a17,style:'close',ethnicity:'Black'},
 birdy:{skin:0xaaa18d,hair:0x4a3022,style:'thin',wingspan:6.8},
 jakob:{skin:0xada28a,hair:0x40281d,style:'straight'},
 bobby:{skin:0xae9b83,hair:0x513422,style:'curly'}
});
const mesh=(parent,geometry,material,at=[0,0,0],scale=[1,1,1])=>{const m=new T.Mesh(geometry,material);m.position.set(...at);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
const tube=(parent,mat,points,r=.01)=>mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(10,points.length*5),r,5,false),mat);
// Hair follows the skull in strands; curls have an actual round silhouette.
export function characterHair(head,design){
 const mat=new T.MeshStandardMaterial({color:design.hair,roughness:.95}),group=new T.Group();head.add(group);
 const thin=design.style==='thin',close=design.style==='close',count=thin?28:close?26:70;
 if(!thin)mesh(group,new T.SphereGeometry(.176,28,20,0,Math.PI*2,0,Math.PI*.55),mat,[0,.12,-.027],[1,.86,.98]);
 const positions=[],normals=[],uvs=[];
 for(let i=0;i<count;i++){
  const theta=i*2.399,phi=.12+(i%17)/17*1.55,cx=Math.sin(phi)*Math.cos(theta)*.174,cy=.12+Math.cos(phi)*.153,cz=Math.sin(phi)*Math.sin(theta)*.171-.027,points=[];
  for(let k=0;k<9;k++){const u=k/8,a=u*Math.PI*2.2,r=close?.005:design.style==='curly'?.013:.004;
   points.push([cx+Math.cos(a)*r,cy+(design.style==='curly'?Math.sin(a)*.013:-u*(thin?.22:.07)),cz+Math.sin(a)*r-u*(thin?.018:.003)]);
  }
  const geo=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,thin?.0014:close?.0024:.0037,4,false).toNonIndexed();
  positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);uvs.push(...geo.attributes.uv.array);geo.dispose();
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));mesh(group,geo,mat);
 group.userData={hair:design.style,color:design.hair};return group;
}
export function dressBirdy(g,skin,raw){
 const body=g.userData.body,wingMat=new T.MeshPhysicalMaterial({color:0x443a32,roughness:.79,side:T.DoubleSide,transmission:0,clearcoat:.04}),featherMat=new T.MeshStandardMaterial({color:0x292820,roughness:.92,side:T.DoubleSide});
 wingMat.map=skin.map;wingMat.bumpMap=skin.bumpMap;wingMat.bumpScale=.005;
 g.userData.wings=[];g.userData.wingspan=6.8;g.userData.hair='thin brown';
 for(const side of [-1,1]){
  const pivot=new T.Group();pivot.position.set(side*.2,.29,-.105);body.add(pivot);g.userData.wings.push(pivot);
  const edge=[[0,0,0],[.38,.36,-.07],[1.02,.55,-.15],[1.72,.44,-.13],[2.45,.15,-.07],[3.2,-.34,0],[2.73,-.52,.03],[2.4,-.41,.08],[2.11,-.73,.09],[1.8,-.56,.13],[1.42,-.87,.12],[1.1,-.67,.11],[.73,-.88,.1],[.45,-.61,.07],[.13,-.39,.02]];
  const vertices=[],uv=[];for(let i=1;i<edge.length-1;i++)for(const p of [edge[0],edge[i],edge[i+1]]){vertices.push(side*p[0],p[1],p[2]);uv.push(p[0]/3.2,p[1]+.9);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();mesh(pivot,geo,wingMat);
  tube(pivot,skin,[[0,0,0],[side*.45,.34,-.06],[side*1.05,.54,-.15],[side*1.76,.43,-.13],[side*2.5,.13,-.06],[side*3.2,-.34,0]],.031);
  for(const n of [5,8,10,12,14]){const p=edge[n];tube(pivot,skin,[[side*.5,.35,-.07],[side*p[0]*.6,p[1]*.25,.025],[side*p[0],p[1],p[2]]],.014);}
  // Long overlapping feathers curve away from the membrane, rather than boxes.
  const fp=[],fu=[];for(let i=0;i<27;i++){
   const u=i/26,x=.36+u*2.62,y=-.57-u*.07,len=.52+Math.sin(u*Math.PI)*.28,w=.045;
   for(let j=0;j<7;j++){const v=j/7,v2=(j+1)/7,width=w*Math.sin((v+.04)*Math.PI),width2=w*Math.sin((v2+.04)*Math.PI);
    const row=(t,s,r)=>[side*(x+s*r+t*.17),y-t*len,.10+Math.sin(t*Math.PI)*.09];
    const a=row(v,-1,width),b=row(v,1,width),c=row(v2,1,width2),d=row(v2,-1,width2);
    for(const [p,t]of [[a,v],[b,v],[c,v2],[a,v],[c,v2],[d,v2]]){fp.push(...p);fu.push(u,t);}
   }
  }
  const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(fp,3));fg.setAttribute('uv',new T.Float32BufferAttribute(fu,2));fg.computeVertexNormals();mesh(pivot,fg,featherMat);
 }
 for(const side of [-1,1])tube(body,raw,[[side*.17,.3,-.15],[side*.23,.12,-.18],[side*.1,-.22,-.16]],.012);
}
export function dressArchetype(g,kind,skin,raw){
 const d=g.userData;
 if(kind==='spitter'){
  const sacMat=new T.MeshPhysicalMaterial({color:0x849157,roughness:.31,clearcoat:.4});d.sac=mesh(d.head,new T.SphereGeometry(1,28,20),sacMat,[-.14,-.17,-.005],[.15,.2,.14]);
  for(let i=0;i<6;i++)tube(d.head,raw,[[-.14+i*.023,-.04,.05],[-.21+i*.035,-.18,.12],[-.17+i*.026,-.34,.03]],.003);
  d.silhouette='swollen throat';
 }
 if(kind==='brute'||kind==='zeb'){
  const armor=new T.MeshStandardMaterial({color:kind==='zeb'?0x302923:0x4c4740,roughness:.86});
  for(const side of [-1,1])for(let i=0;i<5;i++){const shell=mesh(d.body,new T.SphereGeometry(1,20,14),armor,[side*(.15+i*.025),.31-i*.05,-.09],[.14,.09,.12]);shell.rotation.z=side*.35;}
  d.silhouette='armored shoulders';
 }
 if(kind==='stalker'){
  for(const side of [-1,1])for(let i=0;i<4;i++)tube(d.arms[side===-1?0:1].userData.forearm,raw,[[i*.02-.03,-.36,.05],[i*.025-.04,-.52,.08],[i*.03-.05,-.61,.14]],.008);
  d.silhouette='long claws';
 }
 if(kind==='crawler')d.silhouette='low crawling body';
 if(kind==='chris'){
  const fore=d.arms[1].userData.forearm;mesh(fore,new T.SphereGeometry(1,28,18),skin,[0,-.18,.035],[.12,.24,.11]);
  const bone=new T.MeshStandardMaterial({color:0xa4967a,roughness:.71});for(let i=0;i<4;i++)tube(fore,bone,[[(i-1.5)*.033,-.32,.04],[(i-1.5)*.05,-.49,.10],[(i-1.5)*.075,-.60,.17]],.013);
  for(let i=0;i<7;i++)tube(d.body,raw,[[-.16,.3-i*.055,.135],[.04,.25-i*.05,.18],[.16,.20-i*.05,.12]],.006);
  d.silhouette='asymmetric bone claw';
 }
 if(kind==='zeb'){
  const bile=new T.MeshPhysicalMaterial({color:0x879259,roughness:.3,clearcoat:.5});d.bileSacs=[];
  for(const side of [-1,1]){const sac=mesh(d.body,new T.SphereGeometry(1,28,20),bile,[side*.18,.15,.14],[.07,.11,.065]);d.bileSacs.push(sac);for(let i=0;i<3;i++)tube(d.body,raw,[[side*.16,.34,.14],[side*(.17+i*.018),.18,.20],[side*.16,-.05,.15]],.003);}
 }
}
// Clone articulated rigs with independent bones, morph weights and materials.
// Geometry and immutable textures stay resident across chapters and cutscenes.
export function cloneCharacter(source){
 const nodes=new Map(),mats=new Map();
 source.traverse(node=>{const data=node.userData;node.userData={};let copy;try{copy=node.clone(false);}finally{node.userData=data;}nodes.set(node,copy);
  if(node.material){const clone=m=>{if(!mats.has(m)){const mat=m.clone();mat.onBeforeCompile=m.onBeforeCompile;mat.customProgramCacheKey=m.customProgramCacheKey;mats.set(m,mat);}return mats.get(m);};copy.material=Array.isArray(node.material)?node.material.map(clone):clone(node.material);for(const key of ['customDepthMaterial','customDistanceMaterial'])if(node[key])copy[key]=clone(node[key]);}
 });
 const remap=value=>{if(value?.isObject3D)return nodes.get(value)||value;if(Array.isArray(value))return value.map(remap);if(value&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v)]));return value;};
 for(const [node,copy]of nodes){copy.userData=remap(node.userData);for(const c of node.children)copy.add(nodes.get(c));
  if(node.isSkinnedMesh){copy.bind(new T.Skeleton(node.skeleton.bones.map(b=>nodes.get(b)),node.skeleton.boneInverses.map(m=>m.clone())),node.bindMatrix.clone());}
  if(node.morphTargetInfluences)copy.morphTargetInfluences=[...node.morphTargetInfluences];
 }
 const g=nodes.get(source);g.userData.phase=Math.random()*8;g.updateMatrixWorld(true);return g;
}
