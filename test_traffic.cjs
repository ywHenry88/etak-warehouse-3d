const {chromium}=require('playwright'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
const url=process.env.WAREHOUSE_URL||pathToFileURL(path.resolve('index.html')).href;
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto(url);await page.waitForFunction(()=>window.warehouse?.ready);
 const results=await page.evaluate(()=>{
  const results=[];
  for(const start of [0,10,25,40,65,90,120,150,170,200,240,280]){
   warehouse.setView('overview',true);warehouse.seek(start);warehouse.operations.tour.start();
   let last=warehouse.getState().walking,still=0,longestWait=0,overlaps=0,seconds=0;
   for(let i=0;i<5000;i++){
    seconds=i*.08;warehouse.operations.update(start+seconds,.08);
    const s=warehouse.getState(),w=s.walking;
    if(Math.hypot(w.x-last.x,w.z-last.z)<.001)still+=.08;else still=0;
    longestWait=Math.max(longestWait,still);last=w;
    const visitor={x0:w.x-.25,x1:w.x+.25,z0:w.z-.25,z1:w.z+.25};
    const actors=[...warehouse.sampleFleet(start+seconds),...s.staff];
    for(const a of actors)if(warehouse.operations.bodyHits(a.x,a.z,a.heading,visitor,.68,1.29,2.29))overlaps++;
    if(w.tour.status==='Tour complete')break;
   }
   results.push({start,seconds,longestWait,overlaps,...warehouse.operations.tour.state()});
  }
  return results;
 });
 console.log(JSON.stringify(results.map(({visited,target,...r})=>r),null,2));
 for(const r of results){assert.equal(r.status,'Tour complete',`start ${r.start}`);assert.equal(r.visited.length,14);assert.equal(r.overlaps,0,`traffic clearance at ${r.start}`);assert.ok(r.longestWait<10,`stalled ${r.longestWait}s at ${r.start}`);assert.ok(r.seconds<110,`tour taking ${r.seconds}s at ${r.start}`);}
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
