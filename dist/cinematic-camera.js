// Clip the camera-to-subject segment against stage boxes. Starting inside a
// target prop is allowed (for inserts); the camera itself stays before walls.
export function cameraBoxHit(from,to,box){
 if(from.every((v,i)=>v>=box.min[i]&&v<=box.max[i]))return Infinity;
 let near=0,far=1;for(let i=0;i<3;i++){const d=to[i]-from[i];if(Math.abs(d)<1e-9){if(from[i]<box.min[i]||from[i]>box.max[i])return Infinity;continue;}let a=(box.min[i]-from[i])/d,b=(box.max[i]-from[i])/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return Infinity;}return near>=0&&near<=1?near:Infinity;
}
export function fitStoryCamera(position,look,boxes,out=position.slice()){
 let limit=1;for(const box of boxes)limit=Math.min(limit,cameraBoxHit(look,position,box));
 const distance=Math.hypot(...position.map((v,i)=>v-look[i])),u=limit<1?Math.max(0,limit-.17/Math.max(.01,distance)):1;
 for(let i=0;i<3;i++)out[i]=look[i]+(position[i]-look[i])*u;return out;
}
