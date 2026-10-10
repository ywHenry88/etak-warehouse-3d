const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const results={};
 try{
  for(const mobile of [false,true]){
   const page=await browser.newPage(mobile?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.goto('file:///C:/github/etak-warehouse-3d/prototype.html');await page.waitForFunction(()=>window.pilot?.ready,{},{timeout:45000});
   await page.waitForTimeout(1800);
   const state=await page.evaluate(()=>pilot.state());assert.ok(state.animations.length>0);
   const bone1=await page.evaluate(()=>pilot.bones());await page.waitForTimeout(400);const bone2=await page.evaluate(()=>pilot.bones());assert.notDeepEqual(bone1,bone2,'Skeleton animation must move');
   await page.screenshot({path:`prototype-${mobile?'mobile':'desktop'}-view.png`});
   const modes={};
   for(const version of ['new','old']){
    await page.evaluate(v=>{pilot.setVersion(v);pilot.setSubject('all');pilot.setLod(0);},version);
    await page.waitForTimeout(1600);
    const samples=await page.evaluate(async()=>{const a=[];let last=performance.now();for(let i=0;i<150;i++){const t=await new Promise(requestAnimationFrame);if(i>10)a.push(t-last);last=t;}return a;});
    const sorted=[...samples].sort((a,b)=>a-b);modes[version]={...await page.evaluate(()=>pilot.state()),meanFrameMs:samples.reduce((a,b)=>a+b)/samples.length,p95FrameMs:sorted[Math.floor(sorted.length*.95)]};
    await page.evaluate(()=>{pilot.setSubject('forklift');pilot.setMotion(false);});await page.waitForTimeout(150);
    await page.screenshot({path:`prototype-${version}-${mobile?'mobile':'desktop'}-view.png`});
   }
   await page.evaluate(()=>{pilot.setVersion('new');pilot.setSubject('worker');pilot.setLod(0);});const full=await page.evaluate(()=>pilot.state());
   await page.screenshot({path:`prototype-worker-${mobile?'mobile':'desktop'}-view.png`});
   await page.evaluate(()=>pilot.setLod(1));const low=await page.evaluate(()=>pilot.state());assert.ok(low.triangles<full.triangles*.7);
   await page.screenshot({path:`prototype-worker-lod1-${mobile?'mobile':'desktop'}-view.png`});
   await page.locator('#lang').click();assert.equal(await page.locator('h1').textContent(),'Blender asset pilot');
   await page.locator('#photo').click();assert.equal(await page.locator('#photos').isVisible(),true);
   await page.selectOption('#photoSelect','2');assert.ok(await page.locator('#renderPhoto').evaluate(i=>i.complete&&i.naturalWidth===1440));
   await page.locator('#photo').click();assert.equal(await page.locator('#photos').isVisible(),false);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
   assert.deepEqual(errors,[]);results[mobile?'emulatedMobile':'desktop']=modes;await page.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync('assets/prototype/browser_report.json',JSON.stringify(results,null,2));console.log('PASS',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
