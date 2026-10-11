import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {WallPlacement,roomWallRuns,wallSupported,mountsOverlap} from '../dist/wall-placement.js';
import {LEVELS,makeLevelGrid} from '../dist/levels.js';
import {CHAPTERS,TILE,findPath} from '../dist/data.js';
import {World} from '../dist/world.js';

test('The sanctuary chalkboard cannot span the north exit and moves intact onto a side wall',()=>{
 const r=LEVELS.school.rooms[0],grid=makeLevelGrid('school'),p=new WallPlacement(grid,TILE);
 const old={x:12,z:18*TILE,nx:0,nz:1,width:14.4*.56};assert.equal(wallSupported(grid,old),false);
 const north=roomWallRuns(grid,r.bounds).filter(r=>r.side==='north');assert.deepEqual(north.map(r=>Math.round((r.hi-r.lo)*10)/10),[7.2,4.8]);
 const sign=p.place(r.bounds,{kind:'sign',width:5,height:.4,y:2.8});assert.ok(sign);assert.equal(sign.side,'north');
 const board=p.place(r.bounds,{kind:'board',width:14.4*.56,minWidth:4,height:1.72,y:1.9});assert.ok(board);assert.equal(board.side,'west');assert.equal(board.width,14.4*.56);assert.ok(wallSupported(grid,board));
});
test('Every cardinal face requires solid backing and open floor across its entire width',()=>{
 const grid=Array.from({length:7},()=>Array(7).fill(1));for(let z=2;z<=4;z++)for(let x=2;x<=4;x++)grid[z][x]=0;
 const runs=roomWallRuns(grid,[2,2,4,4]);assert.equal(runs.length,4);
 for(const r of runs){assert.ok(wallSupported(grid,r));assert.equal(wallSupported(grid,{...r,width:10}),false);assert.equal(wallSupported(grid,{...r,x:r.x+r.nx*.1,z:r.z+r.nz*.1}),false);}
 assert.equal(wallSupported(grid,{x:4.8,z:4.8,nx:.5,nz:.5,width:1}),false);
});
test('A narrow doorway sliver is rejected instead of slipping between sample points',()=>{
 const grid=makeLevelGrid('school'),edge=5*TILE;
 assert.equal(wallSupported(grid,{x:edge-.5,z:18*TILE,nx:0,nz:1,width:1.0002}),false);
 assert.equal(wallSupported(grid,{x:edge-.5,z:18*TILE,nx:0,nz:1,width:.9998}),true);
});
test('Overlapping windows and fixtures are refused, while separate height bands remain usable',()=>{
 const p=new WallPlacement(makeLevelGrid('school')),face={x:8.4,z:43.2,nx:0,nz:1};
 const board=p.reserve(face,{kind:'board',width:3,height:1.3,y:1.9});assert.ok(board);
 assert.equal(p.reserve(face,{kind:'window',width:1.87,height:1.56,y:1.93}),null);
 const radiator=p.reserve(face,{kind:'radiator',width:1.1,height:.54,y:.42});assert.ok(radiator);assert.equal(mountsOverlap(board,radiator),false);
});
test('Panels shrink only when no full sized wall fits, and disappear when no support fits',()=>{
 const p=new WallPlacement(makeLevelGrid('school')),bounds=LEVELS.school.rooms[0].bounds;
 const small=p.place(bounds,{kind:'board',width:100,minWidth:4,height:1,y:1.6});assert.equal(small.width,4);
 assert.equal(p.place(bounds,{kind:'board',width:100,height:1,y:1.6}),null);
});

function fixture(chapter){
 const w=Object.create(World.prototype);w.root=new T.Group();w.grid=makeLevelGrid(chapter.theme);w.config=chapter;w.theme=chapter.theme;w.level=chapter.level;w.obstacles=[];w.protectedCells=new Set();
 for(const route of [w.level.route,...chapter.items.map(i=>[chapter.start,i.at])])for(let i=1;i<route.length;i++)for(const pt of findPath(w.grid,{x:(route[i-1][0]+.5)*TILE,z:(route[i-1][1]+.5)*TILE},{x:(route[i][0]+.5)*TILE,z:(route[i][1]+.5)*TILE}))w.protectedCells.add(Math.floor(pt.x/TILE)+','+Math.floor(pt.z/TILE));
 w.palette=Object.fromEntries(['metal','black','wood','paper','rust','glass','bone','blood'].map(k=>[k,new T.MeshStandardMaterial()]));w.procedural=()=>new T.Texture();w.surface=()=>new T.MeshStandardMaterial();w.wallPlacement=new WallPlacement(w.grid,TILE,w.level.rooms);w.wallMounts=w.wallPlacement.mounts;
 const before=globalThis.document;
 globalThis.document={createElement(){const canvas={width:512,height:512};const gradient={addColorStop(){}};const context=new Proxy({canvas,createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,k)=>k in t?t[k]:()=>{}});canvas.getContext=()=>context;return canvas;}};
 try{w.dressDirectedRooms(chapter);w.dressArchitecture();w.root.updateMatrixWorld(true);return w;}finally{globalThis.document=before;}
}
function doorPrisms(grid,bounds){
 const [a,b,c,d]=bounds,prisms=[];
 for(const [nx,nz]of [[0,1],[1,0],[-1,0],[0,-1]])for(let i=nz?a:b;i<=(nz?c:d);i++){
  const x=nz?(i+.5)*TILE:(nx>0?a:c+1)*TILE,z=nx?(i+.5)*TILE:(nz>0?b:d+1)*TILE;
  if(grid[Math.floor((z-nz*.1)/TILE)]?.[Math.floor((x-nx*.1)/TILE)]!==0)continue;
  const hw=nz?(TILE-.16)/2:.45,hd=nx?(TILE-.16)/2:.45;
  prisms.push(new T.Box3(new T.Vector3(x-hw,.15,z-hd),new T.Vector3(x+hw,2.6,z+hd)));
 }
 return prisms;
}
for(const c of CHAPTERS)test(c.theme+': actual dressed geometry leaves every room entrance clear',()=>{
 const w=fixture(c);assert.ok(w.wallMounts.length>80);
 for(const m of w.wallMounts){assert.ok(wallSupported(w.grid,m),m.kind+' has no wall backing');assert.ok(m.depth<=.41);}
 for(let i=0;i<w.wallMounts.length;i++)for(let j=i+1;j<w.wallMounts.length;j++)assert.equal(mountsOverlap(w.wallMounts[i],w.wallMounts[j]),false,'Wall fixtures overlap');
 const doors=w.level.rooms.flatMap(r=>doorPrisms(w.grid,r.bounds));assert.ok(doors.length>5);
 w.root.traverse(o=>{if(!o.isMesh)return;const box=new T.Box3().setFromObject(o);for(const door of doors)assert.equal(box.intersectsBox(door),false,'Rendered geometry obstructs entrance: '+box.min.toArray()+' / '+box.max.toArray());});
 const roomNames=new Set(w.wallMounts.filter(m=>m.kind==='sign').map(m=>m.room));for(const r of w.level.rooms)assert.ok(roomNames.has(r.name));
});
