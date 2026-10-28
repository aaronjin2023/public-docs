import * as THREE from '../assets/vendor/three.module.js';
import {elevation,surfaceElevation} from './terrain.js';

const x=-3,z=69,base=elevation(x,z);
const tablet={x:-2.3,z:71.9,width:2.2,depth:.3};
const corners=[-1,1].flatMap(dx=>[-1,1].map(dz=>surfaceElevation(tablet.x+dx*tablet.width/2,tablet.z+dz*.28)));
tablet.floor=Math.max(...corners)+.06;tablet.bottom=Math.min(...corners)-.12;
export const BELL_STEPS=Array.from({length:6},(_,k)=>({x:-3,z:85-k*.4,top:.32+k*.1,bottom:elevation(-3,85-k*.4)-.12}));
export const BELL={x,z,base,tablet,
  focus:{x:-3,y:base+2.3,z:70,distance:28,polar:1.02,azimuth:.48},
  tabletFocus:{x:tablet.x,y:tablet.floor+.8,z:tablet.z,distance:18,polar:.7,azimuth:.04},
  stepsFocus:{x:-3,y:.5,z:83.8,distance:18,polar:.66,azimuth:.24}
};

export function bellInscription(canvas){
  canvas.width=768;canvas.height=448;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#bbb9a3';ctx.fillRect(0,0,768,448);
  ctx.strokeStyle='#6a7162';ctx.lineWidth=3;ctx.strokeRect(28,26,712,396);
  ctx.fillStyle='#38483d';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='38px serif';ctx.fillText('旧 城 议 约',384,86);
  ctx.font='48px serif';ctx.fillText('迁居的人，',384,196);ctx.fillText('仍保有在议会中的座位。',384,278);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function createBellRuin(inscription=null){
  const group=new THREE.Group();group.name='bell-ruin';
  const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.95});
  const stone=material('#909b8e'),edge=material('#b1b4a0'),wood=material('#655947');
  const bronze=new THREE.MeshStandardMaterial({color:'#859982',roughness:.72,metalness:.35});
  const add=(geometry,material,px,py,pz,name)=>{const m=new THREE.Mesh(geometry,material);m.position.set(px,py,pz);m.castShadow=m.receiveShadow=true;m.name=name;group.add(m);return m;};
  const bottom=Math.min(...Array.from({length:32},(_,i)=>surfaceElevation(x+Math.cos(i*Math.PI/16)*1.5,z+Math.sin(i*Math.PI/16)*1.5)))-.12;
  add(new THREE.CylinderGeometry(1.15,1.5,base+3.4-bottom,8),stone,x,(base+3.4+bottom)/2,z,'tower-base');
  for(const y of [.75,2.4,3.4])add(new THREE.CylinderGeometry(1.3,1.34,.16,8),edge,x,base+y,z,'course');
  add(new THREE.BoxGeometry(2.4,.24,2.4),edge,x,base+3.4,z,'bell-floor');
  for(const dx of [-.92,.92])for(const dz of [-.92,.92])add(new THREE.BoxGeometry(.27,2.6,.27),stone,x+dx,base+4.7,z+dz,'bell-post');
  add(new THREE.BoxGeometry(2.2,.24,.28),wood,x,base+5.9,z,'beam');
  add(new THREE.BoxGeometry(2.65,.26,2.65),edge,x,base+6.13,z,'cornice');
  add(new THREE.ConeGeometry(1.9,.58,4),stone,x,base+6.55,z,'roof').rotation.y=Math.PI/4;
  const profile=[[.83,0],[.75,.14],[.53,.4],[.4,.9],[.24,1.15],[0,1.15]].map(([r,y])=>new THREE.Vector2(r,y));
  add(new THREE.LatheGeometry(profile,20),bronze,x,base+4.3,z,'silent-bell');
  add(new THREE.TorusGeometry(.78,.055,6,20),bronze,x,base+4.35,z,'bell-rim').rotation.x=Math.PI/2;
  add(new THREE.TorusGeometry(.17,.05,6,12),bronze,x,base+5.62,z,'bell-loop');

  const t=tablet;
  add(new THREE.BoxGeometry(2.45,t.floor-t.bottom,.56),stone,t.x,(t.floor+t.bottom)/2,t.z,'tablet-foot');
  add(new THREE.BoxGeometry(t.width,1.5,t.depth),edge,t.x,t.floor+.75,t.z,'tablet');
  add(new THREE.PlaneGeometry(2.05,1.22),new THREE.MeshStandardMaterial({color:inscription?'#ffffff':'#bbb9a3',map:inscription,roughness:1}),t.x,t.floor+.81,t.z+.156,'inscription').castShadow=false;
  for(const step of BELL_STEPS)for(const y of [.48,.68])if(y+.08<step.top&&y-.08>step.bottom){
    for(const side of [-1,1]){
      const shell=add(new THREE.TorusGeometry(.05,.025,5,8),edge,step.x+side*1.51,y,step.z,'tide-shell');shell.rotation.y=Math.PI/2;shell.castShadow=false;
    }
  }
  return group;
}
