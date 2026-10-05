const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.WAREHOUSE_URL||'file:///C:/github/etak-warehouse-3d/index.html');await p.waitForFunction(()=>warehouse?.ready);
 const r=await p.evaluate(()=>{
  warehouse.setView('dock',true);warehouse.seek(0);const dock=warehouse.getState().camera;
  warehouse.operations.tour.start();const initial=warehouse.getState();let time=0,last=initial.camera,maxStep=0,maxTurn=0,lowObstacles=[];
  function advance(seconds){for(let n=0;n<Math.round(seconds/.04);n++){time+=.04;warehouse.operations.update(time,.04);const s=warehouse.getState();if(s.flight){
   const [x,y,z]=s.camera.position.map((v,i)=>v+(i===0?21:i===2?22.5:0));
   if(y<7.5&&[...warehouse.operations.staticWalls,...s.storageFootprints,...s.columnRects].some(o=>x>o.x0-.1&&x<o.x1+.1&&z>o.z0-.1&&z<o.z1+.1))lowObstacles.push({x,y,z,phase:s.walking.tour.phase});
   maxStep=Math.max(maxStep,Math.hypot(...s.camera.position.map((v,i)=>v-last.position[i])));
   maxTurn=Math.max(maxTurn,2*Math.acos(Math.min(1,Math.abs(s.camera.quaternion.reduce((sum,v,i)=>sum+v*last.quaternion[i],0)))));
  }last=s.camera;}}
  advance(.8);const hold=warehouse.getState().camera;
  advance(2);warehouse.operations.tour.toggle();const beforePause=warehouse.getState();advance(2);const afterPause=warehouse.getState();warehouse.operations.tour.toggle();
  advance(8);const landed=warehouse.getState();let outroPause=null;
  for(let i=0;i<4000;i++){
   advance(.04);const s=warehouse.getState();
   if(s.walking.tour.phase==='outro'&&!outroPause){warehouse.operations.tour.toggle();const a=warehouse.getState().camera;advance(1);outroPause={a,b:warehouse.getState().camera};warehouse.operations.tour.toggle();}
   if(s.walking.tour.status==='Tour complete')break;
  }
  const end=warehouse.getState();
  warehouse.operations.tour.start();advance(3);warehouse.setView('plan',true);const cancelled=warehouse.getState().camera;advance(12);const afterCancel=warehouse.getState();
  warehouse.operations.tour.start();const restarted=warehouse.getState();warehouse.operations.tour.stop();const stopped=warehouse.getState();
  return {dock,initial:{view:initial.view,camera:initial.camera,phase:initial.walking.tour.phase},hold,pause:{a:beforePause.camera,b:afterPause.camera,phase:afterPause.walking.tour.phase},landed:{phase:landed.walking.tour.phase,view:landed.view,fov:landed.camera.fov},outroPause,end:{camera:end.camera,view:end.view,walking:end.walking.active,tour:end.walking.tour},maxStep,maxTurn,lowObstacles,cancelled,afterCancel:{camera:afterCancel.camera,view:afterCancel.view,active:afterCancel.walking.tour.active},restarted:{view:restarted.view,phase:restarted.walking.tour.phase},stopped:{view:stopped.view,active:stopped.walking.tour.active,walking:document.body.classList.contains('walking')}};
 });
 console.log(JSON.stringify({start:r.initial.view,end:r.end.view,visited:r.end.tour.visited.length,maxStep:r.maxStep,maxTurn:r.maxTurn,lowObstacles:r.lowObstacles}));
 assert.equal(r.initial.view,'dock');assert.equal(r.initial.phase,'intro');assert.deepEqual(r.initial.camera.position,r.dock.position);assert.ok(r.hold.position.every((v,i)=>Math.abs(v-r.dock.position[i])<1e-8));assert.deepEqual(r.pause.a,r.pause.b);assert.equal(r.pause.phase,'intro');assert.equal(r.landed.phase,'walking');assert.equal(r.landed.view,'walk');assert.equal(r.landed.fov,90);assert.deepEqual(r.outroPause.a,r.outroPause.b);assert.equal(r.end.tour.status,'Tour complete');assert.equal(r.end.tour.visited.length,29);assert.equal(r.end.view,'dock');assert.equal(r.end.walking,false);assert.equal(r.end.camera.fov,39);assert.ok(r.end.camera.position.every((v,i)=>Math.abs(v-r.dock.position[i])<1e-8));assert.ok(r.end.camera.quaternion.every((v,i)=>Math.abs(v-r.dock.quaternion[i])<1e-8));assert.ok(r.end.camera.controlsEnabled);assert.ok(r.maxStep<2);assert.ok(r.maxTurn<.1);assert.deepEqual(r.lowObstacles,[]);assert.deepEqual(r.cancelled,r.afterCancel.camera);assert.equal(r.afterCancel.view,'plan');assert.equal(r.afterCancel.active,false);assert.equal(r.restarted.phase,'intro');assert.equal(r.restarted.view,'dock');assert.deepEqual(r.stopped,{view:'dock',active:false,walking:false});assert.deepEqual(errors,[]);
 // Render representative stages, keeping the simulation clock aligned.
 for(const seconds of [0,4,8.8]){
  await p.evaluate(seconds=>{warehouse.setView('dock',true);warehouse.operations.reset();warehouse.seek(0);warehouse.operations.tour.start();for(let t=.04;t<=seconds;t+=.04)warehouse.operations.update(t,.04);warehouse.seek(seconds);warehouse.operations.tour.toggle();},seconds);
  await p.screenshot({path:`tour-flight-${seconds}-view.png`});
 }
 console.log('PASS: dock start/end, smooth flights, all stops, pause/resume, cancel and restart.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
