import argparse, json, pathlib, subprocess, sys, hashlib
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro
import imageio_ffmpeg

root=pathlib.Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser(description='Produce Resident Espey dialogue locally with Kokoro.')
parser.add_argument('--model-directory',required=True,type=pathlib.Path)
parser.add_argument('--probe',action='store_true')
args=parser.parse_args()
model=args.model_directory.resolve()
options=ort.SessionOptions(); options.intra_op_num_threads=4; options.inter_op_num_threads=1
session=ort.InferenceSession(str(model/'kokoro-v1.0.onnx'),options,providers=['CPUExecutionProvider'])
tts=Kokoro.from_session(session,str(model/'voices-v1.0.bin'))
cast={
 'ethan':('am_puck','am_fenrir',.65,1.03), 'joel':('am_michael','am_liam',.65,.95),
 'hall':('am_fenrir','am_onyx',.65,.98), 'landon':('am_echo','am_michael',.55,1.0),
 'luke':('am_puck','am_eric',.55,1.07), 'mimic':('am_puck','am_eric',.55,.91),
 'earl':('am_eric','am_fenrir',.5,1.04), 'paul':('am_michael','am_puck',.4,1.0),
 'johnson':('bm_george','am_fenrir',.75,.96), 'gent':('bm_fable','am_onyx',.7,.88),
 'nathan':('am_onyx','am_echo',.75,.98), 'birdy':('af_nicole','af_bella',.75,.9),
 'jakob':('am_adam','am_fenrir',.6,.92)
}
lines=json.loads((root/'.openai/local/voice-script.json').read_text(encoding='utf8'))
raw=root/'.openai/local/voice-raw';raw.mkdir(parents=True,exist_ok=True)
dest=root/'dist/assets/voices';dest.mkdir(parents=True,exist_ok=True)
manifest={}; ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
for i,line in enumerate(lines):
 key=line['key']; character=key.rsplit('-',1)[0]; a,b,mix,speed=cast[character]
 wav=raw/(key+'.wav'); target=dest/(key+'.mp3')
 if not wav.exists():
  text=line['text'].replace('204','two oh four').replace('Zebene','Zeh bean').replace('Nunley','Nun lee').replace('Orloski','Or loss key').replace('Chapa','Chah pah')
  if '!' in text and character not in ['gent','mimic','birdy']:speed*=1.08
  style=tts.get_voice_style(a)*mix+tts.get_voice_style(b)*(1-mix)
  samples,sr=tts.create(text,style,speed=speed,lang='en-us')
  active=np.flatnonzero(np.abs(samples)>.006)
  if not active.size:raise RuntimeError('Empty speech: '+key)
  samples=samples[max(0,active[0]-int(sr*.045)):min(len(samples),active[-1]+int(sr*.15))]
  samples=np.concatenate([samples,np.zeros(int(sr*.12),dtype=np.float32)])
  sf.write(str(wav),samples,sr,subtype='PCM_16')
 else:samples,sr=sf.read(str(wav))
 if not target.exists():
  fx='highpass=f=75,lowpass=f=10500'
  if character=='gent':fx+=',asetrate=24000*0.95,aresample=24000,atempo=1.0526,aecho=0.8:0.7:90:0.12'
  if character=='mimic':fx+=',aecho=0.8:0.75:85|170:0.16|0.09'
  if character=='birdy':fx+=',aecho=0.8:0.7:110|220:0.13|0.07'
  if character=='jakob':fx+=',asoftclip=type=tanh:threshold=0.65:output=0.85'
  fx+=',loudnorm=I=-18:TP=-2:LRA=9,aresample=24000'
  subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-af',fx,'-c:a','libmp3lame','-b:a','96k','-ac','1',str(target)],check=True)
 # Decode the final MP3 to measure exact browser playback duration including effect tails.
 decoded=subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-i',str(target),'-f','f32le','-ac','1','-ar','24000','pipe:1'],stdout=subprocess.PIPE,check=True).stdout
 duration=len(decoded)/4/24000
 manifest[key]={'file':'assets/voices/'+target.name,'duration':round(duration,4),'speaker':line['speaker'],'text':line['text'],'character':character,'bytes':target.stat().st_size}
 print(f"{i+1}/{len(lines)} {key} {duration:.2f}s",flush=True)
 if '--probe' in sys.argv:break
 if '--probe' not in sys.argv:
  (root/'dist/voice-assets.js').write_text('// AI-generated dialogue. Kokoro-82M v1.0; mastered 24 kHz mono MP3.\nexport const VOICE_ASSETS='+json.dumps(manifest,ensure_ascii=False,indent=1)+';\n',encoding='utf8')
if '--probe' not in sys.argv:
 (root/'.openai/local/voice-production.json').write_text(json.dumps({'model':'Kokoro-82M v1.0','cast':cast,'model_sha256':hashlib.sha256((model/'kokoro-v1.0.onnx').read_bytes()).hexdigest(),'voice_bank_sha256':hashlib.sha256((model/'voices-v1.0.bin').read_bytes()).hexdigest(),'lines':len(manifest),'seconds':sum(x['duration'] for x in manifest.values())},indent=2),encoding='utf8')
