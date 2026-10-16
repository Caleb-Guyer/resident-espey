import {solid} from './data.js?v=5.5.3';

export const EYE_HEIGHT=1.64;
export const CEILING=3.35;
export function viewDirection(yaw=0,pitch=0){
 const c=Math.cos(pitch);
 return {x:-Math.sin(yaw)*c,y:Math.sin(pitch),z:-Math.cos(yaw)*c};
}
export function relativeMove(strafe,backward,yaw=0){
 return {x:strafe*Math.cos(yaw)+backward*Math.sin(yaw),z:-strafe*Math.sin(yaw)+backward*Math.cos(yaw)};
}
export const BODY_SCALE={chris:[1.2,1.15],jakob:[1.65,1.43],zeb:[2.1,1.45],zsiga:[.76,1.16],birdy:[1,1.12],crawler:[1,.64],spitter:[.92,1.12],brute:[1.5,1.17],stalker:[.8,1.25]};

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
 if(c<=0)return 0;if(d<0)return Infinity;
 const t=-b-Math.sqrt(d);return t>=0?t:Infinity;
}
export function capsuleIntersection(origin,direction,a,b,r){
 const bx=b.x-a.x,by=b.y-a.y,bz=b.z-a.z,ox=origin.x-a.x,oy=origin.y-a.y,oz=origin.z-a.z;
 const baba=bx*bx+by*by+bz*bz,bard=bx*direction.x+by*direction.y+bz*direction.z,baoa=bx*ox+by*oy+bz*oz,rdoa=direction.x*ox+direction.y*oy+direction.z*oz,oaoa=ox*ox+oy*oy+oz*oz,A=baba-bard*bard,B=baba*rdoa-baoa*bard,C=baba*oaoa-baoa*baoa-r*r*baba,H=B*B-A*C;
 if(baba>1e-8&&baoa>=0&&baoa<=baba&&oaoa-baoa*baoa/baba<=r*r)return 0;
 let best=Math.min(sphereIntersection(origin,direction,a,r),sphereIntersection(origin,direction,b,r));
 if(H>=0&&A>1e-8){const t=(-B-Math.sqrt(H))/A,y=baoa+t*bard;if(t>=0&&y>0&&y<baba)best=Math.min(best,t);}
 return best;
}
export function propsOcclude(props,a,b,ay=1.5,by=1.5){
 const dx=b.x-a.x,dy=by-ay,dz=b.z-a.z,len=Math.hypot(dx,dy,dz);if(len<1e-6)return false;
 boxes:for(const p of props){if(p.active===false&&!p.blocksShots)continue;let near=0,far=1;
  for(let axis=0;axis<3;axis++){const o=axis===0?a.x:axis===1?ay:a.z,d=axis===0?dx:axis===1?dy:dz,lo=axis===0?p.x-p.w/2:axis===1?(p.minY||0):p.z-p.d/2,hi=axis===0?p.x+p.w/2:axis===1?p.h:p.z+p.d/2;
   if(Math.abs(d)<1e-7){if(o<lo||o>hi)continue boxes;}else{const t1=(lo-o)/d,t2=(hi-o)/d;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));if(near>far)continue boxes;}
  }if(near<1-.04/len)return true;
 }return false;
}

// The ballistic ray uses height as well as direction. Shooting the floor or ceiling
// cannot damage a creature, and furniture occludes shots just like the walls.
export function environmentDistance(grid,origin,direction,props=[],maxDistance=24){
 let limit=Number.isFinite(maxDistance)?Math.max(.1,Math.min(50,maxDistance)):24;
 for(let t=.08;t<limit;t+=.08){
  const y=origin.y+direction.y*t;
  if(y<=.03||y>=CEILING-.03||solid(grid,origin.x+direction.x*t,origin.z+direction.z*t,.025)){limit=t;break;}
 }
 for(const p of props){
  if(p.active===false&&!p.blocksShots)continue;
  const t=boxIntersection(origin,direction,{x:p.x-p.w/2,y:p.minY||0,z:p.z-p.d/2},{x:p.x+p.w/2,y:p.h,z:p.z+p.d/2});
  if(t<limit)limit=t;
 }
 return limit;
}
export function traceShot(grid,origin,enemies,direction,props=[],maxDistance=24){
 let limit=environmentDistance(grid,origin,direction,props,maxDistance);
 let enemy=null,headshot=false,headIndex=null,hitPart=null;const fallbackHead={x:0,y:0,z:0},min={x:0,y:0,z:0},max={x:0,y:0,z:0};
 for(const e of enemies){
  if(e.dead||e.dormant)continue;
  const [wide,tall]=BODY_SCALE[e.kind]||[1,1];
  let head=Infinity,nearestHead=0,body=Infinity,partName='torso';const r=e.kind==='jakob'?.24:e.zombie?.16:.24*wide;
  if(Array.isArray(e.hitHeads)){for(let i=0;i<e.hitHeads.length;i++){const t=sphereIntersection(origin,direction,e.hitHeads[i],r);if(t<head){head=t;nearestHead=i;}}}
  else {fallbackHead.x=e.x;fallbackHead.y=1.64*tall;fallbackHead.z=e.z;head=sphereIntersection(origin,direction,fallbackHead,r);}
  if(Array.isArray(e.hitParts)){for(const part of e.hitParts){const t=capsuleIntersection(origin,direction,part.a,part.b,part.r);if(t<body){body=t;partName=part.name||'torso';}}}
  else {min.x=e.x-.34*wide;min.y=e.kind==='crawler'?.04:.25;min.z=e.z-.34*wide;max.x=e.x+.34*wide;max.y=e.kind==='crawler'?.78:1.48*tall;max.z=e.z+.34*wide;body=boxIntersection(origin,direction,min,max);}
  const t=Math.min(head,body);
  if(t<limit){limit=t;enemy=e;headshot=head<=body;headIndex=headshot?nearestHead:null;hitPart=headshot?'head':partName;}
 }
 return {enemy,headshot,headIndex,hitPart,distance:limit,end:{x:origin.x+direction.x*limit,y:origin.y+direction.y*limit,z:origin.z+direction.z*limit}};
}
