import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../dist/vendor/three.module.js';
import '../dist/direct-lighting.js';
import {maskWallShader,maskWallLights} from '../dist/wall-lighting.js';

test('Wall masks retain material hooks and a stable cache key with a warmable original path',()=>{
 const m=new T.MeshStandardMaterial();m.onBeforeCompile=s=>{s.fragmentShader+='\n// photographed surface';};m.customProgramCacheKey=()=> 'photo-axis';maskWallLights(m);const hook=m.onBeforeCompile;maskWallLights(m);assert.equal(m.onBeforeCompile,hook);assert.equal(m.customProgramCacheKey(),'photo-axis-wall-point-mask-v1');
 const s={vertexShader:'#include <common>\n#include <project_vertex>',fragmentShader:'#include <common>\n#include <lights_fragment_begin>'};m.onBeforeCompile(s);assert.match(s.fragmentShader,/photographed surface/);assert.match(s.vertexShader,/flat varying int espeyPointMask/);assert.match(s.fragmentShader,/espeyPointMask &/);m.userData.espeyWallLights.enabled=false;assert.equal(m.customProgramCacheKey(),'photo-axis');const old={vertexShader:'original vertex',fragmentShader:'original fragment'};m.onBeforeCompile(old);assert.equal(old.vertexShader,'original vertex');
});

test('Expanded wall-mask loops declare scratch values once and use constant bit positions',async()=>{
 const source=await readFile(new URL('../dist/vendor/three.module.js',import.meta.url),'utf8'),start=source.indexOf('const unrollLoopPattern ='),end=source.indexOf('\nfunction ',source.indexOf('function loopReplacer',start)+10),expand=new Function(source.slice(start,end)+';return unrollLoops;')();
 const s={vertexShader:'#include <common>\nvoid main(){\n#include <project_vertex>\n}',fragmentShader:'#include <common>\nvoid main(){\n#include <lights_fragment_begin>\n}'};maskWallShader(s);
 for(const count of [1,9,30]){const expanded=expand(s.vertexShader.replaceAll('NUM_POINT_LIGHTS',String(count)));assert.equal((expanded.match(/vec3 delta;/g)||[]).length,1);assert.equal((expanded.match(/float reach;/g)||[]).length,1);assert.doesNotMatch(expanded,/\bUNROLLED_LOOP_INDEX\b|\[\s*i\s*\]|<<\s*i\b/);assert.match(expanded,new RegExp('1<<'+(count-1)+'\\)'));}
 assert.match(s.vertexShader,/NUM_POINT_LIGHTS <= 30/);assert.match(s.fragmentShader,/#if NUM_POINT_LIGHTS <= 30/);assert.match(s.vertexShader,/distance<=0.0/);
});

test('The transformed unit-box bound is conservative under rotation, nonuniform scale and shear',()=>{
 for(let i=0;i<100;i++){const m=new T.Matrix4().compose(new T.Vector3(i%9,2,i%7),new T.Quaternion().setFromEuler(new T.Euler(i*.13,i*.31,i*.07)),new T.Vector3(.3+i%6,.8+i%4,.5+i%8));m.elements[4]+=.3;const e=m.elements,center=new T.Vector3().setFromMatrixPosition(m),radius=.867*Math.sqrt(e[0]**2+e[1]**2+e[2]**2+e[4]**2+e[5]**2+e[6]**2+e[8]**2+e[9]**2+e[10]**2);for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])assert.ok(new T.Vector3(x,y,z).applyMatrix4(m).distanceTo(center)<=radius);}
});
