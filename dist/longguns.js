import * as T from './vendor/three.module.js';
import {createHands} from './viewmodel.js?v=4.7.0';
const add=(g,geo,m,p=[0,0,0],scale=[1,1,1])=>{const o=new T.Mesh(geo,m);o.position.set(...p);o.scale.set(...scale);g.add(o);return o;};
const group=(g,p=[0,0,0])=>{const o=new T.Group();o.position.set(...p);g.add(o);return o;};
function rounded(w,h,d,r=.005){const x=w/2,y=h/2,s=new T.Shape();s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.quadraticCurveTo(x,-y,x,-y+r);s.lineTo(x,y-r);s.quadraticCurveTo(x,y,x-r,y);s.lineTo(-x+r,y);s.quadraticCurveTo(-x,y,-x,y-r);s.lineTo(-x,-y+r);s.quadraticCurveTo(-x,-y,-x+r,-y);const g=new T.ExtrudeGeometry(s,{depth:d-r*2,bevelEnabled:true,bevelSegments:5,bevelThickness:r,bevelSize:r,curveSegments:12}).translate(0,0,-d/2+r);g.computeBoundingBox();const a=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,min=g.boundingBox.min,size=g.boundingBox.getSize(new T.Vector3());for(let i=0;i<a.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));u.setXY(i,nx>ny&&nx>nz?(a.getZ(i)-min.z)/(size.z||1):(a.getX(i)-min.x)/(size.x||1),ny>nx&&ny>nz?(a.getZ(i)-min.z)/(size.z||1):(a.getY(i)-min.y)/(size.y||1));}return g;}
function rod(g,m,at,r,len){return add(g,new T.CylinderGeometry(r,r,len,40),m,at).rotateX(Math.PI/2);}
function muzzle(g,m,z,y,r){add(g,new T.TorusGeometry(r,.0018,16,48),m.steel,[0,y,z]);add(g,new T.CircleGeometry(r-.002,48),m.dark,[0,y,z-.001]).rotateY(Math.PI);}
function grip(g,m){const o=group(g,[0,-.066,.035]);o.rotation.x=-.24;add(o,rounded(.035,.116,.052,.006),m.rubber);for(const side of[-1,1])for(let i=0;i<14;i++)add(o,rounded(.0008,.0015,.04,.0004),m.dark,[side*.018, -.048+i*.007,0]);return o;}
function sights(g,m,z,y,carbine){const rear=group(g,[0,y+.006,.034]);add(rear,rounded(.010,.018,.011,.002),m.dark,[0,-.015,0]);add(rear,new T.TorusGeometry(.008,.0023,12,32),m.steel,[0,0,.010]);add(g,rounded(.003,.019,.006,.001),m.dark,[0,y,z]);add(g,new T.CircleGeometry(.001,20),m.sight,[0,y+.006,z+.004]);if(carbine)for(const side of[-1,1])add(g,new T.TubeGeometry(new T.CatmullRomCurve3([[side*.016,-.005,0],[side*.015,.013,0],[side*.008,.021,0]].map(p=>new T.Vector3(...p))),24,.002,8,false),m.dark,[0,y,z]);}
export function createLongGun(m,id){
 const root=new T.Group(),gun=group(root),slide=group(gun),hammer=group(gun),trigger=group(gun,[0,-.012,-.022]),g=grip(gun,m),magazine=group(gun),pump=group(gun),shotgun=id==='shotgun';
 const guard=new T.CatmullRomCurve3([[0,-.012,0],[0,-.053,-.014],[0,-.052,-.059],[0,-.020,-.066]].map(p=>new T.Vector3(...p)));add(gun,new T.TubeGeometry(guard,40,.0026,12,false),m.metal);
 add(trigger,new T.TubeGeometry(new T.CatmullRomCurve3([[0,0,0],[0,-.021,-.002],[0,-.025,.004]].map(p=>new T.Vector3(...p))),24,.002,10,false),m.steel);
 if(shotgun){
  add(gun,rounded(.047,.061,.245,.008),m.metal,[0,.035,-.068]);add(slide,rounded(.003,.024,.065,.003),m.steel,[.024,.035,-.080]);add(gun,rounded(.001,.026,.07,.003),m.dark,[.0245,.035,-.080]);
  rod(gun,m.metal,[0,.059,-.431],.0115,.515);rod(gun,m.metal,[0,.016,-.315],.0135,.42);muzzle(gun,m,-.690,.059,.0115);
  add(pump,rounded(.053,.050,.160,.013),m.rubber,[0,.010,-.367]);for(let i=0;i<18;i++){add(pump,new T.TorusGeometry(.025,.0011,8,40),m.dark,[0,.010,-.438+i*.008]).scale.y=.90;}
  add(gun,rounded(.041,.044,.250,.008),m.rubber,[0,.015,.196]).rotateX(.13);add(gun,rounded(.043,.095,.04,.011),m.rubber,[0,-.020,.334]);
  const shell=add(root,new T.CylinderGeometry(.009,.009,.045,32),m.shell||m.rubber,[0,-.02,-.07]);shell.rotation.x=Math.PI/2;shell.visible=false;root.userData.shell=shell;
  sights(gun,m,-.61,.082,false);
 }else{
  add(gun,rounded(.048,.061,.23,.006),m.metal,[0,.04,-.073]);add(gun,rounded(.039,.03,.14,.004),m.frame,[0,-.007,-.067]);
  add(gun,rounded(.041,.052,.24,.008),m.rubber,[0,.035,-.300]);rod(gun,m.steel,[0,.071,-.424],.010,.265);rod(gun,m.metal,[0,.094,-.385],.0036,.20);
  for(const side of[-1,1])for(let i=0;i<8;i++){add(gun,rounded(.0006,.018,.017,.004),m.dark,[side*.021,.046,-.209-i*.024]);add(gun,rounded(.0009,.004,.19,.001),m.frame,[side*.021,.012,-.30]);}
  for(let i=0;i<29;i++)add(gun,rounded(.030,.003,.002,.0005),m.steel,[0,.080,.014-i*.015]);
  rod(gun,m.metal,[0,.071,-.551],.014,.022);muzzle(gun,m,-.564,.071,.012);for(const side of[-1,1])for(let i=0;i<3;i++)add(gun,rounded(.001,.005,.001,.0003),m.dark,[side*.013,.071,-.548-i*.004]);
  magazine.position.set(0,-.025,-.111);add(magazine,rounded(.028,.135,.052,.004),m.magazine,[0,-.057,.015]).rotateX(-.12);for(const side of[-1,1])for(let i=0;i<4;i++)add(magazine,rounded(.001,.100,.002,.0005),m.dark,[side*.0146,-.053,-.006+i*.013]);add(magazine,rounded(.034,.009,.057,.002),m.rubber,[0,-.121,.023]);
  rod(gun,m.steel,[0,.031,.153],.015,.15);add(gun,rounded(.04,.092,.088,.01),m.rubber,[0,-.010,.246]);add(gun,rounded(.044,.113,.024,.01),m.rubber,[0,-.024,.29]);
  add(gun,rounded(.002,.024,.050,.004),m.dark,[.0245,.038,-.108]);add(slide,rounded(.003,.012,.037,.002),m.steel,[.025,.038,-.108]);
  sights(gun,m,-.406,.105,true);
 }
 const {hands,skins}=createHands(m,root),left=hands[1];left.position.set(-.020,-.071,shotgun?-.348:-.278);left.userData.rest=left.position.toArray();left.rotation.set(0,0,-.30);left.userData.restRotation=[0,0,-.30];
 return {root,gun,slide,grip:g,magazine,trigger,hammer,pump,rightHand:hands[0],leftHand:left,rightSkin:skins[0],leftSkin:skins[1],muzzleAt:shotgun?[0,.059,-.69]:[0,.071,-.564]};
}
