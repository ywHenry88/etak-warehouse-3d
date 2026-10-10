// Measure real animation-frame intervals, independently of simulation speed.
export function createPerformance({renderer,composer,ao,smaa,sun,tr,onQualityChange,onLanguage}){
 const compact=matchMedia('(pointer:coarse)').matches||innerWidth<700;
 const profiles=[{name:'Eco',ratio:.75,shadow:0,ao:false},{name:'Balanced',ratio:1,shadow:1024,ao:false},{name:'High',ratio:1.35,shadow:2048,ao:true},{name:'Ultra',ratio:2,shadow:4096,ao:true}];
 let mode='Auto',level=compact?1:2,last=null,start=null,frames=0,fps=0,slow=0,fast=0,ultraReady=0,cooldown=0,ratio=1,triangles=0,calls=0;
 const container=document.createElement('div');container.id='qualityControl';
 const select=document.createElement('select');select.id='qualitySelect';
 for(const name of ['Auto','Ultra','High','Balanced','Eco']){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);}
 const badge=document.createElement('output');badge.id='fpsDisplay';container.append(select,badge);document.body.append(container);
 const style=document.createElement('style');style.textContent='#qualityControl{position:fixed;right:30px;top:69px;z-index:4;display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:5px;background:#12232ddd;color:#c7dce5;font:11px/1.4 ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums}#fpsDisplay{pointer-events:none}#qualitySelect{font:inherit;color:#edf2f3;background:#233742;border:1px solid #ffffff30;border-radius:4px;padding:3px;min-height:28px;cursor:pointer}#qualitySelect:focus-visible{outline:2px solid #f5c774;outline-offset:2px}@media(max-width:700px){#qualityControl{right:12px;top:56px;font-size:10px;gap:4px}#qualitySelect{min-height:28px}}';document.head.append(style);
 function refresh(){
  select.setAttribute('aria-label',tr('Rendering quality'));select.title=tr('Auto adjusts quality to FPS. Manual selection stays fixed.');
  select.options[0].textContent=tr('Auto');select.value=mode;
  badge.textContent=fps?`${Math.round(fps)} FPS · ${(1000/fps).toFixed(1)} ms · ${profiles[level].name}`:`— FPS · ${profiles[level].name}`;
  badge.setAttribute('aria-label',`${Math.round(fps)} ${tr('Frames per second')} · ${profiles[level].name}`);
 }
 function apply(){
  const profile=profiles[level];ratio=Math.min(Math.max(devicePixelRatio||1,level===3?1.5:1),profile.ratio);
  renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);
  renderer.shadowMap.enabled=profile.shadow>0;ao.enabled=profile.ao;smaa.enabled=level>0;
  if(profile.shadow&&sun.shadow.mapSize.x!==profile.shadow){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(profile.shadow,profile.shadow);}
  renderer.shadowMap.needsUpdate=true;slow=fast=ultraReady=0;
  onQualityChange?.(profile.name);
  refresh();
 }
 function reset(){last=start=null;frames=0;slow=fast=ultraReady=0;}
 function setQuality(value){
  const index=profiles.findIndex(p=>p.name===value);
  if(value!=='Auto'&&index<0)return false;
  if(value===mode)return true;
  mode=value;level=mode==='Auto'?(compact?1:2):index;cooldown=0;reset();apply();return true;
 }
 select.onchange=()=>setQuality(select.value);onLanguage?.(refresh);
 document.addEventListener('visibilitychange',reset);
 function update(stamp){
  if(document.hidden){reset();return;}
  if(start===null){start=last=stamp;return;}
  if(stamp-last>1500){reset();return;}last=stamp;frames++;
  const elapsed=stamp-start;if(elapsed<1500)return;
  fps=frames*1000/elapsed;triangles=renderer.info.render.triangles;calls=renderer.info.render.calls;
  // Two consecutive 1.5-second samples prevent one fast frame triggering Ultra.
  // Test actual performance on every device, including fast phones/tablets.
  slow=mode==='Auto'&&fps<(level===3?60:38)?slow+1:0;
  if(mode==='Auto'&&stamp>cooldown){
   fast=fps>57?fast+1:0;ultraReady=fps>80?ultraReady+1:0;
   if(ultraReady>=2&&level<3){level=3;apply();cooldown=stamp+15000;}
   else if(fast>=8&&level<(compact?1:2)){level++;apply();cooldown=stamp+15000;}
  }
  // Downshifts remain available during the upgrade cooldown if Ultra is costly.
  if(slow>=2&&level>0){level--;apply();cooldown=stamp+15000;}
  refresh();
  start=stamp;frames=0;
 }
 apply();renderer.info.autoReset=false;
 return {update,setQuality,state:()=>({mode,fps,frameMs:fps?1000/fps:0,quality:profiles[level].name,pixelRatio:ratio,triangles,drawCalls:calls})};
}
