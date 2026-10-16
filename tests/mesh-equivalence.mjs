import assert from 'node:assert/strict';

// Verify the rendered mesh rather than a particular storage order. Every
// vertex component and oriented triangle must survive in its material group.
export function assertMeshEquivalent(source,actual){
 assert.equal(actual.index.count,source.index.count);assert.deepEqual(actual.groups,source.groups);assert.deepEqual(Object.keys(actual.attributes).sort(),Object.keys(source.attributes).sort());assert.deepEqual(Object.keys(actual.morphAttributes).sort(),Object.keys(source.morphAttributes).sort());
 const streams=g=>[...Object.entries(g.attributes),...Object.entries(g.morphAttributes).flatMap(([name,list])=>list.map((a,i)=>[name+'/'+i,a]))].sort(([a],[b])=>a.localeCompare(b));
 const expected=streams(source),loaded=streams(actual);for(let i=0;i<expected.length;i++){assert.equal(loaded[i][0],expected[i][0]);assert.equal(loaded[i][1].count,expected[i][1].count);assert.equal(loaded[i][1].itemSize,expected[i][1].itemSize);assert.equal(loaded[i][1].normalized,expected[i][1].normalized);}
 const key=(g,i)=>{const a=g.attributes.position;return [a.getX(i),a.getY(i),a.getZ(i)].join('/');},vertices=new Map(),map=new Uint32Array(actual.attributes.position.count),used=new Set();
 for(let i=0;i<source.attributes.position.count;i++){const k=key(source,i);if(!vertices.has(k))vertices.set(k,[]);vertices.get(k).push(i);}
 for(let i=0;i<map.length;i++){
  const candidates=vertices.get(key(actual,i))||[],match=candidates.find(j=>!used.has(j)&&expected.every(([,a],k)=>{const b=loaded[k][1];for(let c=0;c<a.itemSize;c++)if(!Object.is(a.array[j*a.itemSize+c],b.array[i*b.itemSize+c]))return false;return true;}));
  assert.notEqual(match,undefined,'Changed or missing vertex '+i);map[i]=match;used.add(match);
 }
 const triangle=(a,b,c)=>a<=b&&a<=c?a+','+b+','+c:b<=a&&b<=c?b+','+c+','+a:c+','+a+','+b;
 for(const group of source.groups.length?source.groups:[{start:0,count:source.index.count}]){
  const counts=new Map();for(let i=group.start;i<group.start+group.count;i+=3){const k=triangle(source.index.getX(i),source.index.getX(i+1),source.index.getX(i+2));counts.set(k,(counts.get(k)||0)+1);}
  for(let i=group.start;i<group.start+group.count;i+=3){const k=triangle(map[actual.index.getX(i)],map[actual.index.getX(i+1)],map[actual.index.getX(i+2)]);assert.ok(counts.get(k)>0,'Changed triangle, winding or material group');counts.set(k,counts.get(k)-1);}
  assert.ok([...counts.values()].every(n=>n===0));
 }
}
