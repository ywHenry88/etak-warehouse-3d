// Soft condensation particles confined to the two -18 C rooms.
export function createColdMist(THREE,world){
 const textures=Array.from({length:4},(_,variant)=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const u=(x-63.5)/63.5,v=(y-63.5)/63.5;
   // Irregular lobes, with an exactly transparent outer border.
   const r=Math.hypot(u,v/.76),edge=Math.max(0,1-r*r);
   const billow=.68+.17*Math.sin(u*9+variant*1.7+Math.sin(v*7))+.15*Math.cos(v*11-u*4+variant);
   const i=(y*128+x)*4;
   pixels.data[i]=242;pixels.data[i+1]=250;pixels.data[i+2]=255;
   pixels.data[i+3]=Math.round(255*.86*edge*edge*billow);
  }
  ctx.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
 });
 const group=new THREE.Group();group.name='Cold condensation';world.add(group);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3));
 const plumes=[];
 for(let i=0;i<64;i++){
  const north=i<40,j=north?i:i-40,high=j%2===0;
  const material=new THREE.PointsMaterial({map:textures[i%4],color:0xf4fbff,transparent:true,opacity:0,depthWrite:false,depthTest:true,sizeAttenuation:true,toneMapped:false});
  // SSAOPass excludes Points from its opaque normal/depth override. Sprites
  // become solid rectangles there even with a transparent color map.
  const particle=new THREE.Points(geometry,material);particle.frustumCulled=false;group.add(particle);
  plumes.push({particle,x:north?5.5+(j%8)*3.1:6+(j%6)*3.8,z:north?(j<16?2.3:11.6):25.6,phase:i*.61803398875,high});
 }
 function update(time){for(const p of plumes){
  const cycle=(time*.085+p.phase)%1,fade=Math.sin(cycle*Math.PI),drift=Math.sin(time*.19+p.phase*6);
  p.particle.position.set(p.x+drift*.5,(p.high?4.65:.65)+cycle*.85,p.z+Math.cos(time*.15+p.phase*5)*.35);
  p.particle.material.size=(p.high?2.3:1.8)+cycle*1.4;
  p.particle.material.opacity=fade*(p.high?.48:.40);
 }}
 update(0);return {update,count:plumes.length,group};
}
