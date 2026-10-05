// Original 124 BPM electronic tour score and rapid-door motor/air effects.
// No downloads; the AudioContext is created only after a user gesture.
export function createTourAudio({tr,onLanguage,contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)()}){
 const button=document.getElementById('soundToggle');
 let context,master,musicBus,effectsBus,noise,muted=false,active=false,paused=false,running=false,timer;
 let beat=0,nextBeat=0,doorSounds=0,lastEffect=-Infinity;
 const voices=new Set(),previousDoors=new Map(),doorCooldown=new Map();
 const chords=[[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,59]];
 const frequency=midi=>440*2**((midi-69)/12);
 function refresh(){const label=tr(muted?'Unmute sound':'Mute sound');button.classList.toggle('muted',muted);button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',label);button.title=label;}
 function track(source,nodes){
  voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
 }
 function tone(midi,start,duration,volume,type='triangle'){
  const source=context.createOscillator(),envelope=context.createGain();source.type=type;source.frequency.value=frequency(midi);
  envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(volume,start+.009);envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(envelope);envelope.connect(musicBus);track(source,[envelope]);source.start(start);source.stop(start+duration+.02);
 }
 function kick(start){
  const source=context.createOscillator(),envelope=context.createGain();
  source.frequency.setValueAtTime(145,start);source.frequency.exponentialRampToValueAtTime(46,start+.14);
  envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(.5,start+.004);envelope.gain.exponentialRampToValueAtTime(.0001,start+.32);
  source.connect(envelope);envelope.connect(musicBus);track(source,[envelope]);source.start(start);source.stop(start+.34);
 }
 function percussion(start,snare=false){
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain();
  source.buffer=noise;filter.type=snare?'bandpass':'highpass';filter.frequency.value=snare?1900:7200;filter.Q.value=snare?.7:.5;
  const duration=snare?.17:.055;
  envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(snare?.3:.105,start+.003);envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(filter);filter.connect(envelope);envelope.connect(musicBus);track(source,[filter,envelope]);source.start(start);source.stop(start+duration+.01);
  if(snare)tone(50,start,.13,.10,'sine');
 }
 function schedule(){
  if(!running||context.state!=='running')return;
  // Do not catch up a throttled background timer with a burst of notes.
  if(nextBeat<context.currentTime-.2)nextBeat=context.currentTime+.04;
  while(nextBeat<context.currentTime+.3){
   const chord=chords[Math.floor(beat/16)%chords.length],step=beat%16;
   if(beat%2===0)kick(nextBeat);
   if(beat%4===2)percussion(nextBeat,true);
   percussion(nextBeat+.015);
   // Off-beat bass and chord stabs leave room for the kick and door effect.
   if(beat%2===1){tone(chord[0]-12,nextBeat,.22,.22);chord.slice(1).forEach(note=>tone(note,nextBeat,.27,.042));}
   if(![3,7,14].includes(step))tone(chord[[0,2,1,3,2,1,3,2][step%8]]+12,nextBeat,.24,step%4===0?.11:.075);
   beat++;nextBeat+=60/124/2;
  }
 }
 function reconcile(){
  const wanted=!!(context&&context.state==='running'&&active&&!paused&&!muted&&!document.hidden);
  if(wanted===running)return;
  running=wanted;clearInterval(timer);
  const now=context.currentTime;
  master.gain.cancelScheduledValues(now);master.gain.setTargetAtTime(wanted?.85:0,now,.025);
  if(wanted){beat=0;nextBeat=now+.03;schedule();timer=setInterval(schedule,120);}
  else for(const source of voices){try{source.stop(now+.08);}catch{ /* Already ended. */ }}
 }
 async function unlock(){
  // Programmatic tours should not bypass browser autoplay policy.
  if(!navigator.userActivation?.isActive)return;
  try{
   if(!context){
    context=contextFactory();master=context.createGain();master.gain.value=0;master.connect(context.destination);
    musicBus=context.createGain();musicBus.connect(master);effectsBus=context.createGain();effectsBus.connect(master);
    noise=context.createBuffer(1,Math.ceil(context.sampleRate*.55),context.sampleRate);
    const samples=noise.getChannelData(0);let seed=931;for(let i=0;i<samples.length;i++){seed=(1664525*seed+1013904223)>>>0;samples[i]=seed/2147483648-1;}
    context.onstatechange=reconcile;
   }
   await context.resume();reconcile();
  }catch{ /* Web Audio unavailable or blocked: the tour still works. */ }
 }
 function syncTour(isActive,isPaused){active=isActive;paused=isPaused;reconcile();}
 function doorOpening(door,camera){
  if(!running)return;
  const now=context.currentTime,dx=door.x-21-camera.x,dz=door.z-22.5-camera.z,distance=Math.hypot(dx,dz,2-camera.y);
  if(distance>=24||now-(doorCooldown.get(door.id)??-Infinity)<1.1||now-lastEffect<.14)return;
  doorCooldown.set(door.id,now);lastEffect=now;doorSounds++;
  const start=now+.005,volume=.4*(1-distance/24)**2;
  // Briefly duck the music so a nearby opening stays distinct above the beat.
  musicBus.gain.cancelScheduledValues(now);musicBus.gain.setTargetAtTime(.5,now,.018);musicBus.gain.setTargetAtTime(1,now+.48,.13);
  const air=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain();
  air.buffer=noise;filter.type='bandpass';filter.frequency.setValueAtTime(1700,start);filter.frequency.exponentialRampToValueAtTime(650,start+.48);filter.Q.value=.7;
  envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(volume,start+.045);envelope.gain.exponentialRampToValueAtTime(.0001,start+.52);
  air.connect(filter);filter.connect(envelope);envelope.connect(effectsBus);track(air,[filter,envelope]);air.start(start);air.stop(start+.54);
  const motor=context.createOscillator(),motorGain=context.createGain();motor.type='triangle';motor.frequency.setValueAtTime(115,start);motor.frequency.exponentialRampToValueAtTime(230,start+.15);motor.frequency.exponentialRampToValueAtTime(95,start+.48);
  motorGain.gain.setValueAtTime(0,start);motorGain.gain.linearRampToValueAtTime(volume*.32,start+.04);motorGain.gain.exponentialRampToValueAtTime(.0001,start+.5);
  motor.connect(motorGain);motorGain.connect(effectsBus);track(motor,[motorGain]);motor.start(start);motor.stop(start+.53);
 }
 function updateDoors(doors,camera,continuous=true){
  for(const d of doors){
   const old=previousDoors.get(d.id),opening=!!old&&d.open>old.open+.00001;
   if(continuous&&opening&&!old.opening)doorOpening(d,camera);
   previousDoors.set(d.id,{open:d.open,opening:continuous&&opening});
  }
 }
 button.onclick=()=>{muted=!muted;unlock();reconcile();refresh();};
 // Capture runs within the click gesture, before any tour lifecycle changes.
 document.addEventListener('click',e=>{if(e.target.closest('#headerTour,#tourLaunch,#autoTour,#compactPause'))unlock();},true);
 document.addEventListener('visibilitychange',()=>{
  reconcile();if(!document.hidden&&context&&active&&!paused&&!muted)context.resume().then(reconcile).catch(()=>{});
 });
 onLanguage(refresh);refresh();
 return {syncTour,updateDoors,state:()=>({available:!!(window.AudioContext||window.webkitAudioContext),unlocked:!!context,context:context?.state||'locked',muted,playing:running,voices:voices.size,doorSounds})};
}
