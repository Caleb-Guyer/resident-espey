import * as T from './vendor/three.module.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const handCache=new Map();
const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const add=(parent,geometry,material,at=[0,0,0],scale=[1,1,1])=>{const m=new T.Mesh(geometry,material);m.position.set(...at);m.scale.set(...scale);parent.add(m);return m;};
const group=(parent,at=[0,0,0])=>{const g=new T.Group();g.position.set(...at);parent.add(g);return g;};
const sphere=new T.SphereGeometry(1,32,20);
const cyl=new T.CylinderGeometry(1,1,1,40);
function rounded(w,h,d,r=.001){
 const s=new T.Shape(),x=w/2-r,y=h/2-r;s.moveTo(-x,-y-r);s.lineTo(x,-y-r);s.quadraticCurveTo(x+r,-y-r,x+r,-y);s.lineTo(x+r,y);s.quadraticCurveTo(x+r,y+r,x,y+r);s.lineTo(-x,y+r);s.quadraticCurveTo(-x-r,y+r,-x-r,y);s.lineTo(-x-r,-y);s.quadraticCurveTo(-x-r,-y-r,-x,-y-r);
 const g=new T.ExtrudeGeometry(s,{depth:d-r*2,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:4,curveSegments:12}).translate(0,0,-d/2+r);g.computeBoundingBox();const size=g.boundingBox.getSize(new T.Vector3());g.scale(w/size.x,h/size.y,d/size.z);uv(g);return g;
}
function uv(g){
 g.computeBoundingBox();const a=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,min=g.boundingBox.min,size=g.boundingBox.getSize(new T.Vector3());
 for(let i=0;i<a.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));u.setXY(i,nx>ny&&nx>nz?(a.getZ(i)-min.z)/(size.z||1):(a.getX(i)-min.x)/(size.x||1),ny>nx&&ny>nz?(a.getZ(i)-min.z)/(size.z||1):(a.getY(i)-min.y)/(size.y||1));}
}
function sideShape(shape,width){const g=new T.ExtrudeGeometry(shape,{depth:width-.002,bevelSize:.001,bevelThickness:.001,bevelSegments:4,curveSegments:18}).translate(0,0,-width/2+.001).rotateY(-Math.PI/2);uv(g);return g;}
function sweep(points,radii,folds=0){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=curve.computeFrenetFrames(36,false),pos=[],tex=[],index=[];
 for(let i=0;i<=36;i++){const u=i/36,c=curve.getPoint(u),j=Math.min(radii.length-2,Math.floor(u*(radii.length-1))),t=u*(radii.length-1)-j,rx=radii[j][0]+(radii[j+1][0]-radii[j][0])*t,ry=radii[j][1]+(radii[j+1][1]-radii[j][1])*t;
  for(let k=0;k<=32;k++){const a=k/32*Math.PI*2,f=1+folds*Math.sin(u*62+a*2)*Math.sin(u*Math.PI),v=c.clone().addScaledVector(frames.normals[i],Math.cos(a)*rx*f).addScaledVector(frames.binormals[i],Math.sin(a)*ry*f);pos.push(...v.toArray());tex.push(k/32,u*2);if(i<36&&k<32){const n=i*33+k;index.push(n,n+1,n+33,n+1,n+34,n+33);}}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.setIndex(index);g.computeVertexNormals();g.userData.sweptSurface=true;return g;
}
function handGeometry(side){
 if(handCache.has(side))return handCache.get(side).clone();
 const ell=[],segments=[];
 const blob=(p,r)=>ell.push([...p,...r]);
 const finger=(points,r)=>{points.forEach((p,i)=>blob(p,[r*(i===1?1.13:1),r,r]));for(let i=1;i<points.length;i++)segments.push([points[i-1],points[i],r,r*(i===points.length-1?.84:1)]);};
 if(side===1){blob([.013,-.079,.076],[.026,.036,.018]);blob([.035,-.075,.052],[.016,.032,.020]);blob([.020,-.113,.085],[.019,.026,.020]);blob([.026,-.136,.090],[.021,.022,.022]);}
 else{blob([-.034,-.078,.038],[.016,.033,.025]);blob([-.037,-.110,.057],[.016,.030,.020]);blob([-.042,-.134,.067],[.019,.023,.019]);}
 if(side===1){
  for(let i=0;i<3;i++){const y=-.057-i*.020,r=.0085-i*.0008;finger([[.040,y,.043],[.046,y,-.001],[.025,y-.003,-.026],[.002+i*.004,y-.003,-.017]],r);}
  finger([[.040,-.034,.040],[.045,-.027,.002],[.022,-.025,-.044],[.006,-.031,-.038]],.008);
  blob([.016,-.052,.081],[.018,.026,.023]);finger([[.020,-.052,.088],[-.004,-.020,.073],[-.030,-.018,.044],[-.031,-.016,.016]],.0095);
 }else{
  for(let i=0;i<4;i++){const y=-.045-i*.020,r=.008-i*.0006;finger([[-.035,y,.024],[-.045,y,-.013],[-.023,y-.003,-.043],[.017-i*.003,y-.005,-.029]],r);}
  blob([-.037,-.051,.025],[.018,.024,.023]);finger([[-.038,-.050,.018],[-.043,-.020,-.010],[-.035,-.012,-.047]],.0095);
 }
 const smin=(a,b,k=.0028)=>{const h=clamp(.5+.5*(b-a)/k,0,1);return b*(1-h)+a*h-k*h*(1-h);};
 const field=(x,y,z)=>{
  let d=1;for(const[cx,cy,cz,rx,ry,rz]of ell)d=smin(d,(Math.hypot((x-cx)/rx,(y-cy)/ry,(z-cz)/rz)-1)*Math.min(rx,ry,rz));
  for(const[a,b,r1,r2]of segments){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/(dx*dx+dy*dy+dz*dz),0,1);d=smin(d,Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t,z-a[2]-dz*t)-(r1+(r2-r1)*t));}return d;
 };
 const step=.0038,origin=[-.072,-.171,-.072],nx=39,ny=57,nz=53,id=(x,y,z)=>(z*ny+y)*nx+x,values=new Float32Array(nx*ny*nz);
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)values[id(x,y,z)]=field(origin[0]+x*step,origin[1]+y*step,origin[2]+z*step);
 const positions=[],indices=[],lookup=new Map();
 const vertex=(a,b,pa,pb)=>{const key=a<b?a+','+b:b+','+a;if(lookup.has(key))return lookup.get(key);const t=values[a]/(values[a]-values[b]),v=positions.length/3;positions.push(...pa.map((x,i)=>x+(pb[i]-x)*t));lookup.set(key,v);return v;};
 const emit=(ids,away)=>{const a=ids[0]*3,b=ids[1]*3,c=ids[2]*3,ab=new T.Vector3(positions[b]-positions[a],positions[b+1]-positions[a+1],positions[b+2]-positions[a+2]),ac=new T.Vector3(positions[c]-positions[a],positions[c+1]-positions[a+1],positions[c+2]-positions[a+2]);if(ab.cross(ac).dot(new T.Vector3(...away))<0)[ids[1],ids[2]]=[ids[2],ids[1]];indices.push(...ids);};
 for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
  const ci=corners.map(([dx,dy,dz])=>id(x+dx,y+dy,z+dz));if(ci.every(i=>values[i]>=0)||ci.every(i=>values[i]<0))continue;
  const cp=corners.map(([dx,dy,dz])=>[origin[0]+(x+dx)*step,origin[1]+(y+dy)*step,origin[2]+(z+dz)*step]);
  for(const t of tetra){const inside=t.filter(i=>values[ci[i]]<0),outside=t.filter(i=>values[ci[i]]>=0);if(!inside.length||!outside.length)continue;
   const center=list=>list.reduce((a,i)=>a.map((v,j)=>v+cp[i][j]/list.length),[0,0,0]),ic=center(inside),oc=center(outside),away=oc.map((v,i)=>v-ic[i]),v=(i,j)=>vertex(ci[i],ci[j],cp[i],cp[j]);
   if(inside.length===1)emit(outside.map(j=>v(inside[0],j)),away);else if(outside.length===1)emit(inside.map(j=>v(outside[0],j)),away);else{const[a,b]=inside,[c,d]=outside,q=[v(a,c),v(a,d),v(b,d),v(b,c)];emit([q[0],q[1],q[2]],away);emit([q[0],q[2],q[3]],away);}
  }
 }
 const g=new T.BufferGeometry(),tex=[];for(let i=0;i<positions.length;i+=3)tex.push(Math.atan2(positions[i],positions[i+2]-.04)/(Math.PI*2)+.5,(positions[i+1]+.16)*6);
 g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.setIndex(indices);g.computeVertexNormals();
 const morph=g.attributes.position.clone();for(let i=0;i<morph.count;i++){const x=morph.getX(i),y=morph.getY(i),z=morph.getZ(i);if(side===1){const w=Math.exp(-(((y+.028)/.013)**2))*clamp((.030-z)/.04,0,1);morph.setZ(i,z+w*.0035);}else{const w=clamp((.022-z)/.060,0,1)*clamp((-.02-y)/.025,0,1);morph.setX(i,x-w*.006);morph.setZ(i,z+w*.012);}}
 g.morphAttributes.position=[morph];g.computeBoundingSphere();handCache.set(side,g);return g.clone();
}
export function createHands(m,root){
 const hands=[],skins=[];
 for(const side of[1,-1]){
  const rest=side===1?[.020,-.115,.085]:[-.037,-.111,.060],hand=group(root,rest);hand.userData.rest=rest;const geo=handGeometry(side),translation=new T.Matrix4().makeTranslation(...rest.map(v=>-v));geo.applyMatrix4(translation);geo.morphAttributes.position[0].applyMatrix4(translation);geo.computeBoundingSphere();const skin=add(hand,geo,m.skin);skin.frustumCulled=false;skins.push(skin);
  const local=p=>p.map((v,i)=>v-rest[i]);
  const armPoints=(side===1?[[.020,-.115,.085],[.026,-.140,.095],[.058,-.175,.119],[.082,-.213,.136]]:[[-.037,-.112,.060],[-.046,-.141,.073],[-.061,-.178,.088],[-.082,-.213,.110]]).map(local);
  add(hand,sweep(armPoints,[[.019,.019],[.022,.021],[.026,.024],[.032,.029]]),m.skin);
  const clothPoints=[[side*.082,-.213,side===1?.136:.110],[side*.145,-.320,.18],[side*.235,-.50,.32]].map(local);
  add(hand,sweep(clothPoints,[[.034,.031],[.047,.040],[.058,.05]],.065),m.sleeve);
  const cuff=add(hand,new T.TorusGeometry(.033,.003,12,48),m.sleeve,local(clothPoints[0].map((v,i)=>v+rest[i])));cuff.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...clothPoints[1]).sub(new T.Vector3(...clothPoints[0])).normalize());cuff.scale.y=.92;
  if(side===1)add(hand,sphere,m.nail,local([-.040,-.016,.018]),[.001,.0045,.0055]);else add(hand,sphere,m.nail,local([-.045,-.014,-.045]),[.0012,.0048,.0055]);
  if(side===1){
   for(let f=0;f<3;f++){const y=-.046-f*.018;add(hand,sphere,m.skin,local([.041,y,.041]),[.0065,.0048,.006]);}
   const vein=new T.CatmullRomCurve3([[.046,-.094,.064],[.043,-.066,.063],[.037,-.032,.057]].map(p=>new T.Vector3(...local(p))));add(hand,new T.TubeGeometry(vein,30,.00055,8,false),m.skin);
  }
  hands.push(hand);
 }

 return {hands,skins};
}
export function createViewModel(m){
 const root=new T.Group(),gun=group(root),slide=group(gun);
 // A continuous frame silhouette includes a real opening in the trigger guard.
 const outline=new T.Shape();outline.moveTo(.053,.023);outline.lineTo(-.150,.030);outline.quadraticCurveTo(-.169,.030,-.165,.004);outline.lineTo(-.086,-.003);outline.quadraticCurveTo(-.078,-.059,-.027,-.059);outline.lineTo(.010,-.057);outline.lineTo(.030,-.124);outline.quadraticCurveTo(.050,-.135,.074,-.119);outline.lineTo(.054,.023);
 const hole=new T.Path();hole.moveTo(-.071,-.012);hole.quadraticCurveTo(-.068,-.047,-.031,-.048);hole.lineTo(-.006,-.048);hole.lineTo(-.006,-.013);hole.closePath();outline.holes.push(hole);add(gun,sideShape(outline,.034),m.frame);
 add(gun,rounded(.039,.014,.098,.003),m.frame,[0,.030,-.10]);
 // Broad radiused shoulders, a recessed ejection port, and machined edges.
 add(slide,rounded(.038,.032,.209,.0055),m.metal,[0,.055,-.064]);
 add(slide,rounded(.025,.003,.190,.001),m.steel,[0,.071,-.064]);
 add(slide,rounded(.0008,.013,.037,.002),m.dark,[.0193,.053,-.051]);
 add(slide,rounded(.0011,.006,.031,.001),m.steel,[.0195,.049,-.051]);
 add(slide,rounded(.0012,.003,.039,.001),m.metal,[.0199,.060,-.051]);
 for(const side of[-1,1]){
  for(let i=0;i<10;i++){const ridge=add(slide,rounded(.0007,.022,.0012,.0003),m.dark,[side*.0194,.052,.006+i*.003]);ridge.rotation.x=-.24;}
  for(let i=0;i<5;i++)add(slide,rounded(.0007,.018,.001,.0003),m.dark,[side*.0194,.052,-.124-i*.003]);
  add(slide,rounded(.001,.006,.022,.001),m.steel,[side*.0195,.052,.024]);
 }
 add(gun,cyl,m.steel,[0,.054,-.089],[.0073,.202,.0073]).rotation.x=Math.PI/2;
 add(gun,new T.TorusGeometry(.0066,.0011,12,48),m.steel,[0,.054,-.191]);add(gun,new T.CircleGeometry(.0054,48),m.dark,[0,.054,-.192]).rotation.y=Math.PI;
 add(gun,rounded(.019,.009,.017,.002),m.steel,[0,.066,-.032]);
 const sight=new T.Shape();sight.moveTo(-.014,0);sight.lineTo(.014,0);sight.lineTo(.011,.009);sight.lineTo(.0034,.009);sight.lineTo(.0034,.002);sight.lineTo(-.0034,.002);sight.lineTo(-.0034,.009);sight.lineTo(-.011,.009);sight.closePath();
 add(slide,new T.ExtrudeGeometry(sight,{depth:.007,bevelSize:.0004,bevelThickness:.0004,bevelSegments:3,curveSegments:8}),m.dark,[0,.076,.030]);
 add(slide,rounded(.005,.014,.010,.001),m.dark,[0,.077,-.158]);
 for(const x of[-.008,.008])add(slide,new T.CircleGeometry(.00095,24),m.sight,[x,.083,.038]);add(slide,new T.CircleGeometry(.001,24),m.sight,[0,.083,-.152]);
 const grip=group(gun,[0,-.073,.039]);grip.rotation.x=-.17;
 for(const side of[-1,1]){
  const panel=new T.Shape();panel.moveTo(-.025,.047);panel.quadraticCurveTo(.030,.059,.031,.043);panel.lineTo(.028,-.054);panel.quadraticCurveTo(.007,-.063,-.027,-.052);panel.lineTo(-.025,.047);
  add(grip,sideShape(panel,.005),m.rubber,[side*.020,0,0]);
  for(const y of[-.041,.036]){add(grip,cyl,m.steel,[side*.0235,y,.007],[.0033,.002,.0033]).rotation.z=Math.PI/2;add(grip,rounded(.0004,.001,.004,.00015),m.dark,[side*.0246,y,.007]);}
  add(gun,cyl,m.steel,[side*.0185,.018,.020],[.0035,.002,.0035]).rotation.z=Math.PI/2;
  add(slide,rounded(.002,.006,.023,.001),m.frame,[side*.023,.052,.024]).rotation.x=.18;
 }
 add(gun,rounded(.003,.005,.03,.001),m.steel,[-.020,.017,-.021]);
 for(const side of[-1,1]){
  for(let y=-.046;y<.043;y+=.0055)for(let z=-.019;z<.023;z+=.0055)add(grip,sphere,m.dark,[side*.0230,y,z],[.0005,.00065,.00065]);
  add(grip,rounded(.001,.087,.002,.0004),m.frame,[side*.023,-.004,.026]);
 }
 const magazine=group(grip,[0,-.06,0]);add(magazine,rounded(.025,.112,.027,.002),m.magazine,[0,.060,0]);add(magazine,rounded(.031,.006,.034,.002),m.rubber,[0,.002,0]);
 for(let i=0;i<7;i++)add(magazine,new T.CircleGeometry(.0014,20),m.dark,[.0126,.021+i*.012,0]).rotation.y=Math.PI/2;
 const trigger=group(gun,[0,-.006,-.039]);add(trigger,new T.TubeGeometry(new T.CatmullRomCurve3([[0,0,0],[0,-.016,.002],[0,-.028,.012]].map(p=>new T.Vector3(...p))),24,.002,10,false),m.steel);
 const hammer=group(gun,[0,.061,.049]);add(hammer,rounded(.011,.012,.006,.002),m.steel,[0,.004,0]);for(let i=0;i<4;i++)add(hammer,rounded(.010,.0005,.0006,.00015),m.dark,[0,.004+i*.002,.0033]);
 const {hands,skins}=createHands(m,root);
 if(m.marking){const label=add(slide,new T.PlaneGeometry(.067,.0065),m.marking,[-.0224,.049,-.035]);label.rotation.y=-Math.PI/2;}
 return {root,gun,slide,grip,magazine,trigger,hammer,rightHand:hands[0],leftHand:hands[1],rightSkin:skins[0],leftSkin:skins[1]};
}
