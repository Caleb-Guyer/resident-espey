// Foreground preparation yields a painted frame. The timeout also lets loading
// complete when browsers throttle background requestAnimationFrame to 1 Hz.
export function painted(){return new Promise(resolve=>{let frame,timer,done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(frame);resolve();};frame=requestAnimationFrame(()=>frame=requestAnimationFrame(finish));timer=setTimeout(finish,40);});}
export async function prepareTasks(tasks,progress=()=>{},yieldFrame=painted){for(let i=0;i<tasks.length;i++){await yieldFrame();await tasks[i]();progress((i+1)/tasks.length);}}
