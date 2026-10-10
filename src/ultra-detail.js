import * as THREE from 'three';
import photographs from '../assets/ultra/textures.json';

// Colour is sRGB; normal/roughness are linear. Maps stay shared across batches.
function texture(image,srgb,anisotropy,name){
 const t=new THREE.Texture(image);t.name=`Ultra ${name}`;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;t.needsUpdate=true;return t;
}
async function photographic(kind,anisotropy){
 const maps={};await Promise.all(Object.entries(photographs[kind]).map(async([name,url])=>{
  const img=new Image();img.src=url;await img.decode();maps[name]=texture(img,name==='map',anisotropy,`${kind} ${name}`);
 }));return maps;
}

function manufactured(kind,size,anisotropy){
 const count=size*size,height=new Float32Array(count),colour=new Uint8ClampedArray(count*4),rough=new Uint8ClampedArray(count*4),normal=new Uint8ClampedArray(count*4);
 let seed=739+[...kind].reduce((n,c)=>n*3+c.charCodeAt(0),0);const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const grids=[8,32,128].map(n=>({n,data:Float32Array.from({length:n*n},random)}));
 function noise(x,y,g){const u=x/size*g.n,v=y/size*g.n,ix=Math.floor(u),iy=Math.floor(v),a=u-ix,b=v-iy,s=a*a*(3-2*a),t=b*b*(3-2*b),at=(dx,dy)=>g.data[((iy+dy)%g.n)*g.n+(ix+dx)%g.n];return (at(0,0)*(1-s)+at(1,0)*s)*(1-t)+(at(0,1)*(1-s)+at(1,1)*s)*t;}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,k=i*4,a=noise(x,y,grids[0]),b=noise(x,y,grids[1]),c=noise(x,y,grids[2]),grain=random();
  let h=.5,v=238,r=.75;
  if(kind==='carton'){const edge=Math.min(x,y,size-1-x,size-1-y)/size;h=.4+grain*.12+c*.12;v=233+b*8+grain*10-(edge<.007?16:0);r=.84+grain*.14;}
  if(kind==='paint'||kind==='metal'){const scratch=Math.sin(y/size*Math.PI*2*181+b*.5)>.99&&a>.66;h=.5+grain*.035-(scratch?.06:0);v=239+a*8+c*5-(scratch?17:0);r=(kind==='paint'?.58:.33)+b*.15+(scratch?.19:0);}
  if(kind==='panel'){const joint=Math.exp(-Math.pow(Math.min(x,size-x)/(size*.004),2)),ribs=Math.pow(.5+.5*Math.cos(x/size*Math.PI*2*8),20);h=.5+grain*.012-joint*.20-ribs*.012;v=240+a*7-joint*23-ribs*1.5;r=.48+b*.10;}
  if(kind==='pvc'){h=.5+.025*Math.sin(y/size*Math.PI*2*10)+grain*.025;v=226+a*19+b*7;r=.53+b*.19;}
  if(kind==='rubber'){const tread=Math.sin((x+y*.35)/size*Math.PI*2*18)>.88;h=.5+grain*.08-(tread?.14:0);v=203+a*29+grain*17;r=.85+b*.14;}
  if(kind==='fabric'){h=.5+.16*Math.sin(x/size*Math.PI*2*108)*Math.sin(y/size*Math.PI*2*108)+grain*.07;v=208+a*30+b*15;r=.9+grain*.09;}
  if(kind==='skin'){h=.5+grain*.025;v=242+a*8+grain*5;r=.64+b*.15;}
  if(kind==='tape'){h=.5+.02*Math.sin(y/size*Math.PI*2*40+b*2);v=226+a*20;r=.32+b*.18;}
  height[i]=h;colour[k]=colour[k+1]=colour[k+2]=v;colour[k+3]=255;
  rough[k]=rough[k+1]=rough[k+2]=Math.round(r*255);rough[k+3]=255;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const k=(y*size+x)*4,dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*2,dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*2,inv=1/Math.hypot(dx,dy,1);
  normal[k]=Math.round((-.5*dx*inv+.5)*255);normal[k+1]=Math.round((.5*dy*inv+.5)*255);normal[k+2]=Math.round((.5*inv+.5)*255);normal[k+3]=255;
 }
 function canvas(data){const c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').putImageData(new ImageData(data,size,size),0,0);return c;}
 const albedo=canvas(colour);
 if(kind==='carton'){
  const g=albedo.getContext('2d');g.scale(size/1024,size/1024);
  g.fillStyle='#ddd7c9';g.fillRect(80,650,375,200);g.fillStyle='#4e5149';g.font='bold 30px Arial';g.fillText('ETAK / COLD CHAIN',99,690);
  g.font='22px Arial';g.fillText('KEEP DRY / THIS SIDE UP',99,722);
  for(let x=100;x<425;){const w=2+Math.floor(random()*5);g.fillRect(x,748,w,64);x+=w+2+Math.floor(random()*4);}
  g.font='24px Arial';g.fillText('↑ ↑',795,816);g.strokeStyle='#9b8d78';g.lineWidth=3;g.strokeRect(6,6,1012,1012);
 }
 return {map:texture(albedo,true,anisotropy,`${kind} colour`),normalMap:texture(canvas(normal),false,anisotropy,`${kind} normal`),roughnessMap:texture(canvas(rough),false,anisotropy,`${kind} roughness`)};
}

// Metre-scaled projection fixes extruded slab UVs and long stretched walls.
// A dominant plane uses three texture reads, rather than nine for triplanar.
function projectSurface(shader,tileSize,kind){
 const declaration='varying vec3 vUltraPosition; varying vec3 vUltraNormal;\n';
 shader.vertexShader=declaration+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
  vec4 ultraPosition=vec4(transformed,1.0);
  #ifdef USE_INSTANCING
   ultraPosition=instanceMatrix*ultraPosition;
  #endif
  vUltraPosition=(modelMatrix*ultraPosition).xyz;
  vUltraNormal=inverseTransformDirection(transformedNormal,viewMatrix);`);
 shader.fragmentShader=declaration+shader.fragmentShader.replace('#include <map_fragment>',`
  vec3 un=normalize(vUltraNormal),an=abs(un),p=vUltraPosition/${tileSize.toFixed(2)};
  vec2 ultraUv=an.y>=an.x&&an.y>=an.z?vec2(p.x,-p.z*sign(un.y)):(an.x>=an.z?vec2(-p.z*sign(un.x),p.y):vec2(p.x*sign(un.z),p.y));
  ${THREE.ShaderChunk.map_fragment.replaceAll('vMapUv','ultraUv')}`);
 if(kind==='concrete'||kind==='frost'){
  // Millimetre-width slab joints, filtered at distance; no decal geometry.
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 slabPosition=(vUltraPosition.xz+vec2(21.0,22.5))/4.5;
   vec2 seamDistance=abs(fract(slabPosition+0.5)-0.5)*4.5;
   vec2 seamAA=max(fwidth(vUltraPosition.xz)*0.8,vec2(0.002));
   vec2 joint=vec2(1.0)-smoothstep(vec2(0.004),vec2(0.004)+seamAA,seamDistance);
   float slabJoint=max(joint.x,joint.y)*step(0.85,abs(normalize(vUltraNormal).y));
   float finishVariation=sin(vUltraPosition.x*0.29+sin(vUltraPosition.z*0.17))*sin(vUltraPosition.z*0.23);
   diffuseColor.rgb*=1.0-0.13*slabJoint+0.018*finishVariation;`);
 }
 for(const chunk of ['roughnessmap_fragment','normal_fragment_begin','normal_fragment_maps'])shader.fragmentShader=shader.fragmentShader.replace(`#include <${chunk}>`,THREE.ShaderChunk[chunk].replaceAll('vRoughnessMapUv','ultraUv').replaceAll('vNormalMapUv','ultraUv'));
}

const profiles={
 concrete:{surface:'concrete',roughness:.78,normal:.16,tile:3.5,color:'#d2d5d2'},
 frost:{surface:'concrete',roughness:.89,normal:.20,tile:3.5,color:'#d8e6ed'},
 wall:{surface:'wall',roughness:.91,normal:.14,tile:2.5},
 wood:{surface:'wood',roughness:1,normal:.45,color:'#e7d2ad'},
 carton:{surface:'carton',roughness:1,normal:.28},
 metal:{surface:'metal',roughness:.8,normal:.18,metalness:.88},
 paint:{surface:'paint',roughness:.88,normal:.22,metalness:.06},
 panel:{surface:'panel',roughness:.80,normal:.16,metalness:0,tile:1.15},
 pvc:{surface:'pvc',roughness:.94,normal:.18,metalness:0},
 rubber:{surface:'rubber',roughness:1,normal:.48,metalness:0},
 fabric:{surface:'fabric',roughness:1,normal:.48,metalness:0},
 skin:{surface:'skin',roughness:1,normal:.10,metalness:0},
 tape:{surface:'tape',roughness:1,normal:.12,metalness:0},
 glass:{roughness:.13,metalness:0,color:'#c9dcdf'}
};

export function createUltraDetail({scene,renderer,ao,sun,materials,onChange}){
 const records=[],seen=new Set(),surfaces=new Map();let enabled=false,generated=false,loaded=false,pending;
 const anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 const hemi=scene.children.find(o=>o.isHemisphereLight);
 const base={environment:scene.environmentIntensity,radius:ao.kernelRadius,min:ao.minDistance,max:ao.maxDistance,bias:sun.shadow.normalBias,hemi:hemi?.intensity,sun:sun.intensity};
 const add=(material,kind)=>{if(!material||seen.has(material))return;seen.add(material);records.push({material,kind,original:{map:material.map,normalMap:material.normalMap,roughnessMap:material.roughnessMap,roughness:material.roughness,metalness:material.metalness,normalScale:material.normalScale.clone(),color:material.color.clone(),envMapIntensity:material.envMapIntensity,onBeforeCompile:material.onBeforeCompile,customProgramCacheKey:material.customProgramCacheKey}});};
 for(const [material,kind] of materials)add(material,kind);
 scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.userData.ultraSurface)add(m,m.userData.ultraSurface);});
 function generate(){
  if(pending)return pending;generated=true;
  pending=(async()=>{
   const required=new Set(records.map(r=>profiles[r.kind].surface).filter(Boolean));
   await Promise.all([...required].map(async kind=>surfaces.set(kind,photographs[kind]?await photographic(kind,anisotropy):manufactured(kind,kind==='carton'?1024:512,anisotropy))));
   loaded=true;
  })();return pending;
 }
 function updateMaterials(){
  for(const {material:m,kind,original:o} of records){
   if(enabled){
    const p=profiles[kind];if(p.surface)Object.assign(m,surfaces.get(p.surface));
    m.normalScale.setScalar(p.normal??0);m.roughness=p.roughness;m.metalness=p.metalness??0;
    if(p.color)m.color.set(p.color);else if(['paint','pvc','fabric'].includes(kind)){const hsl={};o.color.getHSL(hsl);m.color.setHSL(hsl.h,hsl.s*.80,hsl.l);}
    m.envMapIntensity=kind==='metal'?1.25:1;
    if(p.tile){m.onBeforeCompile=shader=>{o.onBeforeCompile.call(m,shader,renderer);projectSurface(shader,p.tile,kind);};m.customProgramCacheKey=()=>`ultra-metres-${kind}-v3`;}
   }else{Object.assign(m,o);m.normalScale=o.normalScale.clone();m.color=o.color.clone();}
   m.needsUpdate=true;
  }
 }
 function apply(quality){
  const next=quality==='Ultra';if(next===enabled)return;enabled=next;
  if(enabled){if(loaded)updateMaterials();else generate().then(()=>{if(enabled)updateMaterials();});}else updateMaterials();
  scene.environmentIntensity=enabled?.52:base.environment;
  // Less ambient fill preserves form; dielectric paint avoids toy-like metal.
  if(hemi)hemi.intensity=enabled?.85:base.hemi;sun.intensity=enabled?2.55:base.sun;
  ao.kernelRadius=enabled?4.5:base.radius;ao.minDistance=enabled?.00015:base.min;ao.maxDistance=enabled?.005:base.max;
  sun.shadow.normalBias=enabled?.018:base.bias;sun.shadow.needsUpdate=true;
  if(!enabled)for(const maps of surfaces.values())for(const t of Object.values(maps)){t.dispose();t.needsUpdate=true;}
  onChange?.(enabled,anisotropy);
 }
 return {apply,ready:()=>pending??Promise.resolve(),state:()=>({enabled,generated,loaded,materials:records.length,textureSize:enabled?1024:512,anisotropy:enabled?anisotropy:0,sharedTextures:surfaces.size*3,photographicSurfaces:Object.keys(photographs),metreScaledMaterials:records.filter(r=>profiles[r.kind].tile).length})};
}
