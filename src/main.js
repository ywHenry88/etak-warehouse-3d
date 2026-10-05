import * as THREE from 'three';
import bannerURL from '../assets/banner.json';
import {tr,language,initLanguage,setLanguage,onLanguage} from './i18n.js';
import {createOperations} from './operations.js';
import cameraLocations from '../reference_v2/cameras.json';
import cameraPhotos from '../reference_v2/embedded_photos.json';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';

const $=id=>document.getElementById(id), canvas=$('viewport');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
const scene=new THREE.Scene();scene.background=new THREE.Color('#182630');scene.fog=new THREE.Fog('#182630',350,650);
const camera=new THREE.PerspectiveCamera(39,innerWidth/innerHeight,.1,350);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=Math.PI*.485;controls.minDistance=5;controls.maxDistance=400;controls.target.set(6,1,0);
const world=new THREE.Group();world.position.set(-21,0,-22.5);scene.add(world);
const roof=new THREE.Group();world.add(roof);roof.visible=false;
const upperWalls=new THREE.Group();world.add(upperWalls);upperWalls.visible=false;
const indoorCeiling=new THREE.Group();world.add(indoorCeiling);indoorCeiling.visible=false;
const cameraMarkers=new THREE.Group();world.add(cameraMarkers);cameraMarkers.visible=false;
const roofLights=new THREE.Group();world.add(roofLights);
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.035).texture;scene.environmentIntensity=.42;pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xc9e0ee,0x6e604b,1.2));
const sun=new THREE.DirectionalLight(0xffeed6,2.8);sun.position.set(-28,58,36);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-46,right:46,top:48,bottom:-48,near:1,far:155});sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;scene.add(sun);scene.add(sun.target);
const fill=new THREE.DirectionalLight(0xc0dff7,.45);fill.position.set(30,28,-40);scene.add(fill);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight);ao.kernelRadius=3;ao.minDistance=.0001;ao.maxDistance=.007;composer.addPass(ao);composer.addPass(new SMAAPass());composer.addPass(new OutputPass());
let seed=926;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function texture(kind){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');const img=g.createImageData(512,512);for(let i=0;i<img.data.length;i+=4){let n=rand();let v=kind==='asphalt'?52+n*22:kind==='wood'?142+n*34:kind==='carton'?165+n*28:155+n*20;img.data[i]=v+(kind==='wood'?23:kind==='carton'?27:0);img.data[i+1]=v+(kind==='wood'?8:kind==='carton'?12:2);img.data[i+2]=v-(kind==='wood'?30:kind==='carton'?35:0);img.data[i+3]=255;}g.putImageData(img,0,0);if(kind==='concrete'){g.strokeStyle='#656c6a22';g.lineWidth=2;for(let i=0;i<80;i++){g.beginPath();g.moveTo(rand()*512,rand()*512);g.lineTo(rand()*512,rand()*512);g.stroke();}}if(kind==='wood'){for(let i=0;i<210;i++){g.strokeStyle=`rgba(66,38,17,${rand()*.18})`;g.beginPath();let y=rand()*512;g.moveTo(0,y);g.bezierCurveTo(160,y+8,360,y-8,512,y);g.stroke();}}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
const concreteTex=texture('concrete');concreteTex.repeat.set(12,12);const asphaltTex=texture('asphalt');asphaltTex.repeat.set(6,14);
const woodTex=texture('wood'),cartonTex=texture('carton');
const mat=(color,roughness=.65,metalness=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const M={floor:mat('#c1c0b0',.78,0,{map:concreteTex}),asphalt:mat('#87908f',.94,0,{map:asphaltTex}),edge:mat('#868e8d'),wall:mat('#d3d7d3',.7),insulated:mat('#dbe6e6',.45,.1),blue:mat('#2355a0',.42,.65),beam:mat('#da632a',.4,.5),steel:mat('#97a4a8',.33,.8),dark:mat('#26363d',.5,.4),rubber:mat('#171d20',.92),yellow:mat('#edb740',.43,.2),white:mat('#eeeee4',.43,.15),wood:mat('#ddbd8c',.85,0,{map:woodTex}),carton:mat('#d9b480',.9,0,{map:cartonTex}),carton2:mat('#c59c66',.88,0,{map:cartonTex}),tape:mat('#dcc79c',.6),black:mat('#26302e',.7),red:mat('#c3493d',.5,.2),glass:new THREE.MeshPhysicalMaterial({color:'#547b86',roughness:.08,metalness:.1,transparent:true,opacity:.57}),green:mat('#a7ccaf',.6),cold:mat('#c1cbc7',.78),light:new THREE.MeshStandardMaterial({color:'#effaff',emissive:'#d3ecff',emissiveIntensity:2.5}),tail:new THREE.MeshStandardMaterial({color:'#e65138',emissive:'#e54324',emissiveIntensity:.9})};
const boxGeo=new THREE.BoxGeometry(1,1,1),cylGeo=new THREE.CylinderGeometry(1,1,1,14);
const batches=new Map();const dummy=new THREE.Object3D();
function instance(material,x,y,z,sx,sy,sz,ry=0){let a=batches.get(material);if(!a)batches.set(material,a=[]);a.push([x,y,z,sx,sy,sz,ry]);}
function box(parent,material,x,y,z,sx,sy,sz){const m=new THREE.Mesh(boxGeo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(parent,material,x,y,z,r,h,rot=0){const m=new THREE.Mesh(cylGeo,material);m.position.set(x,y,z);m.scale.set(r,h,r);m.rotation.z=rot;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function bar(parent,material,a,b,width=.06){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),m=new THREE.Mesh(boxGeo,material);m.position.copy(av).add(bv).multiplyScalar(.5);m.scale.set(width,av.distanceTo(bv),width);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());m.castShadow=true;parent.add(m);return m;}
function paint(x,z,w,d,color='#efd178',y=.026){return box(world,mat(color,.94),x,y,z,w,.012,d);}
function labelTexture(text,bg='#243945',fg='#f1eee3',w=512,h=128){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.font=`600 ${Math.floor(h*.46)}px "Microsoft JhengHei", Arial`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2,w-24);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const signRecords=[];
function sign(parent,text,x,y,z,w=2,h=.5,ry=0,bg){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:labelTexture(tr(text),bg),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;parent.add(m);signRecords.push({material:m.material,text,bg});return m;}
function floorText(text,x,z,w=4,h=1,color='#d9c36e'){const s=sign(world,text,x,.04,z,w,h,0,'#8a8d7c');s.rotation.x=-Math.PI/2;return s;}
function stripeRect(x,z,w,d){paint(x-w/2,z,.07,d);paint(x+w/2,z,.07,d);paint(x,z-d/2,w,.07);paint(x,z+d/2,w,.07);}

// The drawing is traced in metres: x rightward, z downward on the plan.
const footprint=[[0,0],[27.6,0],[27.6,1.65],[39,1.65],[39,.55],[42,.55],[42,45],[0,45]];
const shape=new THREE.Shape();footprint.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:1.5,bevelEnabled:false}),M.floor);slab.rotation.x=-Math.PI/2;slab.position.y=-1.5;slab.receiveShadow=true;slab.castShadow=true;world.add(slab);
box(world,M.floor,53,-1.65,22.4,22,.30,49);box(world,mat('#283944'),28,-1.93,22,73,.25,58);
for(let z=0;z<46;z+=3)paint(60,z,.12,1.45,'#eee7d1',-1.488);
box(world,M.edge,42.10,-.76,22.5,.22,1.5,45);
const jointMaterial=mat('#92988d',1);
for(let x=2;x<42;x+=5)for(let z=2;z<45;z+=5){instance(jointMaterial,x,.009,z,4.9,.006,.015);}
for(let x=2;x<42;x+=5)instance(jointMaterial,x,.01,22.5,.015,.007,45);
// Open cutaway walls retain the plan outline without hiding the storage.
box(world,M.wall,.05,.65,22.5,.22,1.3,45);box(world,M.wall,19.5,.65,45,39,1.3,.22);box(world,M.wall,41.5,.65,45,1,1.3,.22);
box(world,M.wall,13.8,3.65,0,27.6,7.3,.22);box(world,M.wall,33.3,3.65,1.65,11.4,7.3,.22);
for(let z=1;z<45;z+=2.2){instance(M.steel,.19,.7,z,.09,1.35,.08);}
for(let x=1;x<42;x+=2.2)instance(M.steel,x,.7,44.87,.08,1.35,.09);
// Main service core / toilets at the northwest corner.
box(world,M.wall,1.75,1.8,3.78,3.5,3.6,.14);box(world,M.wall,3.5,1.8,3.8,.16,3.6,7.6);
box(world,M.wall,1.75,1.8,7.6,3.5,3.6,.14);box(world,M.floor,1.75,.01,3.8,3.5,.025,7.6);
for(let z of [1.5,4.8]){box(world,M.insulated,1.75,1.25,z,3.4,2.5,.1);box(world,M.white,.7,.4,z+.8,.6,.65,.9);box(world,M.white,2.4,.85,z+.7,.75,.22,.48);}
sign(world,'SERVICE CORE',1.75,3.1,7.69,3,.4);sign(world,'ETAK  /  ATL A1 EAST',16,5.4,.15,12,1.05);
box(world,M.white,29.85,1.65,3.4,4.3,3.3,.13);box(world,M.white,32,1.65,2.7,.12,3.3,2);sign(world,'ELECTRICAL / SERVICES',29.9,2.65,3.49,3.6,.4);
// Structural columns are anchored to the plan's roughly 15.5 m grid.
const columnRects=[];
for(let x of [16.0,31.25])for(let z of [8.95,20.6,31.4,43.1]){const w=2.05,d=z===8.95?2.55:2.25;box(world,M.wall,x,3.65,z,w,7.3,d);columnRects.push({x0:x-w/2-.25,x1:x+w/2+.25,z0:z-d/2-.25,z1:z+d/2+.25});box(world,M.yellow,x,.32,z,w+.10,.65,d+.1);for(let k=-2;k<=2;k++){const s=box(world,M.dark,x+k*.35,.34,z+d/2+.061,.14,.58,.02);s.rotation.z=-.45;}sign(world,`P${x<20?'1':'2'} / ${Math.round(z)}`,x,2.5,z+d/2+.06,1.7,.32);}
for(let z of [31.4,43.1])box(world,M.wall,.9,3.65,z,1.7,7.3,2.2);
// The detailed plan has an L-shaped freezer, a separate chilled room and two east lobbies.
box(world,M.cold,15.9,.13,26.0,28.8,.25,10.55);
box(world,M.cold,22.9,.13,33.0,15.0,.25,3.9);
box(world,M.cold,36.95,.13,27.7,9.4,.25,13.9);
const wallSegments=[];
function wallRun(x1,z1,x2,z2,height=3.3){const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);const g=new THREE.Group();g.position.set((x1+x2)/2,0,(z1+z2)/2);g.rotation.y=-Math.atan2(dz,dx);world.add(g);box(g,M.insulated,0,height/2,0,len,height,.15);box(g,M.dark,0,.38,.085,len,.55,.025);box(g,M.yellow,0,.10,.11,len,.15,.10);for(let x=-len/2+.9;x<len/2;x+=1.15)box(g,M.steel,x,height/2,.082,.012,height,.008);const upper=new THREE.Group();upper.position.copy(g.position);upper.rotation.copy(g.rotation);upperWalls.add(upper);box(upper,M.insulated,0,(height+6.65)/2,0,len,6.65-height,.15);wallSegments.push({x1,z1,x2,z2});}
for(const [a,b] of [[1.8,20.8],[24.3,30.6],[32.2,34.4],[38,41.8]])wallRun(a,20.65,b,20.65);
wallRun(1.8,20.65,1.8,31.3);wallRun(1.8,31.3,15.15,31.3);wallRun(15.15,31.3,15.15,35.0);
wallRun(15.15,35,30.6,35);wallRun(30.6,20.65,30.6,27.8);wallRun(30.6,30.6,30.6,35);
wallRun(32.3,20.65,32.3,28.0);wallRun(32.3,30.8,32.3,35);wallRun(32.3,35,35.2,35);wallRun(38,35,41.8,35);
wallRun(41.8,12,41.8,35);wallRun(30.1,12.5,30.1,20.2);wallRun(39.4,12.4,39.4,20.2);
wallRun(41.8,.55,41.8,1.4);wallRun(41.8,8.6,41.8,12);
wallRun(32.25,35,32.25,38.15);wallRun(32.25,41.65,32.25,45);
// Steel sliding doors, blue fast-action curtains and protected thresholds from CCTV.
const rapidBlue=mat('#1845b6',.3,.12);
const doors=[];
function rapidDoor(id,x,z,w,ry,title,base=0){
 const g=new THREE.Group();g.position.set(x,base,z);g.rotation.y=ry;world.add(g);
 for(const side of [-1,1]){box(g,M.steel,side*(w/2+.08),2,0,.15,4,.19);box(g,M.yellow,side*(w/2+.22),.7,.24,.10,1.4,.10);}
 box(g,M.steel,0,4.05,0,w+.4,.3,.42);
 const leaf=new THREE.Group();g.add(leaf);box(leaf,rapidBlue,0,1.95,0,w,3.9,.055);
 for(const side of [-1,1]){for(let y of [.2,1.22,2.60,3.80])box(leaf,M.white,0,y,side*.039,w,.034,.018);box(leaf,M.glass,0,1.72,side*.042,w-.12,.50,.012);}
 if(id==='north'){box(g,M.steel,0,2,0,.14,4,.20);box(g,M.yellow,0,.62,-.25,.15,1.24,.15);}
 box(leaf,M.dark,0,.04,0,w,.08,.12);
 for(const side of [-1,1])sign(g,title,0,4.3,side*.13,w,.27,side===1?0:Math.PI,'#204c93');
 box(g,M.insulated,0,5.56,0,w+.4,2.12,.15);
 const lamp=box(g,M.green,w/2+.27,2.0,.15,.13,.22,.07);
 const d={id,x,z,w,ry,title,base,g,leaf,lamp,fraction:0,mode:'auto',safety:false};doors.push(d);return d;
}
rapidDoor('chilled-north',36.2,20.65,3.6,0,'Chilled north door',.25);
rapidDoor('chilled-south',36.6,35,2.8,0,'Chilled south door',.25);
rapidDoor('frozen-link',22.55,20.65,3.5,0,'Frozen link door',.25);
rapidDoor('cold-link',31.45,29.3,2.8,Math.PI/2,'Cold-room connecting door',.25);
rapidDoor('north',41.8,5.0,7.2,Math.PI/2,'North freezer door');
rapidDoor('south',32.25,39.9,3.5,Math.PI/2,'South dispatch door');

for(const [x,z] of [[22.55,19.94],[36.2,19.94],[36.6,35.7]]){const r=box(world,M.steel,x,.12,z,3.3,.055,1.5);r.rotation.x=z>30?.165:-.165;}
for(let x of [7.5,19.5,26.5,34.0,40.4]){const z=x<30?21.15:27.3;const g=new THREE.Group();g.position.set(x,5.55,z);world.add(g);box(g,M.white,0,0,0,2.4,.8,.64);for(let k of [-.65,.65]){const fan=cylinder(g,M.dark,k,0,.36,.25,.045);fan.rotation.x=Math.PI/2;for(let j=0;j<8;j++){const blade=box(g,M.steel,k,0,.392,.40,.03,.014);blade.rotation.z=j*Math.PI/4;}}}
sign(world,'FROZEN  /  −18°C',24,3.6,20.7,5.5,.5,0,'#356777');sign(world,'CHILLED  /  4–10°C',36.6,4.7,20.7,5.7,.5,0,'#356777');

for(const x of [8,20,28]){const g=new THREE.Group();g.position.set(x,5.8,.48);world.add(g);box(g,M.white,0,0,0,2.6,.9,.65);for(const u of [-.72,.72]){const fan=cylinder(g,M.dark,u,0,.36,.28,.05);fan.rotation.x=Math.PI/2;for(let j=0;j<5;j++){const blade=box(g,M.steel,u,0,.4,.46,.04,.015);blade.rotation.z=j*Math.PI/5;}}}
sign(world,'NORTH FROZEN / −18°C',18,4.5,.21,9,.7);
// Dock edges and dock shelters are on the drawing's right side.
const dockZ=[3.3,6.65,38.6,42.25];
const dockRects=[{x0:35.2,x1:42,z0:1.8,z1:11.7},{x0:32.3,x1:42,z0:35.1,z1:45}];
for(const r of dockRects){stripeRect((r.x0+r.x1)/2,(r.z0+r.z1)/2,r.x1-r.x0-.4,r.z1-r.z0-.4);for(let z=r.z0+.4;z<r.z1;z+=.9){const s=paint(r.x0+.3,z,.62,.06);s.rotation.y=-.55;}}
floorText('KEEP CLEAR',38.8,10.5,4,.65);floorText('DISPATCH',37.0,43.9,6,.8);
for(let i=0;i<dockZ.length;i++){const z=dockZ[i];box(world,M.dark,42.05,2,z-1.55,.42,4,.3);box(world,M.dark,42.05,2,z+1.55,.42,4,.3);box(world,M.dark,42.05,3.9,z,.42,.3,3.4);box(world,M.rubber,42.2,-.35,z-1.1,.28,.65,.26);box(world,M.rubber,42.2,-.35,z+1.1,.28,.65,.26);box(world,M.steel,42.55,.023,z,1.35,.045,2.65);for(let s of [-1,1]){cylinder(world,M.yellow,41.1,.5,z+s*1.63,.1,1);box(world,M.dark,41.1,.42,z+s*1.63,.22,.18,.22);}sign(world,`D0${i+1}`,42.30,3.63,z,1.5,.38,Math.PI/2);box(world,M.green,41.94,2.45,z+1.7,.1,.25,.16);}
for(let z of [10,21.9,33.1,44.2]){box(world,M.edge,48,-1.26,z,12,.45,.65);for(let x=43;x<54;x+=.65)box(world,Math.round(x/.65)%2?M.yellow:M.dark,x,-1.01,z,.60,.05,.68);}
for(let z of dockZ){for(let side of [-1,1])paint(48,z+side*1.55,10,.07,'#e8e4cf',-1.488);}
for(let z=0;z<45;z+=3)paint(54.8,z,.12,1.45,'#e8dfbf',-1.488);
// Fire points, protected walkways, drainage and dock-level visual details.
for(let z of [3,17,29,42]){box(world,M.red,.27,1.05,z,.3,1.15,.65);sign(world,'FIRE',.44,1.4,z,.55,.2,Math.PI/2,'#b63831');}
for(let z=1;z<44;z+=1.2)paint(1.1,z,.04,.8,'#e8d8a1');
for(let z=0;z<45;z+=.28)instance(M.dark,54.2,-1.47,z,.5,.025,.055);

// Storage organization follows Warehouse2025 1030.pdf; no invented crosswise north racks.
const rackFootprints=[],storageFootprints=[],slots=[],floorSlots=[];let bayID=0;
const storageZones=[{x0:4.55,x1:30,z0:.55,z1:20.3},{x0:30.25,x1:35,z0:3.25,z1:10.7},{x0:1.9,x1:30.4,z0:21,z1:31.2},{x0:15.3,x1:30.4,z0:31.2,z1:34.9},{x0:32.5,x1:41.6,z0:21,z1:34.8},{x0:16.8,x1:30.3,z0:35.3,z1:44.8}];
const usableStorageArea=1602.79;
const rawZoneArea=storageZones.reduce((a,r)=>a+(r.x1-r.x0)*(r.z1-r.z0),0);
const slotLabel=mat('#eff0db',.8),whiteCarton=mat('#e9e9df',.78),darkCrate=mat('#273535',.77),bluePallet=mat('#2362a6',.55),filmBand=mat('#e7e8e1',.18,.3,{transparent:true,opacity:.18,depthWrite:false});
function inColumn(x,z,w,d){return columnRects.some(c=>x+w/2>c.x0&&x-w/2<c.x1&&z+d/2>c.z0&&z-d/2<c.z1);}
function rackBay(x,z,span=2.85,depth=2.35,axis='x',base=.25){const w=axis==='x'?span:depth,d=axis==='x'?depth:span;if(inColumn(x,z,w,d))return;const id=++bayID;rackFootprints.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,id});storageFootprints.push(rackFootprints.at(-1));const emit=(m,u,y,v,su,sy,sv)=>axis==='x'?instance(m,x+u,base+y,z+v,su,sy,sv):instance(m,x+v,base+y,z+u,sv,sy,su);for(const u of [-span/2+.055,span/2-.055])for(const v of [-depth/2+.065,depth/2-.065]){emit(M.blue,u,3.02,v,.11,6.04,.11);emit(M.yellow,u,.28,v,.18,.55,.18);for(let y=.5;y<6;y+=.5)emit(M.dark,u+.057,y,v,.008,.05,.034);}
for(let level=0;level<3;level++){const y=.24+level*1.98;for(let v of [-depth/2,depth/2])emit(M.beam,0,y,v,span,.14,.095);emit(M.steel,0,y-.08,0,span-.1,.025,depth-.1);const vs=depth>1.5?[-.57,.57]:[0];for(const u of [-span*.25,span*.25])for(const v of vs)slots.push({x:x+(axis==='x'?u:v),y:base+y+.075,z:z+(axis==='x'?v:u),id,zone:z>35?'south':'cold',level});}
for(const u of [-span/2+.065,span/2-.065])for(let y=.7;y<5.5;y+=1.6){const a=axis==='x'?[x+u,base+y,z-depth/2]:[x-depth/2,base+y,z+u],b=axis==='x'?[x+u,base+y+1.5,z+depth/2]:[x+depth/2,base+y+1.5,z+u];bar(world,M.blue,a,b,.045);}if(id%3===1)sign(world,`R${String(id).padStart(2,'0')}`,x,base+6.32,z+depth/2+.02,1.1,.28,0,'#244e8e');}
function rackBlock(x0,x1,z0,z1,axis='x',base=.25){const span=2.85;if(axis==='x'){for(let x=x0+span/2;x<=x1-span/2+.01;x+=span)rackBay(x,(z0+z1)/2,span,z1-z0,axis,base);}else{for(let z=z0+span/2;z<=z1-span/2+.01;z+=span)rackBay((x0+x1)/2,z,span,x1-x0,axis,base);}}
// Lower blocks are traced from the cross-hatched shelf grids on the detailed plan.
rackBlock(3.6,21.7,21.8,23.8);rackBlock(24.6,30.25,21.8,23.8);
rackBlock(.3,3.2,24.5,27.4,'z');rackBlock(3.6,13.7,27.9,31.0);
rackBlock(17.2,30.4,31.5,34.6);rackBlock(17.2,30.3,35.5,38.45,'x',0);rackBlock(17.2,28.7,41.65,44.65,'x',0);
// Perimeter shelving evidenced by C05/C06 and C09/C10, kept off their central aisle.
rackBlock(32.45,33.75,23.0,34.65,'z');rackBlock(40.25,41.55,23.0,34.65,'z');
rackBlock(30.9,32.15,12.5,19.7,'z',0);rackBlock(38.1,39.3,12.5,19.7,'z',0);
// North hall: deep north–south floor-pallet lanes, divided by the C11/C12 cross aisle.
function floorGrid(x0,x1,z0,z1){for(let x=x0+.6;x<x1-.45;x+=1.30)for(let z=z0+.57;z<z1-.43;z+=1.25){if(inColumn(x,z,1.18,1.08))continue;floorSlots.push({x,y:0,z,id:'F'+floorSlots.length,zone:'block',level:0});}}
floorGrid(4.75,29.9,.45,10.65);floorGrid(1.9,29.9,13.25,20.25);floorGrid(30.2,32.2,3.35,10.65);
const pickTargets=[[11.2,10.02],[38.7,13.925],[23.63,37.71],[40.9,32.975]];
slots.unshift(...floorSlots);
const pickSlots=pickTargets.map(([x,z])=>slots.reduce((best,s,i)=>{const dist=Math.hypot(s.x-x,s.z-z)+s.y*5;return dist<best.dist?{i,dist,s}:best;},{dist:Infinity}));
const reserved=new Set(pickSlots.map(s=>s.i));
const targetStock=Math.round(slots.length*.8);const shuffle=slots.map((s,i)=>({i,key:rand()})).filter(s=>!reserved.has(s.i)).sort((a,b)=>a.key-b.key);
const filled=new Set([...reserved,...shuffle.slice(0,targetStock-reserved.size).map(s=>s.i)]);
let stocked=0,displayedPalletCount=0;
function staticPallet(s){const {x,y,z}=s;const cold=s.zone==='cold'||s.zone==='block';const body=(cold?rand()<.82:rand()<.28)?whiteCarton:(rand()<.13?darkCrate:M.carton);const wood=rand()<.16?bluePallet:M.wood;for(let i=-2;i<=2;i++)instance(wood,x,y+.13,z+i*.21,1.13,.055,.155);for(let dx of [-.43,0,.43])instance(wood,x+dx,y+.055,z,.13,.11,.99);const h=.31;for(let yy=0;yy<4;yy++)for(let xx of [-1,1])for(let zz of [-1,1]){instance(body,x+xx*.276,y+.18+h/2+yy*h,z+zz*.247,.53,h-.012,.46);instance(M.tape,x+xx*.276,y+.18+h+yy*h,z+zz*.247,.055,.007,.465);if(zz===1&&yy%2===0){instance(slotLabel,x+xx*.276+.09,y+.18+h/2+yy*h,z+.483,.15,.09,.005);instance(cold?M.red:M.dark,x+xx*.276-.1,y+.18+h/2+yy*h,z+.485,.08,.028,.004);}}for(let yy of [.24,.57,.95,1.35]){instance(filmBand,x,y+yy,z+.494,1.10,.028,.006);instance(filmBand,x+.56,y+yy,z,.006,.028,.99);}displayedPalletCount++;}
slots.forEach((s,i)=>{if(!filled.has(i))return;stocked++;if(!reserved.has(i))staticPallet(s);if(s.zone==='block'){storageFootprints.push({x0:s.x-.565,x1:s.x+.565,z0:s.z-.51,z1:s.z+.51,id:s.id});if(!reserved.has(i))for(let k=1;k<3;k++)staticPallet({...s,y:k*1.5});}});

for(let x=4.75;x<30;x+=1.3)paint(x,11.0,.055,.32,'#e3d199');
floorText('CROSS AISLE / KEEP CLEAR',19,11.95,10,.50);

box(indoorCeiling,M.insulated,21,7.75,22.5,42,.18,45);box(indoorCeiling,M.wall,53,6.65,22.5,23,.2,48);
box(upperWalls,M.insulated,.14,4.0,10.3,.18,5.4,20.6);
// North frozen room: insulated panels and dense drive-in-style lane frames.
box(world,M.cold,17.2,.013,10.4,25.0,.012,20.1);
for(let x=4.8;x<29.7;x+=1.15){box(world,M.insulated,x,3.65,.14,1.13,7.3,.055);box(world,M.steel,x+.56,3.65,.175,.012,7.3,.012);}
for(const [za,zb] of [[.55,10.55],[13.3,20.15]])for(let x=4.75;x<29.9;x+=2.6){
 for(const z of [za,zb]){if(inColumn(x,z,.18,.18))continue;instance(M.blue,x,2.6,z,.11,5.2,.11);instance(M.yellow,x,.23,z,.18,.46,.18);}
 for(const y of [1.5,3.0,4.6]){if(!inColumn(x,(za+zb)/2,.14,zb-za))instance(M.beam,x,y,(za+zb)/2,.1,.12,zb-za);}
}
for(const x of [6,18,27])sign(world,'−18°C',x,5.9,.24,1.6,.45,0,'#286578');

// Overhead services remain light enough for a clear cutaway view.
for(let x of [7,23,37])for(let z of [5.7,12.5,26.5,39.6]){box(roofLights,M.dark,x,6.8,z,.12,.13,3.6);box(roofLights,M.light,x,6.72,z,.30,.065,3.2);}
for(let z of [8.95,20.6,31.4,43.1]){box(roof,M.steel,21,7.35,z,42,.30,.18);for(let x=0;x<42;x+=3.5)bar(roof,M.steel,[x,7.36,z],[x+3.5,8.0,z],.07);box(roof,M.steel,21,8,z,42,.10,.1);}
box(roof,new THREE.MeshStandardMaterial({color:'#aebfc6',transparent:true,opacity:.20,metalness:.4,roughness:.5,depthWrite:false}),21,8.15,22.5,42,.15,45);
for(let z of [5.5,18,38.8]){const pipe=cylinder(roof,M.red,21,7.6,z,.05,40,Math.PI/2);for(let x=3;x<41;x+=5)cylinder(roof,M.red,x,7.39,z,.045,.35);}

function wheel(parent,x,y,z,r=.36,w=.22){const t=cylinder(parent,M.rubber,x,y,z,r,w,Math.PI/2);cylinder(parent,M.steel,x+(x>0?.02:-.02),y,z,r*.52,w+.03,Math.PI/2);return t;}
const truckGroups=[];
function truck(z,index){const g=new THREE.Group();g.position.set(43,0,z);world.add(g);const width=2.70,len=8.3;box(g,M.dark,4,-.31,0,len,.38,2.4);box(g,M.wood,4,-.05,0,len,.1,2.62);box(g,M.white,4,1.33,-width/2,len,2.70,.065);box(g,new THREE.MeshStandardMaterial({color:'#dbe2df',transparent:true,opacity:.16,metalness:.2,roughness:.38,depthWrite:false}),4,1.33,width/2,len,2.70,.065);box(g,M.white,8.15,1.33,0,.07,2.7,width);box(g,M.steel,4,2.74,-1.34,len,.11,.10);box(g,M.steel,4,2.74,1.34,len,.11,.10);for(let x=.2;x<8.1;x+=.34){box(g,M.steel,x,1.34,-1.392,.021,2.6,.011);}box(g,M.steel,-.07,1.32,-1.38,.14,2.8,.13);box(g,M.steel,-.07,1.32,1.38,.14,2.8,.13);box(g,M.steel,-.07,2.71,0,.15,.14,2.8);for(let xx of [1.9,2.9,6.7])for(let side of [-1,1]){const wg=new THREE.Group();wg.rotation.y=Math.PI/2;wg.position.set(xx,-.95,side*1.17);g.add(wg);wheel(wg,0,0,0,.51,.28);}const cabColor=M.white;box(g,cabColor,9.2,.02,0,2.3,1.7,2.6);box(g,cabColor,9.65,1.25,0,1.6,1.2,2.5);box(g,M.glass,10.47,1.29,0,.025,.85,2.20);box(g,M.glass,9.56,1.32,1.268,1.25,.76,.025);box(g,M.glass,9.56,1.32,-1.268,1.25,.76,.025);box(g,M.dark,10.38,-.18,0,.15,.5,1.35);for(let s of [-1,1]){box(g,M.light,10.39,.03,s*.9,.08,.22,.45);box(g,M.steel,9.8,1.20,s*1.52,.23,.3,.1);const w=new THREE.Group();w.rotation.y=Math.PI/2;w.position.set(9.65,-.95,s*1.14);g.add(w);wheel(w,0,0,0,.52,.3);box(g,M.tail,-.18,-.24,s*1.08,.03,.15,.26);}sign(g,'ETAK  /  COLD CHAIN',4,1.5,-1.403,5.6,.55,Math.PI,'#edf0e9');box(g,M.white,8.48,2.08,0,.68,.98,1.72);for(let j=-4;j<=4;j++)box(g,M.dark,8.83,2.08,j*.16,.03,.62,.06);sign(g,'ETAK LOGISTICS',9.1,.64,1.314,1.45,.22,0,'#536c65');sign(g,`ATL · ${String(index+1).padStart(2,'0')}`,9.1,.55,1.31,1.35,.24);const loads=new THREE.Group();g.add(loads);for(let j=0;j<3;j++){const p=dynamicPallet();p.position.set(j===0?4.88:6.8,0,j===0?0:(j===1?.65:-.65));loads.add(p);}truckGroups.push({g,loads});return g;}
function dynamicPallet(){const g=new THREE.Group();for(let i=-2;i<=2;i++)box(g,M.wood,0,.14,i*.20,1.1,.055,.14);for(let x of [-.42,0,.42])box(g,M.wood,x,.065,0,.13,.10,.98);for(let y of [.38,.79])for(let x of [-.27,.27])for(let z of [-.24,.24]){box(g,M.carton,x,y,z,.52,.4,.46);box(g,M.tape,x,y+.205,z,.065,.009,.46);}for(let x of [-.27,.27]){box(g,M.white,x,.76,.475,.2,.14,.009);for(let k=-3;k<4;k++)box(g,M.dark,x+k*.019,.76,.481,.008,.09,.004);}return g;}
dockZ.forEach(truck);
function forklift(index){const g=new THREE.Group();world.add(g);const wheels=[];box(g,M.red,0,.61,-.30,1.12,.76,1.6);box(g,M.dark,0,.27,-.16,1.15,.17,1.75);box(g,M.red,0,.78,-1.05,1.20,.72,.36);box(g,M.black,0,.82,-.32,.57,.16,.56);box(g,M.black,0,1.11,-.59,.57,.53,.13);for(let x of [-.5,.5])for(let z of [-.77,.45])box(g,M.dark,x,1.54,z,.065,1.6,.065);box(g,M.dark,0,2.38,-.12,1.27,.10,1.52);for(let z=-.75;z<.7;z+=.24)box(g,M.dark,0,2.32,z,1.1,.045,.055);for(let x of [-.62,.62])for(let z of [-.80,.60])wheels.push(wheel(g,x,.37,z,.33,.19));for(let x of [-.39,.39])box(g,M.dark,x,1.38,.85,.12,2.65,.16);box(g,M.steel,0,1.22,.90,.07,2.3,.07);box(g,M.dark,0,2.56,.85,.88,.10,.16);const carriage=new THREE.Group();carriage.position.set(0,.15,1.0);g.add(carriage);box(carriage,M.dark,0,.25,0,.94,.48,.13);for(let x of [-.34,.34]){box(carriage,M.steel,x,.04,.61,.11,.085,1.22);box(carriage,M.steel,x,.29,.06,.12,.58,.075);}const cargo=dynamicPallet();cargo.position.set(0,.09,.68);carriage.add(cargo);cylinder(g,M.tail,0,2.53,-.13,.075,.13);box(g,M.light,-.44,1.35,.96,.15,.1,.06);box(g,M.light,.44,1.35,.96,.15,.1,.06);sign(g,`FL-${index+1}`,0,1,-1.245,.83,.26,Math.PI,'#2c3b40');
// Seated operator: workwear, reflective vest, hard hat, articulated arms.
box(g,mat('#283d51'),0,1.01,-.15,.39,.23,.55);box(g,mat('#d4e15e'),0,1.37,-.26,.44,.57,.3);box(g,M.steel,0,1.30,-.091,.40,.035,.016);cylinder(g,mat('#be9170'),0,1.83,-.24,.15,.29);cylinder(g,M.yellow,0,2.0,-.24,.20,.095);bar(g,mat('#d4e15e'),[-.23,1.58,-.24],[-.31,1.26,.24],.13);bar(g,mat('#d4e15e'),[.23,1.58,-.24],[.31,1.26,.24],.13);const steer=cylinder(g,M.black,0,1.30,.26,.23,.035);steer.rotation.x=.55;
return {g,wheels,carriage,cargo};}
// The cross aisle and south aisle follow the new plan; no forklift crosses a storage lane.
const routes=[
 [[pickSlots[0].s.x,11.60],[33.65,11.60],[33.65,5.15],[39.4,5.15],[39.4,3.3],[46.2,3.3]],
 [[37.0,pickSlots[1].s.z],[37.0,6.65],[46.2,6.65]],
 [[pickSlots[2].s.x,39.95],[39.3,39.95],[39.3,38.6],[46.2,38.6]],
 [[38.65,pickSlots[3].s.z],[36.6,pickSlots[3].s.z],[36.6,36.5],[39.2,36.5],[39.2,42.25],[46.2,42.25]]
];
const forklifts=routes.flatMap((points,i)=>{if(i===1)return [];const f=forklift(i===3?2:i===2?1:i);const pickup=dynamicPallet();const s=pickSlots[i].s;pickup.position.set(s.x,s.y,s.z);world.add(pickup);const deposit=truckGroups[i].loads.children[0];deposit.position.set(4.88,.015,0);return [{...f,pickup,pickHeight:s.y-.09,points,index:i,offset:0,phase:'Collecting',distance:points.slice(1).reduce((a,p,j)=>a+Math.hypot(p[0]-points[j][0],p[1]-points[j][1]),0)}];});

function pathAt(points,t){const lengths=points.slice(1).map((p,j)=>Math.hypot(p[0]-points[j][0],p[1]-points[j][1]));let d=t*lengths.reduce((a,b)=>a+b,0);for(let j=0;j<lengths.length;j++){if(d<=lengths[j]||j===lengths.length-1){let u=Math.max(0,Math.min(1,d/lengths[j]));const a=points[j],b=points[j+1];return {x:a[0]+(b[0]-a[0])*u,z:a[1]+(b[1]-a[1])*u,heading:Math.atan2(b[0]-a[0],b[1]-a[1]),segment:j};}d-=lengths[j];}}
const cycle=100;
function updateForklift(f,time){const t=(time+f.offset)%cycle;let p,loaded=true,lift=.15;const pickHeading=f.index===0||f.index===2?Math.PI:Math.PI/2;
if(t<8){p=pathAt(f.points,0);p.heading=pickHeading;lift=f.pickHeight+Math.max(0,Math.min((t-3)/5,1))*.08;f.phase='Picking pallet';loaded=t>3;}
else if(t<46){p=pathAt(f.points,(t-8)/38);lift=.28;f.phase='To dispatch';}
else if(t<53){p=pathAt(f.points,1);lift=.28-(t-46)/7*.33;f.phase='Loading trailer';loaded=t<51;}
else if(t<94){p=pathAt(f.points,1-(t-53)/41);lift=.1;loaded=false;f.phase='Returning empty';}
// Rest along the aisle after returning; turning across it would block visitors
// throughout the other vehicles' dispatch turns.
else{p=pathAt(f.points,0);if(f.index===3)p.heading=pickHeading;lift=.1;loaded=false;f.phase='Next collection';}
f.g.position.set(p.x,f.index===3?Math.max(0,Math.min(.25,(35.8-p.z)*.25)):0,p.z);f.g.rotation.y=p.heading;f.carriage.position.y=lift;f.cargo.visible=loaded;f.pickup.visible=t<=3||t>=96;f.wheels.forEach(w=>w.rotation.x=time*4);truckGroups[f.index].loads.children[0].visible=t>=51||time+f.offset>=cycle;}

// Clean versions of the physical details visible in CCTV: guardrails, pallet trucks,
// indoor apron columns, cold-room evaporators, rapid doors and security cameras.
for(let z of [1.0,12,24,35,46])box(roof,M.wall,52,6.2,z,21,.5,.5);
for(let z=3;z<47;z+=6){box(indoorCeiling,M.steel,53,5.85,z,10,.10,.14);box(indoorCeiling,M.light,53,5.76,z,8,.06,.22);}
box(roof,new THREE.MeshStandardMaterial({color:'#b8c1c2',roughness:.7,transparent:true,opacity:.2,depthWrite:false}),53,6.6,22.5,23,.18,48);
function guardrail(x,z,len,ry=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;world.add(g);for(let u=-len/2;u<=len/2+.01;u+=len/Math.ceil(len/1.2)){cylinder(g,M.yellow,u,.47,0,.045,.95);box(g,M.dark,u,.15,0,.16,.06,.16);}box(g,M.yellow,0,.84,0,len,.065,.065);box(g,M.yellow,0,.38,0,len,.045,.045);}
guardrail(34.8,1.7,1.6,Math.PI/2);guardrail(39.6,10.4,2.7);guardrail(33,43.8,2.4,Math.PI/2);guardrail(40.6,32.0,2.0);
function palletJack(x,z,ry=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;world.add(g);box(g,M.red,0,.38,-.28,.58,.61,.60);for(let u of [-.24,.24]){box(g,M.red,u,.10,.50,.16,.13,1.55);const w=cylinder(g,M.rubber,u,.07,1.14,.075,.13,Math.PI/2);bar(g,M.dark,[0,.58,-.35],[0,1.23,-.65],.045);}box(g,M.dark,0,1.26,-.66,.39,.10,.11);}
palletJack(4.6,33.4,Math.PI/2);palletJack(6.0,33.4,Math.PI/2);palletJack(34.0,43.6);palletJack(34.7,43.6);
for(let k=0;k<7;k++){box(world,M.blue,4.3,.07+k*.14,35.2,1.18,.10,1.1);box(world,M.wood,6,.07+k*.14,35.2,1.18,.10,1.1);}
sign(world,'ETAK LOGISTICS',39.3,3.3,44.82,4.5,.55,0,'#a5b9b6');
const cameraBody=mat('#f1f1ea',.3,.15),cameraLens=mat('#142025',.12,.3);
for(const c of cameraLocations){const g=new THREE.Group();g.position.set(c.x,c.height,c.z);g.rotation.y=Math.atan2(c.dx,c.dz);cameraMarkers.add(g);box(g,cameraBody,0,0,0,.26,.18,.38);box(g,cameraLens,0,0,.205,.18,.115,.024);bar(g,M.steel,[0,-.02,-.15],[0,-.32,-.27],.035);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture('C'+String(c.id).padStart(2,'0'),'#195dc0'),depthTest:false}));sprite.position.set(0,.6,0);sprite.scale.set(1.05,.30,1);g.add(sprite);const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,-.18,1).normalize(),new THREE.Vector3(0,0,.3),1.6,0x438dff,.35,.22);g.add(arrow);}

const ops=createOperations({THREE,world,camera,controls,canvas,M,box,bar,cylinder,sign,dynamicPallet,doors,forklifts,updateForklift,pathAt,wallSegments,columnRects,storageFootprints,truckGroups,dockZ,tr,resumeSimulation:()=>{paused=false;$('playBtn').textContent='Ⅱ';$('playBtn').setAttribute('aria-label',tr('Pause simulation'));},getView:()=>currentView,setView,hideInterior:()=>{indoorCeiling.visible=false;upperWalls.visible=false;},showInterior:()=>{indoorCeiling.visible=true;upperWalls.visible=true;roof.visible=false;}});

const bannerTexture=new THREE.TextureLoader().load(bannerURL);bannerTexture.colorSpace=THREE.SRGBColorSpace;bannerTexture.anisotropy=8;
const bannerGroup=new THREE.Group();world.add(bannerGroup);bannerGroup.position.set(41.96,1.82,27.2);bannerGroup.rotation.y=Math.PI/2;
box(bannerGroup,M.white,0,0,0,7.2,2.68,.065);
const brandBoard=new THREE.Mesh(new THREE.PlaneGeometry(7.05,2.58),new THREE.MeshBasicMaterial({map:bannerTexture}));brandBoard.position.z=.045;bannerGroup.add(brandBoard);

// Consolidate rack steel, timber, cartons and tiny labels into GPU instances.
const staticBatches=new Map();for(const obj of [...world.children]){if(!obj.isMesh||obj.material.transparent)continue;obj.updateMatrix();const key=obj.material;let parts=staticBatches.get(key);if(!parts)staticBatches.set(key,parts=[]);parts.push((obj.geometry.index?obj.geometry.toNonIndexed():obj.geometry.clone()).applyMatrix4(obj.matrix));world.remove(obj);}for(const [material,parts] of staticBatches){const mesh=new THREE.Mesh(mergeGeometries(parts),material);mesh.castShadow=true;mesh.receiveShadow=true;world.add(mesh);parts.forEach(p=>p.dispose());}
let instanceTotal=0;for(const [material,items] of batches){const mesh=new THREE.InstancedMesh(boxGeo,material,items.length);items.forEach(([x,y,z,sx,sy,sz,ry],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();world.add(mesh);instanceTotal+=items.length;}

const labelEntries=[];function htmlLabel(text,sub,x,y,z){const e=document.createElement('div');e.className='label';e.innerHTML=tr(text)+(sub?'<small>'+tr(sub)+'</small>':'');$('labels').append(e);labelEntries.push({e,text,sub,v:new THREE.Vector3(x-21,y,z-22.5)});}
htmlLabel('NORTH FROZEN / −18°C','−18°C / insulated frozen storage',18,5.8,6);htmlLabel('FROZEN','−18°C / mapped rack blocks',18,5.8,28);htmlLabel('CHILLED','4–10°C / perimeter racks',36.8,5.8,27);htmlLabel('SOUTH RACK AISLE','C01 ↔ C02',24,6.5,39.8);htmlLabel('NORTH DISPATCH','Clear rapid-door lobby',39,4,8);htmlLabel('SOUTH DISPATCH','Clear loading area',37.5,4,43);htmlLabel('INDOOR TRUCK APRON','Pavement −1.50 m',54,2.5,23);
htmlLabel('NORTH STAFF RAMP','C16 / pedestrian access',48,1.8,-.55);htmlLabel('SOUTH STAFF RAMP','C17 / pedestrian access',48,1.8,46.1);
const views={overview:{pos:[76,65,83],target:[6,0,0]},plan:{pos:[4,104,.01],target:[4,0,0]},dock:{pos:[62,29,26],target:[21,1,0]},inside:{pos:[-3.3,4.1,17.3],target:[10,1.6,17.3]}};
let currentView='overview',transition=null,paused=false,speed=1,simTime=0,lastStamp=null,labelsOn=innerWidth>=700;
if(!labelsOn){$('labels').style.display='none';$('labelsBtn').classList.remove('active');}
function setView(name,instant=false){ops.exitWalk();controls.enabled=true;$('photoPanel').classList.remove('open');document.body.classList.remove('camera-mode');if(name==='walk'){currentView='walk';transition=null;document.querySelectorAll('[data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===name));ops.enterWalk();return;}camera.fov=39;camera.updateProjectionMatrix();upperWalls.visible=false;indoorCeiling.visible=name==='inside';currentView=name;document.querySelectorAll('[data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===name));if(name==='follow'){transition=null;return;}const v=views[name];transition={startPos:camera.position.clone(),startTarget:controls.target.clone(),endPos:new THREE.Vector3(...v.pos).sub(new THREE.Vector3(...v.target)).multiplyScalar(Math.max(1,.92/camera.aspect)).add(new THREE.Vector3(...v.target)),endTarget:new THREE.Vector3(...v.target),t:0};if(instant){camera.position.copy(transition.endPos);controls.target.copy(transition.endTarget);transition=null;controls.update();}}
setView('overview',true);if(innerWidth<700)$('panel').classList.add('hidden');
document.querySelectorAll('[data-view]').forEach(e=>e.onclick=()=>setView(e.dataset.view));
$('playBtn').onclick=()=>{paused=!paused;$('playBtn').textContent=paused?'▶':'Ⅱ';$('playBtn').setAttribute('aria-label',tr(paused?'Play simulation':'Pause simulation'));};
$('speed').oninput=e=>{speed=Number(e.target.value);$('speedValue').textContent=speed+'×';};
$('labelsBtn').onclick=()=>{labelsOn=!labelsOn;$('labelsBtn').classList.toggle('active',labelsOn);$('labels').style.display=labelsOn?'':'none';};
$('roofBtn').onclick=()=>{roof.visible=!roof.visible;upperWalls.visible=roof.visible;$('roofBtn').classList.toggle('active',roof.visible);};
$('planBtn').onclick=()=>$('planModal').classList.add('open');$('closePlan').onclick=()=>$('planModal').classList.remove('open');
$('tourLaunch').onclick=()=>ops.tour.start();
$('resetBtn').onclick=()=>setView('overview');$('menu').onclick=()=>$('panel').classList.toggle('hidden');
window.addEventListener('keydown',e=>{if(e.key==='Escape')$('planModal').classList.remove('open');if(e.code==='Space'&&e.target===canvas){e.preventDefault();$('playBtn').click();}});
controls.addEventListener('start',()=>{if(currentView==='follow')currentView='manual';transition=null;});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
let selectedCamera=null,photoIndex=0;
const selector=$('cameraSelect');
cameraLocations.forEach(c=>{const option=document.createElement('option');option.value=c.id;option.textContent=`C${String(c.id).padStart(2,'0')} · ${tr(c.zone)}${cameraPhotos[c.id]?'':' ('+tr('plan only')+')'}`;selector.append(option);});
function renderReference(){const items=cameraPhotos[selectedCamera]||[];const c=cameraLocations.find(c=>c.id===selectedCamera);$('photoTitle').textContent=`C${String(c.id).padStart(2,'0')} / ${tr(c.zone)}`;$('photoMeta').textContent=items.length?(language==='zh-Hant'?`2026年9月28日 · 第${photoIndex+1}／${items.length}張`:`28 SEP 2026 · reference ${photoIndex+1} of ${items.length}`):tr('Plan location only · no matching photo supplied');$('referencePhoto').style.display=items.length?'block':'none';$('referenceEmpty').style.display=items.length?'none':'block';if(items.length){$('referencePhoto').src=items[photoIndex].data;$('referencePhoto').alt=`Camera C${c.id}: ${c.zone}`;}$('nextPhoto').style.display=items.length>1?'inline-block':'none';$('photoSource').textContent=items.length?items[photoIndex].file:tr('C04, C07 and C08 are located from the plan, without a supplied image.');}
const cameraViewOffsets={16:{x:40.3,z:-.25,dx:1,dz:0,height:2.8},17:{x:40.3,z:46.1,dx:1,dz:0,height:2.8},5:{x:38.9,z:32.0,dx:-.12,dz:-1},6:{x:34.6,z:22.0,dx:.18,dz:1},7:{x:29.1,z:29.2,dx:-1,dz:-.25},8:{x:16.7,z:24.5,dx:.7,dz:.7},9:{x:37.25,z:19.6,dx:-.12,dz:-1},10:{x:33.3,z:12.0,dx:.2,dz:1},24:{x:4.15,z:.8,dx:0,dz:1}};
function selectCamera(id){ops.exitWalk();controls.enabled=true;const c=cameraLocations.find(c=>c.id===Number(id));if(!c)return;selectedCamera=c.id;photoIndex=0;currentView='C'+String(c.id).padStart(2,'0');transition=null;document.querySelectorAll('[data-view]').forEach(e=>e.classList.remove('active'));camera.fov=c.id===23||c.id===25?87:72;camera.updateProjectionMatrix();const exterior=c.id>=16&&c.id!==24;const length=exterior?13:9;const v={...c,...cameraViewOffsets[c.id]};const mag=Math.hypot(v.dx,v.dz);camera.position.set(v.x-21,v.height,v.z-22.5);controls.target.set(v.x-21+v.dx/mag*length,exterior?-.3:1.3,v.z-22.5+v.dz/mag*length);controls.update();upperWalls.visible=true;indoorCeiling.visible=true;roof.visible=false;cameraMarkers.visible=false;$('camerasBtn').classList.remove('active');selector.value=String(c.id);$('photoPanel').classList.add('open');document.body.classList.add('camera-mode');renderReference();}
selector.onchange=()=>selectCamera(selector.value);
$('camerasBtn').onclick=()=>{cameraMarkers.visible=!cameraMarkers.visible;$('camerasBtn').classList.toggle('active',cameraMarkers.visible);};
$('closePhoto').onclick=()=>{$('photoPanel').classList.remove('open');document.body.classList.remove('camera-mode');setView('overview');};
$('nextPhoto').onclick=()=>{photoIndex=(photoIndex+1)%cameraPhotos[selectedCamera].length;renderReference();};
$('referencePhoto').onclick=()=>{$('imageModal').classList.add('open');$('fullPhoto').src=$('referencePhoto').src;};
$('closeImage').onclick=()=>$('imageModal').classList.remove('open');
window.addEventListener('keydown',e=>{if(e.key==='Escape')$('imageModal').classList.remove('open');});

const tv=new THREE.Vector3();let tick=0;
function renderAt(t,dt=0){ops.update(t,dt);if(transition){transition.t=Math.min(1,transition.t+dt/1.3);const k=transition.t*transition.t*(3-2*transition.t);camera.position.lerpVectors(transition.startPos,transition.endPos,k);controls.target.lerpVectors(transition.startTarget,transition.endTarget,k);if(transition.t===1)transition=null;}if(currentView==='follow'){const f=forklifts[0];tv.set(f.g.position.x-21,1.7,f.g.position.z-22.5);controls.target.lerp(tv,.08);tv.add(new THREE.Vector3(0,18,2.5));camera.position.lerp(tv,.045);}if(currentView!=='walk')controls.update();if(labelsOn){labelEntries.forEach(({e,v})=>{tv.copy(v).project(camera);e.style.left=(tv.x*.5+.5)*innerWidth+'px';e.style.top=(-tv.y*.5+.5)*innerHeight+'px';e.style.display=tv.z>1||tv.z<0||currentView==='walk'||currentView==='inside'||currentView==='follow'||currentView.startsWith('C')?'none':'';});}composer.render();if(tick++%15===0){$('activities').innerHTML=forklifts.map((f,i)=>`<div class="activity"><span>FL-0${i+1}</span><em>${tr(f.phase)}</em></div>`).join('')+ops.staffStatus();ops.refreshDoorUI();$('simTime').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0')+' · '+tr('Continuous loading cycle');$('loads').textContent=ops.dispatched()+' '+tr('pallets dispatched');}}
function animate(stamp){const dt=lastStamp===null?0:Math.min((stamp-lastStamp)/1000,.08);lastStamp=stamp;if(!paused)simTime+=dt*speed;renderAt(simTime,dt);requestAnimationFrame(animate);}
window.addEventListener('hf-seek',e=>{paused=true;simTime=e.detail.time;renderAt(simTime);});
window.warehouse={ready:false,setView,selectCamera,setLanguage,operations:ops,seek(t){paused=true;simTime=t;tick=0;renderAt(t);},resume(){paused=false;},sampleFleet(t){ops.seek(t);return forklifts.map(f=>({x:f.g.position.x,z:f.g.position.z,heading:f.g.rotation.y,loaded:f.cargo.visible,phase:f.phase}));},getState(){return {staffCount:6,forkliftCount:forklifts.length,walkingSpeed:10,tourSpeed:8.25,parkingColumns:0,brandBanner:true,language,doors:ops.doorState(),staff:ops.staffState(),ramps:ops.ramps,walking:ops.walkState(),time:simTime,paused,speed,view:currentView,stocked,slots:slots.length,bays:bayID,rackZoneArea:rawZoneArea,usableStorageArea,rackAllocation:rawZoneArea/usableStorageArea,apronLevel:-1.5,trailerBedLevel:0,rackFootprints,dockRects,columnRects,routes,storageFootprints,groundPositions:floorSlots.length,cameraCount:cameraLocations.length,photoCount:Object.values(cameraPhotos).reduce((a,b)=>a+b.length,0),cameraData:cameraLocations,wallSegments,vehicles:forklifts.map(f=>({x:f.g.position.x,z:f.g.position.z,loaded:f.cargo.visible,phase:f.phase})),instanceTotal};}};
onLanguage(()=>{
 signRecords.forEach(({material,text,bg})=>{material.map.dispose();material.map=labelTexture(tr(text),bg);material.needsUpdate=true;});
 labelEntries.forEach(({e,text,sub})=>e.innerHTML=tr(text)+(sub?'<small>'+tr(sub)+'</small>':''));
 cameraLocations.forEach(c=>{const option=selector.querySelector(`option[value="${c.id}"]`);option.textContent=`C${String(c.id).padStart(2,'0')} · ${tr(c.zone)}${cameraPhotos[c.id]?'':' ('+tr('plan only')+')'}`;});
 if(selectedCamera)renderReference();ops.tour.refresh();ops.refreshDoorUI();document.querySelector('.help').textContent=[tr('Drag to orbit'),tr('Scroll to zoom'),tr('Right-drag to pan')].join(' · ');tick=0;
});
initLanguage();

try{renderer.compile(scene,camera);renderAt(0);$('loading').style.display='none';window.warehouse.ready=true;requestAnimationFrame(animate);}catch(e){$('loading').innerHTML='<h2>Unable to start WebGL</h2><p>'+e.message+'</p>';throw e;}
