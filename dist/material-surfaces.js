import * as T from './vendor/three.module.js?v=5.1.3';
const regions={hand:[0,.5],pale:[0,.5],metal:[.5,.5],infected:[0,0],wall:[.5,0]};
export function surfaceMaterial(atlas,kind,options={}){
 const at=regions[kind]||regions.hand,metal=kind==='metal',scale=kind==='hand'?5:kind==='pale'?2.2:kind==='wall'?.65:kind==='infected'?1.9:1;
 const m=new T.MeshPhysicalMaterial({map:atlas,color:0xffffff,roughness:metal?.36:kind==='hand'?.59:.86,metalness:metal?.78:0,clearcoat:metal?.08:.025,clearcoatRoughness:.7,sheen:metal?0:.15,sheenColor:0xbda38f,...options});
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 surfacePos;varying vec3 surfaceNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nsurfacePos=position;surfaceNormal=normal;');
  if(kind==='wall')s.vertexShader=s.vertexShader.replace('surfacePos=position;','surfacePos=position;\n#ifdef USE_INSTANCING\nsurfacePos=(instanceMatrix*vec4(surfacePos,1.)).xyz;\n#endif\nsurfacePos=(modelMatrix*vec4(surfacePos,1.)).xyz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 surfacePos;varying vec3 surfaceNormal;vec2 surfaceUV(vec2 p){vec2 uv=p*${scale.toFixed(2)};${kind==='wall'?'uv+=vec2(sin(uv.y*.37)*.17,sin(uv.x*.29)*.15);':''}uv=1.-abs(fract(uv*.5)*2.-1.);return vec2(${at.join(',')})+(.016+uv*.968)*.5;}`);
  const sample=metal?'texture2D(map,surfaceUV(vMapUv)).rgb':'(texture2D(map,surfaceUV(surfacePos.yz)).rgb*blend.x+texture2D(map,surfaceUV(surfacePos.xz)).rgb*blend.y+texture2D(map,surfaceUV(surfacePos.xy)).rgb*blend.z)';
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec3 blend=pow(abs(normalize(surfaceNormal)),vec3(4.));blend/=max(.001,blend.x+blend.y+blend.z);vec3 surfaceColor=${sample};diffuseColor.rgb*=surfaceColor;`);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor*(.82+.28*(1.-dot(surfaceColor,vec3(.2126,.7152,.0722)))),.19,.98);');
 };m.customProgramCacheKey=()=> 'material-surface-v3-'+kind;return m;
}
