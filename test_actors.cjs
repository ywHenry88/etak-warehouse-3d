const {chromium}=require('playwright'),{build}=require('esbuild'),assert=require('node:assert/strict');
(async()=>{
 const bundle=await build({stdin:{contents:`
  import * as THREE from 'three';import {createActorModels} from './src/actor-models.js';
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1200,800);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b5c3c7');scene.add(new THREE.HemisphereLight(0xe9f5ff,0x7e6e60,2));const sun=new THREE.DirectionalLight(0xfff4e0,3);sun.position.set(-4,8,5);sun.castShadow=true;scene.add(sun);
  const colors={red:'#a9382e',rubber:'#252829',dark:'#25323b',steel:'#939fa4',tail:'#eeb244',light:'#e9f5ff',wood:'#aa8655'};
  const M=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:k==='steel'?.3:.6})]));
  const models=createActorModels(M),f=models.forklift(0,()=>new THREE.Group(),true);f.g.position.x=1;f.g.rotation.y=-.55;scene.add(f.g);
  const person=models.worker(1,false,true);person.root.position.set(-1.4,0,.4);person.root.rotation.y=.25;scene.add(person.root);person.pose(.21,false);
  const cart=models.palletTruck();cart.position.set(-2.6,0,-.7);cart.rotation.y=.8;scene.add(cart);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#afbab7',roughness:.9}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=-.015;scene.add(ground);
  const camera=new THREE.PerspectiveCamera(38,1.5,.1,100);camera.position.set(6,3.8,8);camera.lookAt(-.2,1,0);
  renderer.render(scene,camera);
  window.actorTest={stats:{worker:models.stats(models.worker(1).root),coldWorker:models.stats(person.root),forklift:models.stats(f.g),cart:models.stats(cart)},bounds:{worker:new THREE.Box3().setFromObject(person.root).getSize(new THREE.Vector3()).toArray()},render:()=>renderer.render(scene,camera)};
 `,resolveDir:process.cwd()},bundle:true,format:'iife',write:false});
 const b=await chromium.launch({channel:'msedge',headless:true});try{
  const p=await b.newPage({viewport:{width:1200,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setContent('<style>body{margin:0}</style>');await p.addScriptTag({content:bundle.outputFiles[0].text});
  const model=await p.evaluate(()=>({stats:actorTest.stats,bounds:actorTest.bounds}));console.log('Actor budgets',JSON.stringify(model));
  assert.ok(model.stats.worker.triangles<4500);assert.ok(model.stats.coldWorker.triangles<6500);assert.ok(model.stats.forklift.triangles<12000);assert.ok(model.stats.cart.triangles<1000);assert.ok(model.bounds.worker[1]>1.7&&model.bounds.worker[1]<1.95);
  await p.screenshot({path:'actors-detail-view.png'});
  await p.goto(process.env.WAREHOUSE_URL||'file:///C:/github/etak-warehouse-3d/index.html');await p.waitForFunction(()=>warehouse?.ready);
  await p.evaluate(()=>{warehouse.setView('walk',true);warehouse.operations.relocate('north');});
  await p.waitForTimeout(12000);const desktop=await p.evaluate(()=>warehouse.getState().performance);await p.screenshot({path:'actors-desktop-view.png'});
  assert.ok(desktop.fps>0);assert.ok(desktop.drawCalls>0);assert.ok(desktop.pixelRatio<=2);assert.match(await p.locator('#fpsDisplay').textContent(),/FPS/);
  const mobile=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(process.env.WAREHOUSE_URL||'file:///C:/github/etak-warehouse-3d/index.html');await mobile.waitForFunction(()=>warehouse?.ready);await mobile.locator('#menu').click();await mobile.locator('#tourLaunch').click();await mobile.waitForTimeout(12000);const mobilePerf=await mobile.evaluate(()=>warehouse.getState().performance);await mobile.screenshot({path:'actors-mobile-view.png'});
  assert.ok(mobilePerf.fps>0);assert.ok(mobilePerf.pixelRatio<=2);assert.ok((await mobile.locator('#walkPanel').boundingBox()).height<115);assert.deepEqual(errors,[]);console.log('Measured headless Edge (not physical phone)',JSON.stringify({desktop,mobile:mobilePerf}));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
