import {mkdir,writeFile} from 'node:fs/promises';
import {dialogueScript} from '../dist/dialogue.js';
const dir=new URL('../.openai/local/',import.meta.url);await mkdir(dir,{recursive:true});
await writeFile(new URL('voice-script.json',dir),JSON.stringify(dialogueScript(),null,2));
console.log(dialogueScript().length+' dialogue lines exported for local production.');
