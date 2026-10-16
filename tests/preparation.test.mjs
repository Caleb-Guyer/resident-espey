import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/game.js';
import {CHAPTERS} from '../dist/data.js';

test('Chapter loading primes reusable enemy templates once and prepares every human story stage without disposable human copies',async()=>{
 const raf=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame;
 globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
 try{for(const humans of [null,{}])for(let chapter=0;chapter<3;chapter++){
  const made=[],disposed=[],stages=[],g=Object.create(Game.prototype);let ran=false,warmed=false;
  Object.assign(g,{setPaused(){},player:{yaw:0,pitch:0},aim:{},time:0,world:{ready:Promise.resolve(),humans,character(...recipe){made.push(recipe);return {recipe};},disposeObject(root){disposed.push(root.recipe);},setView(){assert.ok(ran);},async prepareCombatAsync(){warmed=true;},update(){assert.ok(warmed);}},cinema:{cancel(){},clearPrepared(){},async prewarm(ids){stages.push(...ids);}}});
  await g.prepareRun(chapter,()=>{ran=true;});
  assert.ok(ran&&warmed);assert.equal(g.loading,false);assert.equal(g.preparing,false);assert.equal(made.length,disposed.length);assert.equal(made.length,g.preparation.models);
  assert.equal(stages.length,[3,3,7][chapter]);assert.equal(new Set(stages).size,stages.length);
  for(const kind of new Set([...CHAPTERS[chapter].enemies.map(e=>e[0]),CHAPTERS[chapter].boss.kind]))assert.ok(made.some(a=>a[0]===kind),kind);
  assert.equal(made.some(a=>['npc','player'].includes(a[0])),!humans);
 }}finally{globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=cancel;}
});
