import {createTour} from './tour.js';
export function createOperations(ctx){
 const {THREE,world,camera,controls,canvas,M,box,bar,cylinder,sign,dynamicPallet,doors,forklifts,updateForklift,pathAt,wallSegments,columnRects,storageFootprints,truckGroups,dockZ,tr,getView,setView,showInterior}=ctx;
 const $=id=>document.getElementById(id),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const ramps=[{id:'rampNorth',x0:42,x1:54,z:-.55,width:1.8,high:0,low:-1.5},{id:'rampSouth',x0:42,x1:54,z:46.1,width:1.8,high:0,low:-1.5}];
 const extraWalls=[];
 const wallRect=(a,b,c,d,p=.075)=>({x0:Math.min(a,c)-p,x1:Math.max(a,c)+p,z0:Math.min(b,d)-p,z1:Math.max(b,d)+p});
 for(const r of ramps){
  // The entire ramp surface and rails follow the same height function used by walking.
  const h=x=>-1.5*clamp((x-r.x0)/(r.x1-r.x0),0,1);
  box(world,M.floor,40.5,-.12,r.z,3,.24,r.width);
  box(world,M.floor,54.5,-1.62,r.z,1,.24,r.width);
  const mesh=box(world,M.floor,48,-.87,r.z,Math.hypot(12,1.5),.24,r.width);mesh.rotation.z=-Math.atan2(1.5,12);
  for(const side of [-1,1]){
   const z=r.z+side*(r.width/2+.025);
   const curb=box(world,M.yellow,48,-.68,z,Math.hypot(12,1.5),.12,.15);curb.rotation.z=-Math.atan2(1.5,12);
   for(let x=42;x<=54;x+=1.5){cylinder(world,M.beam,x,h(x)+.51,z,.035,1.02);box(world,M.dark,x,h(x)+.045,z,.16,.06,.16);}
   for(const y of [.52,1.05])bar(world,M.beam,[42,h(42)+y,z],[54,h(54)+y,z],.06);
   extraWalls.push(wallRect(42,z,54,z,.06));
   if((r.id==='rampNorth'&&side===-1)||(r.id==='rampSouth'&&side===1)){
    box(world,M.insulated,40.1,1.65,z,2.2,3.3,.12);
    box(world,M.dark,40.1,.75,z-side*.075,2.2,.45,.02);
    extraWalls.push(wallRect(39,z,41.2,z,.06));
   }
  }
  for(let x=42.3;x<54;x+=.45){const m=box(world,M.dark,x,h(x)+.077,r.z-r.width/2,.22,.01,.16);m.rotation.z=-Math.atan2(1.5,12);}
  const portal=new THREE.Group();portal.position.set(39.1,0,r.z);portal.rotation.y=Math.PI/2;world.add(portal);
  for(const k of [-1,1])box(portal,M.steel,k*.85,1.4,0,.12,2.8,.18);
  box(portal,M.steel,0,2.78,0,1.82,.13,.19);
  const leaf=new THREE.Group();leaf.position.set(-.80,0,0);leaf.rotation.y=-1.48;portal.add(leaf);
  box(leaf,M.steel,.4,1.35,0,.8,2.68,.065);box(leaf,M.glass,.4,1.70,.039,.44,.62,.015);box(leaf,M.yellow,.68,1.03,.085,.08,.25,.06);
  sign(portal,'STAFF EXIT',0,3.03,0,1.65,.3,0,'#276b4e');
  sign(world,'WATCH YOUR STEP',44,h(44)+1.32,r.z-r.width/2-.04,2,.28);
 }
 // Open pedestrian links through the north and south building edges.
 box(world,M.floor,40,.01,.6,2.0,.06,2.0);box(world,M.floor,40,.01,45.2,2,.06,2);
 const staticWalls=[...wallSegments.map(s=>wallRect(s.x1,s.z1,s.x2,s.z2)),...extraWalls,wallRect(41.8,4.93,41.8,5.07,.07),
  wallRect(0,0,0,45),wallRect(0,0,27.6,0),wallRect(27.6,1.65,39,1.65),wallRect(0,45,39,45),wallRect(41,45,42,45),
  {x0:0,x1:3.58,z0:0,z1:7.68},{x0:27.7,x1:32.07,z0:1.65,z1:3.48}];
 const inside=(x,z,r,p=0)=>x>r.x0-p&&x<r.x1+p&&z>r.z0-p&&z<r.z1+p;
 const local=(d,x,z)=>({u:Math.cos(d.ry)*(x-d.x)-Math.sin(d.ry)*(z-d.z),v:Math.sin(d.ry)*(x-d.x)+Math.cos(d.ry)*(z-d.z)});
 function floorHeight(x,z){
  for(const r of ramps){if(x>=39&&x<=55&&Math.abs(z-r.z)<r.width/2)return -1.5*clamp((x-42)/12,0,1);}
  if(x>41.9){for(const z0 of dockZ)if(x<51.2&&Math.abs(z-z0)<1.3)return 0;return -1.5;}
  if(z<.55&&x>39)return x<41&&z>-.4?0:-1.5;
  if(z>45)return x>39&&x<41&&z<45.3?0:-1.5;
  if(z>=34.95&&z<=35.85&&x>35.2&&x<38)return .25*clamp((35.85-z)/.9,0,1);
  if(z>19.2&&z<20.65&&((x>20.8&&x<24.3)||(x>34.4&&x<38)))return .25*(z-19.2)/1.45;
  if(z>=20.65&&z<35&&((x>32.3&&x<41.8)||(x>1.8&&x<30.6&&(z<31.3||x>15.15))))return .25;
  return 0;
 }
 const staff=[];
 function staffMover(i,points){
  const g=new THREE.Group();world.add(g);box(g,M.red,0,.26,0,.64,.44,.53);
  for(const x of [-.24,.24]){box(g,M.red,x,.095,.62,.17,.12,1.65);const w=cylinder(g,M.rubber,x,.085,1.25,.085,.15,Math.PI/2);}
  bar(g,M.dark,[0,.39,-.13],[0,1.05,-.74],.055);box(g,M.dark,0,1.05,-.74,.43,.085,.08);
  const cargo=dynamicPallet();cargo.position.set(0,.04,.70);g.add(cargo);
  const person=new THREE.Group();person.position.set(0,0,-1.17);g.add(person);
  const coat=new THREE.MeshStandardMaterial({color:i?'#e5b448':'#b1c958',roughness:.8}),navy=new THREE.MeshStandardMaterial({color:'#344253',roughness:.9});
  box(person,coat,0,1.12,0,.46,.62,.27);for(const z of [-.143,.143])box(person,M.white,0,1.12,z,.46,.035,.008);
  cylinder(person,new THREE.MeshStandardMaterial({color:'#bd9576',roughness:.8}),0,1.61,0,.13,.25);cylinder(person,M.yellow,0,1.765,0,.17,.09);
  const legs=[];for(const x of [-.13,.13]){const leg=new THREE.Group();leg.position.set(x,.83,0);person.add(leg);box(leg,navy,0,-.35,0,.17,.70,.20);box(leg,M.dark,0,-.76,.075,.20,.12,.33);legs.push(leg);bar(person,coat,[x*2,1.36,0],[x*2,1.06,.42],.12);}
  const pickup=dynamicPallet();pickup.position.set(points[0][0],floorHeight(...points[0]),points[0][1]+.7);world.add(pickup);
  const deposit=dynamicPallet();deposit.position.set(i<2?47.0:points.at(-1)[0],i<2?.015:floorHeight(...points.at(-1)),i<2?dockZ[i?3:1]:points.at(-1)[1]+.70);world.add(deposit);deposit.visible=false;
  const result={g,cargo,person,legs,pickup,deposit,points,index:i,clock:0,phase:'Next collection',done:false};staff.push(result);return result;
 }
 staffMover(0,[[39.1,9.0],[39.1,6.65],[45.6,6.65]]);
 staffMover(1,[[34.6,37.4],[37.6,37.4],[37.6,42.25],[45.6,42.25]]);
 staffMover(2,[[5.3,25.8],[11.4,25.8]]);
 staffMover(3,[[5.2,37.0],[11.2,37.0]]);
 staffMover(4,[[36.2,25.8],[36.2,29.8]]);
 staffMover(5,[[35.0,14.2],[35.0,17.0]]);
 function updateStaff(f,time){
  const t=clamp(time,0,70);let u=0,loaded=t>=3&&t<36;
  if(t<4)f.phase='Picking pallet';else if(t<32){u=(t-4)/28;f.phase='Pushing pallet truck';}else if(t<38){u=1;f.phase='Loading by hand';}else if(t<66){u=1-(t-38)/28;f.phase='Returning empty';}else f.phase='Next collection';
  const p=pathAt(f.points,u);f.g.position.set(p.x,floorHeight(p.x,p.z),p.z);f.g.rotation.y=p.heading;f.cargo.visible=loaded;f.pickup.visible=t<3;f.deposit.visible=t>=36;
  const moving=(t>4&&t<32)||(t>38&&t<66);f.legs.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(t*7+i*Math.PI)*.42:0);
 }
 // Separate dispatch turns avoid head-on traffic at the narrow blue doors.
 // Two forklifts work together, then the other two, followed by hand-pallet loading.
 let stage=0,lastTime=0,dispatchCount=0;const groups=[[0,1],[2]];
 function reset(){stage=0;lastTime=0;dispatchCount=0;forklifts.forEach(f=>{f.clock=0;f.done=false;updateForklift(f,0);f.phase='Next collection';});staff.forEach(f=>{f.clock=0;f.done=false;updateStaff(f,0);f.pickup.visible=false;f.phase='Next collection';});doors.forEach(d=>{d.fraction=0;d.safety=false;d.passageRequest=0;drawDoor(d);});}
 function allActors(){return [...forklifts,...staff].map((f,i)=>{
  const t=f.clock,enabled=i<forklifts.length?stage<2&&groups[stage].includes(i)&&!f.done:(f.index>=2||stage===2)&&!f.done;
  const moving=i<forklifts.length?(t>=8&&t<46)||(t>=53&&t<94):(t>=4&&t<32)||(t>=38&&t<66);
  const u=i<forklifts.length?(t<46?(t+.2-8)/38:1-(t+.2-53)/41):(t<32?(t+.2-4)/28:1-(t+.2-38)/28),p=pathAt(f.points,clamp(u,0,1));
  return {x:f.g.position.x,z:f.g.position.z,heading:f.g.rotation.y,extent:2.9,active:enabled&&moving,dx:p.x-f.g.position.x,dz:p.z-f.g.position.z};
 }).concat(walking?[{x:walk.x,z:walk.z,heading:walk.yaw,extent:.4,active:Math.hypot(intent.x,intent.z)>.001,dx:intent.x,dz:intent.z}]:[]);}
 function drawDoor(d){const open=d.fraction*.985;d.leaf.scale.y=1-open;d.leaf.position.y=3.9*open;d.lamp.material=d.fraction>.94?M.green:M.red;}
 function doorsStep(dt){
  const actors=allActors();for(const d of doors){let demand=false,occupied=false,tailPresent=false;
   for(const a of actors){const p=local(d,a.x,a.z),angle=a.heading-d.ry,reach=a.extent<1?.55:Math.abs(Math.cos(angle))*a.extent+Math.abs(Math.sin(angle))*.72+.15;
    const du=Math.cos(d.ry)*a.dx-Math.sin(d.ry)*a.dz,dv=Math.sin(d.ry)*a.dx+Math.cos(d.ry)*a.dz,k=-p.v/(dv||1e-9),crossU=p.u+du*k;
    if(a.active&&p.v*dv<0&&Math.abs(p.v)<(a.extent<1?2.4:4.6)&&Math.abs(crossU)<d.w/2-.12)demand=true;
    if(Math.abs(p.u)<d.w/2+.3&&Math.abs(p.v)<reach)tailPresent=true;
    const physicalReach=a.extent<1?.55:Math.abs(Math.cos(angle))*2.4+Math.abs(Math.sin(angle))*.72+.15;
    if(Math.abs(p.u)<d.w/2+.3&&Math.abs(p.v)<physicalReach)occupied=true;
   }
   d.safety=d.mode==='closed'&&occupied;
   const target=d.mode==='open'||d.safety||(d.mode==='auto'&&(demand||occupied||(tailPresent&&d.fraction>.1)||d.passageRequest>0))?1:0;
   d.passageRequest=Math.max(0,(d.passageRequest||0)-dt);
   d.fraction=clamp(d.fraction+Math.sign(target-d.fraction)*dt*.85,0,1);drawDoor(d);
  }
 }
 function blockedDoor(x,z,extent,heading){return doors.find(d=>{const p=local(d,x,z),reach=heading===undefined?extent:Math.abs(Math.cos(heading-d.ry))*extent+Math.abs(Math.sin(heading-d.ry))*.78;return d.fraction<.94&&Math.abs(p.u)<d.w/2+.25&&Math.abs(p.v)<reach;});}
 // Rectangular vehicle body vs wall rectangles, with full orientation (not just centers).
 function bodyHits(x,z,heading,r,halfWidth=.69,rear=1.30,front=1.02){
  const fx=Math.sin(heading),fz=Math.cos(heading),rx=Math.cos(heading),rz=-Math.sin(heading),cx=x+fx*(front-rear)/2,cz=z+fz*(front-rear)/2,hl=(rear+front)/2;
  const ox=(r.x0+r.x1)/2,oz=(r.z0+r.z1)/2,hw=(r.x1-r.x0)/2,hd=(r.z1-r.z0)/2,dx=cx-ox,dz=cz-oz;
  return Math.abs(dx)<Math.abs(rx)*halfWidth+Math.abs(fx)*hl+hw&&Math.abs(dz)<Math.abs(rz)*halfWidth+Math.abs(fz)*hl+hd&&Math.abs(dx*rx+dz*rz)<halfWidth+hw*Math.abs(rx)+hd*Math.abs(rz)&&Math.abs(dx*fx+dz*fz)<hl+hw*Math.abs(fx)+hd*Math.abs(fz);
 }
 function bodyWallHit(f){return staticWalls.find(r=>bodyHits(f.g.position.x,f.g.position.z,f.g.rotation.y,r));}
 function pedestrianHit(f){return walking&&bodyHits(f.g.position.x,f.g.position.z,f.g.rotation.y,{x0:walk.x-.40,x1:walk.x+.40,z0:walk.z-.40,z1:walk.z+.40},.72,1.4,2.3);}
 function step(dt){
  doorsStep(dt);
  for(const f of staff.slice(2)){
   const old=f.clock;updateStaff(f,old+dt);const blocked=bodyWallHit(f)||pedestrianHit(f);
   if(blocked){updateStaff(f,old);f.phase='Waiting for traffic';}else{f.clock=old+dt;if(f.clock>=70){f.clock=0;updateStaff(f,0);}}
  }
  if(stage<2){
   for(const i of groups[stage]){const f=forklifts[i];if(f.done)continue;const old=f.clock;updateForklift(f,Math.min(99.99,old+dt));
    const door=blockedDoor(f.g.position.x,f.g.position.z,2.65,f.g.rotation.y),wall=bodyWallHit(f)||pedestrianHit(f);
    if(door||wall){if(door)door.passageRequest=.5;updateForklift(f,Math.min(99.99,old));f.phase=door?'Waiting for door':'Waiting for traffic';}
    else{f.clock=Math.min(100,old+dt);if(old<51&&f.clock>=51)dispatchCount++;f.done=f.clock>=100;}
   }
   if(groups[stage].every(i=>forklifts[i].done)){stage++;if(stage===2)staff.slice(0,2).forEach(f=>f.pickup.visible=true);}
  }else{
   for(const f of staff.slice(0,2)){if(f.done)continue;const old=f.clock;updateStaff(f,old+dt);const door=blockedDoor(f.g.position.x,f.g.position.z,2.1,f.g.rotation.y),wall=bodyWallHit(f)||pedestrianHit(f);
    if(door||wall){if(door)door.passageRequest=.5;updateStaff(f,old);f.phase=door?'Waiting for door':'Waiting for traffic';}else{f.clock=Math.min(70,old+dt);if(old<36&&f.clock>=36)dispatchCount++;f.done=f.clock>=70;}
   }
   if(staff.slice(0,2).every(f=>f.done)){stage=0;forklifts.forEach(f=>{f.clock=0;f.done=false;updateForklift(f,0);});staff.slice(0,2).forEach(f=>{f.clock=0;f.done=false;updateStaff(f,0);f.pickup.visible=false;});}
  }
 }
 function seek(time){if(time<lastTime-.00001)reset();let remaining=Math.max(0,time-lastTime);while(remaining>.000001){const dt=Math.min(.05,remaining);step(dt);remaining-=dt;}lastTime=time;}
 function setDoorMode(id,mode){if(!['auto','open','closed'].includes(mode))return;doors.filter(d=>id==='all'||d.id===id).forEach(d=>d.mode=mode);refreshDoorUI();}
 for(const d of doors){const e=document.createElement('option');e.value=d.id;e.textContent=tr(d.title);$('doorSelect').append(e);}
 document.querySelectorAll('[data-door-mode]').forEach(e=>e.onclick=()=>setDoorMode($('doorSelect').value,e.dataset.doorMode));$('doorSelect').onchange=refreshDoorUI;
 function refreshDoorUI(){
  for(const d of doors)$('doorSelect').querySelector(`option[value="${d.id}"]`).textContent=tr(d.title);
  const selected=doors.filter(d=>$('doorSelect').value==='all'||d.id===$('doorSelect').value);
  document.querySelectorAll('[data-door-mode]').forEach(e=>e.classList.toggle('active',selected.every(d=>d.mode===e.dataset.doorMode)));
  $('doorStatus').textContent=selected.map(d=>tr(d.title)+': '+tr(d.safety?'Safety hold':d.fraction>.99?'Open':d.fraction<.01?'Closed':d.mode==='closed'?'Closing':'Opening')).join(' · ');
 }
 // First-person walking uses the same walls/door apertures and the actual ramp elevations.
 let walking=false,lookDrag=false,lastPointer=null;
 const walk={x:27.8,z:39.95,y:0,yaw:Math.PI/2,pitch:0},keys=new Set(),intent={x:0,z:0};
 const truckObstacles=[];
 for(const z of dockZ){truckObstacles.push({x0:51.15,x1:53.95,z0:z-1.4,z1:z+1.4},{x0:43,x1:51.2,z0:z-1.40,z1:z-1.29},{x0:43,x1:51.2,z0:z+1.29,z1:z+1.40},{x0:47.3,x1:50.7,z0:z-1.2,z1:z+1.2});}
 function canPlan(x,z){
  if(x<.4||x>63||z<-1.8||z>47.25)return false;
  if(x<39&&(z<.25||z>44.7))return false;
  if(staticWalls.some(r=>inside(x,z,r,.24))||columnRects.some(r=>inside(x,z,r,.1))||storageFootprints.some(r=>inside(x,z,r,.26))||truckObstacles.some(r=>inside(x,z,r,.23)))return false;
  const personRect={x0:x-.24,x1:x+.24,z0:z-.24,z1:z+.24};if([...forklifts,...staff].some(f=>bodyHits(f.g.position.x,f.g.position.z,f.g.rotation.y,personRect,.6,1.25,1.25)))return false;
  return true;
 }
 function canWalk(x,z){return canPlan(x,z)&&!blockedDoor(x,z,.43)&&Math.abs(floorHeight(x,z)-floorHeight(walk.x,walk.z))<.20;
 }
 function walkCamera(){walk.y=floorHeight(walk.x,walk.z);camera.position.set(walk.x-21,walk.y+1.67,walk.z-22.5);camera.lookAt(camera.position.x+Math.sin(walk.yaw)*Math.cos(walk.pitch),camera.position.y+Math.sin(walk.pitch),camera.position.z+Math.cos(walk.yaw)*Math.cos(walk.pitch));camera.updateMatrixWorld();}
 function relocate(place){const p={south:[27.8,39.95,Math.PI/2],north:[20.5,11.6,Math.PI/2],rampNorth:[40.7,-.55,Math.PI/2],rampSouth:[40.7,46.1,Math.PI/2]}[place]||[27.8,39.95,Math.PI/2];[walk.x,walk.z,walk.yaw]=p;walk.pitch=-.025;if(walking)walkCamera();}
 function enterWalk(){walking=true;controls.enabled=false;camera.fov=70;camera.updateProjectionMatrix();showInterior();document.body.classList.add('walking');relocate($('walkStart').value);canvas.focus();}
 function exitWalk(){walking=false;keys.clear();intent.x=intent.z=0;tour.stop();lookDrag=false;document.body.classList.remove('walking');controls.enabled=true;}
 function walkMove(forward,side,dt){const speed=10.0;const dx=(Math.sin(walk.yaw)*forward-Math.cos(walk.yaw)*side)*speed*dt,dz=(Math.cos(walk.yaw)*forward+Math.sin(walk.yaw)*side)*speed*dt;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));for(let i=0;i<steps;i++){if(canWalk(walk.x+dx/steps,walk.z))walk.x+=dx/steps;if(canWalk(walk.x,walk.z+dz/steps))walk.z+=dz/steps;}walkCamera();}
 const tour=createTour({walk,canPlan,canStep:(x,z,a,b)=>Math.abs(floorHeight(x,z)-floorHeight(a,b))<.20,moveTo:(x,z)=>{if(!canWalk(x,z))return false;walk.x=x;walk.z=z;walkCamera();return true;},face:(yaw,dt)=>{const delta=Math.atan2(Math.sin(yaw-walk.yaw),Math.cos(yaw-walk.yaw));walk.yaw+=delta*Math.min(1,dt*5);walkCamera();},begin:()=>{setView('walk');ctx.resumeSimulation?.();relocate('south');doors.forEach(d=>d.mode='auto');},doorRequest:p=>{intent.x=p.x-walk.x;intent.z=p.z-walk.z;},tr});
 $('exitWalk').onclick=()=>setView('overview');$('walkStart').onchange=()=>{tour.stop();relocate($('walkStart').value);};
 window.addEventListener('keydown',e=>{if(!walking||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Escape'){setView('overview');return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.code==='KeyE'){const d=doors.filter(d=>Math.hypot(d.x-walk.x,d.z-walk.z)<5).sort((a,b)=>Math.hypot(a.x-walk.x,a.z-walk.z)-Math.hypot(b.x-walk.x,b.z-walk.z))[0];if(d)setDoorMode(d.id,d.mode==='open'?'closed':'open');}});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
 canvas.addEventListener('pointerdown',e=>{if(!walking)return;lookDrag=true;lastPointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!walking||!lookDrag)return;walk.yaw-=(e.clientX-lastPointer[0])*.004;walk.pitch=clamp(walk.pitch-(e.clientY-lastPointer[1])*.003,-1.2,1.2);lastPointer=[e.clientX,e.clientY];walkCamera();});
 canvas.addEventListener('pointerup',()=>lookDrag=false);canvas.addEventListener('pointercancel',()=>lookDrag=false);
 document.querySelectorAll('[data-walk]').forEach(e=>{e.onpointerdown=ev=>{ev.preventDefault();keys.add(e.dataset.walk);e.setPointerCapture(ev.pointerId);};e.onpointerup=e.onpointercancel=()=>keys.delete(e.dataset.walk);});
 function update(t,realDt){const old=lastTime;seek(t);if(t===old)doorsStep(realDt);if(walking){if(tour.state().active){if(tour.state().paused)intent.x=intent.z=0;for(let n=0;n<5;n++)tour.update(realDt/5);if(!tour.state().active)intent.x=intent.z=0;}else{const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),s=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),norm=Math.hypot(f,s)||1;intent.x=Math.sin(walk.yaw)*f-Math.cos(walk.yaw)*s;intent.z=Math.cos(walk.yaw)*f+Math.sin(walk.yaw)*s;walkMove(f/norm,s/norm,realDt);}}}
 function doorState(){return doors.map(d=>({id:d.id,x:d.x,z:d.z,width:d.w,rotation:d.ry,mode:d.mode,open:d.fraction,safety:d.safety}));}
 function staffState(){return staff.map(f=>({x:f.g.position.x,z:f.g.position.z,heading:f.g.rotation.y,loaded:f.cargo.visible,phase:f.phase,clock:f.clock,deposit:f.deposit.visible}));}
 function validateWalls(){return [...forklifts,...staff].map((f,index)=>({index,hit:bodyWallHit(f)})).filter(f=>f.hit);}
 function staffStatus(){return staff.map((f,i)=>`<div class="activity"><span>PT-0${i+1}</span><em>${tr(f.phase)}</em></div>`).join('');}
 reset();refreshDoorUI();
 return {update,seek,reset,setDoorMode,doorState,staffState,staffStatus,refreshDoorUI,ramps,floorHeight,enterWalk,exitWalk,relocate,walkMove,tour,canPlan,walkState:()=>({...walk,active:walking,tour:tour.state()}),validateWalls,bodyHits,staticWalls,stage:()=>stage,dispatched:()=>dispatchCount,clocks:()=>forklifts.map(f=>f.clock)};
}
