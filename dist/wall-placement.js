// Wall decorations use real exposed faces, never the center of a room's bounds.
const EPS=.00001;
const tangent=f=>[f.nz,-f.nx];
const coordinate=f=>f.x*f.nz-f.z*f.nx;
const plane=f=>f.x*f.nx+f.z*f.nz;
const sameFace=(a,b)=>a.nx===b.nx&&a.nz===b.nz&&Math.abs(plane(a)-plane(b))<EPS;
const overlaps=(a,b)=>a.minX<b.maxX-EPS&&a.maxX>b.minX+EPS&&a.minZ<b.maxZ-EPS&&a.maxZ>b.minZ+EPS;
const subtract=(spaces,lo,hi)=>spaces.flatMap(([a,b])=>hi<=a||lo>=b?[[a,b]]:[[a,Math.min(b,lo)],[Math.max(a,hi),b]].filter(([l,h])=>h-l>EPS));

export function mountBounds(m){
 const x=m.x+m.nx*m.depth/2,z=m.z+m.nz*m.depth/2,hw=(Math.abs(m.nz)*m.width+Math.abs(m.nx)*m.depth)/2,hd=(Math.abs(m.nx)*m.width+Math.abs(m.nz)*m.depth)/2;
 return {minX:x-hw,maxX:x+hw,minZ:z-hd,maxZ:z+hd};
}
export function roomDoorways(grid,bounds,tile=2.4){
 const [a,b,c,d]=bounds,doors=[];
 for(const [nx,nz]of[[0,1],[1,0],[-1,0],[0,-1]])for(let i=nz?a:b;i<=(nz?c:d);i++){
  const x=nz?(i+.5)*tile:(nx>0?a:c+1)*tile,z=nx?(i+.5)*tile:(nz>0?b:d+1)*tile;
  if(grid[Math.floor((z-nz*.02)/tile)]?.[Math.floor((x-nx*.02)/tile)]!==0)continue;
  const hw=nz?tile/2:.6,hd=nx?tile/2:.6;doors.push({x,z,nx,nz,minX:x-hw,maxX:x+hw,minZ:z-hd,maxZ:z+hd});
 }
 return doors;
}

export function wallSupported(grid,mount,tile=2.4){
 const {x,z,nx,nz,width}=mount;
 if(![x,z,nx,nz,width].every(Number.isFinite)||width<=0||!(Math.abs(nx)===1&&nz===0||Math.abs(nz)===1&&nx===0))return false;
 const [tx,tz]=tangent(mount),lo=coordinate(mount)-width/2,hi=lo+width;
 // Check each crossed tile interval, including narrow slivers at either end.
 const cuts=[lo,hi];for(let k=Math.floor(lo/tile)+1;k*tile<hi-EPS;k++)cuts.push(k*tile);
 cuts.sort((a,b)=>a-b);
 for(let i=1;i<cuts.length;i++){
  const offset=(cuts[i-1]+cuts[i])/2-coordinate(mount),px=x+tx*offset,pz=z+tz*offset;
  const back=grid[Math.floor((pz-nz*.02)/tile)]?.[Math.floor((px-nx*.02)/tile)];
  const front=grid[Math.floor((pz+nz*.02)/tile)]?.[Math.floor((px+nx*.02)/tile)];
  if(back!==1||front!==0)return false;
 }
 return true;
}

export function roomWallRuns(grid,bounds,tile=2.4){
 const [a,b,c,d]=bounds,runs=[];
 for(const [side,nx,nz]of[['north',0,1],['west',1,0],['east',-1,0],['south',0,-1]]){
  const faces=[];
  for(let i=(nz?a:b);i<=(nz?c:d);i++){
   const x=nz?(i+.5)*tile:(nx>0?a:c+1)*tile,z=nx?(i+.5)*tile:(nz>0?b:d+1)*tile;
   const face={x,z,nx,nz,width:tile};if(wallSupported(grid,face,tile))faces.push({...face,u:coordinate(face)});
  }
  faces.sort((a,b)=>a.u-b.u);
  let run;
  for(const f of faces){const lo=f.u-tile/2,hi=f.u+tile/2;
   if(run&&Math.abs(run.hi-lo)<EPS)run.hi=hi;
   else{run={...f,side,lo,hi};runs.push(run);}
  }
 }
 return runs;
}

export function mountsOverlap(a,b,gap=.08){
 return sameFace(a,b)&&Math.abs(coordinate(a)-coordinate(b))<(a.width+b.width)/2+gap-EPS&&Math.abs(a.y-b.y)<(a.height+b.height)/2+gap-EPS;
}

export class WallPlacement{
 constructor(grid,tile=2.4,rooms=[]){this.grid=grid;this.tile=tile;this.mounts=[];this.doorways=rooms.flatMap(r=>roomDoorways(grid,r.bounds,tile));}
 reserve(face,{kind,width,height,y,depth=.12,room=null,gap=.08}){
  const mount={...face,kind,width,height,y,depth,room,yaw:Math.atan2(face.nx,face.nz)};
  if(![height,y,depth].every(Number.isFinite)||height<=0||y-height/2<0||y+height/2>3.25||depth<0||!wallSupported(this.grid,mount,this.tile)||this.mounts.some(m=>mountsOverlap(m,mount,gap))||this.doorways.some(d=>overlaps(mountBounds(mount),d)))return null;
  this.mounts.push(mount);return mount;
 }
 place(bounds,options){
  const {width,height,y,minWidth=width,depth=.12,preferred=['north','west','east','south'],clearance=.14,gap=.08}=options;
  const runs=roomWallRuns(this.grid,bounds,this.tile).sort((a,b)=>preferred.indexOf(a.side)-preferred.indexOf(b.side)||b.hi-b.lo-(a.hi-a.lo));
  // Try full size on every wall before considering a smaller supported panel.
  for(const w of [...new Set([width,minWidth])])for(const run of runs){
   let spaces=[[run.lo+clearance,run.hi-clearance]];
   for(const door of this.doorways){
    const nlo=run.nx>0?door.minX:run.nx<0?-door.maxX:run.nz>0?door.minZ:-door.maxZ,nhi=run.nx>0?door.maxX:run.nx<0?-door.minX:run.nz>0?door.maxZ:-door.minZ;
    if(plane(run)>=nhi-EPS||plane(run)+depth<=nlo+EPS)continue;
    const lo=run.nz>0?door.minX:run.nz<0?-door.maxX:run.nx>0?-door.maxZ:door.minZ,hi=run.nz>0?door.maxX:run.nz<0?-door.minX:run.nx>0?-door.minZ:door.maxZ;
    spaces=subtract(spaces,lo-gap,hi+gap);
   }
   for(const m of this.mounts){if(!sameFace(run,m)||Math.abs(y-m.y)>=(height+m.height)/2+gap-EPS)continue;
    const lo=coordinate(m)-m.width/2-gap,hi=coordinate(m)+m.width/2+gap;
    spaces=subtract(spaces,lo,hi);
   }
   spaces.sort((a,b)=>b[1]-b[0]-(a[1]-a[0]));
   for(const [lo,hi]of spaces){if(hi-lo<w-EPS)continue;
    const u=(lo+hi)/2,delta=u-coordinate(run),[tx,tz]=tangent(run);
    const mount=this.reserve({...run,x:run.x+tx*delta,z:run.z+tz*delta},{...options,width:w});if(mount)return mount;
   }
  }
  return null;
 }
}
