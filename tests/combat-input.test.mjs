import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/game.js';

class Node extends EventTarget{
 constructor(action){super();this.dataset={action};this.style={};this.tagName='CANVAS';}
 querySelector(){return new Node();}
 setPointerCapture(){}
 hasPointerCapture(){return false;}
}
const send=(target,type,values={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerType:'mouse',clientX:10,clientY:10,movementX:0,movementY:0,...values});target.dispatchEvent(e);};
function fixture(locked,fn){
 const previous={document:globalThis.document,addEventListener:globalThis.addEventListener};
 const win=new Node(),doc=new Node(),canvas=new Node(),joy=new Node(),pad=new Node(),aim=new Node('aim'),fire=new Node('fire'),other=new Node('heal'),nodes=new Map([['#world',canvas],['#joystick',joy],['#look-pad',pad]]);
 doc.querySelector=s=>{if(!nodes.has(s))nodes.set(s,new Node());return nodes.get(s);};doc.querySelectorAll=()=>[aim,fire,other];doc.body={classList:{toggle(){}}};doc.pointerLockElement=locked?canvas:null;
 globalThis.document=doc;globalThis.addEventListener=win.addEventListener.bind(win);
 const g=Object.create(Game.prototype);g.running=true;g.paused=false;g.pointerLocked=locked;g.mouse={x:0,y:0,down:false,aiming:false,drag:false};g.touch={x:0,z:0,fire:false,aiming:false};g.keys=new Set();g.settings={sensitivity:1};
 g.player={x:6,z:6,yaw:0,pitch:0,hp:100,ammo:12,reserve:24,cooldown:0,reloading:0,dash:0,melee:0};g.grid=Array.from({length:10},()=>Array(10).fill(0));g.enemies=[];g.stats={shots:0};g.world={effect(){},tracer(){},fireWeapon(aimed){g.lastShotAimed=aimed;}};g.sound={init(){},play(){},pause(){}};g.ui={pause(){g.setPaused(true);}};g.capturePointer=()=>{};
 try{g.setupInput();fn({g,win,canvas,aim,fire,other});}finally{globalThis.document=previous.document;globalThis.addEventListener=previous.addEventListener;}
}

for(const locked of[false,true]){
 test((locked?'Pointer lock':'Drag look')+': hold aim, click fire, then release fire without losing aim',()=>fixture(locked,({g,canvas,win})=>{
  send(canvas,'pointerdown',{button:2,buttons:2});send(canvas,'mousedown',{button:2,buttons:2});assert.equal(g.player.ammo,12);assert.equal(g.mouse.aiming,true);
  // A second button produces pointermove + mousedown, never a second pointerdown.
  send(win,'pointermove',{button:0,buttons:3});send(canvas,'mousedown',{button:0,buttons:3});assert.equal(g.player.ammo,11);assert.equal(g.lastShotAimed,true);assert.equal(g.mouse.down,true);assert.equal(g.player.aiming,true);
  g.shoot();assert.equal(g.player.ammo,11,'Immediate input and frame handling cannot double-fire');
  send(win,'pointermove',{button:0,buttons:2});send(win,'mouseup',{button:0,buttons:2});assert.equal(g.mouse.down,false);assert.equal(g.mouse.aiming,true);assert.equal(g.mouse.drag,!locked);
  send(win,'pointerup',{button:2,buttons:0});send(win,'mouseup',{button:2,buttons:0});assert.equal(g.mouse.aiming,false);assert.equal(g.mouse.drag,false);assert.equal(g.player.aiming,false);
 }));
 test((locked?'Pointer lock':'Drag look')+': hold fire, add aim, then release aim without losing fire',()=>fixture(locked,({g,canvas,win})=>{
  send(canvas,'pointerdown',{button:0,buttons:1});send(canvas,'mousedown',{button:0,buttons:1});assert.equal(g.player.ammo,11);assert.equal(g.lastShotAimed,false);
  send(win,'pointermove',{button:2,buttons:3});send(canvas,'mousedown',{button:2,buttons:3});assert.equal(g.mouse.down,true);assert.equal(g.mouse.aiming,true);assert.equal(g.player.ammo,11);
  g.player.cooldown=0;g.shoot();assert.equal(g.lastShotAimed,true);assert.equal(g.player.ammo,10);
  send(win,'pointermove',{button:2,buttons:1});send(win,'mouseup',{button:2,buttons:1});assert.equal(g.mouse.down,true);assert.equal(g.player.aiming,false);assert.equal(g.mouse.drag,!locked);
  send(win,'pointerup',{button:0,buttons:0});send(win,'mouseup',{button:0,buttons:0});assert.equal(g.mouse.down,false);assert.equal(g.mouse.drag,false);
 }));
}
test('Blur, pause, cancellation and releasing outside the canvas clear held combat input',()=>fixture(false,({g,canvas,win})=>{
 send(canvas,'mousedown',{button:2,buttons:2});send(canvas,'mousedown',{button:0,buttons:3});send(win,'blur');assert.equal(g.paused,true);assert.equal(g.mouse.down,false);assert.equal(g.mouse.aiming,false);
 send(canvas,'mousedown',{button:0,buttons:1});assert.equal(g.player.ammo,11,'Paused clicks cannot shoot');g.setPaused(false);
 send(canvas,'mousedown',{button:2,buttons:2});send(win,'pointercancel');assert.equal(g.mouse.aiming,false);assert.equal(g.mouse.drag,false);
 send(canvas,'mousedown',{button:2,buttons:2});send(win,'mouseup',{button:2,buttons:0});assert.equal(g.mouse.aiming,false);
}));
test('Reloading, middle clicks and touch compatibility clicks cannot consume ammunition',()=>fixture(false,({g,canvas})=>{
 send(canvas,'mousedown',{button:1,buttons:4});send(canvas,'mousedown',{button:0,buttons:1,sourceCapabilities:{firesTouchEvents:true}});assert.equal(g.player.ammo,12);assert.equal(g.mouse.down,false);
 g.player.reloading=.8;send(canvas,'mousedown',{button:2,buttons:2});send(canvas,'mousedown',{button:0,buttons:3});assert.equal(g.player.ammo,12);assert.equal(g.player.aiming,true);
}));
test('Touch aim and other buttons cannot cancel another finger holding fire',()=>fixture(false,({g,aim,fire,other})=>{
 send(aim,'pointerdown',{pointerType:'touch',pointerId:1});send(fire,'pointerdown',{pointerType:'touch',pointerId:2});assert.equal(g.player.ammo,11);assert.equal(g.lastShotAimed,true);
 send(aim,'pointerup',{pointerType:'touch',pointerId:1});assert.equal(g.touch.fire,true);assert.equal(g.touch.aiming,true);
 send(other,'pointerup',{pointerType:'touch',pointerId:3});assert.equal(g.touch.fire,true);g.player.cooldown=0;g.shoot();assert.equal(g.player.ammo,10);
 send(fire,'pointercancel',{pointerType:'touch',pointerId:2});assert.equal(g.touch.fire,false);
}));
