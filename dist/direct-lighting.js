import {ShaderChunk} from './vendor/three.module.js?v=5.4.2';

// Keep light counts stable (and their shaders warm) while avoiding the full
// physical BRDF for lights whose attenuation or colour is exactly zero.
// Use the final radiance, after attenuation and shadows, for every direct
// light. No distance threshold or light contribution is approximated here.
export function gateDirectLighting(source){
 if(source.includes('// ESPEY_BOUNDED_LIGHTS'))return source;
 const gated=source.replace(/^([\t ]*)RE_Direct\( directLight,([^\n]+)\);/gm,(_,space,args)=>`${space}if ( any( notEqual( directLight.color, vec3( 0.0 ) ) ) ) {\n${space}\tRE_Direct( directLight,${args});\n${space}}`);
 return gated===source?source:'// ESPEY_BOUNDED_LIGHTS\n'+gated;
}

ShaderChunk.lights_fragment_begin=gateDirectLighting(ShaderChunk.lights_fragment_begin);

// Point-light attenuation is exactly zero outside a positive cutoff radius.
// Reject that volume before normalization, attenuation, shadow lookup and BRDF.
// Nonpositive radii remain unlimited; light counts and shader variants stay fixed.
export function gatePointLightVolumes(source){
 if(source.includes('// ESPEY_POINT_VOLUMES'))return source;
 const start=source.indexOf('pointLight = pointLights[ i ];'),end=source.indexOf('\t}\n\t#pragma unroll_loop_end',start);
 if(start<0||end<0)return source;
 return (source.slice(0,start)+'// ESPEY_POINT_VOLUMES\n\t\tpointLight = pointLights[ i ];\n\t\tespeyPointDelta = pointLight.position - geometryPosition;\n\t\tif ( any( notEqual( pointLight.color, vec3( 0.0 ) ) ) && ( pointLight.distance <= 0.0 || dot( espeyPointDelta, espeyPointDelta ) < pointLight.distance * pointLight.distance ) ) {\n'+source.slice(start+'pointLight = pointLights[ i ];'.length,end)+'\t\t}\n'+source.slice(end)).replace('PointLight pointLight;','PointLight pointLight;\n\tvec3 espeyPointDelta;');
}
ShaderChunk.lights_fragment_begin=gatePointLightVolumes(ShaderChunk.lights_fragment_begin);
