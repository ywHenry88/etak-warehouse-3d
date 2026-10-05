// Thin condensation plumes, confined to the two −18°C rooms.
export function createColdMist(THREE,world){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,2,64,64,62);
 gradient.addColorStop(0,'rgba(245,252,255,.65)');gradient.addColorStop(.45,'rgba(225,241,251,.25)');gradient.addColorStop(1,'rgba(225,241,251,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const texture=new THREE.CanvasTexture(canvas),group=new THREE.Group();world.add(group);
 const plumes=[];
 for(let i=0;i<44;i++){
  const material=new THREE.SpriteMaterial({map:texture,color:0xf4fbff,transparent:true,opacity:.12,depthWrite:false});
  const sprite=new THREE.Sprite(material);group.add(sprite);
  const north=i<28,j=north?i:i-28;
  plumes.push({sprite,x:north?5.5+(j%7)*3.6:6+(j%6)*3.8,z:north?(j<14?2.1:11.6):25.6,phase:i*1.618,high:j%2===0});
 }
 function update(time){for(const p of plumes){const cycle=(time*.09+p.phase)%1,fade=Math.sin(cycle*Math.PI),drift=Math.sin(time*.16+p.phase);p.sprite.position.set(p.x+drift*.45,(p.high?4.3:.45)+cycle*.8,p.z+Math.cos(time*.12+p.phase)*.35);p.sprite.scale.set(1.6+cycle*1.8,.6+cycle*.9,1);p.sprite.material.opacity=fade*(p.high?.11:.16);}}
 update(0);return {update,count:plumes.length};
}
