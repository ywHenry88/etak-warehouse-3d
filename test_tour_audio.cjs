const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const Native=window.AudioContext;
   window.AudioContext=class extends Native{
    constructor(...args){super(...args);window.testAudioContext=this;window.testAnalyser=this.createAnalyser();this.firstGain=true;}
    createGain(){const gain=super.createGain();if(this.firstGain){this.firstGain=false;gain.connect(window.testAnalyser);}return gain;}
   };
  });
  await page.goto(process.env.WAREHOUSE_URL||'file:///C:/github/etak-warehouse-3d/index.html');
  await page.waitForFunction(()=>window.warehouse?.ready);
  assert.equal((await page.evaluate(()=>warehouse.getState().audio)).unlocked,false);
  async function layout(width){
   await page.setViewportSize({width,height:844});
   const boxes=await page.evaluate(()=>{
    const ids=['.brand','#soundToggle','#headerTour','#menu','.language-control'];
    return ids.map(id=>{const el=document.querySelector(id),r=el.getBoundingClientRect();return {id,x:r.x,right:r.right,y:r.y,width:r.width};}).filter(r=>r.width);
   });
   for(let i=0;i<boxes.length;i++){assert.ok(boxes[i].x>=0&&boxes[i].right<=width,JSON.stringify(boxes));if(i)assert.ok(boxes[i-1].right<=boxes[i].x,JSON.stringify(boxes));}
   assert.equal(await page.$eval('#headerTour',e=>e.nextElementSibling.id),'menu');
  }
  for(const width of [320,390,768,1440])await layout(width);
  await page.setViewportSize({width:390,height:844});
  await page.selectOption('#languageSelect','en');assert.equal(await page.getAttribute('#headerTour','aria-label'),'Start auto tour');
  await page.selectOption('#languageSelect','zh-Hant');assert.equal(await page.getAttribute('html','lang'),'zh-Hant');
  await page.click('#menu');assert.ok(await page.locator('#tourLaunch').isVisible());
  await page.click('#headerTour');await page.waitForFunction(()=>warehouse.getState().audio.playing);
  assert.equal(await page.locator('#panel').isVisible(),false);
  for(const width of [320,390,768,1440])await layout(width);
  await page.setViewportSize({width:390,height:844});
  const peak=await page.evaluate(async()=>{
   let peak=0;const samples=new Float32Array(testAnalyser.fftSize);
   for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,50));testAnalyser.getFloatTimeDomainData(samples);for(const v of samples)peak=Math.max(peak,Math.abs(v));}return peak;
  });assert.ok(peak>.002&&peak<.9,`Actual music signal peak: ${peak}`);
  await page.click('#soundToggle');await page.waitForFunction(()=>!warehouse.getState().audio.playing);
  assert.equal((await page.evaluate(()=>warehouse.getState().audio)).muted,true);
  await page.click('#soundToggle');await page.waitForFunction(()=>warehouse.getState().audio.playing);
  await page.click('#headerTour');assert.equal((await page.evaluate(()=>warehouse.getState().walking.tour)).paused,true);
  await page.waitForFunction(()=>!warehouse.getState().audio.playing&&warehouse.getState().audio.voices===0);
  await page.click('#headerTour');await page.waitForFunction(()=>warehouse.getState().audio.playing);
  await page.evaluate(()=>warehouse.setView('overview',true));
  await page.waitForFunction(()=>!warehouse.getState().audio.playing&&warehouse.getState().audio.voices===0);
  // Real AudioContext integration with controlled door positions and fractions.
  const moduleURL='data:text/javascript;base64,'+fs.readFileSync('src/tour-audio.js').toString('base64');
  await page.evaluate(async url=>{
   const {createTourAudio}=await import(url);
   window.testDoorAudio=createTourAudio({tr:x=>x,onLanguage:()=>{}});
   document.getElementById('headerTour').onclick=()=>testDoorAudio.syncTour(true,false);
  },moduleURL);
  await page.click('#headerTour');await page.waitForFunction(()=>testDoorAudio.state().playing);
  const doorResult=await page.evaluate(()=>{
   const camera={x:0,y:1.7,z:0},d={id:'near',x:21,z:23,open:0};
   testDoorAudio.updateDoors([d],camera);d.open=.1;testDoorAudio.updateDoors([d],camera);const first=testDoorAudio.state().doorSounds;
   for(let i=2;i<=10;i++){d.open=i/10;testDoorAudio.updateDoors([d],camera);}
   const sustained=testDoorAudio.state().doorSounds;
   testDoorAudio.updateDoors([{id:'far',x:200,z:200,open:0}],camera);testDoorAudio.updateDoors([{id:'far',x:200,z:200,open:.1}],camera);
   testDoorAudio.updateDoors([{id:'seek',x:21,z:23,open:0}],camera);testDoorAudio.updateDoors([{id:'seek',x:21,z:23,open:1}],camera,false);
   const final=testDoorAudio.state().doorSounds;testDoorAudio.syncTour(false,false);return {first,sustained,final};
  });assert.deepEqual(doorResult,{first:1,sustained:1,final:1});
  await page.waitForFunction(()=>testDoorAudio.state().voices===0);
  await page.screenshot({path:'header-mobile-view.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: 320–1440px header, language switching, gesture audio, nonzero music signal, mute/pause/stop cleanup, nearby door one-shot and seek suppression.',{peak,doorResult});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
