// Nonblocking GPU backpressure. Never use finish() or a timed client wait in
// gameplay: an overloaded driver should drop a render, not stall input handling.
export class RenderBudget{
 constructor(gl,maxHz=120,capacity=2){this.gl=gl;this.interval=1000/maxHz;this.capacity=capacity;this.pending=[];this.next=-Infinity;this.gpuSkipped=this.rateSkipped=0;this.supported=!!(gl?.fenceSync&&gl?.clientWaitSync);}
 begin(now){
  const gl=this.gl;if(!Number.isFinite(now)||gl?.isContextLost?.())return false;
  if(this.supported){while(this.pending.length){const state=gl.clientWaitSync(this.pending[0],0,0);if(state===gl.TIMEOUT_EXPIRED)break;gl.deleteSync(this.pending.shift());if(state===gl.WAIT_FAILED){this.clear();this.supported=false;break;}}}
  if(this.pending.length>=this.capacity){this.gpuSkipped++;return false;}
  if(now+.2<this.next){this.rateSkipped++;return false;}
  this.next=!Number.isFinite(this.next)||now-this.next>this.interval?now+this.interval:this.next+this.interval;return true;
 }
 end(){if(!this.supported||this.gl.isContextLost?.())return;const sync=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(sync){this.pending.push(sync);this.gl.flush();}}
 clear(){if(!this.gl?.isContextLost?.())for(const sync of this.pending)this.gl.deleteSync(sync);this.pending.length=0;this.next=-Infinity;}
}
// Loading keeps its cover visible until uploads and warm renders have actually
// reached the GPU. Poll with zero timeout and yield between polls.
const unavailable=()=>Object.assign(Error('Graphics context unavailable'),{code:'GRAPHICS_LOST'});
export async function duringGPUWork(gl,work){
 if(gl?.isContextLost?.())throw unavailable();
 const canvas=gl?.canvas;if(!canvas?.addEventListener)return work();
 let lost;const interrupt=new Promise((_,reject)=>{lost=()=>reject(unavailable());canvas.addEventListener('webglcontextlost',lost,{once:true});});
 try{return await Promise.race([Promise.resolve().then(()=>{if(gl.isContextLost?.())throw unavailable();return work();}),interrupt]);}finally{canvas.removeEventListener('webglcontextlost',lost);}
}
export async function finishGPUWarmup(gl,{timeout=5000,clock=()=>performance.now(),yieldFrame=()=>new Promise(r=>setTimeout(r,12))}={}){
 if(!gl?.fenceSync||!gl?.clientWaitSync)return;
 if(gl.isContextLost?.())throw unavailable();
 const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(!sync)return;
 const start=clock();gl.flush();
 try{while(true){if(gl.isContextLost?.())throw unavailable();const state=gl.clientWaitSync(sync,0,0);if(state===gl.ALREADY_SIGNALED||state===gl.CONDITION_SATISFIED)return;if(state===gl.WAIT_FAILED)throw Error('Graphics preparation failed');if(clock()-start>=timeout)throw Error('Graphics preparation timed out');await yieldFrame();}}
 finally{if(!gl.isContextLost?.())gl.deleteSync(sync);}
}
