import * as T from './vendor/three.module.js?v=5.4.1';
// Compile the real output shader with a tiny viewport. Reuse the shadow pass
// already rendered for the same stationary scene; restore all caller state.
export function warmRaster(renderer){
 const viewport=renderer.getViewport?.(new T.Vector4()),scissor=renderer.getScissor?.(new T.Vector4()),test=renderer.getScissorTest?.(),shadows=renderer.shadowMap?.autoUpdate;
 return {
  output(){if(viewport){renderer.setViewport(0,0,16,16);renderer.setScissor(0,0,16,16);renderer.setScissorTest(true);}},
  reuseShadow(){if(shadows!==undefined)renderer.shadowMap.autoUpdate=false;},
  restore(){if(viewport)renderer.setViewport(viewport);if(scissor)renderer.setScissor(scissor);if(test!==undefined)renderer.setScissorTest(test);if(shadows!==undefined)renderer.shadowMap.autoUpdate=shadows;}
 };
}
