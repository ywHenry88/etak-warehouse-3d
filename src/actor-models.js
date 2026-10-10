import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Only rigid pieces are merged; joints, wheels and lifting parts stay articulated.
export function mergeRigid(group){
 const batches=new Map();
 for(const m of [...group.children]){
  if(!m.isMesh||Array.isArray(m.material)||m.children.length)continue;
  m.updateMatrix();const geo=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);
  const parts=batches.get(m.material)||[];parts.push(geo);batches.set(m.material,parts);group.remove(m);
 }
 for(const [material,parts] of batches){const geometry=mergeGeometries(parts);const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);parts.forEach(p=>p.dispose());}
 return group;
}

// Use only for static structures. Preserve the root so roof/cutaway toggles work.
export function mergeStaticStructure(group){
 group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert(),meshes=[];
 group.traverse(m=>{if(m.isMesh)meshes.push(m);});
 for(const m of meshes){const transform=inverse.clone().multiply(m.matrixWorld);group.add(m);transform.decompose(m.position,m.quaternion,m.scale);}
 return mergeRigid(group);
}

export function createActorModels(M){
 const registry={workers:[],forklifts:[],carts:[]};
 const cache=new Map(),sphere=new THREE.SphereGeometry(1,10,7),tube=new THREE.CylinderGeometry(1,1,1,8),boxGeo=new THREE.BoxGeometry(1,1,1);
 const material=(color,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const navy=material('#293e50'),vests=[material('#c8ce43'),material('#c99e39')],reflective=material('#d2d8cb',.42,.15);
 const skins=['#ba8b69','#d2ab88','#91684f'].map(c=>material(c)),boot=material('#262b2c',.85),red=material('#a9382e',.38,.3),steel=material('#8c969b',.32,.7);
 const helmet=material('#dfb04c',.4),seam=material('#233038',.85),coat=material('#bf9447',.95),stitch=material('#987740',.98);
 for(const m of [navy,...vests,coat,stitch])m.userData.ultraSurface='fabric';
 red.userData.ultraSurface='paint';steel.userData.ultraSurface='metal';helmet.userData.ultraSurface='pvc';
 for(const m of skins)m.userData.ultraSurface='skin';
 for(const m of [boot,seam])m.userData.ultraSurface='rubber';
 reflective.userData.ultraSurface='fabric';
 function mesh(parent,geometry,mat,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function round(parent,mat,x,y,z,w,h,d,r=.04){const key=[w,h,d,r].join(',');if(!cache.has(key))cache.set(key,new RoundedBoxGeometry(w,h,d,1,r));return mesh(parent,cache.get(key),mat,x,y,z);}
 const oval=(p,m,x,y,z,a,b,c)=>mesh(p,sphere,m,x,y,z,a,b,c);
 const box=(p,m,x,y,z,a,b,c)=>mesh(p,boxGeo,m,x,y,z,a,b,c);
 function link(parent,mat,a,b,r1,r2=r1){
  const key=`tube:${r1}:${r2}`;if(!cache.has(key))cache.set(key,new THREE.CylinderGeometry(r1,r2,1,8));
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
  const m=mesh(parent,cache.get(key),mat,...av.add(bv).multiplyScalar(.5).toArray(),1,delta.length(),1);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
 }
 function worker(index=0,seated=false,coldCoat=false){
  const motion={time:0,pushing:false};
  const root=new THREE.Group(),torso=new THREE.Group();root.add(torso);const skin=skins[index%skins.length],vest=vests[index%2];
  // Broad shoulders taper into a waist; ellipsoids avoid square torsos and heads.
  oval(torso,navy,0,1.16,0,.215,.30,.125);
  oval(torso,coldCoat?coat:vest,0,coldCoat?1.13:1.18,.013,coldCoat?.23:.222,coldCoat?.33:.278,coldCoat?.16:.13);
  oval(torso,navy,0,.865,0,.175,.12,.12);
  for(const side of [-1,1]){
   round(torso,reflective,side*.105,1.29,coldCoat?.157:.128,.035,.27,.009,.003);
   round(torso,reflective,side*.105,1.29,coldCoat?-.139:-.112,.035,.27,.009,.003);
  }
  round(torso,reflective,0,1.065,coldCoat?.167:.126,.34,.034,.012,.004);
  round(torso,reflective,0,1.065,coldCoat?-.143:-.12,.34,.034,.012,.004);
  box(torso,seam,0,1.17,coldCoat?.18:.147,.008,coldCoat?.52:.36,.006);
  round(torso,coldCoat?coat:navy,.105,1.17,coldCoat?.17:.14,.09,.072,.016,.01);
  if(coldCoat){
   for(const side of [-1,1])round(torso,coat,side*.076,1.435,0,.09,.12,.18,.033);
   for(const y of [.91,1.0,1.13,1.25])box(torso,stitch,0,y,.169,.33,.006,.004);
  }
  mesh(torso,tube,skin,0,1.465,0,.062,.11,.062);
  oval(torso,skin,0,1.605,.012,.105,.142,.108);
  oval(torso,skin,0,1.605,.118,.027,.039,.024);
  for(const side of [-1,1]){oval(torso,skin,side*.104,1.60,0,.022,.038,.027);oval(torso,seam,side*.038,1.64,.107,.011,.006,.005);}
  const hatKey='hard-hat';if(!cache.has(hatKey))cache.set(hatKey,new THREE.SphereGeometry(1,12,5,0,Math.PI*2,0,Math.PI/2));
  mesh(torso,cache.get(hatKey),helmet,0,1.715,0,.133,.105,.14);
  oval(torso,helmet,0,1.712,.013,.145,.016,.166);
  round(torso,helmet,0,1.794,0,.025,.026,.18,.009);
  const coatTail=coldCoat?new THREE.Group():null;
  if(coatTail){
   coatTail.position.y=.86;root.add(coatTail);
   round(coatTail,coat,0,-.10,0,.45,.48,.34,.06);
   for(const side of [-1,1]){
    round(coatTail,coat,side*.118,-.025,.178,.13,.12,.019,.012);
    round(coatTail,reflective,side*.116,-.25,.17,.20,.025,.009,.003);
   }
   box(coatTail,seam,0,-.105,.176,.008,.44,.006);
   mergeRigid(coatTail);
  }
  const legs=[],arms=[];
  for(const side of [-1,1]){
   const hip=new THREE.Group();hip.position.set(side*.105,.86,0);root.add(hip);
   link(hip,navy,[0,0,0],[0,-.37,0],.09,.073);
   oval(hip,navy,0,-.37,0,.075,.08,.08);
   const knee=new THREE.Group();knee.position.y=-.37;hip.add(knee);
   link(knee,navy,[0,0,0],[0,-.37,0],.073,.054);
   round(knee,boot,0,-.412,.05,.145,.14,.27,.043);
   round(knee,seam,0,-.47,.052,.15,.025,.274,.008);
   mergeRigid(hip);mergeRigid(knee);legs.push({hip,knee});
   const shoulder=new THREE.Group();shoulder.position.set(side*.215,1.36,0);root.add(shoulder);
   oval(shoulder,coldCoat?coat:navy,0,0,0,coldCoat?.085:.075,.09,.085);
   link(shoulder,coldCoat?coat:navy,[0,0,0],[side*.018,-.25,0],coldCoat?.084:.074,coldCoat?.065:.054);
   const elbow=new THREE.Group();elbow.position.set(side*.018,-.25,0);shoulder.add(elbow);
   link(elbow,coldCoat?coat:navy,[0,0,0],[0,-.235,0],coldCoat?.065:.054,coldCoat?.045:.039);
   oval(elbow,coldCoat?boot:skin,0,-.265,0,.041,.06,.035);
   mergeRigid(shoulder);mergeRigid(elbow);arms.push({shoulder,elbow});
  }
  mergeRigid(torso);
  function pose(time=0,pushing=false){
   motion.time=time;motion.pushing=pushing;
   // The continuous coat hem drapes across the lap when seated, sways on foot.
   if(coatTail){coatTail.rotation.x=seated?-1.22:-.04+Math.sin(time*9)*.035;coatTail.rotation.z=seated?0:Math.sin(time*9)*.015;}
   if(seated){root.position.set(0,.23,-.27);torso.rotation.x=-.04;legs.forEach(({hip,knee})=>{hip.rotation.x=-1.4;knee.rotation.x=1.5;});}
   else{torso.position.y=Math.sin(time*18)*.012;legs.forEach(({hip,knee},i)=>{const phase=time*9+i*Math.PI;hip.rotation.x=Math.sin(phase)*.38;knee.rotation.x=Math.max(0,Math.cos(phase))*.55;});}
   arms.forEach(({shoulder,elbow},i)=>{
    shoulder.rotation.x=seated?-.65:pushing?-.72:-Math.sin(time*9+i*Math.PI)*.26;
    elbow.rotation.x=seated?-.88:pushing?-.72:-.16;
   });
  }
  pose();const actor={root,pose,coldCoat,seated,index,motion};registry.workers.push(actor);return actor;
 }
 function wheel(parent,x,y,z,r=.33,w=.19){
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
  const key=`wheel:${r}:${w}`;if(!cache.has(key))cache.set(key,new THREE.CylinderGeometry(r,r,w,16));
  const tyre=mesh(g,cache.get(key),M.rubber,0,0,0);tyre.rotation.z=Math.PI/2;
  const hub=mesh(g,tube,steel,0,0,0,r*.50,w+.016,r*.50);hub.rotation.z=Math.PI/2;
  const cap=mesh(g,tube,seam,x<0?-.105:.105,0,0,r*.18,.025,r*.18);cap.rotation.z=Math.PI/2;
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;oval(g,steel,x<0?-.12:.12,Math.sin(a)*r*.3,Math.cos(a)*r*.3,.012,.018,.018);}
  mergeRigid(g);return g;
 }
 function palletTruck(){
  const g=new THREE.Group();
  round(g,red,0,.23,0,.54,.28,.43,.08);
  for(const x of [-.24,.24]){
   round(g,red,x,.095,.62,.17,.12,1.65,.035);
   const roller=mesh(g,tube,M.rubber,x,.075,1.25,.075,.15,.075);roller.rotation.z=Math.PI/2;
  }
  const pump=mesh(g,tube,steel,0,.39,-.08,.068,.28,.068);
  link(g,seam,[0,.42,-.13],[0,1.01,-.72],.028);
  const grip=new THREE.Mesh(new THREE.TorusGeometry(.15,.023,5,12),seam);grip.position.set(0,1.05,-.73);grip.scale.y=.62;g.add(grip);
  link(g,steel,[-.20,.14,-.14],[.20,.14,-.14],.075);
  mergeRigid(g);registry.carts.push(g);return g;
 }
 function forklift(index,dynamicPallet,coldCoat=false){
  const g=new THREE.Group(),wheels=[];
  round(g,red,0,.58,-.35,1.1,.66,1.50,.16);
  round(g,red,0,.73,-.97,1.17,.72,.49,.17);
  round(g,seam,0,.26,-.17,1.15,.18,1.72,.04);
  round(g,seam,0,.98,-.50,.56,.43,.14,.07);
  round(g,seam,0,.83,-.25,.55,.15,.55,.06);
  for(const side of [-1,1]){
   round(g,red,side*.48,.7,.51,.25,.17,.63,.065);
   round(g,steel,side*.54,.34,-.11,.14,.045,.52,.01);
   for(let i=0;i<4;i++)box(g,seam,side*.554,.59+i*.055,-.52,.008,.021,.28);
   link(g,seam,[side*.49,.90,-.79],[side*.49,2.30,-.62],.031);
   link(g,seam,[side*.49,.95,.49],[side*.49,2.30,.44],.031);
   round(g,seam,side*.5,2.32,-.08,.075,.085,1.28,.02);
   for(const z of [-.8,.6])wheels.push(wheel(g,side*.60,.33,z,.33,.18));
   round(g,seam,side*.38,1.37,.85,.11,2.65,.16,.014);
   round(g,steel,side*.38,1.37,.944,.04,2.48,.015,.004);
   const lamp=round(g,M.light,side*.44,1.65,.57,.13,.09,.08,.025);
  }
  for(const z of [-.68,-.36,0,.36,.55])box(g,seam,0,2.32,z,1.07,.055,.06);
  round(g,seam,0,2.56,.85,.90,.10,.16,.015);
  link(g,steel,[0,.31,.88],[0,2.39,.88],.031);
  link(g,seam,[0,.63,.26],[0,1.36,.22],.04);
  const steer=new THREE.Mesh(new THREE.TorusGeometry(.19,.023,5,14),seam);steer.position.set(0,1.39,.20);steer.rotation.x=-1.03;g.add(steer);
  for(const x of [.27,.34]){link(g,seam,[x,.85,.1],[x,1.11,.16],.013);oval(g,seam,x,1.12,.16,.035,.035,.035);}
  const beacon=mesh(g,tube,M.tail,0,2.44,-.41,.063,.12,.063);
  for(let x=-.36;x<.4;x+=.12)box(g,seam,x,.68,-1.221,.066,.2,.008);
  mergeRigid(g);
  const carriage=new THREE.Group();carriage.position.set(0,.15,1);g.add(carriage);
  round(carriage,seam,0,.25,0,.94,.48,.13,.025);
  for(const x of [-.34,.34]){box(carriage,steel,x,.04,.61,.11,.085,1.22);box(carriage,steel,x,.29,.06,.12,.58,.075);}
  mergeRigid(carriage);
  const cargo=dynamicPallet();cargo.position.set(0,.09,.68);carriage.add(cargo);
  const driver=worker(index,true,coldCoat);g.add(driver.root);
  const actor={g,wheels,carriage,cargo,coldCoat,driver};registry.forklifts.push(actor);return actor;
 }
 function stats(root){let triangles=0,draws=0;root.traverse(m=>{if(m.isMesh){triangles+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;draws++;}});return {triangles,draws};}
 return {worker,palletTruck,forklift,round,mergeRigid,stats,registry};
}
