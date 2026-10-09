import * as THREE from 'three';

// Shared, tileable PBR surfaces, generated only on the first Ultra promotion.
// Colour is sRGB; normal and roughness maps deliberately remain linear data.
function surface(kind,size,repeat,anisotropy){
 const count=size*size,height=new Float32Array(count),colour=new Uint8ClampedArray(count*4),rough=new Uint8ClampedArray(count*4),normal=new Uint8ClampedArray(count*4);
 let seed=739+kind.length*137;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const grids=[8,32,128].map(n=>({n,data:Float32Array.from({length:n*n},random)}));
 function noise(x,y,g){const u=x/size*g.n,v=y/size*g.n,ix=Math.floor(u),iy=Math.floor(v),a=u-ix,b=v-iy,s=a*a*(3-2*a),t=b*b*(3-2*b),at=(dx,dy)=>g.data[((iy+dy)%g.n)*g.n+(ix+dx)%g.n];return (at(0,0)*(1-s)+at(1,0)*s)*(1-t)+(at(0,1)*(1-s)+at(1,1)*s)*t;}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,k=i*4,a=noise(x,y,grids[0]),b=noise(x,y,grids[1]),c=noise(x,y,grids[2]),grain=random();
  let h=.5,v=230,r=.8;
  if(kind==='concrete'){h=a*.45+b*.35+c*.17+grain*.03;v=213+a*21+b*13+grain*5;r=.68+b*.2;}
  if(kind==='wood'){const wave=Math.sin(y/size*Math.PI*2*72+Math.sin(x/size*Math.PI*8)*1.6+b*3);h=.5+wave*.17+c*.11;v=215+wave*13+b*20;r=.70+c*.24;}
  if(kind==='carton'){h=.4+grain*.15+c*.15;v=231+grain*12+b*7;r=.82+grain*.15;}
  if(kind==='frost'){h=a*.2+b*.24+c*.22+grain*.12;v=230+a*10+c*13;r=.55+b*.22+grain*.08;}
  if(kind==='metal'){h=.5+Math.sin(y/size*Math.PI*2*170)*.012+grain*.025;v=248;r=.73+b*.15;}
  if(kind==='fabric'){h=.5+.10*Math.sin(x/size*Math.PI*2*120)*Math.sin(y/size*Math.PI*2*120)+grain*.06;v=244;r=.90+grain*.09;}
  height[i]=h;colour[k]=colour[k+1]=colour[k+2]=v;colour[k+3]=255;
  rough[k]=rough[k+1]=rough[k+2]=Math.round(r*255);rough[k+3]=255;
 }
 const strength=kind==='wood'?1.8:kind==='fabric'?.8:kind==='metal'?.3:1.3;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const k=(y*size+x)*4,dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*strength,dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*strength,inv=1/Math.hypot(dx,dy,1);
  normal[k]=Math.round((-.5*dx*inv+.5)*255);normal[k+1]=Math.round((.5*dy*inv+.5)*255);normal[k+2]=Math.round((.5*inv+.5)*255);normal[k+3]=255;
 }
 function texture(data,srgb=false){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').putImageData(new ImageData(data,size,size),0,0);const t=new THREE.CanvasTexture(canvas);t.name=`Ultra ${kind} ${srgb?'colour':'data'}`;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=anisotropy;return t;}
 return {map:texture(colour,true),normalMap:texture(normal),roughnessMap:texture(rough)};
}

export function createUltraDetail({scene,renderer,ao,sun,materials,onChange}){
 const records=[],seen=new Set(),surfaces=new Map();let enabled=false,generated=false;
 const anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 const base={environment:scene.environmentIntensity,radius:ao.kernelRadius,min:ao.minDistance,max:ao.maxDistance,bias:sun.shadow.normalBias};
 const add=(material,kind)=>{if(!material||seen.has(material))return;seen.add(material);records.push({material,kind,original:{map:material.map,normalMap:material.normalMap,roughnessMap:material.roughnessMap,roughness:material.roughness,metalness:material.metalness,normalScale:material.normalScale.clone(),envMapIntensity:material.envMapIntensity}});};
 for(const [material,kind] of materials)add(material,kind);
 scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.userData.ultraSurface)add(m,m.userData.ultraSurface);});
 function generate(){
  if(generated)return;
  for(const [kind,size,repeat] of [['concrete',1024,[12,12]],['wood',1024,[1,1]],['carton',1024,[1,1]],['frost',1024,[1,1]],['metal',512,[1,1]],['fabric',512,[1,1]]])surfaces.set(kind,surface(kind,size,repeat,anisotropy));
  generated=true;
 }
 function apply(quality){
  const next=quality==='Ultra';if(next===enabled)return;enabled=next;
  if(enabled)generate();
  for(const {material:m,kind,original:o} of records){
   if(enabled){
    const s=surfaces.get(kind);m.map=['metal','fabric'].includes(kind)?o.map:s.map;m.normalMap=s.normalMap;m.roughnessMap=s.roughnessMap;
    m.normalScale.setScalar(kind==='concrete'?.35:kind==='frost'?.22:kind==='wood'?.48:kind==='fabric'?.3:.18);
    m.roughness=kind==='concrete'?.8:kind==='frost'?.86:kind==='metal'?Math.max(.28,o.roughness*.9):1;
    m.envMapIntensity=kind==='metal'?1.12:o.envMapIntensity;
   }else{Object.assign(m,o);m.normalScale=o.normalScale.clone();}
   m.needsUpdate=true;
  }
  scene.environmentIntensity=enabled?.48:base.environment;
  ao.kernelRadius=enabled?4.5:base.radius;ao.minDistance=enabled?.00015:base.min;ao.maxDistance=enabled?.005:base.max;
  sun.shadow.normalBias=enabled?.018:base.bias;sun.shadow.needsUpdate=true;
  // Release GPU allocations after a downgrade; retain canvases for cheap re-entry.
  if(!enabled)for(const maps of surfaces.values())for(const t of Object.values(maps)){t.dispose();t.needsUpdate=true;}
  onChange?.(enabled,anisotropy);
 }
 return {apply,state:()=>({enabled,generated,materials:records.length,textureSize:enabled?1024:512,anisotropy:enabled?anisotropy:0,sharedTextures:generated?surfaces.size*3:0})};
}
