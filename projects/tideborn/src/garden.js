import * as THREE from '../assets/vendor/three.module.js';
import {surfaceElevation} from './terrain.js';
import {groundPathGeometry,createPathSteps} from './harbour-approach.js';

const center={x:-82,z:38},radius=2.45;
const samplePath=bends=>bends.flatMap((p,i)=>{
  if(!i)return [p];const a=bends[i-1],n=Math.ceil(Math.hypot(p[0]-a[0],p[1]-a[1])/.125);
  return Array.from({length:n},(_,j)=>[a[0]+(p[0]-a[0])*(j+1)/n,a[1]+(p[1]-a[1])*(j+1)/n]);
});
const floor=Math.max(...Array.from({length:72},(_,i)=>surfaceElevation(center.x+Math.cos(i*Math.PI/36)*radius,center.z+Math.sin(i*Math.PI/36)*radius)))+.16;
function stair(start,end){
  const dx=end[0]-start[0],dz=end[1]-start[1],length=Math.hypot(dx,dz),n=Math.ceil(length/.2);
  const base=Math.max(...[-1,0,1].map(s=>surfaceElevation(start[0]-dz/length*.33*s,start[1]+dx/length*.33*s)))+.1;
  return {points:[start,end],landing:Array.from({length:n+1},(_,i)=>[start[0]+dx*i/n,base+(floor-base)*i/n,start[1]+dz*i/n]),height:floor};
}
const bench={x:-84.4,z:33.2};
const gx=surfaceElevation(bench.x+.1,bench.z)-surfaceElevation(bench.x-.1,bench.z),gz=surfaceElevation(bench.x,bench.z+.1)-surfaceElevation(bench.x,bench.z-.1);
bench.yaw=Math.atan2(-gx,-gz);
const local=(u,v)=>[bench.x+u*Math.cos(bench.yaw)+v*Math.sin(bench.yaw),bench.z-u*Math.sin(bench.yaw)+v*Math.cos(bench.yaw)];
bench.feet=[-.65,.65].map(u=>local(u,0));
bench.height=Math.max(...bench.feet.map(([x,z])=>surfaceElevation(x,z)))+.55;

export const GARDEN={...center,radius,floor,bench,basin:{x:-79.4,z:36.8},
  paths:[samplePath([[-78.3,39.3],[-79.4,39.4]]),samplePath([[-82,34.5],[-83.4,34.1],[-85,34.7]])],
  stairs:[stair([-79.4,39.4],[-80.05,38.8]),stair([-82,34.5],[-82,35.95])],
  focus:{x:-82,y:floor+.6,z:37,distance:23,polar:1.02,azimuth:-1.5}
};

export function nearGarden(x,z,margin=0){
  if(Math.hypot(x-center.x,z-center.z)<radius+margin)return true;
  if(Math.hypot(x-bench.x,z-bench.z)<1.05+margin||Math.hypot(x-GARDEN.basin.x,z-GARDEN.basin.z)<.8+margin)return true;
  return [...GARDEN.paths,...GARDEN.stairs.map(s=>s.landing.map(([x,,z])=>[x,z]))].some(path=>path.some(([px,pz])=>Math.hypot(x-px,z-pz)<.4+margin));
}

export function createGarden(lanternMaterial=new THREE.MeshStandardMaterial({color:'#e9cf94',emissive:'#ffca72',emissiveIntensity:0})){
  const group=new THREE.Group();group.name='garden';
  const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:1});
  const wood=material('#806c51'),stone=material('#a6afa0'),pathMaterial=material('#c4bea0'),bamboo=material('#7f9169');
  const add=(geometry,material,x,y,z,name)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.name=name??'';group.add(m);return m;};
  const column=(x,z,top,r=.12)=>{const bottom=Math.min(...[-r*1.3,r*1.3].flatMap(dx=>[-r*1.3,r*1.3].map(dz=>surfaceElevation(x+dx,z+dz))))-.08;return add(new THREE.CylinderGeometry(r,r*1.3,top-bottom,6),wood,x,(bottom+top)/2,z,'post');};
  const deck=add(new THREE.CylinderGeometry(radius,radius,.18,6),wood,center.x,floor-.09,center.z,'deck');deck.rotation.y=Math.PI/6;
  for(let k=0;k<6;k++)column(center.x+Math.cos(k*Math.PI/3)*2,center.z+Math.sin(k*Math.PI/3)*2,floor+2.2);
  add(new THREE.ConeGeometry(3,1.2,6),material('#7d9284'),center.x,floor+2.8,center.z,'roof');
  add(new THREE.CylinderGeometry(.025,.025,.5,5),wood,-80.8,floor+1.95,36.9,'lamp-cord');
  add(new THREE.BoxGeometry(.38,.08,.38),wood,-80.8,floor+1.71,36.9,'lamp-cap');
  add(new THREE.BoxGeometry(.28,.4,.28),lanternMaterial,-80.8,floor+1.47,36.9,'lamp');
  const light=new THREE.PointLight('#ffcf87',0,12,2);light.position.set(-80.8,floor+1.47,36.9);group.add(light);group.userData.light=light;
  for(const points of GARDEN.paths){const path=new THREE.Mesh(groundPathGeometry(points,.34),pathMaterial);path.name='path';path.receiveShadow=true;group.add(path);}
  for(const stairs of GARDEN.stairs){const steps=createPathSteps(stairs,stone,floor);steps.name='stairs';group.add(steps);}
  const seat=add(new THREE.BoxGeometry(1.8,.16,.46),wood,bench.x,bench.height,bench.z,'seat');seat.rotation.y=bench.yaw;
  for(const [x,z] of bench.feet)column(x,z,bench.height-.08,.13);

  const {x,z}=GARDEN.basin,heights=Array.from({length:24},(_,i)=>surfaceElevation(x+Math.cos(i*Math.PI/12)*.55,z+Math.sin(i*Math.PI/12)*.55));
  const base=Math.max(...heights)+.05,bottom=Math.min(...heights)-.08;
  add(new THREE.CylinderGeometry(.48,.55,base-bottom+.12,12),stone,x,(base+bottom)/2+.06,z,'basin-base');
  const rim=add(new THREE.TorusGeometry(.37,.13,6,16),stone,x,base+.2,z,'basin-rim');rim.rotation.x=Math.PI/2;
  const water=add(new THREE.CircleGeometry(.34,16),material('#5e918c'),x,base+.18,z,'basin-water');water.rotation.x=-Math.PI/2;water.castShadow=false;
  const start=new THREE.Vector3(x+.52,base+1.13,z-.3),end=new THREE.Vector3(x,base+.88,z),direction=end.clone().sub(start);
  const pipe=add(new THREE.CylinderGeometry(.09,.09,direction.length(),8,1,true),bamboo,...start.clone().add(end).multiplyScalar(.5).toArray(),'bamboo');pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  column(start.x,start.z,start.y-.05,.075);
  add(new THREE.CylinderGeometry(.017,.023,.67,5),material('#9ebeb2'),x,base+.52,z,'trickle').castShadow=false;
  group.userData.focus=GARDEN.focus;
  group.userData.waterFocus={x,y:base+.55,z,distance:18,polar:.45,azimuth:1.2};
  return group;
}
