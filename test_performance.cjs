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
  return {at80,brief,ultra,settings,fallback,cooldown,recovery,sixty};
 };`,resolveDir:process.cwd()},bundle:true,format:'iife',write:false});
 const b=await chromium.launch({channel:'msedge',headless:true});try{
  for(const mobile of [false,true]){
   const p=await b.newPage({viewport:{width:mobile?390:1200,height:844},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
   await p.setContent('<body></body>');await p.addScriptTag({content:bundle.outputFiles[0].text});const r=await p.evaluate(()=>runQualityCheck());
   assert.notEqual(r.at80.quality,'Ultra');assert.notEqual(r.brief.quality,'Ultra');assert.equal(r.ultra.quality,'Ultra');assert.equal(r.settings.shadow,4096);assert.ok(r.settings.ao&&r.settings.smaa);assert.equal(r.settings.renderer,mobile?2:1.5);assert.equal(r.settings.renderer,r.settings.composer);assert.match(r.settings.badge,/Ultra/);assert.equal(r.fallback.quality,'High');assert.notEqual(r.cooldown.quality,'Ultra');assert.equal(r.recovery.quality,'Ultra');assert.equal(r.sixty.quality,'Ultra');
   console.log('PASS quality transitions',mobile?'mobile':'desktop',JSON.stringify(r.settings));await p.close();
  }
  const p=await b.newPage();await p.goto(process.env.WAREHOUSE_URL||'file:///C:/github/etak-warehouse-3d/index.html');await p.waitForFunction(()=>warehouse?.ready);await p.waitForFunction(()=>warehouse.getState().performance.fps>0);assert.match(await p.locator('#fpsDisplay').textContent(),/FPS.*(Eco|Balanced|High|Ultra)/);console.log('PASS live FPS and quality label');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
