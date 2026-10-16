import {finishGPUWarmup} from './render-budget.js?v=5.2.1';
// Spread texture and bone uploads across loading frames. A scene's first draw
// should not submit every decoded image and skeleton in one driver burst.
export async function uploadSceneTextures(renderer,scenes,{yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0)),finish=finishGPUWarmup,clock=()=>performance.now(),budget=4,batchSize=16}={}){
 if(!renderer.initTexture)return;
 const textures=new Set(),skeletons=new Set(),add=t=>{if(t?.isTexture)textures.add(t);};
 for(const scene of scenes.filter(Boolean)){add(scene.environment);add(scene.background);scene.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])for(const value of Object.values(m))add(value);if(o.isSkinnedMesh)skeletons.add(o.skeleton);});}
 for(const skeleton of skeletons){if(!skeleton.boneTexture)skeleton.computeBoneTexture();add(skeleton.boneTexture);}
 let start=clock(),count=0;for(const texture of textures){if(renderer.getContext?.()?.isContextLost?.())throw Object.assign(Error('Graphics context unavailable'),{code:'GRAPHICS_LOST'});const cached=renderer.properties?.get(texture);if(cached?.__webglTexture&&cached.__version===texture.version)continue;renderer.initTexture(texture);if(++count>=batchSize||clock()-start>=budget){await finish(renderer.getContext?.());await yieldFrame();start=clock();count=0;}}
 if(count)await finish(renderer.getContext?.());
}
