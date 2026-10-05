// Surface finishes and fixed lighting keep the frozen rooms clear to walk through.
export function createColdAppearance(THREE){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#c2d5df';ctx.fillRect(0,0,256,256);
 let seed=18;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<6000;i++){
  const shade=215+Math.floor(random()*40);ctx.fillStyle=`rgba(${shade},${shade},255,${.08+random()*.24})`;
  const size=.4+random()*1.3;ctx.fillRect(random()*256,random()*256,size,size);
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 const floor=new THREE.MeshStandardMaterial({color:'#c4dbe8',map:texture,roughness:.86,metalness:.02});
 const carton=new THREE.MeshStandardMaterial({color:'#e1edf3',map:texture,roughness:.92});
 const light=new THREE.MeshStandardMaterial({color:'#d5f1ff',emissive:'#aedfff',emissiveIntensity:2});
 function install({world,doors,box,M}){
  const group=new THREE.Group();group.name='Frozen room lighting and temperature displays';world.add(group);
  // Downward, short-range lights stay within the frozen rooms; no global tint.
  for(const [x,z] of [[10,11.6],[24,11.6],[10,25.6],[24,27]]){
   const lamp=new THREE.SpotLight(0xb8dfff,36,8,Math.PI*.30,.75,1.5);
   lamp.position.set(x,6.65,z);lamp.target.position.set(x,0,z);group.add(lamp,lamp.target);
  }
  const display=document.createElement('canvas');display.width=768;display.height=256;
  const g=display.getContext('2d');g.fillStyle='#102e40';g.fillRect(0,0,768,256);
  g.strokeStyle='#a9e3ff';g.lineWidth=6;g.lineCap='round';
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3,dx=Math.cos(a),dy=Math.sin(a);g.beginPath();g.moveTo(105,128);g.lineTo(105+dx*62,128+dy*62);
   for(const side of [-1,1]){g.moveTo(105+dx*38,128+dy*38);g.lineTo(105+dx*24-dy*side*17,128+dy*24+dx*side*17);}g.stroke();
  }
  g.fillStyle='#d8f4ff';g.font='600 132px "Segoe UI",Arial';g.textBaseline='middle';g.fillText('−18°C',215,137);
  g.fillStyle='#79b9d8';g.fillRect(30,230,708,4);
  const map=new THREE.CanvasTexture(display);map.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.MeshBasicMaterial({map,toneMapped:false});
  for(const id of ['w2-w1','frozen-link','cold-link']){
   const door=doors.find(d=>d.id===id);
   for(const side of [-1,1]){
    const mount=new THREE.Group();mount.position.set(door.x,door.base,door.z);mount.rotation.y=door.ry;group.add(mount);
    box(mount,M.dark,0,5.3,side*.16,2.55,.91,.09);
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.8),screen);panel.position.set(0,5.3,side*.215);panel.rotation.y=side<0?Math.PI:0;mount.add(panel);
   }
  }
  return {style:'frost-and-cool-light',temperature:-18,lights:4,displays:6};
 }
 return {floor,carton,light,install};
}
