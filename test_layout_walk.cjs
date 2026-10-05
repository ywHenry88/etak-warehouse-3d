const {chromium}=require('playwright'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
const url=process.env.WAREHOUSE_URL||pathToFileURL(path.resolve('index.html')).href;
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1500,height:950}});await page.goto(url);await page.waitForFunction(()=>window.warehouse?.ready);
 const layout=await page.evaluate(()=>{
  warehouse.seek(0);const s=warehouse.getState(),ops=warehouse.operations;
  const ramp=[];for(const x of [33.5,36,39,40.5])for(let z=19.3;z<21;z+=.1)ramp.push({x,z,clear:ops.canPlan(x,z),height:ops.floorHeight(x,z)});
  return {speed:s.walkingSpeed,tourSpeed:s.tourSpeed,fov:s.walkingFov,doorIds:s.doors.map(d=>d.id),ramp,walls:s.wallSegments.filter(r=>r.z1===20.65&&r.z2===20.65&&Math.min(r.x1,r.x2)>32),dock:s.dockRects[0]};
 });
 assert.equal(layout.speed,8);assert.equal(layout.tourSpeed,6.6);assert.equal(layout.fov,90);assert.ok(!layout.doorIds.includes('chilled-north'));assert.deepEqual(layout.walls,[]);assert.ok(layout.ramp.every(p=>p.clear),'W2/W6 full-width opening');assert.ok(layout.dock.z1<=12,'dispatch confined to W3');
 const motion=await page.evaluate(()=>{
  warehouse.operations.tour.start();const samples=[];let last=warehouse.getState().walking,turnRate=0,parkingTurns=0,lastTurnSign=0,parkingPoints=0,geometryHits=0;
  for(let i=0;i<10000;i++){
   warehouse.operations.update(i*.02,.02);const s=warehouse.getState(),w=s.walking;
   const delta=Math.atan2(Math.sin(w.yaw-last.yaw),Math.cos(w.yaw-last.yaw));turnRate=Math.max(turnRate,Math.abs(delta)/.02);
   for(const r of [...warehouse.operations.staticWalls,...s.storageFootprints])if(w.x>r.x0+.01&&w.x<r.x1-.01&&w.z>r.z0+.01&&w.z<r.z1-.01)geometryHits++;
   if(w.x>55.5&&w.z>8&&w.z<38){parkingPoints++;if(Math.abs(delta)>.001){const sign=Math.sign(delta);if(lastTurnSign&&sign!==lastTurnSign)parkingTurns++;lastTurnSign=sign;}if(i%10===0)samples.push({x:w.x,z:w.z,yaw:w.yaw});}else lastTurnSign=0;
   last=w;if(w.tour.status==='Tour complete')return {seconds:i*.02,turnRate,parkingTurns,parkingPoints,geometryHits,samples,visited:w.tour.visited.length};
  }
  return {status:warehouse.operations.tour.state(),walking:warehouse.getState().walking,vehicles:warehouse.sampleFleet(warehouse.getState().time)};
 });
 assert.equal(motion.visited,14,JSON.stringify(motion));assert.equal(motion.geometryHits,0);assert.ok(motion.turnRate<=2.21);assert.ok(motion.parkingPoints>50);assert.ok(motion.parkingTurns<=2,`parking reversals ${motion.parkingTurns}`);
 await page.evaluate(()=>{warehouse.setView('overview',true);warehouse.seek(0)});await page.screenshot({path:'updated-layout-view.png'});
 await page.selectOption('#cameraSelect','9');await page.screenshot({path:'w2-view.png'});
 console.log(JSON.stringify({passed:true,url,layout:{...layout,ramp:'clear'},motion:{...motion,samples:motion.samples.length}},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
