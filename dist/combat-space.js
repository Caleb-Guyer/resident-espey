import {enemyRadius} from './enemy-director.js?v=5.4.2';
import {solid} from './data.js?v=5.4.2';

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
export function encounterViewClear(grid,props,camera,focus){
 if(!cameraClear(grid,props,camera.x,camera.y,camera.z))return false;
 const length=Math.hypot(camera.x-focus.x,camera.y-focus.y,camera.z-focus.z),steps=Math.ceil(length/.24);
 for(let i=1;i<steps;i++){const u=i/steps;if(length*u<.4)continue;const x=focus.x+(camera.x-focus.x)*u,y=focus.y+(camera.y-focus.y)*u,z=focus.z+(camera.z-focus.z)*u;if(solid(grid,x,z,.05))return false;
  for(const p of props){if(p.active===false&&!p.blocksShots)continue;if(focus.x>p.x-p.w/2&&focus.x<p.x+p.w/2&&focus.z>p.z-p.d/2&&focus.z<p.z+p.d/2)continue;if(y>(p.minY||0)&&y<p.h&&x>p.x-p.w/2&&x<p.x+p.w/2&&z>p.z-p.d/2&&z<p.z+p.d/2)return false;}
 }return true;
}
export function fitEncounterCamera(grid,props,desired,fallback,out,focus=null){
 if(focus){
  if(encounterViewClear(grid,props,desired,focus))return out.copy(desired);
  // Bounded search stays on the authored side of the creature. A camera can
  // occupy clear floor while still looking through a wall or a closed shutter.
  for(let i=1;i<=12;i++){const u=1-i/16;out.set(focus.x+(desired.x-focus.x)*u,desired.y,focus.z+(desired.z-focus.z)*u);if(Math.hypot(out.x-focus.x,out.z-focus.z)>.75&&encounterViewClear(grid,props,out,focus))return out;}
  for(let i=1;i<=12;i++){const u=i/12;out.set(desired.x+(fallback.x-desired.x)*u,desired.y,desired.z+(fallback.z-desired.z)*u);if(encounterViewClear(grid,props,out,focus))return out;}
 }
 if(cameraClear(grid,props,desired.x,desired.y,desired.z)){out.copy(desired);return out;}
 const length=Math.hypot(desired.x-fallback.x,desired.z-fallback.z),steps=Math.max(1,Math.ceil(length/.12));
 for(let i=1;i<=steps;i++){const u=i/steps,x=desired.x+(fallback.x-desired.x)*u,z=desired.z+(fallback.z-desired.z)*u;if(cameraClear(grid,props,x,desired.y,z)){out.set(x,desired.y,z);return out;}}
 out.set(fallback.x,Number.isFinite(fallback.eyeHeight)?fallback.eyeHeight:1.64,fallback.z);return out;
}
