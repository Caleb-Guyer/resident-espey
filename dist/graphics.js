// Applying a quality preset must warm its shadow/output variants before the
// pause menu hands control back. A failed warmup restores the previous preset.
export async function applyGraphics(world,quality,prepare=false,dpr=globalThis.devicePixelRatio||1){
 const renderer=world.renderer,oldShadow=renderer.shadowMap.enabled,oldRatio=renderer.getPixelRatio();
 const shadow=quality==='high',ratio=Math.min(dpr,shadow?1.65:1),changed=oldShadow!==shadow||oldRatio!==ratio;
 if(changed){renderer.shadowMap.enabled=shadow;renderer.setPixelRatio(ratio);world.resize();}
 try{if(prepare&&world.root)await world.prepareCombatAsync();world.needsPausedRender=true;}
 catch(error){renderer.shadowMap.enabled=oldShadow;renderer.setPixelRatio(oldRatio);world.resize();throw error;}
}
