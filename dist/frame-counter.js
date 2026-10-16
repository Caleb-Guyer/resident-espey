// Count rendered game frames, not RAF callbacks or the world's two render passes.
// Refresh text twice a second and leave GPU timing/readback entirely untouched.
export class FrameCounter{
 constructor(element){this.element=element;this.active=false;this.value=null;}
 update(now,active,renderFrame){
  if(!active){if(this.active){this.active=false;this.value=null;this.element.hidden=true;}return;}
  if(!this.active||now<this.start){this.active=true;this.start=now;this.frames=0;this.renderFrame=renderFrame;this.value=null;this.element.hidden=false;this.element.textContent='— FPS';return;}
  if(renderFrame!==this.renderFrame){this.frames++;this.renderFrame=renderFrame;}
  const elapsed=now-this.start;if(elapsed<500)return;
  const value=Math.round(this.frames*1000/elapsed);if(value!==this.value){this.value=value;this.element.textContent=value+' FPS';}this.start=now;this.frames=0;
 }
}
