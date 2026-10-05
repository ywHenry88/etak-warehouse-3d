// One GPU particle batch: soft condensation with no opaque SSAO rectangles.
export function createColdMist(THREE,world){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const u=(x-63.5)/63.5,v=(y-63.5)/63.5,edge=Math.max(0,1-u*u-v*v);
  const cloud=.7+.16*Math.sin(u*8+Math.sin(v*6))+.14*Math.cos(v*10-u*3),i=(y*128+x)*4;
  pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(255*edge*edge*cloud);
 }
 ctx.putImageData(pixels,0,0);
 const texture=new THREE.CanvasTexture(canvas),count=48,positions=[],seeds=[],sizes=[];
 // Interleave both rooms so the reduced mobile count still covers both zones.
 for(let i=0;i<count;i++){
  const north=i%2===0,j=Math.floor(i/2),high=j%2===0;
  positions.push(6+(j%6)*4.0,high?4.75:.65,north?(j<12?2.8:11.6):25.6);
  seeds.push(i*.61803398875);sizes.push(high?2.55:2.0);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.Float32BufferAttribute(seeds,1));geometry.setAttribute('puffSize',new THREE.Float32BufferAttribute(sizes,1));
 const material=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
  uniforms:{map:{value:texture},time:{value:0},pointScale:{value:400},pointLimit:{value:180}},
  vertexShader:`
   attribute float seed;attribute float puffSize;
   uniform float time;uniform float pointScale;uniform float pointLimit;
   varying float opacity;varying float angle;
   void main(){
    float cycle=fract(time*.075+seed);
    vec3 p=position+vec3(sin(time*.17+seed*6.)*.38,cycle*.65,cos(time*.13+seed*5.)*.28);
    vec4 mv=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=min(pointLimit,(puffSize+cycle*.8)*pointScale/max(.1,-mv.z));
    opacity=sin(cycle*3.14159265)*.34*smoothstep(.5,2.,-mv.z);
    angle=sin(time*.08+seed)*.35;
   }`,
  fragmentShader:`
   uniform sampler2D map;varying float opacity;varying float angle;
   void main(){
    vec2 p=gl_PointCoord-.5;float c=cos(angle),s=sin(angle);
    vec2 uv=mat2(c,-s,s,c)*p+.5;
    if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))discard;
    float alpha=texture2D(map,uv).a*opacity;
    if(alpha<.002)discard;
    gl_FragColor=vec4(.89,.95,1.,alpha);
    #include <colorspace_fragment>
   }`
 });
 const particles=new THREE.Points(geometry,material);particles.name='Frozen room condensation';particles.frustumCulled=false;world.add(particles);
 const size=new THREE.Vector2();
 function update(time,renderer,camera,quality='High'){
  renderer.getDrawingBufferSize(size);material.uniforms.time.value=time;
  material.uniforms.pointScale.value=size.y*.5*camera.projectionMatrix.elements[5];
  material.uniforms.pointLimit.value=180*renderer.getPixelRatio();
  geometry.setDrawRange(0,quality==='Eco'?24:count);
 }
 return {update,count,particles};
}
