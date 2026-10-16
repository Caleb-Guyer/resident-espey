import * as T from './vendor/three.module.js?v=5.4.2';
const meshes=new Map(),types={Float32Array,Uint16Array,Uint32Array};
export const preparedGeometry=key=>meshes.get(key);
export function decodePreparedGeometry(buffer){
 const pending=new Map();try{
  const view=new DataView(buffer);if(view.getUint32(0,true)!==0x45534d31)return false;
  const length=view.getUint32(4,true),start=(8+length+3)&~3;if(length>65536||start>buffer.byteLength)return false;
  const records=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length)));if(!Array.isArray(records)||records.length>16)return false;
  for(const record of records){
   const g=new T.BufferGeometry();pending.set(record.key,g);
   const attribute=a=>{const Type=types[a.type];if(!Type||!Number.isInteger(a.offset)||a.offset<0||a.offset%4||!Number.isInteger(a.length)||a.length<1||a.length>4000000||!Number.isInteger(a.size)||a.size<1||a.size>4||a.length%a.size||start+a.offset+a.length*Type.BYTES_PER_ELEMENT>buffer.byteLength)throw Error('Invalid prepared geometry');return new T.BufferAttribute(new Type(buffer,start+a.offset,a.length),a.size);};
   for(const [name,a]of Object.entries(record.attributes))g.setAttribute(name,attribute(a));g.setIndex(attribute(record.index));
   const count=g.attributes.position?.count;if(!count||!g.attributes.normal||!g.attributes.uv||!g.attributes.skinIndex||!g.attributes.skinWeight||Object.values(g.attributes).some(a=>a.count!==count))throw Error('Incomplete prepared geometry');
   for(const a of Object.values(g.attributes))for(const v of a.array)if(!Number.isFinite(v))throw Error('Non-finite prepared geometry');for(const i of g.index.array)if(i>=count)throw Error('Invalid prepared index');
   for(const group of record.groups)g.addGroup(group.start,group.count,group.materialIndex);g.boundingSphere=new T.Sphere(new T.Vector3(...record.sphere.center),record.sphere.radius);
  }
  for(const [key,g]of pending)meshes.set(key,g);return true;
 }catch{for(const g of pending.values())g.dispose();return false;}
}
let loading;
export function loadPreparedGeometry(){
 return loading||=(async()=>{try{
  const response=await fetch(new URL('./assets/creatures-v1.bin.gz',import.meta.url));if(!response.ok)return false;let buffer=await response.arrayBuffer();
  const bytes=new Uint8Array(buffer);if(bytes[0]===31&&bytes[1]===139){if(typeof DecompressionStream==='undefined')return false;buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
  return decodePreparedGeometry(buffer);
 }catch{return false;}})();
}
