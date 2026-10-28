import {elevation} from './terrain.js';

// Reserve the whole harbour, including future three-level piers and the nursery bay.
export function clearOfHarbour(x,z,port){
  const dx=x-port.x,dz=z-port.z,c=Math.cos(port.angle),s=Math.sin(port.angle),u=dx*c-dz*s,v=dx*s+dz*c;
  return !(Math.abs(u)<6.5&&v>-5&&v<13.5)&&!(port.city==='haven'&&Math.hypot(u+6,v-4.8)<3.5);
}
export function createSeaRouter(ports){
  const size=3,nx=91,nz=77,ox=-135,oz=-114;
  const coords=i=>({x:ox+(i%nx)*size,z:oz+Math.floor(i/nx)*size});
  const navigable=(x,z)=>ports.every(p=>clearOfHarbour(x,z,p))&&elevation(x,z)<=.1&&[-1.2,1.2].every(dx=>[-1.2,1.2].every(dz=>elevation(x+dx,z+dz)<=.1));
  const clearSegment=(a,b)=>{
    const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.5);
    for(let i=0;i<=steps;i++)if(!navigable(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps))return false;
    return true;
  };
  const water=Uint8Array.from({length:nx*nz},(_,i)=>{const p=coords(i);return navigable(p.x,p.z)?1:0;});
  const edges=new Map();
  const nearest=p=>{let best=Infinity,id=-1;for(let i=0;i<water.length;i++){if(!water[i])continue;const q=coords(i),d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<best){best=d;id=i;}}return id;};
  return (a,b)=>{
    const berth=p=>({x:p.x+Math.sin(p.angle)*16,z:p.z+Math.cos(p.angle)*16});
    const start=nearest(berth(a)),end=nearest(berth(b));if(start<0||end<0)return null;
    const prev=new Int32Array(nx*nz).fill(-1),queue=[start];prev[start]=start;
    for(let qi=0;qi<queue.length&&prev[end]===-1;qi++){
      const id=queue[qi],x=id%nx,z=Math.floor(id/nx);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const xx=x+dx,zz=z+dz,ni=zz*nx+xx;if(xx<0||xx>=nx||zz<0||zz>=nz||prev[ni]!==-1||!water[ni])continue;
        const key=Math.min(id,ni)*water.length+Math.max(id,ni);
        if(!edges.has(key)){const p=coords(id),q=coords(ni);edges.set(key,navigable((p.x+q.x)/2,(p.z+q.z)/2));}
        if(!edges.get(key))continue;prev[ni]=id;queue.push(ni);
      }
    }
    if(prev[end]===-1)return null;
    const points=[];let cur=end;while(cur!==start){points.push(coords(cur));cur=prev[cur];}points.push(coords(start));points.reverse();
    const path=[points[0]];
    for(let i=0;i<points.length-1;){
      let next=points.length-1;while(next>i+1&&!clearSegment(points[i],points[next]))next--;
      path.push(points[next]);i=next;
    }
    return path;
  };
}

// Both moving scenery and completed-transfer arrows use distance along the same polyline.
export function createSeaJourney(points){
  const distances=[0];
  for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
  const length=distances.at(-1);
  return {length,at(fraction){
    const distance=Math.max(0,Math.min(1,fraction))*length;
    let i=1;while(i<points.length-1&&distances[i]<=distance)i++;
    const a=points[i-1],b=points[i],span=distances[i]-distances[i-1],t=span?(distance-distances[i-1])/span:0;
    return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,heading:Math.atan2(b.x-a.x,b.z-a.z)};
  }};
}
