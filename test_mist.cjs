const {chromium}=require('playwright'),{build}=require('esbuild'),assert=require('node:assert/strict');
(async()=>{
 const bundle=await build({stdin:{contents:`
  import * as THREE from 'three';
  import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
  import {createColdMist} from './src/cold-mist.js';
  window.checkMist=()=>{
   const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(256,256);
   const scene=new THREE.Scene();scene.background=new THREE.Color(0x101820);
   const camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.z=8;
   const mist=createColdMist(THREE,scene);mist.update(3);
   const before=mist.group.children.map(p=>p.position.toArray());mist.update(5);
   const moving=mist.group.children.every((p,i)=>p.position.distanceTo(new THREE.Vector3(...before[i]))>.01);
   mist.group.children.forEach((p,i)=>p.visible=i===0);
   const puff=mist.group.children[0];puff.position.set(0,0,0);puff.material.size=4;puff.material.opacity=.48;
   // Foreground stock must still occlude the transparent mist.
   const stock=new THREE.Mesh(new THREE.BoxGeometry(.7,3,.5),new THREE.MeshBasicMaterial({color:0x354150}));
   stock.position.set(.8,0,1);scene.add(stock);
   const target=new THREE.WebGLRenderTarget(256,256),ao=new SSAOPass(scene,camera,256,256);
   const read=rt=>{const a=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(rt,0,0,256,256,a);return a;};
   const color=visible=>{mist.group.visible=visible;renderer.setRenderTarget(target);renderer.render(scene,camera);return read(target);};
   const clear=color(false),cloud=color(true);
   let changed=0,maxDelta=0,edgeChanges=0;
   for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const i=(y*256+x)*4,d=Math.abs(cloud[i]-clear[i]);if(d>2)changed++;maxDelta=Math.max(maxDelta,d);
    if((x<40||x>215||y<40||y>215)&&d>0)edgeChanges++;
   }
   const normal=visible=>{mist.group.visible=visible;ao.render(renderer,null,target);return read(ao.normalRenderTarget);};
   const a=normal(false),b=normal(true);let normalChanges=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])normalChanges++;
   const center=(128*256+128)*4,behindStock=(128*256+158)*4;
   const result={moving,changed,maxDelta,edgeChanges,normalChanges,centerBrightened:cloud[center]>clear[center]+20,stockOccludes:cloud[behindStock]===clear[behindStock]};
   renderer.dispose();ao.dispose();target.dispose();return result;
  };`,resolveDir:process.cwd()},bundle:true,format:'iife',write:false});
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html><body></body></html>');await page.addScriptTag({content:bundle.outputFiles[0].text});
  const r=await page.evaluate(()=>checkMist());console.log('Mist rendering',r);
  assert.ok(r.moving);assert.ok(r.changed>1000);assert.ok(r.maxDelta>20);assert.ok(r.centerBrightened);assert.ok(r.stockOccludes);assert.equal(r.edgeChanges,0);assert.equal(r.normalChanges,0,'Mist must not create rectangular AO geometry');
  await page.goto(process.env.WAREHOUSE_URL||'file:///C:/github/etak-warehouse-3d/index.html');await page.waitForFunction(()=>warehouse?.ready);
  await page.evaluate(()=>{warehouse.selectCamera(12);warehouse.seek(20)});await page.screenshot({path:'mist-after-view.png'});
  await page.evaluate(()=>{warehouse.setView('walk',true);warehouse.operations.relocate('north');warehouse.seek(20)});await page.screenshot({path:'mist-walk-after-view.png'});
  await page.evaluate(()=>warehouse.seek(23));await page.screenshot({path:'mist-walk-drift-view.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'mist-mobile-view.png'});
  assert.deepEqual(errors,[]);console.log('PASS: soft animated mist, no AO rectangles, correct stock occlusion, desktop/mobile WebGL.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
