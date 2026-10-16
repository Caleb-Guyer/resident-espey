import * as T from './vendor/three.module.js?v=5.4.1';
import {createHands} from './viewmodel.js?v=5.4.1';
import {profileGeometry} from './profile-geometry.js?v=5.4.1';
const add=(g,geo,m,p=[0,0,0],scale=[1,1,1])=>{const o=new T.Mesh(geo,m);o.position.set(...p);o.scale.set(...scale);g.add(o);return o;};
const group=(g,p=[0,0,0])=>{const o=new T.Group();o.position.set(...p);g.add(o);return o;};
function rounded(w,h,d,r=.005){const x=w/2,y=h/2,s=new T.Shape();s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.quadraticCurveTo(x,-y,x,-y+r);s.lineTo(x,y-r);s.quadraticCurveTo(x,y,x-r,y);s.lineTo(-x+r,y);s.quadraticCurveTo(-x,y,-x,y-r);s.lineTo(-x,-y+r);s.quadraticCurveTo(-x,-y,-x+r,-y);const g=new T.ExtrudeGeometry(s,{depth:d-r*2,bevelEnabled:true,bevelSegments:Math.min(w,h,d)<.002?1:5,bevelThickness:r,bevelSize:r,curveSegments:Math.min(w,h,d)<.002?2:12}).translate(0,0,-d/2+r);g.computeBoundingBox();const a=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,min=g.boundingBox.min,size=g.boundingBox.getSize(new T.Vector3());for(let i=0;i<a.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));u.setXY(i,nx>ny&&nx>nz?(a.getZ(i)-min.z)/(size.z||1):(a.getX(i)-min.x)/(size.x||1),ny>nx&&ny>nz?(a.getZ(i)-min.z)/(size.z||1):(a.getY(i)-min.y)/(size.y||1));}return g;}
function rod(g,m,at,r,len){return add(g,new T.CylinderGeometry(r,r,len,40),m,at).rotateX(Math.PI/2);}
function muzzle(g,m,z,y,r){add(g,new T.TorusGeometry(r,.0018,16,48),m.steel,[0,y,z]);add(g,new T.CircleGeometry(r-.002,48),m.dark,[0,y,z-.001]).rotateY(Math.PI);}
function grip(g,m){const o=group(g,[0,-.066,.035]);o.rotation.x=-.24;add(o,rounded(.035,.116,.052,.006),m.rubber);for(const side of[-1,1])for(let i=0;i<14;i++)add(o,rounded(.0008,.0015,.04,.0004),m.dark,[side*.018, -.048+i*.007,0]);return o;}
function sights(g,m,z,y,carbine){const rear=group(g,[0,y+.006,.034]);add(rear,rounded(.010,.018,.011,.002),m.dark,[0,-.015,0]);add(rear,new T.TorusGeometry(.008,.0023,12,32),m.steel,[0,0,.010]);add(g,rounded(.003,.019,.006,.001),m.dark,[0,y,z]);add(g,new T.CircleGeometry(.001,20),m.sight,[0,y+.006,z+.004]);if(carbine)for(const side of[-1,1])add(g,new T.TubeGeometry(new T.CatmullRomCurve3([[side*.016,-.005,0],[side*.015,.013,0],[side*.008,.021,0]].map(p=>new T.Vector3(...p))),24,.002,8,false),m.dark,[0,y,z]);}
export function createLongGun(m,id){
 const root=new T.Group(),gun=group(root),slide=group(gun),hammer=group(gun),trigger=group(gun,[0,-.012,-.022]),g=grip(gun,m),magazine=group(gun),pump=group(gun),shotgun=id==='shotgun';
 const guard=new T.CatmullRomCurve3([[0,-.012,0],[0,-.053,-.014],[0,-.052,-.059],[0,-.020,-.066]].map(p=>new T.Vector3(...p)));add(gun,new T.TubeGeometry(guard,40,.0026,12,false),m.metal);
 add(trigger,new T.TubeGeometry(new T.CatmullRomCurve3([[0,0,0],[0,-.021,-.002],[0,-.025,.004]].map(p=>new T.Vector3(...p))),24,.002,10,false),m.steel);
 if(shotgun){
  add(gun,profileGeometry([[-.191,.027,.035,.035],[-.183,.043,.052,.035],[-.155,.047,.061,.035],[.031,.044,.057,.035],[.052,.031,.038,.036]],.55),m.metal);add(slide,rounded(.003,.024,.065,.003),m.steel,[.023,.035,-.080]);add(gun,rounded(.001,.026,.07,.003),m.dark,[.0235,.035,-.080]);
  rod(gun,m.metal,[0,.059,-.431],.0115,.515);rod(gun,m.metal,[0,.016,-.315],.0135,.42);muzzle(gun,m,-.690,.059,.0115);
  add(pump,profileGeometry([[-.450,.040,.039,.010],[-.437,.052,.050,.010],[-.300,.051,.050,.010],[-.284,.038,.039,.010]],.82),m.rubber);for(let i=0;i<18;i++){add(pump,new T.TorusGeometry(.025,.0011,8,40),m.dark,[0,.010,-.438+i*.008]).scale.y=.90;}
  add(gun,profileGeometry([[.064,.023,.031,.020],[.100,.031,.039,.014],[.18,.041,.044,.006],[.280,.043,.071,-.018],[.326,.042,.093,-.023],[.342,.037,.091,-.025]],.8),m.rubber);add(gun,rounded(.043,.095,.012,.004),m.dark,[0,-.025,.348]);
  const shell=add(root,new T.CylinderGeometry(.009,.009,.045,32),m.shell||m.rubber,[0,-.02,-.07]);shell.rotation.x=Math.PI/2;shell.visible=false;root.userData.shell=shell;
  sights(gun,m,-.61,.082,false);
 }else{
  add(gun,profileGeometry([[-.188,.035,.040,.043],[-.179,.047,.055,.041],[-.145,.048,.061,.040],[.020,.045,.055,.040],[.044,.029,.037,.040]],.5),m.metal);add(gun,rounded(.039,.03,.14,.004),m.frame,[0,-.007,-.067]);
  const fore=profileGeometry([[-.421,.034,.041,.037],[-.402,.040,.050,.035],[-.201,.040,.050,.035],[-.184,.033,.043,.035]],.62);add(gun,fore,m.frame);rod(gun,m.steel,[0,.071,-.424],.010,.265);rod(gun,m.metal,[0,.094,-.385],.0036,.20);
  for(const side of[-1,1])for(let i=0;i<8;i++){add(gun,rounded(.0006,.018,.017,.004),m.dark,[side*.021,.046,-.209-i*.024]);add(gun,rounded(.0009,.004,.19,.001),m.frame,[side*.021,.012,-.30]);}
  for(let i=0;i<29;i++)add(gun,rounded(.030,.003,.002,.0005),m.steel,[0,.080,.014-i*.015]);
  rod(gun,m.metal,[0,.071,-.551],.014,.022);muzzle(gun,m,-.564,.071,.012);for(const side of[-1,1])for(let i=0;i<3;i++)add(gun,rounded(.001,.005,.001,.0003),m.dark,[side*.013,.071,-.548-i*.004]);
  magazine.position.set(0,-.025,-.111);add(magazine,rounded(.028,.135,.052,.004),m.magazine,[0,-.057,.015]).rotateX(-.12);for(const side of[-1,1])for(let i=0;i<4;i++)add(magazine,rounded(.001,.100,.002,.0005),m.dark,[side*.0146,-.053,-.006+i*.013]);add(magazine,rounded(.034,.009,.057,.002),m.rubber,[0,-.121,.023]);
  rod(gun,m.steel,[0,.031,.153],.015,.15);add(gun,profileGeometry([[.188,.023,.034,.027],[.215,.038,.051,.008],[.247,.042,.093,-.009],[.284,.043,.111,-.024],[.303,.035,.107,-.026]],.85),m.rubber);add(gun,rounded(.043,.108,.010,.003),m.dark,[0,-.024,.309]);
  add(gun,rounded(.002,.024,.050,.004),m.dark,[.0245,.038,-.108]);add(slide,rounded(.003,.012,.037,.002),m.steel,[.025,.038,-.108]);
  sights(gun,m,-.406,.105,true);
 }
 const {hands,skins}=createHands(m,root,true),left=hands[1];left.position.set(-.020,-.071,shotgun?-.348:-.278);left.userData.rest=left.position.toArray();left.rotation.set(0,0,-.30);left.userData.restRotation=[0,0,-.30];
 return {root,gun,slide,grip:g,magazine,trigger,hammer,pump,rightHand:hands[0],leftHand:left,rightSkin:skins[0],leftSkin:skins[1],muzzleAt:shotgun?[0,.059,-.69]:[0,.071,-.564]};
}
