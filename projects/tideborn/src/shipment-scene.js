import * as THREE from '../assets/vendor/three.module.js';
import {createSeaJourney} from './sea-routes.js';

export const shipmentKey=leg=>`${leg.from}:${leg.to}`;

// Static arrows show completed seasonal transfers; the scene's moving boats are independent scenery.
export function createShipmentOverlay(ports,seaRoute){
  const group=new THREE.Group(),entries=new Map();let focused=null;
  const arrowGeometry=new THREE.BufferGeometry();arrowGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-1.25,0,-1,1.25,0,-1,0,0,2.1],3));
  function highlight(){
    for(const [key,e] of entries){const dim=focused&&focused!==key;e.line.material.opacity=dim?.18:.95;e.arrows.forEach(a=>a.material.opacity=dim?.18:1);}
  }
  return {
    group,
    get focused(){return entries.get(focused)??null;},
    clearFocus(){focused=null;highlight();},
    focus(key){const e=entries.get(key);if(!e?.group.visible)return null;focused=key;highlight();return e;},
    update(legs=[]){
      for(const e of entries.values())e.group.visible=false;
      for(const leg of legs){
        const key=shipmentKey(leg);let e=entries.get(key);
        if(!e){
          const from=ports.find(p=>p.city===leg.from),to=ports.find(p=>p.city===leg.to),path=seaRoute(from,to);
          if(!path||path.length<2)continue;
          const points=path.map(p=>new THREE.Vector3(p.x,1.7,p.z)),part=new THREE.Group();
          const vertices=[],indices=[];
          points.forEach((p,i)=>{
            const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],length=Math.hypot(b.x-a.x,b.z-a.z)||1;
            const dx=(b.z-a.z)/length*.45,dz=-(b.x-a.x)/length*.45;
            vertices.push(p.x-dx,p.y,p.z-dz,p.x+dx,p.y,p.z+dz);
            if(i){const n=i*2;indices.push(n-2,n-1,n,n-1,n+1,n);}
          });
          const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
          const line=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#e6b45e',transparent:true,opacity:.95,side:THREE.DoubleSide,toneMapped:false}));part.add(line);
          const journey=createSeaJourney(points);
          const arrows=[.25,.5,.75].map(f=>{
            const p=journey.at(f);
            const arrow=new THREE.Mesh(arrowGeometry,new THREE.MeshBasicMaterial({color:'#ffe0a2',transparent:true,side:THREE.DoubleSide,toneMapped:false}));
            arrow.position.set(p.x,1.75,p.z);arrow.rotation.y=p.heading;part.add(arrow);return arrow;
          });
          e={group:part,line,arrows,points,from:leg.from,to:leg.to,amount:0};entries.set(key,e);group.add(part);
        }
        e.amount=leg.amount;e.group.visible=true;
      }
      if(focused&&!entries.get(focused)?.group.visible)focused=null;highlight();
    },
    stats(){return {visible:group.visible,focused,cacheSize:entries.size,legs:[...entries.values()].filter(e=>e.group.visible).map(e=>({from:e.from,to:e.to,amount:e.amount,points:e.points.length}))};},
  };
}
