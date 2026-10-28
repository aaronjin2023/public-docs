import * as THREE from '../assets/vendor/three.module.js';

export const HARBOURS={
  haven:'绳环挂在双臂信号架上；海上的人先认出这两条垂下的线。',
  ember:'陶色灯炉有三圈凸起的沿，像一件还留着窑温的大器皿。',
  moss:'透空木灯亭立在水边，宽檐把灯火和下雨的天隔开。',
  spire:'三道铜环围住石灯柱，刻度从山上的星表延伸到了岸边。',
  reed:'细木桩把灯托高，苇编顶让它像一座很小的高脚粮仓。',
  wind:'矮石座压住灯杆，斜帆罩把光留在背风的一侧。',
};

// Each marker reuses the original beacon site; no shoreline space or harbour capacity is added.
export function createHarbourDetails(city,port,angle,lanternMaterial){
  const group=new THREE.Group();group.position.set(port.x,0,port.z);group.rotation.y=angle;
  const beacon=new THREE.Group();group.add(beacon);
  const offset=city.id==='spire'?2.6:1.8;
  beacon.position.set(offset*Math.cos(angle),0,offset*Math.sin(angle));
  const wood='#756449',stone='#b3b5a2',cloth='#d9ceb0',clay='#a86e53',brass='#b4a06e',ink='#486667';
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1});
  const batches=new Map(),dummy=new THREE.Object3D();
  function shape(parent,geometry,key,tint,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
    const id=key;
    if(!batches.has(id))batches.set(id,{parent,geometry,items:[]});else geometry.dispose();
    batches.get(id).items.push({tint,x,y,z,sx,sy,sz,rx,ry,rz});
  }
  const box=(p,c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>shape(p,new THREE.BoxGeometry(1,1,1),'box',c,x,y,z,w,h,d,rx,ry,rz);
  const post=(p,c,x,y,z,r,h)=>shape(p,new THREE.CylinderGeometry(1,1,1,8),'post',c,x,y,z,r,h,r);
  const cone=(p,c,x,y,z,r,h)=>shape(p,new THREE.ConeGeometry(1,1,8),'cone',c,x,y,z,r,h,r);
  const ring=(p,c,x,y,z,r,rx=0)=>shape(p,new THREE.TorusGeometry(1,.13,5,16),'ring',c,x,y,z,r,r,r,rx);
  if(city.id==='haven'){
    post(beacon,wood,0,2.12,0,.13,3.65);box(beacon,wood,0,3.5,0,1.1,.12,.12);
    for(const x of [-.44,.44]){box(beacon,cloth,x,2.9,0,.045,1.05,.045);ring(beacon,brass,x,2.3,0,.13);}
    cone(beacon,clay,0,3.94,0,.35,.45);
  }else if(city.id==='ember'){
    box(beacon,stone,0,.7,0,.95,.6,.95);post(beacon,clay,0,1.95,0,.4,2.1);
    for(const y of [1.2,2.1,3.15])box(beacon,clay,0,y,0,.95,.16,.85);
    post(beacon,ink,0,3.35,0,.27,.35);cone(beacon,clay,0,3.95,0,.52,.55);
  }else if(city.id==='moss'){
    for(const x of [-.32,.32])for(const z of [-.28,.28])post(beacon,wood,x,2.1,z,.075,3.6);
    box(beacon,wood,0,3.28,0,.9,.13,.8);box(beacon,'#78947a',0,3.95,0,1.05,.18,1,0,0,.12);
  }else if(city.id==='spire'){
    post(beacon,stone,0,1.95,0,.35,3.3);box(beacon,stone,0,.55,0,.95,.2,.95);
    for(const y of [1.2,2.3,3.85])ring(beacon,brass,0,y,0,.43,Math.PI/2);
    cone(beacon,brass,0,4.05,0,.4,.4);
  }else if(city.id==='reed'){
    for(const x of [-.34,.34])post(beacon,wood,x,1.95,0,.08,3.4);
    box(beacon,wood,0,3.35,0,.9,.12,.8);cone(beacon,'#a4a276',0,3.99,0,.55,.65);
  }else{
    for(let i=0;i<3;i++)box(beacon,stone,0,.65+i*.55,0,.55-i*.07,.5,.55-i*.07);
    post(beacon,wood,0,2.7,0,.10,2);box(beacon,cloth,0,3.92,0,1,.13,.75,0,0,-.16);
  }
  for(const {parent,geometry,items} of batches.values()){
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);
    items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx,p.ry,p.rz);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(p.tint));});
    mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  }
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),lanternMaterial);
  lamp.position.y=3.55;beacon.add(lamp);
  group.userData={beacon,label:HARBOURS[city.id]};return group;
}
