const {chromium}=require('playwright'),{build}=require('esbuild'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 // Exercise the real scene and quality callbacks with a deterministic frame clock.
 const source=fs.readFileSync('src/main.js','utf8').replaceAll('requestAnimationFrame(animate);','').replaceAll('ultraActors?.apply(quality);','');
 const hook=`
 let testStamp=0;performanceMonitor.update(0);
 window.ultraTest={
  async advance(fps,seconds){for(let i=0;i<fps*seconds;i++){testStamp+=1000/fps;performanceMonitor.update(testStamp);}await ultraDetail.ready();renderAt(0);return this.state();},
  async loadingFallback(){ultraDetail.apply('Ultra');ultraDetail.apply('High');await ultraDetail.ready();renderAt(0);return this.state();},
  closeup(which){controls.enabled=false;document.getElementById('panel').classList.add('hidden');world.visible=false;let stage=scene.getObjectByName('material-preview');if(!stage){stage=new THREE.Group();stage.name='material-preview';scene.add(stage);const f=forklifts[0].g.clone(true);f.position.set(0,0,0);f.rotation.set(0,0,0);stage.add(f);box(stage,M.floor,0,-.1,0,18,.2,18);box(stage,M.wall,0,2.5,-4,18,5,.15);}camera.position.set(4.5,2.8,5.5);camera.lookAt(0,1.1,0);camera.fov=45;camera.updateProjectionMatrix();renderAt(0);},
  restoreScene(){world.visible=true;scene.getObjectByName('material-preview').visible=false;warehouse.selectCamera(14);renderAt(0);},
  state(){return {detail:ultraDetail.state(),quality:performanceMonitor.state().quality,textures:renderer.info.memory.textures,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,floorRoughness:M.floor.roughness,floorColor:M.floor.color.getHexString(),floorMap:M.floor.map.uuid,floorNormal:!!M.floor.normalMap,wallNormal:!!M.wall.normalMap,tyreNormal:!!M.rubber.normalMap,paintMetalness:M.red.metalness,wallProgram:M.wall.customProgramCacheKey(),signWidth:signRecords[0].material.map.image.width};},
  async frameCosts(){const times=[];for(let i=0;i<8;i++){const t=performance.now();renderAt(i*.04,.04);renderer.getContext().finish();times.push(performance.now()-t);await new Promise(r=>setTimeout(r,0));}return times;}
 };`;
 const bundle=await build({stdin:{contents:source+hook,resolveDir:path.resolve('src')},bundle:true,format:'iife',write:false});
 const html=fs.readFileSync('index.template.html','utf8').replace('__PLAN_IMAGE__','data:image/png;base64,'+fs.readFileSync('assets/floorplan.png').toString('base64')).replace('__BUNDLE__',()=>bundle.outputFiles[0].text.replaceAll('</script','<\\/script'));
 const file=path.resolve('ultra-test.tmp.html');fs.writeFileSync(file,html);
 const b=await chromium.launch({channel:'msedge',headless:true});try{
  const p=await b.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.goto('file:///'+file.replaceAll('\\','/'));await p.waitForFunction(()=>window.warehouse?.ready);
  await p.evaluate(()=>{warehouse.selectCamera(6);warehouse.seek(0);document.getElementById('photoPanel').style.display='none';});
  const high=await p.evaluate(()=>ultraTest.state());assert.equal(high.detail.generated,false);assert.equal(high.floorNormal,false);
  await p.screenshot({path:'ultra-before-view.png'});
  const cancelled=await p.evaluate(()=>ultraTest.loadingFallback());assert.equal(cancelled.floorNormal,false);assert.equal(cancelled.floorColor,high.floorColor);
  const first=await p.evaluate(()=>ultraTest.advance(100,4));assert.equal(first.quality,'Ultra');assert.ok(first.detail.enabled&&first.floorNormal);assert.equal(first.signWidth,1024);assert.equal(first.triangles,high.triangles);assert.equal(first.calls,high.calls);
  await p.screenshot({path:'ultra-after-view.png'});
  assert.ok(first.wallNormal&&first.tyreNormal);assert.equal(first.paintMetalness,.06);assert.match(first.wallProgram,/ultra-metres/);assert.equal(first.detail.photographicSurfaces.length,3);
  const costs=await p.evaluate(()=>ultraTest.frameCosts());
  const down=await p.evaluate(()=>ultraTest.advance(45,5));assert.equal(down.quality,'High');assert.equal(down.floorMap,high.floorMap);assert.equal(down.floorRoughness,high.floorRoughness);assert.equal(down.floorNormal,false);assert.equal(down.floorColor,high.floorColor);assert.equal(down.wallProgram,high.wallProgram);assert.equal(down.paintMetalness,high.paintMetalness);assert.equal(down.signWidth,512);assert.ok(down.textures<=high.textures);
  const second=await p.evaluate(()=>ultraTest.advance(100,24));assert.equal(second.quality,'Ultra');assert.ok(second.textures<=first.textures);assert.equal(second.detail.sharedTextures,36);assert.equal(second.floorColor,first.floorColor);
  await p.evaluate(()=>ultraTest.advance(45,5));const third=await p.evaluate(()=>ultraTest.advance(100,24));assert.equal(third.textures,second.textures);
  await p.selectOption('#languageSelect','en');assert.equal((await p.evaluate(()=>ultraTest.state())).signWidth,1024);
  await p.evaluate(()=>ultraTest.closeup('forklift'));await p.screenshot({path:'ultra-forklift-view.png'});
  await p.evaluate(()=>ultraTest.restoreScene());await p.screenshot({path:'ultra-dock-view.png'});
  await p.setViewportSize({width:390,height:844});await p.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));document.getElementById('panel').classList.add('hidden');warehouse.seek(0);});await p.screenshot({path:'ultra-mobile-view.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS Ultra real-scene shaders, no extra scene triangles/draw calls, textures released on fallback, cached re-entry, translated high-resolution signs, mobile render.',JSON.stringify({high,ultra:first,down,frameMs:costs}));
 }finally{await b.close();fs.unlinkSync(file);}
})().catch(e=>{console.error(e);process.exit(1)});
