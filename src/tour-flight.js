// Cinematic bookends for the existing ground route. Coordinates use scene space.
export function createTourFlight({THREE,camera,controls,dockPose,cutaway,enterWalking,finishDock}){
 let flight=null;
 const world=(x,y,z)=>new THREE.Vector3(x-21,y,z-22.5);
 const easing=t=>t*t*t*(t*(t*6-15)+10);
 function start(direction,walk){
  cutaway();controls.enabled=false;
  const dock=dockPose(),landing=world(walk.x,walk.y+1.67,walk.z);
  const groundTarget=landing.clone().add(new THREE.Vector3(Math.sin(walk.yaw)*Math.cos(walk.pitch),Math.sin(walk.pitch),Math.cos(walk.yaw)*Math.cos(walk.pitch)).multiplyScalar(8));
  const incoming=direction==='intro';
  // Travel above the structure; only descend/ascend in the clear Start/End areas.
  const points=incoming?
   [dock.position,world(53,22,49.5),world(13,15,47),world(walk.x,11,walk.z),landing]:
   [camera.position.clone(),world(walk.x,11,walk.z),world(48,18,48),dock.position];
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
  const rotation=(position,target)=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,target,camera.up));
  flight={direction,curve,time:0,duration:incoming?8:7,hold:incoming?1.2:0,
   from:camera.quaternion.clone(),middle:rotation(curve.getPointAt(.5),world(18,2,27)),to:incoming?rotation(landing,groundTarget):rotation(dock.position,dock.target),
   fov:camera.fov,targetFov:incoming?90:39};
 }
 function update(dt){
  if(!flight)return true;
  flight.time+=Math.max(0,dt);
  const t=Math.min(1,Math.max(0,(flight.time-flight.hold)/flight.duration)),k=easing(t);
  camera.position.copy(flight.curve.getPointAt(k));
  if(t<.5)camera.quaternion.slerpQuaternions(flight.from,flight.middle,easing(t*2));
  else camera.quaternion.slerpQuaternions(flight.middle,flight.to,easing((t-.5)*2));
  camera.fov=flight.fov+(flight.targetFov-flight.fov)*k;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  if(t<1)return false;flight=null;return true;
 }
 function finish(){
  flight=null;const dock=dockPose();camera.position.copy(dock.position);controls.target.copy(dock.target);
  camera.fov=39;camera.updateProjectionMatrix();
  // Flush any damping left from orbiting before the tour, then restore it.
  const damping=controls.enableDamping;controls.enableDamping=false;controls.update();
  camera.position.copy(dock.position);controls.target.copy(dock.target);controls.update();controls.enableDamping=damping;
  controls.enabled=true;finishDock();
 }
 return {start,update,finish,cancel:()=>{if(flight)finish();},enterWalk:()=>{flight=null;enterWalking();},state:()=>flight?{direction:flight.direction,elapsed:flight.time,duration:flight.duration+flight.hold}:null};
}
