import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import modelData from '../assets/actors/embedded.json';

// Visual adapters only: simulation roots, routes, collision shapes and cargo remain
// owned by operations.js. One shared asset set is decoded on first Ultra entry.
export function createUltraActors({actorModels,renderer,camera}){
 const {registry}=actorModels,workers=[],forklifts=[],carts=[];
 const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
 const staffMaterials=new Map();
 const point=new THREE.Vector3(),axisX=new THREE.Vector3(1,0,0),q=new THREE.Quaternion();
 let wanted=false,enabled=false,pending=null,loaded=false,error=null;
 function track(root){root.traverse(o=>{
  if(!o.isMesh)return;
  o.castShadow=o.receiveShadow=true;geometries.add(o.geometry);
  if(o.isSkinnedMesh){
   // Conservative animated bounds avoid per-frame CPU skinning just for culling.
   o.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.9,0),1.4);
   o.frustumCulled=true;skeletons.add(o.skeleton);
  }
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   materials.add(m);for(const value of Object.values(m))if(value?.isTexture){textures.add(value);value.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  }
 });}
 function existing(root,exclude=[]){return root.children.filter(o=>!exclude.includes(o)).map(o=>[o,o.visible]);}
 function toggleOriginals(items,on){for(const [o,visible] of items)o.visible=on?false:visible;}
 function makeWorker(actor,source){
  const model=clone(source),legacy=existing(actor.root),bones=new Map(),shared=new Map();
  model.name='Ultra_'+source.name;model.visible=false;
  // SkeletonUtils copies a skeleton per material primitive. Reuse one per person.
  model.traverse(o=>{if(o.isSkinnedMesh){const key=o.skeleton.bones.map(b=>b.uuid).join();if(shared.has(key))o.skeleton=shared.get(key);else shared.set(key,o.skeleton);
    const base=o.material;
    if(/^(Skin|Insulated navy fabric)/.test(base.name)){
     const variant=actor.index%3,key=base.uuid+':'+variant;
     if(!staffMaterials.has(key)){
      const material=base.clone();
      if(base.name.startsWith('Skin'))material.color.set(['#b88b6f','#cfab8d','#9c7058'][variant]);
      else material.color.set(['#ffffff','#dfe5e9','#c7d1d8'][variant]);
      staffMaterials.set(key,material);
     }
     o.material=staffMaterials.get(key);
    }
   }
   if(o.isBone)bones.set(o.name.replace(/[^a-z]/gi,'').replace(/\d+$/,''),{bone:o,rest:o.quaternion.clone()});
  });
  // Existing root origin is at the old driver's feet; align pelvis to NICHIYU seat.
  if(actor.seated)model.position.set(0,.077,-.16);
  actor.root.add(model);track(model);workers.push({actor,model,legacy,bones});
 }
 function makeForklift(actor,sources){
  const legacy=existing(actor.g,[actor.carriage,actor.driver.root]);
  legacy.push(...existing(actor.carriage,[actor.cargo]));
  const levels=sources.map((source,i)=>{
   const model=source.clone(true);model.name='Ultra_NICHIYU_LOD'+i;
   // Fit the existing 1.38 m wide / 2.30 m forward traffic envelope.
   model.rotation.y=Math.PI;model.scale.set(.99,1,.97);model.visible=false;
   const wheels=[];let lift;
   model.traverse(o=>{if(!o.isMesh&&/__Lift_carriage/.test(o.name))lift=o;
    if(!o.isMesh&&/__(Front_wheel|Rear_twin_tyre)/.test(o.name))wheels.push(o);
   });
   if(!lift||wheels.length!==4)throw Error('NICHIYU articulation missing');
   actor.g.add(model);track(model);return {model,lift,wheels};
  });
  forklifts.push({actor,legacy,levels,lod:1});
 }
 function releaseGPU(){
  for(const x of geometries)x.dispose();for(const x of materials)x.dispose();for(const x of textures)x.dispose();
  for(const x of skeletons)x.dispose();
 }
 function toggle(on){
  if(enabled===on)return;enabled=on;
  for(const w of workers){toggleOriginals(w.legacy,on);w.model.visible=on;}
  for(const f of forklifts){toggleOriginals(f.legacy,on);f.levels.forEach((l,i)=>l.model.visible=on&&i===f.lod);}
  for(const c of carts){toggleOriginals(c.legacy,on);c.model.visible=on;}
  if(!on)releaseGPU();
 }
 async function load(){
  const bytes=Uint8Array.from(atob(modelData),c=>c.charCodeAt(0));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');
  const asset=name=>{const obj=gltf.scene.getObjectByName(name);if(!obj)throw Error('Missing actor '+name);return obj;};
  // Validate the entire package before attaching any objects.
  const sources=Object.fromEntries(['WorkerCold','WorkerWarm','DriverCold','DriverWarm','Nichiyu_LOD0','Nichiyu_LOD1','PalletTruck'].map(n=>[n,asset(n)]));
  for(const actor of registry.workers)makeWorker(actor,sources[(actor.seated?'Driver':'Worker')+(actor.coldCoat?'Cold':'Warm')]);
  for(const actor of registry.forklifts)makeForklift(actor,[sources.Nichiyu_LOD0,sources.Nichiyu_LOD1]);
  for(const root of registry.carts){
   // Snapshot original geometry only; moving loads are owned by the simulation.
   const legacy=existing(root).filter(([o])=>o.isMesh),model=sources.PalletTruck.clone(true);
   model.name='Ultra_PalletTruck';model.rotation.y=Math.PI;model.visible=false;root.add(model);track(model);carts.push({legacy,model});
  }
  loaded=true;if(wanted){toggle(true);update();}
 }
 function pitch(worker,name,angle){const b=worker.bones.get(name);if(b)b.bone.quaternion.copy(b.rest).multiply(q.setFromAxisAngle(axisX,angle));}
 function update(){
  if(!enabled)return;
  for(const w of workers){
   const {time,pushing}=w.actor.motion,seated=w.actor.seated;
   if(!seated)w.model.position.y=Math.abs(Math.sin(time*9))*.009;
   pitch(w,'spine',seated?-.035:pushing?.055:Math.sin(time*18)*.012);
   pitch(w,'head',seated?.02:pushing?-.025:-Math.sin(time*18)*.008);
   for(const [i,side] of ['L','R'].entries()){
    const phase=time*9+i*Math.PI;
    pitch(w,'thigh'+side,seated?-1.4:Math.sin(phase)*.36);
    pitch(w,'shin'+side,seated?1.5:Math.max(0,Math.cos(phase))*.50);
    pitch(w,'upperarm'+side,seated?-.68:pushing?-.58:-Math.sin(phase)*.24);
    pitch(w,'forearm'+side,seated?-.85:pushing?-.90:-.13);
   }
  }
  camera.updateWorldMatrix(true,false);
  for(const f of forklifts){
   f.actor.g.getWorldPosition(point);const distance=camera.position.distanceTo(point);
   // Hysteresis prevents flicker when walking along the LOD boundary.
   if(distance<11)f.lod=0;else if(distance>14)f.lod=1;
   f.levels.forEach((level,i)=>{
    level.model.visible=i===f.lod;
    level.lift.position.y=f.actor.carriage.position.y-.034;
    level.wheels.forEach(w=>w.rotation.x=-f.actor.wheels[0].rotation.x);
   });
  }
 }
 function apply(quality){
  wanted=quality==='Ultra';
  if(!wanted){toggle(false);return;}
  if(loaded){toggle(true);update();return;}
  if(!pending)pending=load().catch(e=>{
   error=e.message;toggle(false);
   for(const w of workers)w.model.removeFromParent();
   for(const f of forklifts)for(const l of f.levels)l.model.removeFromParent();
   for(const c of carts)c.model.removeFromParent();
   releaseGPU();workers.length=forklifts.length=carts.length=0;
   console.warn('Ultra actors unavailable; retaining standard models.',e);
  });
 }
 return {apply,update,ready:()=>pending||Promise.resolve(),state:()=>({enabled,loaded,error,workers:workers.filter(w=>!w.actor.seated).length,drivers:workers.filter(w=>w.actor.seated).length,forklifts:forklifts.length,carts:carts.length,nearForklifts:enabled?forklifts.filter(f=>f.lod===0).length:0,sharedTextures:textures.size})};
}
