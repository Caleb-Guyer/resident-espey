import test from 'node:test';
import assert from 'node:assert/strict';
import {ShaderChunk} from '../dist/vendor/three.module.js';
import {gateDirectLighting,gatePointLightVolumes} from '../dist/direct-lighting.js';

test('Zero-contribution guards cover every direct BRDF after its shadow attenuation',()=>{
 const source=ShaderChunk.lights_fragment_begin,gated=gateDirectLighting(source);
 assert.equal((gated.match(/if \( any\( notEqual\( directLight.color, vec3\( 0\.0 \) \) \) \)/g)||[]).length,3);
 assert.equal((gated.match(/RE_Direct\( directLight,/g)||[]).length,3);
 for(const kind of ['POINT','SPOT','DIR']){
  const block=gated.slice(gated.indexOf(`NUM_${kind}_LIGHTS > 0`));
  assert.ok(block.indexOf('getShadow(')<block.indexOf('if ( any( notEqual( directLight.color, vec3( 0.0 ) ) ) )')||kind==='POINT');
 }
 // The guard must not drop IBL, ambient light, emissive, area lights or shadows.
 const unwrapped=gated.replace('// ESPEY_BOUNDED_LIGHTS\n','').replace(/([\t ]*)if \( any\( notEqual\( directLight.color, vec3\( 0\.0 \) \) \) \) \{\n[\t ]*(RE_Direct\( directLight,[^\n]+\);)\n[\t ]*\}/g,'$1$2');
 assert.equal(unwrapped,source);
 assert.equal(gateDirectLighting(gated),gated);
});

test('Point-light volume rejection preserves unbounded lights, active interiors and the remaining lighting paths',()=>{
 const source=gateDirectLighting(ShaderChunk.lights_fragment_begin),gated=gatePointLightVolumes(source);
 const original=gated.replace('\n\tvec3 espeyPointDelta;','').replace(/\/\/ ESPEY_POINT_VOLUMES\n\t\tpointLight = pointLights\[ i \];\n\t\tespeyPointDelta[^]*?\{\n/,'pointLight = pointLights[ i ];').replace('\t\t}\n\t}\n\t#pragma unroll_loop_end','\t}\n\t#pragma unroll_loop_end');
 assert.equal((gated.match(/vec3 espeyPointDelta;/g)||[]).length,1);assert.ok(gated.indexOf('vec3 espeyPointDelta;')<gated.indexOf('for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ )'));assert.equal(original,source);assert.equal(gatePointLightVolumes(gated),gated);assert.equal(gatePointLightVolumes('unrelated shader'),'unrelated shader');
 const start=gated.indexOf('ESPEY_POINT_VOLUMES'),normalize=gated.indexOf('getPointLightInfo(',start);assert.ok(start<normalize);assert.ok(gated.indexOf('getPointShadow(',start)>normalize);
 for(const radius of [-1,0,3,12])for(const distance of [0,1,3,12,20]){const accepted=radius<=0||distance*distance<radius*radius;if(!accepted)assert.equal(Math.pow(Math.max(0,1-Math.pow(distance/radius,4)),2),0);else assert.ok(radius<=0||distance<radius);}
});
