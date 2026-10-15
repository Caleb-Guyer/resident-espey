import {enemyRadius} from './enemy-director.js?v=5.1.1';
import {solid} from './data.js?v=5.1.1';

// Soft steering keeps a group moving without turning creatures into a queue
// of rigid obstacles. Committed tells and charges use their original paths.
export function crowdSteering(e,enemies,player,dx,dz,out={x:0,z:0}){
 let x=dx,z=dz;const self=Number.isInteger(e.id)?e.id:enemies.indexOf(e);
 for(let i=0;i<enemies.length;i++){
  const other=enemies[i];if(other===e||other.dead||other.dormant)continue;
  let ax=e.x-other.x,az=e.z-other.z,d=Math.hypot(ax,az),gap=enemyRadius(e)+enemyRadius(other)+.24;if(d>=gap)continue;
  if(d<.001){const id=Number.isInteger(other.id)?other.id:i;ax=self<id?-.001:.001;az=0;d=.001;}
  const weight=(1-d/gap)*1.7;x+=ax/Math.max(d,.001)*weight;z+=az/Math.max(d,.001)*weight;
 }
 const ax=e.x-player.x,az=e.z-player.z,d=Math.hypot(ax,az),gap=enemyRadius(e)+.56;
 if(d>1e-5&&d<gap){const weight=(1-d/gap)*2.2;x+=ax/d*weight;z+=az/d*weight;}
 const length=Math.hypot(x,z);out.x=length>1e-5?x/length:0;out.z=length>1e-5?z/length:0;return out;
}
export function segmentDistanceSq(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l>1e-8?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l)):0;return (x-ax-dx*t)**2+(z-az-dz*t)**2;}
export function damageDirection(player,source,out={x:50,y:50}){
 const dx=(source?.sourceX??source?.x??player.x)-player.x,dz=(source?.sourceZ??source?.z??player.z)-player.z,len=Math.hypot(dx,dz),yaw=player.yaw||0;
 out.x=len>1e-5?50+48*(dx*Math.cos(yaw)-dz*Math.sin(yaw))/len:50;
 out.y=len>1e-5?50+48*(dx*Math.sin(yaw)+dz*Math.cos(yaw))/len:50;return out;
}
export function cameraClear(grid,props,x,y,z){
 if(solid(grid,x,z,.16))return false;
 for(const p of props)if((p.active!==false||p.blocksShots)&&y>(p.minY||0)-.16&&y<p.h+.16&&x>p.x-p.w/2-.16&&x<p.x+p.w/2+.16&&z>p.z-p.d/2-.16&&z<p.z+p.d/2+.16)return false;
 return true;
}
export function fitEncounterCamera(grid,props,desired,fallback,out){
 if(cameraClear(grid,props,desired.x,desired.y,desired.z)){out.copy(desired);return out;}
 const length=Math.hypot(desired.x-fallback.x,desired.z-fallback.z),steps=Math.max(1,Math.ceil(length/.12));
 for(let i=1;i<=steps;i++){const u=i/steps,x=desired.x+(fallback.x-desired.x)*u,z=desired.z+(fallback.z-desired.z)*u;if(cameraClear(grid,props,x,desired.y,z)){out.set(x,desired.y,z);return out;}}
 out.set(fallback.x,Number.isFinite(fallback.eyeHeight)?fallback.eyeHeight:1.64,fallback.z);return out;
}
