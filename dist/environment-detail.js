import * as T from './vendor/three.module.js?v=5.2.1';import {mergeRigid} from './sculpt-surface.js?v=5.2.1';
const box=(g,m,w,h,d,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;};
const pipe=(g,m,points,r)=>{const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),40,r,12,false),m);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;};
export function addEnvironmentDetail(w){
 const m=w.palette,steel=new T.MeshStandardMaterial({color:0x6a706c,roughness:.63,metalness:.5}),wet=new T.MeshPhysicalMaterial({color:0x243433,roughness:.12,metalness:.14,transparent:true,opacity:.48,depthWrite:false,clearcoat:.7});
 for(const room of w.level.rooms){
  if(['utility','switchgear','relay','assembly','finale'].includes(room.kind))w.wallGroup(room,{kind:'service cabinet',width:.85,height:2.5,y:1.91,depth:.25},g=>{
   box(g,m.metal,.77,1.63,.18,0,1.48,.03);box(g,steel,.70,1.55,.045,0,1.48,.145);for(const side of[-1,1]){box(g,m.black,.009,1.49,.009,side*.347,1.48,.174);for(const y of[.93,1.55,2.05])box(g,m.rust,.045,.025,.025,side*.38,y,.13);}
   for(let i=0;i<9;i++)box(g,m.black,.44,.008,.003,0,1.80+i*.025,.171);pipe(g,m.metal,[[.25,1.52,.18],[.25,1.36,.20],[.25,1.18,.18]],.012);
   for(const side of[-1,1])pipe(g,m.black,[[side*.22,2.32,.08],[side*.23,2.75,.08],[side*.38,3.13,.02]],.012);mergeRigid(g);
  });
  if(['flood','current','infirmary','triage','storage'].includes(room.kind))w.wallGroup(room,{kind:'plumbing',width:1.9,height:.65,y:2.57,depth:.25},g=>{
   pipe(g,m.rust,[[-.91,2.74,.06],[-.45,2.74,.06],[.06,2.53,.17],[.43,2.53,.17],[.91,2.53,.08]],.028);pipe(g,steel,[[-.9,2.53,.05],[-.39,2.53,.05],[-.12,2.38,.10],[.48,2.38,.1],[.9,2.38,.04]],.016);
   for(const x of[-.70,.66])box(g,m.metal,.065,.37,.035,x,2.57,.025);const valve=new T.Mesh(new T.TorusGeometry(.075,.011,12,40),m.rust);valve.position.set(.41,2.53,.22);g.add(valve);for(const a of[0,Math.PI/2]){const bar=box(g,m.rust,.13,.009,.009,.41,2.53,.22);bar.rotation.z=a;}mergeRigid(g);
  });
  if(['flood','current','infirmary'].includes(room.kind)){const[a,b,c,d]=room.bounds;for(let i=0;i<4;i++){const shape=new T.Shape(),r=.60+i*.11;for(let k=0;k<=28;k++){const angle=k/28*Math.PI*2,radius=r*(1+.11*Math.sin(k*2.7+i)),x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*.60;k?shape.lineTo(x,y):shape.moveTo(x,y);}const puddle=new T.Mesh(new T.ShapeGeometry(shape,28),wet);puddle.rotation.x=-Math.PI/2;puddle.position.set((a+.65+i*.7)*2.4,.017,(b+.7+i*.8)*2.4);puddle.receiveShadow=true;w.root.add(puddle);}}
 }
}
