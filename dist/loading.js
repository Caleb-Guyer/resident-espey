// A real painted loading frame precedes each preparation task. It also lets the
// browser deliver input, download textures and finish parallel shader work.
export function painted(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
export async function prepareTasks(tasks,progress=()=>{},yieldFrame=painted){
 for(let i=0;i<tasks.length;i++){await yieldFrame();await tasks[i]();progress((i+1)/tasks.length);}
}
