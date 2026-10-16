import {ShaderChunk} from './vendor/three.module.js?v=5.2.1';

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
