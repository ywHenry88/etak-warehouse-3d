// A* plans against the model's actual walls, stock, door apertures and floor levels.
export function createTour({walk,canPlan,canYield,canStep,moveTo,face,begin,doorRequest,tr}){
 const stops=[['South rack aisle',27.8,39.95],['Southwest staging',9,39.7],['South dispatch entrance',39.5,40],['South ramp / C17',40.7,46.1],['Indoor truck apron',57,24],['North ramp / C16',40.7,-.55],['North dispatch lobby',38.6,5.1],['North freezer',25,11.6],['North freezer cross aisle',18.5,11.6],['W2 chilled area, north',36.2,16.5],['Chilled room, north',36.4,24.9],['Frozen room, east',26.6,27.0],['Chilled room, south',36.4,32.8],['South rack aisle',27.8,39.95]];
 let active=false,index=1,path=[],pathIndex=0,pause=false,dwell=0,replan=0,status='Start auto tour',visited=[],blocked=0,yielding=false,yields=0;
 const cell=.3,xMin=.3,zMin=-1.5,nx=210,nz=164;
 const point=id=>({x:xMin+(id%nx)*cell,z:zMin+Math.floor(id/nx)*cell});
 const node=(x,z)=>Math.round((z-zMin)/cell)*nx+Math.round((x-xMin)/cell);
 function clearSegment(a,b){
  if(!canStep(a.x,a.z,b.x,b.z))return false;
  const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.06));
  for(let i=1;i<=count;i++)if(!canPlan(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count))return false;
  return true;
 }
 function smooth(points){
  const result=[];let anchor={x:walk.x,z:walk.z},i=0;
  while(i<points.length){let next=points.length-1;while(next>i&&!clearSegment(anchor,points[next]))next--;result.push(points[next]);anchor=points[next];i=next+1;}
  return result;
 }
 function lookAhead(){
  let remaining=2.2,from={x:walk.x,z:walk.z};
  for(let i=pathIndex;i<path.length;i++){const to=path[i],length=Math.hypot(to.x-from.x,to.z-from.z);if(length>=remaining)return {x:from.x+(to.x-from.x)*remaining/length,z:from.z+(to.z-from.z)*remaining/length};remaining-=length;from=to;}
  return from;
 }
 function plan(target,refuge=false){
  const start=node(walk.x,walk.z),goal=node(target[1],target[2]),end=point(goal),open=[],cost=new Map([[start,0]]),came=new Map(),closed=new Set(),cache=new Map();
  const valid=id=>{if(!cache.has(id)){const p=point(id);cache.set(id,canPlan(p.x,p.z));}return cache.get(id);};
  const push=(id,f)=>{open.push({id,f});let i=open.length-1;while(i){const p=(i-1)>>1;if(open[p].f<=f)break;[open[p],open[i]]=[open[i],open[p]];i=p;}};
  const pop=()=>{const r=open[0],last=open.pop();if(open.length){open[0]=last;let i=0;while(true){let j=i*2+1;if(j>=open.length)break;if(j+1<open.length&&open[j+1].f<open[j].f)j++;if(open[i].f<=open[j].f)break;[open[i],open[j]]=[open[j],open[i]];i=j;}}return r.id;};
  push(start,0);let reached=null;
  while(open.length){const id=pop();if(closed.has(id))continue;
   // Connect the real position to the grid; rounding can put the start inside traffic.
   const p=id===start?{x:walk.x,z:walk.z}:point(id);
   if(refuge?canYield(p.x,p.z):id===goal){reached=id;break;}
   closed.add(id);const ix=id%nx,iz=Math.floor(id/nx);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const xx=ix+dx,zz=iz+dz;if(xx<0||xx>=nx||zz<0||zz>=nz)continue;
    const next=zz*nx+xx;if(closed.has(next)||!valid(next))continue;
    if(id!==start&&dx&&dz&&(!valid(iz*nx+xx)||!valid(zz*nx+ix)))continue;
    const q=point(next);if(refuge&&Math.hypot(q.x-walk.x,q.z-walk.z)>12)continue;
    if(!canStep(p.x,p.z,q.x,q.z))continue;
    if(id===start){let clear=true;const n=Math.ceil(Math.hypot(q.x-p.x,q.z-p.z)/.04);for(let k=1;k<=n;k++)if(!canPlan(p.x+(q.x-p.x)*k/n,p.z+(q.z-p.z)*k/n)){clear=false;break;}if(!clear)continue;}
    const g=cost.get(id)+Math.hypot(q.x-p.x,q.z-p.z)/cell;if(g>=(cost.get(next)??Infinity))continue;
    cost.set(next,g);came.set(next,id);push(next,g+(refuge?0:Math.hypot(q.x-end.x,q.z-end.z)/cell));
   }
  }
  if(reached===null)return [];
  const result=[];let id=reached;while(id!==start){result.push(point(id));id=came.get(id);}return smooth(result.reverse());
 }
 function refresh(){
  const action=active?(pause?'Resume tour':'Pause tour'):'Start auto tour';
  const compact=document.getElementById('compactPause');compact.textContent=pause?'▶':'Ⅱ';compact.setAttribute('aria-label',tr(action));
  document.body.classList.toggle('touring',active);
 document.getElementById('autoTour').textContent=tr(active?(pause?'Resume tour':'Pause tour'):'Start auto tour');document.getElementById('tourStatus').textContent=active?`${index+1}/${stops.length} · ${tr(stops[index][0])} · ${tr(status)}`:tr(status);}
 function start(){begin();active=true;pause=false;index=1;visited=[stops[0][0]];face(Math.atan2(stops[index][1]-walk.x,stops[index][2]-walk.z),1);path=plan(stops[index]);pathIndex=0;dwell=0;replan=0;blocked=0;yielding=false;yields=0;status='Auto walking';refresh();}
 function stop(){active=false;pause=false;path=[];status='Start auto tour';refresh();}
 function toggle(){if(!active)start();else{pause=!pause;refresh();}}
 function recover(){
  const next=plan(stops[index]);
  if(next.length){path=next;pathIndex=0;yielding=false;}
  else if(blocked>=1.5){const refuge=plan(stops[index],true);if(refuge.length){path=refuge;pathIndex=0;yielding=true;yields++;blocked=0;}}
  replan=1;
 }
 function update(dt){if(!active||pause)return;replan-=dt;if(dwell>0){dwell-=dt;doorRequest(walk);return;}
  if(!path.length){blocked+=dt;if(replan<=0)recover();status=yielding?'Stepping aside for traffic':'Waiting for clear route';doorRequest(walk);refresh();return;}
  const p=path[pathIndex],dx=p.x-walk.x,dz=p.z-walk.z,dist=Math.hypot(dx,dz),look=lookAhead();
  if(Math.hypot(look.x-walk.x,look.z-walk.z)>.03)face(Math.atan2(look.x-walk.x,look.z-walk.z),dt);
  doorRequest(p);
  const step=Math.min(dist,6.6*dt),x=walk.x+dx/(dist||1)*step,z=walk.z+dz/(dist||1)*step;
  if(moveTo(x,z)){blocked=0;status=yielding?'Stepping aside for traffic':'Auto walking';if(step>=dist-1e-7){pathIndex++;if(pathIndex>=path.length){if(yielding){yielding=false;path=[];dwell=1;replan=0;}else{visited.push(stops[index][0]);index++;if(index>=stops.length){active=false;status='Tour complete';refresh();return;}dwell=.4;path=plan(stops[index]);pathIndex=0;}}}}
  else{blocked+=dt;status='Waiting for door or traffic';if(replan<=0)recover();}
  refresh();
 }
 document.getElementById('autoTour').onclick=toggle;document.getElementById('stopTour').onclick=stop;
 refresh();return {start,stop,toggle,update,refresh,state:()=>({active,paused:pause,index,status,visited:[...visited],target:stops[index],pathLength:path.length,yielding,yields}),stops};
}
