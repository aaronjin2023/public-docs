import * as THREE from '../assets/vendor/three.module.js';
import {elevation,surfaceElevation,reedRiverX} from './terrain.js';

export function harbourPort(city){
  let port,best=Infinity;
  for(let z=-106;z<=106;z+=2)for(let x=-124;x<=124;x+=2){
    const h=elevation(x,z),d=Math.hypot(x-city.x,z-city.z);
    if(h<.2&&h>-.9&&d<best){best=d;port={x,z};}
  }
  return {...port,angle:Math.atan2(port.x-city.x,port.z-city.z),city:city.id};
}

export function approachClear(city,layout,x,z){
  if(surfaceElevation(x,z)<1.1||Math.hypot(x-city.x,z-city.z)<3.5)return false;
  if(city.id==='reed'&&z>24&&Math.abs(x-reedRiverX(z))<1.15)return false;
  if(layout.homes.some(h=>{
    const dx=x-h.x,dz=z-h.z,u=dx*Math.cos(h.yaw)-dz*Math.sin(h.yaw),v=dx*Math.sin(h.yaw)+dz*Math.cos(h.yaw);
    return Math.abs(u)<.97&&Math.abs(v)<.87;
  }))return false;
  if(Object.values(layout.sites).some(s=>s.footprint.some(p=>Math.hypot(x-p.x,z-p.z)<1.35)))return false;
  if(layout.fields.some(p=>Math.abs(x-p.x)<1.45&&Math.abs(z-p.z)<1.5))return false;
  return true;
}

function routeToStreet(start,targets,clear){
  const segment=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.025));for(let i=0;i<=n;i++)if(!clear([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]))return false;return true;};
  if(!clear(start)||!targets.length)return null;
  const step=.25,radius=88,n=radius*2+1,origin=[start[0]-radius*step,start[1]-radius*step];
  const at=id=>[origin[0]+id%n*step,origin[1]+Math.floor(id/n)*step];
  const startId=radius*n+radius,queue=[startId],prev=new Int32Array(n*n).fill(-1),safe=new Int8Array(n*n);prev[startId]=startId;
  const walkable=id=>{if(!safe[id])safe[id]=clear(at(id))?1:-1;return safe[id]>0;};
  let end=-1,target;
  for(let i=0;i<queue.length&&end<0;i++){
    const id=queue[i],a=at(id),match=targets.find(p=>Math.hypot(p[0]-a[0],p[1]-a[1])<=.7&&segment(a,p));
    if(match){end=id;target=match;break;}
    const ix=id%n,iz=Math.floor(id/n);
    for(const [dx,dz] of [[0,-1],[-1,0],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
      const x=ix+dx,z=iz+dz,next=z*n+x;
      if(x<0||x>=n||z<0||z>=n||prev[next]>=0||!walkable(next)||!segment(a,at(next)))continue;
      prev[next]=id;queue.push(next);
    }
  }
  if(end<0)return null;
  const raw=[target];for(let id=end;id!==startId;id=prev[id])raw.push(at(id));raw.push(start);raw.reverse();
  const bends=[raw[0]];
  for(let i=0;i<raw.length-1;){let next=raw.length-1;while(next>i+1&&!segment(raw[i],raw[next]))next--;bends.push(raw[next]);i=next;}
  const points=[];
  for(let i=1;i<bends.length;i++){const a=bends[i-1],b=bends[i],count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.25));for(let k=0;k<count;k++)points.push([a[0]+(b[0]-a[0])*k/count,a[1]+(b[1]-a[1])*k/count]);}points.push(target);
  return {points,bends};
}

export function harbourApproach(city,layout,port){
  const point=(u,v)=>[port.x+u*Math.cos(port.angle)+v*Math.sin(port.angle),port.z-u*Math.sin(port.angle)+v*Math.cos(port.angle)];
  const clear=([x,z])=>approachClear(city,layout,x,z);
  const landings=[0,-.6,.6,-1.2,1.2,-1.8,1.8].flatMap(u=>[1.4,1.8,2.2,2.6].map(v=>({p:point(u,-v),d:Math.hypot(u,v)}))).filter(q=>clear(q.p)).sort((a,b)=>a.d-b.d);
  const targets=layout.paths.flat().filter(clear);
  if(!landings.length||!targets.length)throw new Error(`No safe harbour landing in ${city.id}`);
  const start=landings[0].p,route=routeToStreet(start,targets,clear);
  if(!route)throw new Error(`No safe harbour approach in ${city.id}`);
  const toe=point(0,-.35),count=Math.ceil(Math.hypot(toe[0]-start[0],toe[1]-start[1])/.2),landing=[];
  for(let i=0;i<=count;i++){
    const x=start[0]+(toe[0]-start[0])*i/count,z=start[1]+(toe[1]-start[1])*i/count;
    const dx=toe[0]-start[0],dz=toe[1]-start[1],length=Math.hypot(dx,dz),px=-dz/length*.33,pz=dx/length*.33;
    landing.push([x,Math.max(1.08,surfaceElevation(x-px,z-pz)+.14,surfaceElevation(x+px,z+pz)+.14),z]);
  }
  return {...route,landing};
}

export function civicApproach(city,layout){
  if(city.id==='reed')return null;
  const site=layout.sites.civic,depth=city.id==='ember'?.7:1.5;
  const point=(u,v)=>[site.x+u*Math.cos(site.yaw)+v*Math.sin(site.yaw),site.z-u*Math.sin(site.yaw)+v*Math.cos(site.yaw)];
  const clear=([x,z])=>approachClear(city,layout,x,z),sites={...layout.sites};delete sites.civic;
  const outside={...layout,sites},targets=[...layout.paths.flat(),...layout.approach.points].filter(clear);
  const height=Math.max(...site.footprint.map(p=>elevation(p.x,p.z)))+.23,candidates=[];
  const edges=city.id==='moss'?[[0,depth,0,1]]:[[0,depth,0,1],[2.2,city.id==='ember'?.35:0,1,0],[-2.2,city.id==='ember'?.35:0,-1,0],[0,-depth,0,-1]];
  for(const [u,v,du,dv] of edges)for(const distance of [1.4,2,3,4,5]){
    const start=point(u+du*distance,v+dv*distance),top=point(u+du*.02,v+dv*.02);
    if(!clear(start))continue;
    const length=distance-.02,dx=top[0]-start[0],dz=top[1]-start[1];
    const base=Math.max(...[-1,0,1].map(side=>surfaceElevation(start[0]-dz/length*.33*side,start[1]+dx/length*.33*side)))+.1;
    if(Math.abs(height-base)/length>1.05)continue;
    const count=Math.ceil(length/.25),landing=[];
    for(let i=0;i<=count;i++)landing.push([start[0]+(top[0]-start[0])*i/count,base+(height-base)*i/count,start[1]+(top[1]-start[1])*i/count]);
    if(landing.some(([x,y,z])=>[-1,0,1].some(side=>{
      const px=x-dz/length*.33*side,pz=z+dx/length*.33*side;
      return !approachClear(city,outside,px,pz)||surfaceElevation(px,pz)>.06+y;
    })))continue;
    candidates.push({start,landing,score:length+Math.min(...targets.map(p=>Math.hypot(p[0]-start[0],p[1]-start[1])))});
  }
  candidates.sort((a,b)=>a.score-b.score);
  for(const c of candidates){const route=routeToStreet(c.start,targets,clear);if(route)return {...route,landing:c.landing,height};}
  throw new Error(`No safe civic approach in ${city.id}`);
}

export function nearApproach(x,z,approach,margin){
  return approach.points.some(([px,pz])=>Math.hypot(x-px,z-pz)<margin);
}

export function groundPathGeometry(points,width){
  const vertices=[];
  for(let i=1;i<points.length;i++){
    const [x,z]=points[i-1],[nx,nz]=points[i],dx=nx-x,dz=nz-z,length=Math.hypot(dx,dz);
    if(!length||surfaceElevation(x,z)<.8||surfaceElevation(nx,nz)<.8)continue;
    const px=-dz/length*width,pz=dx/length*width;
    const a=[x+px,surfaceElevation(x+px,z+pz)+.1,z+pz],b=[x-px,surfaceElevation(x-px,z-pz)+.1,z-pz];
    const c=[nx+px,surfaceElevation(nx+px,nz+pz)+.1,nz+pz],d=[nx-px,surfaceElevation(nx-px,nz-pz)+.1,nz-pz];
    vertices.push(...a,...c,...b,...b,...c,...d);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}

export function createPathSteps(approach,material,endHeight=1.06){
  const vertices=[],p=approach.landing;
  for(let i=1;i<p.length;i++){
    const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),px=-dz/length*.33,pz=dx/length*.33,top=Math.max(a[1],b[1]);
    const al=[a[0]+px,top,a[2]+pz],ar=[a[0]-px,top,a[2]-pz],bl=[b[0]+px,top,b[2]+pz],br=[b[0]-px,top,b[2]-pz];
    vertices.push(...al,...bl,...ar,...ar,...bl,...br);
    const lower=i===p.length-1?endHeight:Math.max(b[1],p[i+1][1]),ll=[bl[0],lower,bl[2]],lr=[br[0],lower,br[2]];
    if(lower>top)vertices.push(...bl,...ll,...br,...br,...ll,...lr);
    else vertices.push(...bl,...br,...ll,...br,...lr,...ll);
  }
  const a=p[0],b=p[1],length=Math.hypot(b[0]-a[0],b[2]-a[2]),px=-(b[2]-a[2])/length*.33,pz=(b[0]-a[0])/length*.33,top=Math.max(a[1],b[1]);
  const al=[a[0]+px,top,a[2]+pz],ar=[a[0]-px,top,a[2]-pz],ll=[al[0],surfaceElevation(al[0],al[2])+.06,al[2]],lr=[ar[0],surfaceElevation(ar[0],ar[2])+.06,ar[2]];
  vertices.push(...al,...ll,...ar,...ar,...ll,...lr);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
