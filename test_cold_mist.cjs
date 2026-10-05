const {chromium}=require('playwright'),{build}=require('esbuild'),assert=require('node:assert/strict');
(async()=>{
 const bundle=await build({stdin:{contents:`
 import * as THREE from 'three';import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';import {createColdMist} from './src/cold-mist.js';
 window.verifyMist=()=>{
  const renderer=new THREE.WebGLRenderer();renderer.setSize(256,256);const scene=new THREE.Scene();scene.background=new THREE.Color('#142536');
  const camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.z=8;
  const mist=createColdMist(THREE,scene),p=mist.particles;
  mist.update(0,renderer,camera,'Eco');const ecoCount=p.geometry.drawRange.count;
  mist.update(0,renderer,camera,'High');const fullCount=p.geometry.drawRange.count;
  p.geometry.attributes.position.setXYZ(0,0,0,0);p.geometry.attributes.position.needsUpdate=true;p.geometry.attributes.seed.setX(0,.4);p.geometry.attributes.seed.needsUpdate=true;p.geometry.setDrawRange(0,1);
  const target=new THREE.WebGLRenderTarget(256,256),ao=new SSAOPass(scene,camera,256,256);
  const read=rt=>{const a=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(rt,0,0,256,256,a);return a;};
  const color=visible=>{p.visible=visible;renderer.setRenderTarget(target);renderer.render(scene,camera);return read(target);};
  const clear=color(false),cloud=color(true);let visiblePixels=0,edgePixels=0;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,d=Math.abs(cloud[i]-clear[i]);if(d>3)visiblePixels++;if((x<30||x>225||y<30||y>225)&&d)edgePixels++;}
  const normal=visible=>{p.visible=visible;ao.render(renderer,null,target);return read(ao.normalRenderTarget);};
  const a=normal(false),b=normal(true);let rectanglePixels=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])rectanglePixels++;
  p.visible=true;renderer.info.reset();renderer.setRenderTarget(target);renderer.render(scene,camera);const drawCalls=renderer.info.render.calls;
  mist.update(4,renderer,camera,'High');p.geometry.setDrawRange(0,1);const later=color(true);let motionPixels=0;for(let i=0;i<cloud.length;i++)if(cloud[i]!==later[i])motionPixels++;
  renderer.dispose();ao.dispose();target.dispose();return {visiblePixels,edgePixels,rectanglePixels,drawCalls,motionPixels,ecoCount,fullCount};
 };`,resolveDir:process.cwd()},bundle:true,format:'iife',write:false});
 const b=await chromium.launch({channel:'msedge',headless:true});try{
  const p=await b.newPage({viewport:{width:1400,height:900}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.setContent('<body></body>');await p.addScriptTag({content:bundle.outputFiles[0].text});const result=await p.evaluate(()=>verifyMist());
  assert.ok(result.visiblePixels>500);assert.equal(result.edgePixels,0);assert.equal(result.rectanglePixels,0);assert.equal(result.drawCalls,1);assert.ok(result.motionPixels>500);assert.equal(result.ecoCount,24);assert.equal(result.fullCount,48);assert.deepEqual(errors,[]);console.log('Mist render PASS',result);
  await p.goto(process.env.WAREHOUSE_URL||'file:///C:/github/etak-warehouse-3d/index.html');await p.waitForFunction(()=>warehouse?.ready);await p.evaluate(()=>{warehouse.selectCamera(12);warehouse.seek(20);});await p.screenshot({path:'cold-mist-restored-view.png'});
  await p.evaluate(()=>{warehouse.selectCamera(7);warehouse.seek(20);});await p.screenshot({path:'cold-coats-view.png'});assert.deepEqual(errors,[]);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
