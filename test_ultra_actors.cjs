const {chromium}=require('playwright'),{build}=require('esbuild'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const source=fs.readFileSync('src/main.js','utf8').replaceAll('requestAnimationFrame(animate);','');
 const hook=`
 window.actorIntegration={
  async quality(q){ultraDetail.apply(q);ultraActors.apply(q);await Promise.all([ultraDetail.ready(),ultraActors.ready()]);renderAt(0);return this.state();},
  async cancel(){ultraActors.apply('Ultra');ultraActors.apply('High');await ultraActors.ready();return this.state();},
  state(){let skins=0,triangles=0;world.traverseVisible(o=>{if(o.isSkinnedMesh)skins++;if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return {actors:ultraActors.state(),skins,triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,nodes:world.getObjectsByProperty('isObject3D',true).length};},
  async performanceTransitions(){let stamp=0;performanceMonitor.update(stamp);for(let i=0;i<400;i++){stamp+=10;performanceMonitor.update(stamp);}await Promise.all([ultraActors.ready(),ultraDetail.ready()]);renderAt(0);const up=this.state();for(let i=0;i<225;i++){stamp+=1000/45;performanceMonitor.update(stamp);}renderAt(0);return {up,down:this.state()};},
  cameraView(id){warehouse.selectCamera(id);document.getElementById('panel').classList.add('hidden');document.getElementById('photoPanel').style.display='none';renderAt(18);return this.state();},
  sample(t){warehouse.seek(t);return {fleet:warehouse.sampleFleet(t),staff:ops.staffState()};},
  bones(){return actorModels.registry.workers.map(w=>{const out=[];w.root.traverseVisible(o=>{if(o.isBone)out.push([o.name,...o.quaternion.toArray()]);});return out;});},
  distance(d){camera.position.set(0,d,0);ultraActors.update();return this.state();},
  near(){forklifts[0].g.getWorldPosition(camera.position);camera.position.add(new THREE.Vector3(3,2,3));ultraActors.update();return this.state();},
  workerCloseup(){camera.position.set(-.1,1.7,2.4);camera.lookAt(-1.2,1.35,.5);ultraActors.update();composer.render();},
  workerBounds(){return actorModels.registry.workers.filter(w=>!w.seated).map(w=>{w.root.updateWorldMatrix(true,true);const inverse=w.root.matrixWorld.clone().invert(),bounds=new THREE.Box3();w.root.traverseVisible(o=>{if(!o.isSkinnedMesh)return;for(let i=0;i<o.geometry.attributes.position.count;i++){const v=new THREE.Vector3();o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld).applyMatrix4(inverse);bounds.expandByPoint(v);}});return {size:bounds.getSize(new THREE.Vector3()).toArray(),min:bounds.min.toArray()};});},
  surfaces(){const mats=new Map();world.traverseVisible(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name.includes('/ runtime'))mats.set(m.name,m);});return [...mats.values()].filter(m=>/Insulated navy|Vehicle enamel/.test(m.name)).map(m=>{const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d');ctx.drawImage(m.map.image,0,0,32,32);const px=ctx.getImageData(0,0,32,32).data,sum=[0,0,0];for(let i=0;i<px.length;i+=4)for(let k=0;k<3;k++)sum[k]+=px[i+k]/1024;return {name:m.name,srgb:m.map.colorSpace,mean:sum,vertexColors:m.vertexColors,roughness:!!m.roughnessMap,normal:!!m.normalMap};});},
  async frameCosts(){const times=[];for(let i=0;i<16;i++){const t=performance.now();renderAt(18+i*.04,.04);renderer.getContext().finish();times.push(performance.now()-t);await new Promise(r=>setTimeout(r,0));}times.sort((a,b)=>a-b);return {medianMs:times[8],p90Ms:times[14],draws:renderer.info.render.calls,triangles:renderer.info.render.triangles};},
  check(){return actorModels.registry.forklifts.map(f=>{const model=f.g.getObjectByName('Ultra_NICHIYU_LOD0');const lift=model.children.find(o=>o.name.includes('__Lift_carriage'));const copy=model.clone(true),bounds=new THREE.Box3().setFromObject(copy,true);return {bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},forward:new THREE.Vector3(0,0,-1).applyQuaternion(model.quaternion).toArray(),liftY:lift.position.y,carriageY:f.carriage.position.y,cargoVisible:f.cargo.visible,oldWheelsHidden:f.wheels.every(w=>!w.visible)};});},
  preview(kind){
   world.visible=false;document.getElementById('panel').classList.add('hidden');document.getElementById('labels').style.display='none';
   let stage=scene.getObjectByName('actor-stage');if(stage)scene.remove(stage);stage=new THREE.Group();stage.name='actor-stage';scene.add(stage);
   const f=actorModels.registry.forklifts[0];stage.add(f.g);f.g.position.set(1,0,0);f.g.rotation.set(0,-.4,0);f.cargo.visible=false;
   const staff=actorModels.registry.workers.filter(w=>!w.seated);
   for(const [i,w] of [staff[2],staff[0]].entries()){stage.add(w.root);w.root.position.set(-1.2-i*1.15,0,.5);w.root.rotation.set(0,.25,0);w.pose(.19,i===1);}
   const cart=actorModels.registry.carts[0];stage.add(cart);cart.position.set(-2.3,0,1.65);cart.rotation.set(0,.25,0);
   box(stage,M.floor,0,-.1,0,20,.2,20);scene.background=new THREE.Color('#b4bfc0');scene.fog=null;
   camera.position.set(6,3.5,7).multiplyScalar(Math.max(1,1.2/camera.aspect));camera.fov=40;camera.updateProjectionMatrix();camera.lookAt(0,1,0);ultraActors.update();composer.render();
   return this.check();
  }
 };`;
 const bundle=await build({stdin:{contents:source+hook,resolveDir:path.resolve('src')},bundle:true,format:'iife',write:false});
 const file=path.resolve('actors-test.tmp.html');fs.writeFileSync(file,fs.readFileSync('index.template.html','utf8').replace('__PLAN_IMAGE__','').replace('__BUNDLE__',()=>bundle.outputFiles[0].text.replaceAll('</script','<\\/script')));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('file:///'+file.replaceAll('\\','/'));await page.waitForFunction(()=>window.warehouse?.ready);
  const high=await page.evaluate(()=>actorIntegration.state());assert.equal(high.actors.loaded,false);
  const baseline=await page.evaluate(()=>[0,9,28].map(t=>actorIntegration.sample(t)));
  const warmHigh=await page.evaluate(()=>actorIntegration.quality('High'));
  const cancel=await page.evaluate(()=>actorIntegration.cancel());assert.equal(cancel.actors.enabled,false);assert.equal(cancel.skins,0);
  const ultra=await page.evaluate(()=>actorIntegration.quality('Ultra'));
  assert.equal(ultra.actors.error,null);assert.equal(ultra.actors.workers,8);assert.equal(ultra.actors.drivers,4);assert.equal(ultra.actors.forklifts,4);assert.equal(ultra.actors.carts,12);assert.equal(ultra.skins,120);
  const surfaces=await page.evaluate(()=>actorIntegration.surfaces());assert.equal(surfaces.length,2);for(const m of surfaces){assert.equal(m.srgb,'srgb');assert.ok(m.normal&&m.roughness&&m.vertexColors);if(m.name.includes('navy'))assert.ok(m.mean[0]>45&&m.mean[2]>75);else assert.ok(m.mean[0]>165&&m.mean[1]<55);}
  const motion=await page.evaluate(()=>[0,9,28].map(t=>actorIntegration.sample(t)));assert.deepEqual(motion,baseline);
  const bonesA=await page.evaluate(()=>{actorIntegration.sample(0);return actorIntegration.bones();});
  const bonesB=await page.evaluate(()=>{actorIntegration.sample(.25);return actorIntegration.bones();});
  const bounds=await page.evaluate(()=>actorIntegration.workerBounds());for(const w of bounds){assert.ok(w.size[0]<1.15&&w.size[1]<1.95&&w.size[2]<1.35,JSON.stringify(w));assert.ok(w.min[1]>-.16);}
  assert.notDeepEqual(bonesA[4],bonesB[4]);assert.deepEqual(bonesA[0],bonesB[0]);
  const check=await page.evaluate(()=>actorIntegration.check());for(const f of check){assert.ok(f.forward[2]>.99);assert.ok(Math.abs(f.liftY-f.carriageY+.034)<1e-6);assert.ok(f.oldWheelsHidden);assert.ok(f.bounds.min[0]>=-.69&&f.bounds.max[0]<=.69);assert.ok(f.bounds.min[2]>=-1.3&&f.bounds.max[2]<=2.3);}
  const far=await page.evaluate(()=>actorIntegration.distance(130));assert.equal(far.actors.nearForklifts,0);
  const near=await page.evaluate(()=>actorIntegration.near());assert.ok(near.actors.nearForklifts>0);
  const down=await page.evaluate(()=>actorIntegration.quality('High'));assert.equal(down.skins,0);assert.ok(down.textures<=warmHigh.textures);assert.equal(down.triangles,high.triangles);
  const again=await page.evaluate(()=>actorIntegration.quality('Ultra'));assert.equal(again.nodes,ultra.nodes);assert.ok(again.textures<=ultra.textures);
  await page.evaluate(()=>actorIntegration.quality('High'));const third=await page.evaluate(()=>actorIntegration.quality('Ultra'));assert.equal(third.textures,again.textures);
  const transitions=await page.evaluate(()=>actorIntegration.performanceTransitions());assert.equal(transitions.up.actors.enabled,true);assert.equal(transitions.down.actors.enabled,false);
  await page.evaluate(()=>actorIntegration.quality('Ultra'));
  await page.evaluate(()=>actorIntegration.cameraView(6));await page.screenshot({path:'ultra-integrated-cold-view.png'});
  const frameCosts=await page.evaluate(()=>actorIntegration.frameCosts());
  await page.evaluate(()=>actorIntegration.cameraView(14));await page.screenshot({path:'ultra-integrated-dock-view.png'});
  await page.evaluate(()=>actorIntegration.preview());await page.screenshot({path:'ultra-integrated-actors-view.png'});
  await page.evaluate(()=>actorIntegration.workerCloseup());await page.screenshot({path:'ultra-worker-material-view.png'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));actorIntegration.preview();});await page.screenshot({path:'ultra-integrated-mobile-view.png'});
  assert.deepEqual(errors,[]);console.log('PASS Ultra actor integration',JSON.stringify({high,ultra,down,again,surfaces,frameCosts}));
 }finally{await browser.close();fs.unlinkSync(file);}
})().catch(e=>{console.error(e);process.exit(1);});
