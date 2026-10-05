import {isFrozenZone} from './cold-appearance.js';
import {createTour} from './tour.js';
import {createMobileControls} from './mobile-controls.js';
import {onLanguage} from './i18n.js';
export function createOperations(ctx){
 const {THREE,world,camera,controls,canvas,M,actorModels,box,bar,cylinder,sign,dynamicPallet,doors,forklifts,updateForklift,pathAt,wallSegments,columnRects,storageFootprints,truckGroups,dockZ,tr,getView,setView,showInterior}=ctx;
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
  if(x>29.3&&x<30.9&&z>9.8&&z<13.4)return .25*clamp((x-29.3)/1.6,0,1);
  if(x>34.1&&x<38.3&&z>8.8&&z<10.4)return .25*clamp((z-8.8)/1.6,0,1);
  if(x>30.1&&x<41.8&&z>=10&&z<20.65)return .25;
  if(z>19.2&&z<20.65&&x>20.8&&x<24.3)return .25*(z-19.2)/1.45;
  if(x>=30.6&&x<=32.3&&z>=28&&z<=30.6)return .25;
  if(z>=20.65&&z<35&&((x>32.3&&x<41.8)||(x>1.8&&x<30.6&&(z<31.3||x>15.15))))return .25;
  return 0;
 }
 const staff=[];
 function staffMover(i,points){
  const g=new THREE.Group(),cart=actorModels.palletTruck();world.add(g);g.add(cart);
  const cargo=dynamicPallet();cargo.position.set(0,.04,.70);cart.add(cargo);
  const worker=actorModels.worker(i,false,points.some(([x,z])=>isFrozenZone(x,z))),person=worker.root;person.position.set(0,0,-1.17);g.add(person);
  const pickup=dynamicPallet();pickup.position.set(points[0][0],floorHeight(...points[0]),points[0][1]+.7);world.add(pickup);
  const deposit=dynamicPallet();deposit.position.set(i<2?47.0:points.at(-1)[0],i<2?.015:floorHeight(...points.at(-1)),i<2?dockZ[i?3:1]:points.at(-1)[1]+.70);world.add(deposit);deposit.visible=false;
  const result={g,cart,cargo,person,worker,pickup,deposit,points,index:i,staff:true,distance:points.slice(1).reduce((sum,p,j)=>sum+Math.hypot(p[0]-points[j][0],p[1]-points[j][1]),0),clock:0,phase:'Next collection',done:false};staff.push(result);return result;
 }
 staffMover(0,[[39.1,8.0],[39.1,6.65],[45.6,6.65]]);
 staffMover(1,[[35.0,42.25],[45.6,42.25]]);
 staffMover(2,[[5.3,25.8],[11.4,25.8]]);
 staffMover(3,[[5.2,37.0],[11.2,37.0]]);
 staffMover(4,[[35.3,25.0],[35.3,30.0]]);
 staffMover(5,[[34.5,14.5],[34.5,18.0]]);
 staffMover(6,[[17.5,25.8],[23.2,25.8]]);
 staffMover(7,[[4.4,32.9],[11.8,32.9]]);
 function motion(f,time){const speed=f.staff?1.65:1.15,duration=2*f.distance/speed,phase=((time%duration)+duration)%duration/duration;return {duration,phase,outbound:phase<.5,p:pathAt(f.points,phase<.5?phase*2:2-phase*2)};}
 function updateStaff(f,time){
  const {duration,phase,outbound,p}=motion(f,time),trip=Math.floor(time/duration),withCart=f.index!==7&&(trip+f.index)%3!==2;
  f.hasCart=withCart;f.cart.visible=withCart;f.person.position.z=withCart?-1.17:0;
  f.g.position.set(p.x,floorHeight(p.x,p.z),p.z);f.g.rotation.y=p.heading+(outbound?0:Math.PI);
  f.cargo.visible=withCart&&outbound;f.pickup.visible=false;f.deposit.visible=false;
  f.phase=withCart?(outbound?'Pushing pallet truck':'Returning empty'):'Walking to next task';
  f.worker.pose(time,withCart);
  f.duration=duration;f.travelPhase=phase;
 }
 // Every actor runs its own continuous circuit; no dispatch-group idle stages.
 let lastTime=0,dispatchCount=0;
 const randomValues=new Uint32Array(12);crypto.getRandomValues(randomValues);
 [...forklifts,...staff].forEach((f,i)=>{f.initialClock=(.1+(randomValues[i]/4294967296)*.8)*2*f.distance/(f.staff?1.65:1.15);});
 function updateActor(f,time){if(f.staff)updateStaff(f,time);else{updateForklift(f,time);f.g.position.y=floorHeight(f.g.position.x,f.g.position.z);}}
 function reset(){
  lastTime=0;dispatchCount=0;doors.forEach(d=>{d.fraction=0;d.safety=false;d.passageRequest=0;drawDoor(d);});
  for(const f of [...forklifts,...staff]){
   if(!f.spawnChosen){for(let i=0;i<160;i++){updateActor(f,f.initialClock);const shape=actorShape(f);if(!bodyWallHit(f)&&!blockedDoor(f.g.position.x,f.g.position.z,Math.max(shape.front,shape.rear)+.4,f.g.rotation.y))break;f.initialClock+=.37;}f.spawnChosen=true;}
   f.clock=f.initialClock;updateActor(f,f.clock);
  }
 }
 function allActors(){return [...forklifts,...staff].map(f=>{const p=motion(f,f.clock+.2).p,shape=actorShape(f);return {x:f.g.position.x,z:f.g.position.z,heading:f.g.rotation.y,extent:Math.max(shape.rear,shape.front)+.3,active:true,dx:p.x-f.g.position.x,dz:p.z-f.g.position.z};}).concat(walking?[{x:walk.x,z:walk.z,heading:walk.yaw,extent:.4,active:Math.hypot(intent.x,intent.z)>.001,dx:intent.x,dz:intent.z}]:[]);}
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
 // Reserve cart space throughout each staff circuit, including when walking
 // empty, so attaching a cart cannot suddenly overlap a nearby visitor.
 function actorShape(f){return f.staff?(f.index!==7?{half:.48,rear:1.52,front:1.52}:{half:.25,rear:.3,front:.3}):{half:.69,rear:1.3,front:2.3};}
 function bodyWallHit(f){const shape=actorShape(f);return staticWalls.find(r=>bodyHits(f.g.position.x,f.g.position.z,f.g.rotation.y,r,shape.half,shape.rear,f.staff?shape.front:1.02));}
 function pedestrianHit(f){const shape=actorShape(f);return walking&&bodyHits(f.g.position.x,f.g.position.z,f.g.rotation.y,{x0:walk.x-.26,x1:walk.x+.26,z0:walk.z-.26,z1:walk.z+.26},shape.half,shape.rear,shape.front);}
 function step(dt){
  doorsStep(dt);
  for(const f of [...forklifts,...staff]){
   const old=f.clock,previous=f.travelPhase;updateActor(f,old+dt);const shape=actorShape(f);
   const door=blockedDoor(f.g.position.x,f.g.position.z,Math.max(shape.front,shape.rear)+.15,f.g.rotation.y),wall=bodyWallHit(f)||pedestrianHit(f);
   if(door||wall){if(door)door.passageRequest=.5;updateActor(f,old);f.phase=door?'Waiting for door':'Waiting for traffic';}
   else{f.clock=old+dt;if(previous<.5&&f.travelPhase>=.5&&(f.staff?f.hasCart:true))dispatchCount++;}
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
  // Match the envelope that makes vehicles yield to the visitor. Otherwise the
  // visitor can enter their stopping space and both parties wait indefinitely.
  const personRect={x0:x-.26,x1:x+.26,z0:z-.26,z1:z+.26};
  if([...forklifts,...staff].some(f=>{const sh=actorShape(f);return bodyHits(f.g.position.x,f.g.position.z,f.g.rotation.y,personRect,sh.half,sh.rear,sh.front);}))return false;
  return true;
 }
 function canWalk(x,z){return canPlan(x,z)&&!blockedDoor(x,z,.43)&&Math.abs(floorHeight(x,z)-floorHeight(walk.x,walk.z))<.20;
 }
 function walkCamera(){walk.y=floorHeight(walk.x,walk.z);camera.position.set(walk.x-21,walk.y+1.67,walk.z-22.5);camera.lookAt(camera.position.x+Math.sin(walk.yaw)*Math.cos(walk.pitch),camera.position.y+Math.sin(walk.pitch),camera.position.z+Math.cos(walk.yaw)*Math.cos(walk.pitch));camera.updateMatrixWorld();}
 function relocate(place){
  const p={routeStart:[1.5,38.2,Math.PI/2],northwest:[6.5,2,0],south:[27.8,39.95,Math.PI/2],north:[20.5,11.6,Math.PI/2],rampNorth:[40.7,-.55,Math.PI/2],rampSouth:[40.7,46.1,Math.PI/2]}[place]||[27.8,39.95,Math.PI/2];
  let position=p;
  // A tour can start at any traffic phase; never spawn inside a passing vehicle.
  if(!canPlan(p[0],p[1])){
   const candidates=[];for(let dx=-3;dx<=3;dx+=.15)for(let dz=-3;dz<=3;dz+=.15){const x=p[0]+dx,z=p[1]+dz;if(canPlan(x,z)&&!blockedDoor(x,z,.43)&&Math.abs(floorHeight(x,z)-floorHeight(p[0],p[1]))<.1)candidates.push([x,z,p[2],dx*dx+dz*dz]);}
   candidates.sort((a,b)=>a[3]-b[3]);if(candidates.length)position=candidates[0];
  }
  [walk.x,walk.z,walk.yaw]=position;walk.pitch=-.025;if(walking)walkCamera();
 }
 function enterWalk(){walking=true;controls.enabled=false;camera.fov=90;camera.updateProjectionMatrix();showInterior();document.body.classList.add('walking');mobileControls.collapse();relocate($('walkStart').value);canvas.focus();}
 function exitWalk(){walking=false;keys.clear();intent.x=intent.z=0;tour.stop();lookDrag=false;document.body.classList.remove('walking');controls.enabled=true;}
 function walkMove(forward,side,dt){const speed=8.0;const dx=(Math.sin(walk.yaw)*forward-Math.cos(walk.yaw)*side)*speed*dt,dz=(Math.cos(walk.yaw)*forward+Math.sin(walk.yaw)*side)*speed*dt;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));for(let i=0;i<steps;i++){if(canWalk(walk.x+dx/steps,walk.z))walk.x+=dx/steps;if(canWalk(walk.x,walk.z+dz/steps))walk.z+=dz/steps;}walkCamera();}
 // A refuge must be off nearby equipment routes, not merely clear this instant.
 function canYield(x,z){
  if(Math.hypot(x-walk.x,z-walk.z)<1)return false;
  for(const f of [...forklifts,...staff]){
   if(Math.hypot(f.g.position.x-walk.x,f.g.position.z-walk.z)>8)continue;
   for(let i=1;i<f.points.length;i++){
    const [ax,az]=f.points[i-1],[bx,bz]=f.points[i],dx=bx-ax,dz=bz-az;
    const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);
    if(Math.hypot(x-ax-t*dx,z-az-t*dz)<1.8)return false;
   }
  }
  return true;
 }
 function canStep(x,z,a,b){
  // Check the complete segment, including tiny grazes at obstacle corners.
  // Point samples alone miss these and can repeatedly replan the same blocked shortcut.
  const intersects=(x,z,a,b,r,pad=0)=>{
   let lo=0,hi=1;
   for(const [start,delta,min,max] of [[x,a-x,r.x0-pad,r.x1+pad],[z,b-z,r.z0-pad,r.z1+pad]]){
    if(Math.abs(delta)<1e-10){if(start<=min||start>=max)return false;continue;}
    let t0=(min-start)/delta,t1=(max-start)/delta;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>=hi)return false;
   }
   return lo<hi;
  };
  if(staticWalls.some(r=>intersects(x,z,a,b,r,.24))||columnRects.some(r=>intersects(x,z,a,b,r,.1))||storageFootprints.some(r=>intersects(x,z,a,b,r,.26))||truckObstacles.some(r=>intersects(x,z,a,b,r,.23)))return false;
  for(const f of [...forklifts,...staff]){
   const sin=Math.sin(f.g.rotation.y),cos=Math.cos(f.g.rotation.y),pad=.26*(Math.abs(sin)+Math.abs(cos));
   const local=(px,pz)=>{const dx=px-f.g.position.x,dz=pz-f.g.position.z;return [cos*dx-sin*dz,sin*dx+cos*dz];};
   const [sx,sz]=local(x,z),[ex,ez]=local(a,b);
   const sh=actorShape(f);if(intersects(sx,sz,ex,ez,{x0:-sh.half,x1:sh.half,z0:-sh.rear,z1:sh.front},pad))return false;
  }
  // A diagonal can cut across the lowered apron even when both ends are level.
  const n=Math.max(1,Math.ceil(Math.hypot(a-x,b-z)/.03));let height=floorHeight(x,z);
  for(let i=1;i<=n;i++){const next=floorHeight(x+(a-x)*i/n,z+(b-z)*i/n);if(Math.abs(next-height)>=.20)return false;height=next;}
  return true;
 }
 const tour=createTour({walk,canPlan,canYield,canStep,
  moveTo:(x,z)=>{if(!canWalk(x,z))return false;walk.x=x;walk.z=z;walkCamera();return true;},
  face:(yaw,dt)=>{const delta=Math.atan2(Math.sin(yaw-walk.yaw),Math.cos(yaw-walk.yaw));walk.yaw+=clamp(delta*(1-Math.exp(-dt*3.5)),-dt*2.2,dt*2.2);walkCamera();},
  begin:next=>{
   setView('dock',true);ctx.resumeSimulation?.();relocate('routeStart');walk.y=floorHeight(walk.x,walk.z);
   walk.yaw=Math.atan2(next[1]-walk.x,next[2]-walk.z);doors.forEach(d=>d.mode='auto');
   keys.clear();intent.x=intent.z=0;lookDrag=false;mobileControls.collapse();
   document.body.classList.add('walking');ctx.tourFlight.start('intro',walk);
  },
  enterRoute:()=>{walking=true;ctx.tourFlight.enterWalk();camera.fov=90;camera.updateProjectionMatrix();walkCamera();},
  advanceFlight:dt=>ctx.tourFlight.update(dt),
  finishRoute:()=>{walking=false;keys.clear();intent.x=intent.z=0;lookDrag=false;ctx.tourFlight.start('outro',walk);},
  complete:()=>{ctx.tourFlight.finish();document.body.classList.remove('walking');},
  cancel:()=>{ctx.tourFlight.cancel();if(!walking)document.body.classList.remove('walking');},
  doorRequest:p=>{intent.x=p.x-walk.x;intent.z=p.z-walk.z;},tr
 });
 const mobileControls=createMobileControls({tr,toggleTour:()=>tour.toggle(),onLanguage});
 $('exitWalk').onclick=()=>setView('overview');$('walkStart').onchange=()=>{tour.stop();if(!walking)setView('walk');relocate($('walkStart').value);};
 window.addEventListener('keydown',e=>{if((!walking&&!tour.state().active)||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Escape'){setView('overview');return;}if(!walking)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.code==='KeyE'){const d=doors.filter(d=>Math.hypot(d.x-walk.x,d.z-walk.z)<5).sort((a,b)=>Math.hypot(a.x-walk.x,a.z-walk.z)-Math.hypot(b.x-walk.x,b.z-walk.z))[0];if(d)setDoorMode(d.id,d.mode==='open'?'closed':'open');}});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
 canvas.addEventListener('pointerdown',e=>{if(!walking)return;lookDrag=true;lastPointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!walking||!lookDrag)return;walk.yaw-=(e.clientX-lastPointer[0])*.004;walk.pitch=clamp(walk.pitch-(e.clientY-lastPointer[1])*.003,-1.2,1.2);lastPointer=[e.clientX,e.clientY];walkCamera();});
 canvas.addEventListener('pointerup',()=>lookDrag=false);canvas.addEventListener('pointercancel',()=>lookDrag=false);
 document.querySelectorAll('[data-walk]').forEach(e=>{e.onpointerdown=ev=>{ev.preventDefault();keys.add(e.dataset.walk);e.setPointerCapture(ev.pointerId);};e.onpointerup=e.onpointercancel=()=>keys.delete(e.dataset.walk);});
 function update(t,realDt){
  const old=lastTime;seek(t);if(t===old)doorsStep(realDt);
  if(tour.state().active){
   if(tour.state().paused)intent.x=intent.z=0;
   for(let n=0;n<5;n++)tour.update(realDt/5);
   if(!tour.state().active)intent.x=intent.z=0;
  }else if(walking){
   const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),s=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),norm=Math.hypot(f,s)||1;
   intent.x=Math.sin(walk.yaw)*f-Math.cos(walk.yaw)*s;intent.z=Math.cos(walk.yaw)*f+Math.sin(walk.yaw)*s;walkMove(f/norm,s/norm,realDt);
  }
 }
 function doorState(){return doors.map(d=>({id:d.id,x:d.x,z:d.z,width:d.w,rotation:d.ry,mode:d.mode,open:d.fraction,safety:d.safety}));}
 function staffState(){return staff.map(f=>({coldCoat:f.worker.coldCoat,x:f.g.position.x,z:f.g.position.z,heading:f.g.rotation.y,loaded:f.cargo.visible,phase:f.phase,clock:f.clock,deposit:f.deposit.visible,withPalletTruck:f.hasCart,speed:1.65}));}
 function validateWalls(){return [...forklifts,...staff].map((f,index)=>({index,hit:bodyWallHit(f)})).filter(f=>f.hit);}
 function staffStatus(){return staff.map((f,i)=>`<div class="activity"><span>PT-0${i+1}</span><em>${tr(f.phase)}</em></div>`).join('');}
 reset();refreshDoorUI();
 return {update,seek,reset,setDoorMode,doorState,staffState,staffStatus,refreshDoorUI,ramps,floorHeight,enterWalk,exitWalk,relocate,walkMove,tour,canPlan,walkState:()=>({...walk,active:walking,tour:tour.state()}),validateWalls,bodyHits,staticWalls,stage:()=>0,dispatched:()=>dispatchCount,clocks:()=>forklifts.map(f=>f.clock)};
}
