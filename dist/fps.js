import {solid} from './data.js?v=4.1.0';

export const EYE_HEIGHT=1.64;
export const CEILING=3.35;
export function viewDirection(yaw=0,pitch=0){
 const c=Math.cos(pitch);
 return {x:-Math.sin(yaw)*c,y:Math.sin(pitch),z:-Math.cos(yaw)*c};
}
export function relativeMove(strafe,backward,yaw=0){
 return {x:strafe*Math.cos(yaw)+backward*Math.sin(yaw),z:-strafe*Math.sin(yaw)+backward*Math.cos(yaw)};
}
export const BODY_SCALE={chris:[1.2,1.15],jakob:[1.18,1.65],zeb:[2.1,1.45],zsiga:[.76,1.16],birdy:[.8,1]};

export function propsBlock(props,x,z,r=.32){
 return props.some(p=>p.active!==false&&x+r>p.x-p.w/2&&x-r<p.x+p.w/2&&z+r>p.z-p.d/2&&z-r<p.z+p.d/2);
}
function boxIntersection(origin,direction,min,max){
 let near=0,far=Infinity;
 for(const key of ['x','y','z']){
  const d=direction[key],o=origin[key];
  if(Math.abs(d)<1e-7){if(o<min[key]||o>max[key])return Infinity;continue;}
  const a=(min[key]-o)/d,b=(max[key]-o)/d;
  near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
  if(near>far)return Infinity;
 }
 return near;
}
function sphereIntersection(origin,direction,center,r){
 const x=origin.x-center.x,y=origin.y-center.y,z=origin.z-center.z;
 const b=x*direction.x+y*direction.y+z*direction.z,c=x*x+y*y+z*z-r*r,d=b*b-c;
 if(d<0)return Infinity;
 const t=-b-Math.sqrt(d);return t>=0?t:Infinity;
}

// The ballistic ray uses height as well as direction. Shooting the floor or ceiling
// cannot damage a creature, and furniture occludes shots just like the walls.
export function traceShot(grid,origin,enemies,direction,props=[]){
 let limit=24;
 for(let t=.08;t<limit;t+=.08){
  const y=origin.y+direction.y*t;
  if(y<=.03||y>=CEILING-.03||solid(grid,origin.x+direction.x*t,origin.z+direction.z*t,.025)){limit=t;break;}
 }
 for(const p of props){
  if(p.active===false)continue;
  const t=boxIntersection(origin,direction,{x:p.x-p.w/2,y:0,z:p.z-p.d/2},{x:p.x+p.w/2,y:p.h,z:p.z+p.d/2});
  if(t<limit)limit=t;
 }
 let enemy=null,headshot=false;
 for(const e of enemies){
  if(e.dead||e.dormant)continue;
  const [wide,tall]=BODY_SCALE[e.kind]||[1,1];
  const head=sphereIntersection(origin,direction,{x:e.x,y:1.64*tall,z:e.z},.24*wide);
  const body=boxIntersection(origin,direction,{x:e.x-.34*wide,y:.25,z:e.z-.34*wide},{x:e.x+.34*wide,y:1.48*tall,z:e.z+.34*wide});
  const t=Math.min(head,body);
  if(t<limit){limit=t;enemy=e;headshot=head<=body;}
 }
 return {enemy,headshot,distance:limit,end:{x:origin.x+direction.x*limit,y:origin.y+direction.y*limit,z:origin.z+direction.z*limit}};
}
