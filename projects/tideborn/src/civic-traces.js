import * as THREE from '../assets/vendor/three.module.js';
import {elevation,reedRiverX} from './terrain.js';
import {PETITIONS} from './residents.js';
import {CITIES} from './world-data.js';
import {addNurseryFish} from './nursery-fish.js';
export const CIVIC_RIVER_Z=46;

function sandstoneMaterial(){
  const width=128,height=64,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const row=Math.floor(y/32),u=(x+row*32)%128,block=Math.floor(u/64),joint=y%32<2||u%64<2;
    const tone=joint?-24:((block+row)%3-1)*6+((x*17+y*29)%7-3),i=(y*width+x)*4;
    data[i]=172+tone;data[i+1]=157+tone;data[i+2]=130+tone;data[i+3]=255;
  }
  const map=new THREE.DataTexture(data,width,height);map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
  return new THREE.MeshStandardMaterial({map,roughness:1});
}

// These are lasting civic places, not extra levels of the five ordinary buildings.
export function createCivicTraces(city,site,port,angle,materials){
  const {stone,darkStone,wood,cloth,brass}=materials;
  const water=new THREE.MeshStandardMaterial({color:'#579a92',roughness:.55});
  const leaf=new THREE.MeshStandardMaterial({color:'#6c9568',roughness:1});
  const soil=new THREE.MeshStandardMaterial({color:'#6e6850',roughness:1});
  const ink=new THREE.MeshStandardMaterial({color:'#334e48',roughness:1});
  const petition=PETITIONS.find(p=>p.city===city.id),traces={};
  function mesh(g,geometry,material,x,y,z){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
  const box=(g,m,x,y,z,w,h,d)=>mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);
  const post=(g,x,y,z,h=2)=>mesh(g,new THREE.CylinderGeometry(.07,.1,h,5),wood,x,y+h/2,z);
  const jar=(g,x,y,z,r=.22)=>mesh(g,new THREE.CylinderGeometry(r*.8,r,r*1.7,8),brass,x,y+r*.85,z);
  function line(g,points,material=wood){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));g.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:material.color})));}
  function make(choice,coastal=false,owner=petition){
    const g=new THREE.Group();g.name=`${owner.id}:${choice}`;g.visible=false;
    const option=owner.options.find(o=>o.id===choice);g.userData={petition:owner.id,choice,label:option.trace};
    let floor;
    if(coastal){g.position.set(port.x,0,port.z);g.rotation.y=angle;floor=.95;}
    else if(city.id==='reed'){g.position.set(reedRiverX(CIVIC_RIVER_Z),0,CIVIC_RIVER_Z);floor=elevation(g.position.x,g.position.z)+.45;}
    else{
      g.position.set(site.x,0,site.z);g.rotation.y=site.yaw;
      const heights=site.footprint.map(p=>elevation(p.x,p.z)),low=Math.min(...heights)-.1;floor=Math.max(...heights)+.15;
      const wall=box(g,darkStone,0,(floor+low)/2,0,4.4,floor-low,city.id==='ember'?1.4:3);
      if(city.id==='wind'){
        wall.material=sandstoneMaterial();
        const {position,normal,uv}=wall.geometry.attributes;
        // Map the same stone courses in world units on all four existing faces.
        for(let i=0;i<uv.count;i++)uv.setXY(i,(Math.abs(normal.getX(i))>.5?position.getZ(i):position.getX(i))/2.2,position.getY(i)/.64);
        uv.needsUpdate=true;
      }
      box(g,stone,0,floor,0,4.4,.16,city.id==='ember'?1.4:3);
    }
    g.userData.focus={x:g.position.x,y:floor+1,z:g.position.z};traces[choice]=g;return [g,floor];
  }
  if(city.id==='haven'){
    let [g,h]=make('ferry',true);
    box(g,wood,-2.6,h,0,5,.25,2);
    for(const x of [-1.2,-4.5])for(const z of [-.7,.7])post(g,x,h,z,2.3);
    box(g,cloth,-2.8,h+2.35,0,3.8,.1,2.1);box(g,wood,-2.8,h+.55,.55,2.8,.18,.35);
    [g,h]=make('nursery',true);
    g.position.x+=-6*Math.cos(angle)+4.8*Math.sin(angle);g.position.z+=6*Math.sin(angle)+4.8*Math.cos(angle);
    g.userData.focus={x:g.position.x,y:1,z:g.position.z};
    const rope=[];
    for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*2,z=Math.sin(a)*2;
      post(g,x,.2,z,1.3);rope.push([x,1.35,z]);
      mesh(g,new THREE.SphereGeometry(.2,6,4),cloth,x,.85,z).userData.waterline=.12;
    }
    line(g,[...rope,rope[0]]);box(g,wood,0,1.8,-2,1.3,.7,.12);
    addNurseryFish(g,city);
    const queuePetition=PETITIONS.find(p=>p.id==='haven-queue'),colors=CITIES.map(c=>new THREE.MeshStandardMaterial({color:c.color,roughness:1}));
    [g,h]=make('rotation',false,queuePetition);
    mesh(g,new THREE.CylinderGeometry(.18,.25,.85,8),wood,0,h+.5,0);
    mesh(g,new THREE.CylinderGeometry(1.15,1.15,.14,24),wood,0,h+.99,0);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;mesh(g,new THREE.CylinderGeometry(.13,.13,.12,8),colors[i],Math.sin(a)*.88,h+1.12,Math.cos(a)*.88);}
    const pointer=new THREE.Group();pointer.position.y=h+1.22;g.add(pointer);box(pointer,brass,0,0,.4,.13,.09,.8);g.userData.pointer=pointer;
    for(const x of [-1.75,1.75])post(g,x,h,-1,2.1);box(g,wood,0,h+1.9,-1,3.6,.12,.16);
    for(let i=0;i<6;i++)box(g,cloth,-1.4+i*.56,h+1.6,-1,.42,.5,.08);
    [g,h]=make('charter',false,queuePetition);
    for(const x of [-1.9,1.9])post(g,x,h,0,2.3);
    for(const y of [.75,1.95])box(g,wood,0,h+y,0,4,.12,.14);
    for(let i=0;i<6;i++){const x=-1.6+i*.64;box(g,colors[i],x,h+1.4,.05,.48,1.1,.16);for(const y of [1.2,1.5])box(g,cloth,x,h+y,.15,.28,.06,.035);}
  }else if(city.id==='ember'){
    let [g,h]=make('filter');g.userData.pollutionWater=water;
    for(const x of [-1.05,1.05]){
      mesh(g,new THREE.CylinderGeometry(.62,.69,.55,12),stone,x,h+.3,0);
      mesh(g,new THREE.CylinderGeometry(.5,.5,.035,12),x<0?soil:water,x,h+.59,0);
      post(g,x,h,-.45,1.3);
    }
    box(g,stone,0,h+.35,0,.8,.22,.3);box(g,water,0,h+.47,0,.8,.035,.15);
    line(g,[[-1.05,h+1.1,-.45],[1.05,h+1.1,-.45]]);
    [g,h]=make('orders');
    for(const x of [-1.55,-.7,.15])for(let k=0;k<(x===-.7?2:1);k++)box(g,brass,x,h+.27+k*.5,0,.6,.5,.6);
    post(g,1.45,h,0,3.1);box(g,wood,.7,h+3,0,1.65,.15,.16);
    line(g,[[-.05,h+3,0],[-.05,h+1.4,0]]);box(g,wood,-.05,h+1.25,0,.4,.2,.4);
  }else if(city.id==='moss'){
    let [g,h]=make('commons');
    for(const x of [-1.2,0,1.2])for(const z of [-.65,.65]){
      box(g,wood,x,h+.15,z,.85,.22,.85);box(g,soil,x,h+.28,z,.72,.04,.72);
      post(g,x,h+.3,z,.45);mesh(g,new THREE.IcosahedronGeometry(.35,0),leaf,x,h+.9,z);
    }
    const corners=[[-1.9,-1.2],[1.9,-1.2],[1.9,1.2],[-1.9,1.2],[-1.9,-1.2]];
    corners.slice(0,4).forEach(([x,z])=>post(g,x,h,z,1));
    line(g,[[.5,h+.85,1.2],[1.9,h+.85,1.2],[1.9,h+.85,-1.2],[-1.9,h+.85,-1.2],[-1.9,h+.85,1.2],[-.5,h+.85,1.2]]);
    [g,h]=make('timber');
    for(const x of [-1,1])for(const z of [-.4,.65])box(g,wood,x,h+.45,z,1.1,.16,.4);
    for(const x of [-1.5,1.5])post(g,x,h,-1.05,2.2);
    box(g,ink,0,h+1.55,-1.05,2.7,.9,.12);line(g,[[-1,h+1.7,-.97],[.7,h+1.7,-.97]],cloth);
    for(const x of [-1.8,1.8]){mesh(g,new THREE.CylinderGeometry(.32,.4,.3,8),wood,x,h+.2,.8);mesh(g,new THREE.RingGeometry(.15,.2,10),cloth,x,h+.36,.8).rotation.x=-Math.PI/2;}
  }else if(city.id==='spire'){
    let [g,h]=make('open');
    for(const x of [-1.3,1.3]){
      post(g,x,h,-.7,1.8);box(g,ink,x,h+1.45,-.7,1.2,1,.12);
      for(let i=0;i<4;i++)mesh(g,new THREE.SphereGeometry(.065,5,4),brass,x-.35+i*.23,h+1.5+Math.sin(i)*.22,-.6);
    }
    post(g,0,h,.6,1.1);
    for(const turn of [0,Math.PI/2]){const ring=mesh(g,new THREE.TorusGeometry(.65,.05,5,20),brass,0,h+1.8,.6);ring.rotation.y=turn;ring.rotation.x=.4;}
    [g,h]=make('fields');
    for(const x of [-1.65,1.65])post(g,x,h,-1,2.15);
    box(g,cloth,0,h+1.5,-1,3.2,1.1,.08);
    for(let i=0;i<5;i++)line(g,[[-1.35+i*.65,h+1.08,-.94],[-1.35+i*.65,h+1.94,-.94]],ink);
    for(const z of [.1,.9]){box(g,wood,0,h+.25,z,3.2,.3,.55);for(const x of [-1.2,-.4,.4,1.2])jar(g,x,h+.4,z,.16);}
  }else if(city.id==='reed'){
    for(const choice of ['levee','floodplain']){
      const [g,h]=make(choice);
      for(const dz of choice==='levee'?[-2,-1,0,1,2]:[-2,2]){
        const x=reedRiverX(CIVIC_RIVER_Z+dz)-g.position.x+1.3,y=elevation(g.position.x+x,CIVIC_RIVER_Z+dz);
        box(g,darkStone,x,y+.65,dz,.55,1.3,.98);box(g,wood,x,y+1.35,dz,.8,.12,1.02);
      }
      if(choice==='floodplain'){
        for(const z of [-.9,.9])post(g,1.5,h,z,1.8);
        box(g,wood,1.5,h+1.85,0,.15,.16,2.05);
        for(let i=0;i<9;i++){const x=2.4+(i%3)*.3,z=-.9+Math.floor(i/3)*.7,y=elevation(g.position.x+x,g.position.z+z);mesh(g,new THREE.ConeGeometry(.13,.9,4),leaf,x,y+.45,z);}
      }else{post(g,1.5,h,0,2.15);box(g,cloth,1.5,h+1.9,0,.12,.5,.8);}
    }
  }else{
    let [g,h]=make('settle');
    for(const x of [-1.3,1.3]){post(g,x,h,-.7,1.8);post(g,x,h,.7,1.8);}
    box(g,cloth,0,h+1.85,0,3.2,.12,2.1);box(g,wood,0,h+.65,0,2.4,.18,.55);
    for(const z of [-.65,.65])box(g,wood,0,h+.35,z,2.4,.15,.3);
    for(const x of [-.8,0,.8])jar(g,x,h+.75,0,.13);jar(g,1.7,h,.8,.3);
    [g,h]=make('provisions',true);
    g.position.x+=Math.cos(angle)*3;g.position.z-=Math.sin(angle)*3;g.userData.focus={x:g.position.x,y:2,z:g.position.z};
    box(g,wood,0,h,0,3.6,.2,2.4);
    for(const x of [-1.3,1.3])post(g,x,h,-.7,2.1);
    box(g,cloth,0,h+2.1,-.5,3.2,.1,1.1);
    for(const x of [-1,-.3,.4]){jar(g,x,h+.2,.5,.24);box(g,wood,x,h+.4,-.4,.5,.6,.5);}
    box(g,cloth,1.15,h+.5,.45,.55,.04,.65);
  }
  return traces;
}

export function syncCivicTraces(traces,decisions=[],pollution=0,firstReceiver=null){
  if(traces.filter)traces.filter.userData.pollutionWater.color.set('#579a92').lerp(new THREE.Color('#69614a'),Math.max(0,Math.min(1,pollution*1.5)));
  for(const group of Object.values(traces))group.visible=decisions.some(d=>d.id===group.userData.petition&&d.choice===group.userData.choice);
  if(traces.rotation){const data=traces.rotation.userData,index=CITIES.findIndex(c=>c.id===firstReceiver);data.firstReceiver=index<0?null:firstReceiver;data.pointer.visible=index>=0;if(index>=0)data.pointer.rotation.y=index*Math.PI/3;}
}
