import test from 'node:test';
import assert from 'node:assert/strict';
import {ShaderChunk} from '../dist/vendor/three.module.js';
import {gateDirectLighting} from '../dist/direct-lighting.js';

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
