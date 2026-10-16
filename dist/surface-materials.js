import * as T from './vendor/three.module.js?v=5.4.0';
// Original albedo scans are sampled inside their own atlas region. Triplanar
// mapping keeps the fused anatomy continuous across its numerous skin bones.
export function scannedMaterial(atlas,kind,options={}){
 const regions={pale:[0,.5],dark:[.5,.5],metal:[0,0],feather:[.5,0]},offset=regions[kind]||regions.pale,scale=kind==='metal'?8:kind==='feather'?3:2.2;
 const m=new T.MeshPhysicalMaterial({map:atlas,color:0xffffff,roughness:kind==='metal'?.39:.76,metalness:kind==='metal'?.82:0,clearcoat:kind==='metal'?.08:.025,...options});
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 scanPosition;varying vec3 scanNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nscanPosition=position;scanNormal=normal;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>', '#include <common>\n#define SCAN_GAIN '+(kind==='metal'?'2.8':'1.0')+'\n');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 scanPosition;varying vec3 scanNormal;\nvec2 scanUV(vec2 v){return vec2(${offset.join(',')})+(.012+fract(v*${scale.toFixed(1)})*.976)*.5;}`)
   .replace('#include <map_fragment>',kind==='metal'?'vec3 finishColor=texture2D(map,scanUV(vMapUv/'+scale.toFixed(1)+')).rgb*SCAN_GAIN;diffuseColor.rgb*=mix(vec3(.19),finishColor,.58);':kind==='feather'?'diffuseColor.rgb*=texture2D(map,scanUV(vMapUv/'+scale.toFixed(1)+')).rgb*SCAN_GAIN;':'vec3 weights=pow(abs(normalize(scanNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);vec3 scanColor=texture2D(map,scanUV(scanPosition.yz)).rgb*weights.x+texture2D(map,scanUV(scanPosition.xz)).rgb*weights.y+texture2D(map,scanUV(scanPosition.xy)).rgb*weights.z;diffuseColor.rgb*=scanColor*SCAN_GAIN;');
  if(kind==='metal')s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat wear=clamp(dot(texture2D(map,scanUV(vMapUv/8.0)).rgb,vec3(.2126,.7152,.0722))*2.8,0.,1.);roughnessFactor=clamp(roughnessFactor*(1.28-.50*wear),.19,.92);');
 };m.customProgramCacheKey=()=>`scan-2026-v47-${kind}`;return m;
}
export function microTexture(mode='skin'){
 const n=256,c=document.createElement('canvas');c.width=c.height=n;const ctx=c.getContext('2d'),im=ctx.createImageData(n,n);let seed=291;
 const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,grain=rnd()-.5,ridge=mode==='cloth'?Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2)*.22:mode==='grip'?Math.sin(x*.8)*Math.sin(y*.8)*.3:Math.sin(x*.31+y*.42)*.06;im.data[i]=128+grain*35+ridge*64;im.data[i+1]=128+grain*23-ridge*52;im.data[i+2]=250;im.data[i+3]=255;}
 ctx.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(mode==='skin'?5:mode==='cloth'?3:2,mode==='skin'?5:mode==='cloth'?3:2);t.colorSpace=T.NoColorSpace;t.anisotropy=8;return t;
}
