const {chromium}=require('playwright'),{build}=require('esbuild'),assert=require('node:assert/strict');
(async()=>{
 const bundle=await build({stdin:{contents:`
 import {createPerformance} from './src/performance.js';
 window.runQualityCheck=()=>{
  const renderer={shadowMap:{},info:{render:{triangles:100, calls:10}},setPixelRatio(r){this.ratio=r;}};
  const composer={setPixelRatio(r){this.ratio=r;}},ao={},smaa={};
  const sun={shadow:{mapSize:{x:2048,set(x,y){this.x=x;this.y=y;}},map:null}};
  const monitor=createPerformance({renderer,composer,ao,smaa,sun,tr:s=>s});
  let stamp=0;monitor.update(stamp);
  const advance=(fps,seconds)=>{for(let i=0;i<fps*seconds;i++){stamp+=1000/fps;monitor.update(stamp);}return monitor.state();};
  const at80=advance(80,6),brief=advance(100,1.6),ultra=advance(100,3.2);
  const settings={shadow:sun.shadow.mapSize.x,ao:ao.enabled,smaa:smaa.enabled,renderer:renderer.ratio,composer:composer.ratio,badge:document.getElementById('fpsDisplay').textContent};
  const fallback=advance(45,5),cooldown=advance(100,5),recovery=advance(100,20);
  const sixty=advance(60,5);
  const manual=[];
  for(const name of ['Ultra','High','Balanced','Eco']){monitor.setQuality(name);const initial=monitor.state();const slow=advance(20,8),fast=advance(120,20);manual.push({name,initial,slow,fast});}
  const invalid=monitor.setQuality('invalid');
  monitor.setQuality('Auto');const restored=monitor.state(),autoUp=advance(100,4),autoDown=advance(30,5);
  return {at80,brief,ultra,settings,fallback,cooldown,recovery,sixty,manual,invalid,restored,autoUp,autoDown};
 };`,resolveDir:process.cwd()},bundle:true,format:'iife',write:false});
 const b=await chromium.launch({channel:'msedge',headless:true});try{
  for(const mobile of [false,true]){
   const p=await b.newPage({viewport:{width:mobile?390:1200,height:844},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
   await p.setContent('<body></body>');await p.addScriptTag({content:bundle.outputFiles[0].text});const r=await p.evaluate(()=>runQualityCheck());
   assert.notEqual(r.at80.quality,'Ultra');assert.notEqual(r.brief.quality,'Ultra');assert.equal(r.ultra.quality,'Ultra');assert.equal(r.settings.shadow,4096);assert.ok(r.settings.ao&&r.settings.smaa);assert.equal(r.settings.renderer,mobile?2:1.5);assert.equal(r.settings.renderer,r.settings.composer);assert.match(r.settings.badge,/Ultra/);assert.equal(r.fallback.quality,'High');assert.notEqual(r.cooldown.quality,'Ultra');assert.equal(r.recovery.quality,'Ultra');assert.equal(r.sixty.quality,'Ultra');
   for(const m of r.manual)for(const state of [m.initial,m.slow,m.fast]){assert.equal(state.mode,m.name);assert.equal(state.quality,m.name);}
   assert.equal(r.invalid,false);assert.equal(r.restored.mode,'Auto');assert.equal(r.restored.quality,mobile?'Balanced':'High');assert.equal(r.autoUp.quality,'Ultra');assert.equal(r.autoDown.quality,'High');
   console.log('PASS quality transitions',mobile?'mobile':'desktop',JSON.stringify(r.settings));await p.close();
  }
  const p=await b.newPage();await p.goto(process.env.WAREHOUSE_URL||'file:///C:/github/etak-warehouse-3d/index.html');await p.waitForFunction(()=>warehouse?.ready);await p.waitForFunction(()=>warehouse.getState().performance.fps>0);assert.match(await p.locator('#fpsDisplay').textContent(),/FPS.*(Eco|Balanced|High|Ultra)/);console.log('PASS live FPS and quality label');
  for(const mobile of [false,true]){
   const page=mobile?await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}):p,errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   if(mobile){await page.goto(process.env.WAREHOUSE_URL||'file:///C:/github/etak-warehouse-3d/index.html');await page.waitForFunction(()=>warehouse?.ready);}
   assert.equal(await page.locator('#qualitySelect').inputValue(),'Auto');
   assert.equal(await page.locator('#qualitySelect').getAttribute('aria-label'),'畫質');
   assert.equal(await page.locator('#qualitySelect option[value="Auto"]').textContent(),'自動');
   await page.selectOption('#qualitySelect','Ultra');await page.waitForFunction(()=>warehouse.getState().ultraActors.enabled&&warehouse.getState().ultraDetail.loaded);
   await page.waitForTimeout(4000);assert.equal((await page.evaluate(()=>warehouse.getState())).performance.quality,'Ultra');
   for(const name of ['High','Balanced','Eco']){await page.selectOption('#qualitySelect',name);const s=await page.evaluate(()=>warehouse.getState());assert.equal(s.performance.mode,name);assert.equal(s.performance.quality,name);assert.equal(s.ultraActors.enabled,false);assert.equal(s.ultraDetail.enabled,false);}
   await page.selectOption('#languageSelect','en');assert.equal(await page.locator('#qualitySelect').getAttribute('aria-label'),'Rendering quality');assert.equal(await page.locator('#qualitySelect option[value="Auto"]').textContent(),'Auto');
   await page.locator('#headerTour').click();assert.ok(await page.locator('#qualitySelect').isVisible());
   await page.selectOption('#qualitySelect','High');await page.selectOption('#qualitySelect','Auto');assert.equal((await page.evaluate(()=>warehouse.getState())).performance.mode,'Auto');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const boxes=await page.evaluate(()=>{const q=document.getElementById('qualityControl').getBoundingClientRect(),header=document.querySelector('.top').getBoundingClientRect();return {q:{left:q.left,right:q.right,top:q.top},headerBottom:header.bottom,width:innerWidth};});assert.ok(boxes.q.left>=0&&boxes.q.right<=boxes.width&&boxes.q.top>=boxes.headerBottom);
   await page.screenshot({path:mobile?'quality-mobile-view.png':'quality-desktop-view.png'});assert.deepEqual(errors,[]);console.log('PASS quality selector, Ultra assets, translation and touring',mobile?'mobile':'desktop');
   if(mobile)await page.close();
  }
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
