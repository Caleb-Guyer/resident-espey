export function normalizeSettings(saved={},reducedMotion=false){
 const s=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
 const number=(key,fallback,min,max)=>{const v=s[key],n=(typeof v==='number'||typeof v==='string'&&v.trim()!=='')?Number(v):NaN;return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
 const boolean=(key,fallback)=>typeof s[key]==='boolean'?s[key]:fallback;
 return {volume:number('volume',.6,0,1),dialogueVolume:number('dialogueVolume',1,0,1),quality:s.quality==='low'?'low':'high',sensitivity:number('sensitivity',1,.3,2.5),fov:number('fov',76,60,95),subtitles:boolean('subtitles',true),motion:boolean('motion',reducedMotion),flashlight:boolean('flashlight',true)};
}
