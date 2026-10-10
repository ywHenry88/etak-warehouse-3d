import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createActorModels} from './actor-models.js';
import {createUltraDetail} from './ultra-detail.js';
const $=id=>document.getElementById(id);
const compact=matchMedia('(pointer:coarse)').matches||innerWidth<650;
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.25:1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
$('stage').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#aeb9bd');scene.fog=new THREE.Fog('#aeb9bd',20,40);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.05,80);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1;controls.maxDistance=20;controls.maxPolarAngle=Math.PI*.49;
const sun=new THREE.DirectionalLight('#fff1df',3);sun.position.set(3,9,6);sun.castShadow=true;sun.shadow.mapSize.set(compact?1024:2048,compact?1024:2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:30});sun.shadow.normalBias=.025;scene.add(sun);
scene.add(new THREE.HemisphereLight('#d4e7f3','#746553',.75));const fill=new THREE.DirectionalLight('#cadfff',.7);fill.position.set(-6,3,-3);scene.add(fill);
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.45;pmrem.dispose();
const M=Object.fromEntries(Object.entries({red:'#a9382e',rubber:'#171d20',dark:'#26363d',black:'#26302e',steel:'#97a4a8',white:'#eeeee4',tail:'#e65138',light:'#effaff',wood:'#ddbd8c',carton:'#d9b480',tape:'#dcc79c'}).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:k==='steel'?.33:.75,metalness:k==='steel'?.8:0})]));
const actor=createActorModels(M),oldRoot=new THREE.Group();scene.add(oldRoot);
function box(parent,mat,x,y,z,w,h,d){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
function oldPallet(){const g=new THREE.Group();for(let i=-2;i<=2;i++)box(g,M.wood,0,.14,i*.20,1.1,.055,.14);for(let x of [-.42,0,.42])box(g,M.wood,x,.065,0,.13,.10,.98);for(let y of [.38,.79])for(let x of [-.27,.27])for(let z of [-.24,.24]){box(g,M.carton,x,y,z,.52,.4,.46);box(g,M.tape,x,y+.205,z,.065,.009,.46);}for(let x of [-.27,.27]){box(g,M.white,x,.76,.475,.2,.14,.009);for(let k=-3;k<4;k++)box(g,M.dark,x+k*.019,.76,.481,.008,.09,.004);}return actor.mergeRigid(g);}
const legacyFork=actor.forklift(0,()=>new THREE.Group());legacyFork.g.remove(legacyFork.g.children.at(-1)); // Compare unoccupied trucks on both sides.
const legacyWorker=actor.worker(0,false,true),legacyCargo=oldPallet(),legacyCart=actor.palletTruck();
const legacy={forklift:legacyFork.g,worker:legacyWorker.root,cargo:legacyCargo,cart:legacyCart};
Object.values(legacy).forEach(o=>oldRoot.add(o));
const detail=createUltraDetail({scene,renderer,sun,ao:{kernelRadius:3,minDistance:.0001,maxDistance:.007},materials:[[M.wood,'wood'],[M.carton,'carton'],[M.rubber,'rubber'],[M.steel,'metal'],[M.red,'paint'],[M.dark,'paint'],[M.white,'paint'],[M.tape,'tape']]});
detail.apply('Ultra');
let gltf,newRoot,stage,mixer,clips=[],roots={},lang='zh',version='new',subject='all',lod='auto',activeLod=0,motion=true,photos=false,time=0,last=0,frames=0,period=0,fps=0;
const photoData=JSON.parse($('photoData').textContent);
const configurations={all:{camera:[6.8,4.1,7.8],target:[0,1,0]},forklift:{camera:[4.1,2.9,-5.0],target:[0,1.28,-.3]},worker:{camera:[1.8,1.5,3.0],target:[0,1,0]},cargo:{camera:[2.4,2.1,3.7],target:[0,.6,0]}};
function reset(){const c=configurations[subject];camera.position.fromArray(c.camera).multiplyScalar(innerWidth<650?1.35:1);controls.target.fromArray(c.target);controls.update();}
function poseObjects(objects,isNew){
 for(const [kind,o] of Object.entries(objects)){
  const baseRotation=isNew||kind==='worker'?0:Math.PI;
  o.visible=subject==='all'||kind===subject||(subject==='cargo'&&kind==='cart');o.position.set(0,0,0);o.rotation.y=baseRotation;
  if(subject==='all'){
   const p={forklift:[-1.65,0,-.4],worker:[1.0,0,1.40],cargo:[1.55,0,-.45],cart:[1.55,0,.05]}[kind];o.position.fromArray(p);
   o.rotation.y=baseRotation+(kind==='forklift'?-.16:0);
  }else if(subject==='cargo'&&kind==='cart')o.position.z=.50;
 }
}
function updateVisibility(){
 if(!gltf)return;
 activeLod=lod==='auto'?(compact||camera.position.distanceTo(controls.target)>10?1:0):Number(lod);
 oldRoot.visible=version==='old';newRoot.visible=version==='new';
 for(const o of Object.values(roots))o.visible=false;
 const current={forklift:roots[`Forklift_LOD${activeLod}`],worker:roots[`Worker_LOD${activeLod}`],cargo:roots[`Pallet_load_LOD${activeLod}`],cart:roots.Pallet_truck_LOD0};
 poseObjects(current,true);poseObjects(legacy,false);
 stage.position.y=0;stage.visible=subject==='all';
 ground.visible=subject!=='all';
 $('new').setAttribute('aria-pressed',String(version==='new'));$('old').setAttribute('aria-pressed',String(version==='old'));
 $('status').textContent=photos?(lang==='zh'?'Blender Cycles 靜態渲染':'Blender Cycles still render'):(version==='new'?(lang==='zh'?`NICHIYU 三輪電動叉車 · ${activeLod?'輕量':'精細'}模型`:`NICHIYU three-wheel electric · LOD${activeLod}`):(lang==='zh'?'現有 Ultra 資產':'Current Ultra assets'));
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#aeb5b3',roughness:.85}));ground.rotation.x=-Math.PI/2;ground.position.y=-.005;ground.receiveShadow=true;scene.add(ground);
function labels(){
 for(const el of document.querySelectorAll('[data-zh]'))el.textContent=el.dataset[lang];
 $('lang').textContent=lang==='zh'?'EN':'繁';document.documentElement.lang=lang==='zh'?'zh-Hant':'en';
 $('motion').textContent=lang==='zh'?(motion?'動畫開':'動畫關'):(motion?'Motion on':'Motion off');
 $('note').textContent=lang==='zh'?'拖曳旋轉、滾輪縮放。切換前後使用相同鏡頭、光照及地面；此頁測試單組資產，並非全倉效能。':'Drag to orbit, scroll to zoom. Both versions share camera, lighting and floor. FPS measures this asset pilot, not the full warehouse.';
 updateVisibility();
}
function setVersion(v){version=v;updateVisibility();}
$('new').onclick=()=>setVersion('new');$('old').onclick=()=>setVersion('old');
$('subject').onchange=e=>{subject=e.target.value;reset();updateVisibility();};$('lod').onchange=e=>{lod=e.target.value;updateVisibility();};
$('reset').onclick=reset;$('lang').onclick=()=>{lang=lang==='zh'?'en':'zh';labels();};
$('motion').onclick=()=>{motion=!motion;$('motion').setAttribute('aria-pressed',String(motion));labels();};
$('photo').onclick=()=>{photos=!photos;$('photo').setAttribute('aria-pressed',String(photos));$('photos').style.display=photos?'flex':'none';$('photoSelect').style.display=photos?'inline-block':'none';$('stats').style.display=photos?'none':'block';updateVisibility();};
$('photoSelect').onchange=()=>{$('renderPhoto').src=photoData[Number($('photoSelect').value)];};
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function geometryStats(){let triangles=0,calls=0;scene.traverseVisible(o=>{if(!o.isMesh)return;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;calls+=Array.isArray(o.material)?o.geometry.groups.length:1;});return {triangles,calls};}
function draw(stamp){
 const dt=last?Math.min((stamp-last)/1000,.06):0;last=stamp;if(!document.hidden&&motion&&!photos)time+=dt;
 if(mixer&&version==='new')mixer.setTime(time);
 if(version==='old')legacyWorker.pose(time,false);
 controls.update();if(lod==='auto')updateVisibility();
 if(!photos)renderer.render(scene,camera);
 frames++;if(stamp-period>1500){fps=frames*1000/(stamp-period);period=stamp;frames=0;const st=geometryStats();$('stats').textContent=`${fps.toFixed(0)} FPS · ${(1000/fps).toFixed(1)} ms\n${st.triangles.toLocaleString()} triangles · ${st.calls} draws`;}
 requestAnimationFrame(draw);
}
async function init(){
 await detail.ready();const bytes=Uint8Array.from(atob(JSON.parse($('modelData').textContent)),c=>c.charCodeAt(0));
 gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');
 newRoot=gltf.scene;scene.add(newRoot);
 for(const name of ['Forklift_LOD0','Forklift_LOD1','Worker_LOD0','Worker_LOD1','Pallet_load_LOD0','Pallet_load_LOD1','Pallet_truck_LOD0']){roots[name]=newRoot.getObjectByName(name);if(!roots[name])throw Error('Missing asset '+name);}
 stage=newRoot.getObjectByName('Surface_sample');scene.attach(stage);
 newRoot.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});stage.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 const mats=new Set();gltf.scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)mats.add(m);});
 stage.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)mats.add(m);});
 for(const m of mats)for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const floorMat=[...mats].find(m=>m.name==='Warehouse concrete');if(floorMat){ground.material=floorMat;const uv=ground.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*30/3.5,uv.getY(i)*30/3.5);uv.needsUpdate=true;}
 clips=gltf.animations;mixer=new THREE.AnimationMixer(newRoot);clips.forEach(c=>mixer.clipAction(c).play());
 $('renderPhoto').src=photoData[0];reset();updateVisibility();$('loading').remove();
 window.pilot={ready:true,setVersion,setSubject(v){subject=v;$('subject').value=v;reset();updateVisibility();},setLod(v){lod=String(v);$('lod').value=lod;updateVisibility();},setMotion(v){motion=v;labels();},state(){return {version,subject,lod:activeLod,fps,frameMs:fps?1000/fps:0,...geometryStats(),animations:clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})),rendererTextures:renderer.info.memory.textures,compact,webgl:renderer.capabilities.isWebGL2};},bones(){const out=[];newRoot.traverse(o=>{if(o.isBone)out.push({name:o.name,q:o.quaternion.toArray()});});return out;}};
 requestAnimationFrame(draw);
}
init().catch(e=>{$('loading').innerHTML='<p id="error">Unable to load preview: '+e.message+'</p>';console.error(e);});
