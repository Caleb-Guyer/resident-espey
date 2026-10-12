const ids={'Ethan':'ethan','Joel':'joel','Coach Hall':'hall','Earl':'earl','Earl Britt':'earl','Landon':'landon','The Gentleman':'gent','Calen':'calen','Benny':'benny'};
export function speakingActor(scene,line){const id=ids[line?.speaker];return scene.actors?.find(a=>a.id===id)?.id||null;}
export function dialogueFrame(scene,sample,time){
 const id=speakingActor(scene,sample.line),a=sample.actors.find(a=>a.id===id),original=scene.sourceTime?.(time)??time;
 // Keep physical actions and establishing shots readable before cutting closer.
 if(!a||a.moving||original<6||scene.stage==='road'||scene.stage==='dawn'||scene.stage==='seal'||a.pose==='reach'||a.pose==='brace')return {position:sample.position,look:sample.look,fov:sample.fov,subject:null};
 const seated=a.pose==='sit'||a.pose==='kneel',height=(id==='gent'?2.51:1.60)+a.y-(seated?.42:0),side=sample.position[0]<a.x?-.45:.45,front=[Math.sin(a.yaw),Math.cos(a.yaw)],right=[Math.cos(a.yaw),-Math.sin(a.yaw)],distance=id==='gent'?2.8:2.1;
 return {position:[a.x+front[0]*distance+right[0]*side,height+.015,a.z+front[1]*distance+right[1]*side],look:[a.x,height-.06,a.z],fov:43,subject:id};
}
export function speechMotion(line,time){
 if(!line||time<line.at||time>=line.to)return 0;
 const elapsed=time-line.at,envelope=Math.min(1,elapsed/.12,(line.to-time)/.16);
 return Math.max(0,envelope)*(.18+Math.abs(Math.sin(elapsed*15.1)*Math.sin(elapsed*7.3))*.82);
}
