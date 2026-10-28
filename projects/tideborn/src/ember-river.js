import * as THREE from '../assets/vendor/three.module.js';
import {elevation,clamp} from './terrain.js';

// A representative downstream reach beside the civic terrace; no second water or pollution model.
export const EMBER_REACH=Array.from({length:53},(_,i)=>({x:-54+i/4,z:-41-3.5*Math.sin(i/52*Math.PI)}));
export const nearEmberRiver=(x,z)=>EMBER_REACH.some(p=>Math.hypot(x-p.x,z-p.z)<2.8);
const clearWater=new THREE.Color('#66aaa0'),dirtyWater=new THREE.Color('#4a4738');
const clearBank=new THREE.Color('#b6ae97'),dirtyBank=new THREE.Color('#4b4437');

function ribbon(width,lift,material){
  const points=[];
  for(let i=0;i<EMBER_REACH.length-1;i++){
    const a=EMBER_REACH[i],b=EMBER_REACH[i+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    const vertex=(p,side)=>{const w=width*(1+.12*Math.sin(p.x*1.7)+.08*Math.cos(p.x*.53)),x=p.x-dz/length*w*side,z=p.z+dx/length*w*side;return [x,elevation(x,z)+lift,z];};
    const al=vertex(a,-1),ar=vertex(a,1),bl=vertex(b,-1),br=vertex(b,1);
    points.push(...al,...bl,...ar,...ar,...bl,...br);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;return mesh;
}

export function createEmberRiver(){
  const group=new THREE.Group();
  const bank=new THREE.MeshStandardMaterial({color:clearBank,roughness:1,side:THREE.DoubleSide});
  const water=new THREE.MeshStandardMaterial({color:clearWater,roughness:.45,side:THREE.DoubleSide});
  group.add(ribbon(1.05,.17,bank),ribbon(.58,.32,water));
  const stones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#858678',roughness:1}),22),pose=new THREE.Object3D();
  for(let i=0;i<22;i++){
    const p=EMBER_REACH[2+i*2],q=EMBER_REACH[3+i*2],side=i%2?1:-1,angle=Math.atan2(q.z-p.z,q.x-p.x),x=p.x-Math.sin(angle)*1.35*side,z=p.z+Math.cos(angle)*1.35*side;
    pose.position.set(x,elevation(x,z)+.1,z);pose.scale.set(.22+(i%3)*.07,.2,.28);pose.rotation.set(.3,i*.7,.2);pose.updateMatrix();stones.setMatrixAt(i,pose.matrix);
  }
  stones.castShadow=stones.receiveShadow=true;group.add(stones);
  const pixels=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const i=(y*32+x)*4,r=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);
    pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(255*Math.max(0,1-r)**1.4*(.85+.15*Math.sin(x*.7+y*.4)));
  }
  const wash=new THREE.DataTexture(pixels,32,32);wash.needsUpdate=true;wash.magFilter=wash.minFilter=THREE.LinearFilter;
  const plume=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshStandardMaterial({color:'#66523c',map:wash,transparent:true,opacity:0,depthWrite:false,roughness:.7}));
  plume.rotation.x=-Math.PI/2;plume.scale.set(3.6,1.7,1);plume.position.set(-40.5,.55,-41);group.add(plume);
  group.userData={bank,water,plume,pollution:0,focus:{x:-47.5,y:elevation(-47.5,-42)+1,z:-40}};
  return group;
}

export function updateEmberRiver(group,city){
  const d=group.userData,p=clamp(city.pollution),darkness=clamp(p*1.5);
  d.water.color.copy(clearWater).lerp(dirtyWater,darkness);
  d.bank.color.copy(clearBank).lerp(dirtyBank,darkness);
  d.plume.material.opacity=p*.72;d.plume.visible=p>0;
  d.pollution=p;
}
