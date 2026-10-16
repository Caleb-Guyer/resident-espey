import * as T from './vendor/three.module.js?v=5.5.4';
// A flat, per-instance mask rejects lights outside a conservative transformed
// unit-box bound. All radiance, attenuation, normals and shadows remain exact.
export function maskWallShader(s){
   s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
#if NUM_POINT_LIGHTS > 0 && NUM_POINT_LIGHTS <= 30
struct PointLight {vec3 position;vec3 color;float distance;float decay;};
uniform PointLight pointLights[NUM_POINT_LIGHTS];
flat varying int espeyPointMask;
#endif`);
   s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
#if NUM_POINT_LIGHTS > 0 && NUM_POINT_LIGHTS <= 30
mat4 espeyBoundMatrix=modelViewMatrix;
#ifdef USE_INSTANCING
espeyBoundMatrix=modelViewMatrix*instanceMatrix;
#endif
vec3 espeyCenter=espeyBoundMatrix[3].xyz;
float espeyRadius=.867*sqrt(dot(espeyBoundMatrix[0].xyz,espeyBoundMatrix[0].xyz)+dot(espeyBoundMatrix[1].xyz,espeyBoundMatrix[1].xyz)+dot(espeyBoundMatrix[2].xyz,espeyBoundMatrix[2].xyz));
espeyPointMask=0;
vec3 delta;float reach;
#pragma unroll_loop_start
for(int i=0;i<NUM_POINT_LIGHTS;i++){
 delta=pointLights[i].position-espeyCenter;
 reach=pointLights[i].distance+espeyRadius;
 if(pointLights[i].distance<=0.0||dot(delta,delta)<=reach*reach)espeyPointMask|=(1<<UNROLLED_LOOP_INDEX);
}
#pragma unroll_loop_end
#endif`);
   s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\n#if NUM_POINT_LIGHTS > 0 && NUM_POINT_LIGHTS <= 30\nflat varying int espeyPointMask;\n#endif');
   s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin.replace('if ( any( notEqual( pointLight.color, vec3( 0.0 ) ) ) &&','#if NUM_POINT_LIGHTS <= 30\nif ( ( espeyPointMask & (1 << UNROLLED_LOOP_INDEX) ) != 0 )\n#endif\nif ( any( notEqual( pointLight.color, vec3( 0.0 ) ) ) &&'));

}

export function maskWallLights(material){
 if(material.userData.espeyWallLights)return material;
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey();material.userData.espeyWallLights={enabled:true};
 material.onBeforeCompile=function(s,...args){compile.call(this,s,...args);if(material.userData.espeyWallLights.enabled)maskWallShader(s);};
 material.customProgramCacheKey=()=>key+(material.userData.espeyWallLights.enabled?'-wall-point-mask-v1':'');
 material.needsUpdate=true;return material;
}
