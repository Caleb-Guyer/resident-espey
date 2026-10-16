// Generate PCM without opening an audio device or blocking the Start button.
// Small chunks yield to input/loading paint even on a cold, slower device.
let prepared;
export function prepareScreamSamples(yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0))){
 if(prepared)return prepared;
 prepared=(async()=>{
  const samples={},sampleRate=22050;
  for(const [kind,pitch]of [['birdy',340],['jakob',170],['zeb',85]]){
   const data=new Float32Array(Math.ceil(sampleRate*1.35));let phase=0,seed=83;
   for(let start=0;start<data.length;start+=2048){
    for(let i=start;i<Math.min(data.length,start+2048);i++){const t=i/sampleRate,u=t/1.35,frequency=pitch*(1+.3*Math.sin(u*Math.PI))*(1+.024*Math.sin(t*67));phase+=frequency/sampleRate;seed=Math.imul(seed,1664525)+1013904223;const breath=((seed>>>0)/4294967296*2-1)*.13,voice=Math.sin(phase*Math.PI*2)+.38*Math.sin(phase*Math.PI*6)+.16*Math.sin(phase*Math.PI*14),env=Math.min(1,t/.09)*Math.min(1,(1.35-t)/.4);data[i]=Math.tanh(voice*.9+breath)*env*.55;}
    await yieldTask();
   }samples[kind]=data;
  }return {samples,sampleRate};
 })();return prepared;
}
