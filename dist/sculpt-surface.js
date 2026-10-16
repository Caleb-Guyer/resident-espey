import * as T from './vendor/three.module.js?v=5.5.4';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
export function segmentDistance(p,a,b){let u=0,d=0;for(let i=0;i<3;i++){u+=(p[i]-a[i])*(b[i]-a[i]);d+=(b[i]-a[i])**2;}u=clamp(u/(d||1),0,1);return p.reduce((n,v,i)=>n+(v-a[i]-(b[i]-a[i])*u)**2,0);}
// Authored muscle volumes blend into one watertight surface, including fused
// torsos and irregular limb growth. The skeleton deforms the continuous skin.
export function sculptSurface(shapes,segments,{min,max,step=.027,cloth=()=>0,scar=.0025,bindWeights,smoothWeights=0}){
 const size=min.map((v,i)=>Math.ceil((max[i]-v)/step)+1),[nx,ny,nz]=size,index=(x,y,z)=>(z*ny+y)*nx+x,values=new Float32Array(nx*ny*nz);
 const sample=(px,py,pz)=>{let d=10;
  for(const [cx,cy,cz,rx,ry,rz]of shapes){const q=Math.sqrt(((px-cx)/rx)**2+((py-cy)/ry)**2+((pz-cz)/rz)**2),e=(q-1)*Math.min(rx,ry,rz),k=.045,h=clamp(.5+.5*(e-d)/k,0,1);d=e*(1-h)+d*h-k*h*(1-h);}
  return d+scar*(Math.sin(py*41+px*63+pz*29)*Math.sin(pz*53-px*47+py*13)+.4*Math.sin(px*101+py*79+pz*87));
 };
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)values[index(x,y,z)]=sample(min[0]+x*step,min[1]+y*step,min[2]+z*step);
 const vertices=[],uvs=[],groups=[[],[],[]],lookup=new Map();
 const vertex=(i,j,a,b)=>{
  const key=i<j?i+','+j:j+','+i;if(lookup.has(key))return lookup.get(key);const u=values[i]/(values[i]-values[j]),p=a.map((v,k)=>v+(b[k]-v)*u),id=vertices.length/3;
  vertices.push(...p);uvs.push(Math.atan2(p[0],p[2])/(Math.PI*2)+.5,p[1]*1.1);lookup.set(key,id);return id;
 };
 const emit=(v,away)=>{
  const p=v.map(i=>vertices.slice(i*3,i*3+3)),a=p[1].map((n,i)=>n-p[0][i]),b=p[2].map((n,i)=>n-p[0][i]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  if(n.reduce((sum,x,i)=>sum+x*away[i],0)<0)[v[1],v[2]]=[v[2],v[1]];const center=p[0].map((_,i)=>(p[0][i]+p[1][i]+p[2][i])/3);groups[cloth(...center)].push(...v);
 };
 for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
  const ids=corners.map(([a,b,c])=>index(x+a,y+b,z+c));if(ids.every(i=>values[i]>=0)||ids.every(i=>values[i]<0))continue;
  const points=corners.map(([a,b,c])=>[min[0]+(x+a)*step,min[1]+(y+b)*step,min[2]+(z+c)*step]);
  for(const t of tetra){const inside=t.filter(i=>values[ids[i]]<0),outside=t.filter(i=>values[ids[i]]>=0);if(!inside.length||!outside.length)continue;
   const center=a=>points[0].map((_,j)=>a.reduce((n,i)=>n+points[i][j],0)/a.length),a=center(inside),b=center(outside),away=b.map((v,i)=>v-a[i]),v=(i,j)=>vertex(ids[i],ids[j],points[i],points[j]);
   if(inside.length===1)emit(outside.map(j=>v(inside[0],j)),away);else if(outside.length===1)emit(inside.map(j=>v(outside[0],j)),away);
   else {const[a,b]=inside,[c,d]=outside,q=[v(a,c),v(a,d),v(b,d),v(b,c)];emit([q[0],q[1],q[2]],away);emit([q[0],q[2],q[3]],away);}
  }
 }
 const count=vertices.length/3,boneCount=segments.length;let field=new Float32Array(count*boneCount);
 for(let i=0;i<count;i++){const p=vertices.slice(i*3,i*3+3),w=bindWeights?bindWeights(p):segments.map(([a,b],j)=>[j,Math.exp(-segmentDistance(p,a,b)/.014)]),sum=w.reduce((n,a)=>n+a[1],0)||1;for(const[j,v]of w)field[i*boneCount+j]=v/sum;}
 // Diffusion follows the skin topology, smoothing the shoulder and hip blends
 // without leaking influence across a gap between an arm and the rib cage.
 if(smoothWeights){
  const adjacent=Array.from({length:count},()=>new Set());for(const triangles of groups)for(let i=0;i<triangles.length;i+=3)for(let j=0;j<3;j++){const a=triangles[i+j],b=triangles[i+(j+1)%3];adjacent[a].add(b);adjacent[b].add(a);}
  const neighbors=adjacent.map(s=>[...s]);let next=new Float32Array(field.length);
  for(let pass=0;pass<smoothWeights;pass++){for(let i=0;i<count;i++){const list=neighbors[i],offset=i*boneCount;for(let b=0;b<boneCount;b++){let sum=0;for(const j of list)sum+=field[j*boneCount+b];next[offset+b]=field[offset+b]*.45+(list.length?sum/list.length:field[offset+b])*.55;}}[field,next]=[next,field];}
 }
 const indices=[],weights=[];for(let i=0;i<count;i++){
  const ranked=Array.from({length:boneCount},(_,j)=>[j,field[i*boneCount+j]]).sort((a,b)=>b[1]-a[1]),cutoff=ranked[4]?.[1]||0,w=ranked.slice(0,4).map(([j,v])=>[j,Math.max(0,v-cutoff)]),sum=w.reduce((n,a)=>n+a[1],0)||1;
  // Fade the fourth influence to zero before its slot changes. Truncating it
  // at full strength causes visible seams on the fused torso during a lunge.
  while(w.length<4)w.push([0,0]);for(const[j,v]of w){indices.push(j);weights.push(v/sum);}
 }
 const normals=[],h=.001;for(let i=0;i<vertices.length;i+=3){const [x,y,z]=vertices.slice(i,i+3),n=[sample(x+h,y,z)-sample(x-h,y,z),sample(x,y+h,z)-sample(x,y-h,z),sample(x,y,z+h)-sample(x,y,z-h)],length=Math.hypot(...n)||1;normals.push(...n.map(v=>v/length));}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));geo.setIndex(groups.flat());let offset=0;groups.forEach((g,i)=>{if(g.length)geo.addGroup(offset,g.length,i);offset+=g.length;});geo.computeBoundingSphere();return geo;
}
export function mergeRigid(parent){
 const buckets=new Map();for(const m of [...parent.children])if(m.visible&&m.isMesh&&!m.morphTargetInfluences&&!Array.isArray(m.material)){if(!buckets.has(m.material))buckets.set(m.material,[]);buckets.get(m.material).push(m);}
 for(const [material,meshes]of buckets){if(meshes.length<2)continue;const attrs={position:[],normal:[],uv:[]};for(const m of meshes){m.updateMatrix();const geo=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);for(const key of Object.keys(attrs))if(geo.attributes[key])attrs[key].push(...geo.attributes[key].array);geo.dispose();parent.remove(m);m.geometry.dispose();}
  const geo=new T.BufferGeometry();for(const [key,array]of Object.entries(attrs))if(array.length)geo.setAttribute(key,new T.Float32BufferAttribute(array,key==='uv'?2:3));geo.computeBoundingSphere();const m=new T.Mesh(geo,material);m.castShadow=m.receiveShadow=true;parent.add(m);
 }
}

