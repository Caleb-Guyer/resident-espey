import {setHumanShape,rotateHumanBone} from './human-actors.js?v=5.5.3';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const visemes={p:'AA_VI_01_PP',b:'AA_VI_01_PP',m:'AA_VI_01_PP',f:'AA_VI_02_FF',v:'AA_VI_02_FF',t:'AA_VI_03_TH',d:'AA_VI_03_TH',s:'AA_VI_07_SS',z:'AA_VI_07_SS',j:'AA_VI_06_CH',c:'AA_VI_06_CH',e:'AA_VI_11_E',i:'AA_VI_11_E',o:'AA_VI_13_O',u:'AA_VI_14_U',w:'AA_VI_14_U',r:'AA_VI_14_U',a:'AA_VI_10_aa'};

// Precompute from decoded dialogue while the loading cover is visible. The
// playback gain is irrelevant: muted previews perform exactly the same lips.
export function voiceEnvelope(buffer){
 const pcm=buffer.getChannelData(0),hz=40,window=Math.max(1,Math.floor(buffer.sampleRate/hz)),values=new Float32Array(Math.ceil(pcm.length/window));
 for(let i=0;i<values.length;i++){let sum=0,count=0;for(let j=i*window;j<Math.min(pcm.length,(i+1)*window);j+=4){sum+=pcm[j]*pcm[j];count++;}values[i]=Math.sqrt(sum/Math.max(1,count));}
 const sorted=Array.from(values).sort((a,b)=>a-b),reference=Math.max(.025,sorted[Math.floor(sorted.length*.9)]||.025);
 for(let i=0;i<values.length;i++)values[i]=clamp((values[i]-.006)/(reference*.82));
 return {hz,values,duration:buffer.duration??pcm.length/buffer.sampleRate};
}
export function speechEnvelope(envelope,elapsed){
 if(!envelope||elapsed<0)return null;const x=elapsed*envelope.hz,i=Math.floor(x),k=x-i,v=envelope.values;
 return (v[i]||0)*(1-k)+(v[i+1]||0)*k;
}

export function faceEmotion(scene,id,sourceTime,pose){
 if(pose==='hurt'||id==='joel'&&['opening','closet','serum','promise'].includes(scene))return 'pain';
 if(scene==='home'||scene==='all')return 'relief';
 if(['road','descent','closet'].includes(scene)||scene==='opening'&&sourceTime<17)return 'fear';
 if(id==='hall'&&['serum','return','sacrifice'].includes(scene))return 'regret';
 return 'resolve';
}

export function performHumanFace(root,{time,line,speaking,envelope,emotion='resolve',yaw=0,pitch=0}){
 const h=root.userData.humanActor,phase=h.phase,shape=(name,w)=>setHumanShape(root,name,w);
 // Asymmetric schedules between actors prevent a synchronized room of blinks.
 const blinkPhase=(time+phase*2.71)%4.7,blink=blinkPhase<.19?Math.sin(blinkPhase/.19*Math.PI):0;
 shape('AU_45_Blink',blink);
 const gaze=clamp(yaw,-.55,.55),up=clamp(pitch,-.25,.25);
 shape(gaze>0?'AU_61_EyesTurnLeft':'AU_62_EyesTurnRight',Math.abs(gaze)*.55);
 shape(up>0?'AU_63_EyesUp':'AU_64_EyesDown',Math.abs(up)*.6);
 rotateHumanBone(root,h.headBone,'y',gaze*.58);rotateHumanBone(root,h.headBone,'x',-up*.45);
 const tension=.9+Math.sin(time*.83+phase)*.1;
 if(emotion==='fear'){shape('AU_01_InnerBrowRaiser',.26*tension);shape('AU_05_UpperLidRaiser',.16*(1-blink));shape('AU_15_LipCornerDepressor',.13);}
 if(emotion==='pain'){shape('AU_01_InnerBrowRaiser',.24);shape('AU_04_BrowLowerer',.32*tension);shape('AU_07_LidTightener',.27*(1-blink));shape('AU_15_LipCornerDepressor',.22);}
 if(emotion==='regret'){shape('AU_01_InnerBrowRaiser',.29);shape('AU_15_LipCornerDepressor',.18);shape('AU_07_LidTightener',.08);}
 if(emotion==='resolve'){shape('AU_04_BrowLowerer',.23*tension);shape('AU_07_LidTightener',.12*(1-blink));shape('AU_24_LipPressor',speaking?0:.12);}
 if(emotion==='relief'){shape('AU_12_LipCornerPuller',.23);shape('AU_07_LidTightener',.1*(1-blink));}
 if(speaking&&line){
  const elapsed=time-line.at,duration=envelope?.duration??line.to-line.at,edge=clamp(Math.min(elapsed/.07,(duration-elapsed)/.12)),energy=speechEnvelope(envelope,elapsed),mouth=(energy===null?.3+Math.abs(Math.sin(elapsed*12.3))*.5:energy)*edge;
  const text=line.text.toLowerCase().replace(/[^a-z ]/g,''),cursor=clamp(elapsed/duration)*Math.max(0,text.length-1),i=Math.floor(cursor),blend=cursor-i;
  const current=visemes[text[i]]||'AA_VI_10_aa',next=visemes[text[i+1]]||current;
  shape(current,mouth*(current===next?1:1-blend)*.78);if(next!==current)shape(next,mouth*blend*.78);
  if(current!=='AA_VI_01_PP')shape('AK_25_JawOpen',mouth*.14);
 }
}
