// Read on demand in Settings, never in the frame loop. This is the adapter
// actually selected by the browser, rather than the GPU's marketing name.
export function renderingInfo(renderer){
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),raw=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 const adapter=String(raw||'Unavailable').replace(/^ANGLE \([^,]*,\s*/,'').replace(/\s*\(0x[\da-f]+\)/ig,'').replace(/,?\s+(?:Direct3D|D3D|OpenGL|Vulkan|Metal).*$/i,'');
 return {adapter:adapter&&adapter!=='ANGLE'?adapter:String(raw||'Unavailable'),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};
}
// Applying a quality preset must warm its shadow/output variants before the
// pause menu hands control back. A failed warmup restores the previous preset.
export async function applyGraphics(world,quality,prepare=false,dpr=globalThis.devicePixelRatio||1){
 const renderer=world.renderer,oldShadow=renderer.shadowMap.enabled,oldRatio=renderer.getPixelRatio();
 const shadow=quality==='high',ratio=Math.min(dpr,shadow?1.65:1),changed=oldShadow!==shadow||oldRatio!==ratio;
 if(changed){renderer.shadowMap.enabled=shadow;renderer.setPixelRatio(ratio);world.resize();}
 try{if(prepare&&world.root)await world.prepareCombatAsync();world.needsPausedRender=true;}
 catch(error){renderer.shadowMap.enabled=oldShadow;renderer.setPixelRatio(oldRatio);world.resize();throw error;}
}
