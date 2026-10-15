// Each loss invalidates the previous preparation. A late promise cannot resume
// gameplay after a second loss or replace the newer recovery state.
export class GraphicsRecovery{
 constructor(callbacks){this.callbacks=callbacks;this.state='ready';this.generation=0;}
 lose(){this.generation++;this.state='lost';this.callbacks.lost();}
 async restore(){
  if(this.state!=='lost')return false;const generation=this.generation;this.state='warming';
  try{await this.callbacks.warm();if(generation!==this.generation)return false;this.state='ready';this.callbacks.ready();return true;}
  catch(error){if(generation!==this.generation)return false;this.state='failed';this.callbacks.failed(error);return false;}
 }
}
