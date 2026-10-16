import * as T from './vendor/three.module.js?v=5.5.3';
const meshes=new Map(),types={Float32Array,Uint16Array,Uint32Array};
export const preparedGeometry=key=>meshes.get(key);
function* decodeSteps(buffer){
 const pending=new Map();let committed=false;try{
  const view=new DataView(buffer);if(view.getUint32(0,true)!==0x45534d31)return false;
  const length=view.getUint32(4,true),start=(8+length+3)&~3;if(length>65536||start>buffer.byteLength)return false;
  const records=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length)));if(!Array.isArray(records)||records.length>16)return false;
  for(const record of records){
   const g=new T.BufferGeometry();pending.set(record.key,g);
   const attribute=a=>{const Type=types[a.type];if(!Type||!Number.isInteger(a.offset)||a.offset<0||a.offset%4||!Number.isInteger(a.length)||a.length<1||a.length>4000000||!Number.isInteger(a.size)||a.size<1||a.size>4||a.length%a.size||start+a.offset+a.length*Type.BYTES_PER_ELEMENT>buffer.byteLength)throw Error('Invalid prepared geometry');return new T.BufferAttribute(new Type(buffer,start+a.offset,a.length),a.size);};
   for(const [name,a]of Object.entries(record.attributes))g.setAttribute(name,attribute(a));g.setIndex(attribute(record.index));
   const count=g.attributes.position?.count;if(!count||!g.attributes.normal||!g.attributes.uv||!g.attributes.skinIndex||!g.attributes.skinWeight||Object.values(g.attributes).some(a=>a.count!==count))throw Error('Incomplete prepared geometry');
   // Integer storage is finite by construction. Validate float streams and
   // indices in small blocks, including within the largest individual stream.
   for(const a of Object.values(g.attributes))if(a.array instanceof Float32Array){const values=a.array;for(let start=0;start<values.length;start+=8192){const end=Math.min(start+8192,values.length);for(let i=start;i<end;i++)if(!Number.isFinite(values[i]))throw Error('Non-finite prepared geometry');yield;}}
   const indices=g.index.array;for(let start=0;start<indices.length;start+=8192){const end=Math.min(start+8192,indices.length);for(let i=start;i<end;i++)if(!Number.isInteger(indices[i])||indices[i]<0||indices[i]>=count)throw Error('Invalid prepared index');yield;}
   for(const group of record.groups)g.addGroup(group.start,group.count,group.materialIndex);g.boundingSphere=new T.Sphere(new T.Vector3(...record.sphere.center),record.sphere.radius);
  }
  for(const [key,g]of pending)meshes.set(key,g);committed=true;return true;
 }catch{return false;}finally{if(!committed)for(const g of pending.values())g.dispose();}
}
export function decodePreparedGeometry(buffer){
 const task=decodeSteps(buffer);let step;do{step=task.next();}while(!step.done);return step.value;
}
// Validate large sculpt buffers in short tasks so the title/loading UI can
// paint. Commit the whole set only after every attribute and index passes.
export async function decodePreparedGeometryAsync(buffer,{budget=4,clock=()=>performance.now(),yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){
 const task=decodeSteps(buffer);let start=clock();try{while(true){const step=task.next();if(step.done)return step.value;if(clock()-start>=budget){await yieldFrame();start=clock();}}}finally{task.return();}
}
let loading;
export function loadPreparedGeometry(){
 return loading||=(async()=>{try{
  const response=await fetch(new URL('./assets/creatures-v2.bin.gz',import.meta.url));if(!response.ok)return false;let buffer=await response.arrayBuffer();
  const bytes=new Uint8Array(buffer);if(bytes[0]===31&&bytes[1]===139){if(typeof DecompressionStream==='undefined')return false;buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
  return await decodePreparedGeometryAsync(buffer);
 }catch{return false;}})();
}
