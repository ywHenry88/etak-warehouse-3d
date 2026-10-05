// Measure real animation-frame intervals, independently of simulation speed.
export function createPerformance({renderer,composer,ao,smaa,sun,tr}){
 const compact=matchMedia('(pointer:coarse)').matches||innerWidth<700;
 const profiles=[{name:'Eco',ratio:.75,shadow:0,ao:false},{name:'Balanced',ratio:1,shadow:1024,ao:false},{name:'High',ratio:1.35,shadow:2048,ao:true}];
 let level=compact?1:2,last=null,start=null,frames=0,fps=0,slow=0,fast=0,cooldown=0,ratio=1,triangles=0,calls=0;
 const badge=document.createElement('output');badge.id='fpsDisplay';badge.textContent='— FPS';badge.setAttribute('aria-label','Frames per second');document.body.append(badge);
 const style=document.createElement('style');style.textContent='#fpsDisplay{position:fixed;right:30px;top:69px;z-index:4;padding:4px 8px;border-radius:5px;background:#12232ddd;color:#c7dce5;font:11px/1.4 ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;pointer-events:none}@media(max-width:700px){#fpsDisplay{right:16px;top:56px;font-size:10px}}';document.head.append(style);
 function apply(){
  const profile=profiles[level];ratio=Math.min(devicePixelRatio||1,profile.ratio);
  renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);
  renderer.shadowMap.enabled=profile.shadow>0;ao.enabled=profile.ao;smaa.enabled=level>0;
  if(profile.shadow&&sun.shadow.mapSize.x!==profile.shadow){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(profile.shadow,profile.shadow);}
  renderer.shadowMap.needsUpdate=true;slow=fast=0;
 }
 function reset(){last=start=null;frames=0;slow=fast=0;}
 document.addEventListener('visibilitychange',reset);
 function update(stamp){
  if(document.hidden){reset();return;}
  if(start===null){start=last=stamp;return;}
  if(stamp-last>1500){reset();return;}last=stamp;frames++;
  const elapsed=stamp-start;if(elapsed<1500)return;
  fps=frames*1000/elapsed;triangles=renderer.info.render.triangles;calls=renderer.info.render.calls;
  badge.textContent=`${Math.round(fps)} FPS · ${(1000/fps).toFixed(1)} ms`;
  badge.setAttribute('aria-label',`${Math.round(fps)} ${tr('Frames per second')}`);
  if(stamp>cooldown){
   slow=fps<38?slow+1:0;fast=fps>57?fast+1:0;
   if(slow>=2&&level>0){level--;apply();cooldown=stamp+10000;}
   else if(fast>=8&&level<(compact?1:2)){level++;apply();cooldown=stamp+15000;}
  }
  start=stamp;frames=0;
 }
 apply();renderer.info.autoReset=false;
 return {update,state:()=>({fps,frameMs:fps?1000/fps:0,quality:profiles[level].name,pixelRatio:ratio,triangles,drawCalls:calls})};
}
