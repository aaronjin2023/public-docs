import * as THREE from '../assets/vendor/three.module.js';
import {SEASONS} from './world-data.js';

// One existing tree from the seeded forest; its trunk and foliage keep their original rules.
export const FROG_TREE={x:-83.5173630178906,z:53.84374833712354,h:3.467278437034708,s:1.3198471027659253,v:.6189854072872549};
export const FROG_FOCUS={x:FROG_TREE.x,y:FROG_TREE.h+1.8,z:FROG_TREE.z+1.9,distance:18,polar:.96,azimuth:.18};
export function frogReading(city,tick,climate){
  const canopy=FROG_TREE.v<city.ecology/.96,sheltered=climate==='dry'||(climate!=='wet'&&tick%4===1);
  return {canopy,sheltered,season:SEASONS[tick%4],label:!canopy?'树冠稀疏 · 枝窝暂空':sheltered?'避旱 · 身影藏进积水枝窝':'湿润时节 · 身影停在枝窝边'};
}
export function createMossFrogs(){
  const group=new THREE.Group();group.position.set(FROG_TREE.x,FROG_TREE.h,FROG_TREE.z);
  const bark=new THREE.MeshStandardMaterial({color:'#685e47',roughness:1}),green=new THREE.MeshStandardMaterial({color:'#699274',roughness:.8,side:THREE.DoubleSide});
  const waterMaterial=new THREE.MeshStandardMaterial({color:'#80b5ac',roughness:.24,metalness:.1});
  const glow=new THREE.MeshStandardMaterial({color:'#e0cf85',roughness:.8,emissive:'#d3be66',emissiveIntensity:0});
  const sphere=new THREE.SphereGeometry(1,8,6),cylinder=new THREE.CylinderGeometry(1,1,1,6),dummy=new THREE.Object3D(),nests=[];
  function rod(parent,a,b,r,material=bark){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.clone().sub(from),m=new THREE.Mesh(cylinder,material);
    m.position.copy(from.add(to).multiplyScalar(.5));m.scale.set(r,d.length(),r);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;
    if(parent.userData.rods){m.updateMatrix();parent.userData.rods.push(m.matrix.clone());}else parent.add(m);
  }
  for(const [i,at] of [[-.55,1.55,1.8],[.65,1.8,1.6]].entries()){
    rod(group,[0,.95,0],at,.13);
    const nest=new THREE.Group();nest.position.fromArray(at);group.add(nest);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.43,.085,5,12),bark);rim.rotation.x=Math.PI/2;rim.position.y=.08;nest.add(rim);
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.43,.22,.3,12,1,true),bark);bowl.position.y=-.07;bowl.material.side=THREE.DoubleSide;nest.add(bowl);
    const water=new THREE.Mesh(new THREE.CircleGeometry(.365,16),waterMaterial);water.rotation.x=-Math.PI/2;nest.add(water);
    const leaf=new THREE.Mesh(sphere,green);leaf.scale.set(.65,.045,.55);leaf.position.set(0,.075,.65);nest.add(leaf);
    rod(nest,[0,-.08,0],[0,.075,.65],.035,green);
    const frog=new THREE.Group();frog.rotation.y=i?-.35:.35;frog.userData.rods=[];nest.add(frog);
    const shapes=[{at:[0,.17,0],scale:[.20,.13,.28],color:'#638b5b'},{at:[0,.22,.22],scale:[.23,.12,.17],color:'#759b65'}];
    for(const side of [-1,1]){
      shapes.push({at:[side*.22,.12,-.13],scale:[.14,.10,.19],color:'#577c50'},{at:[side*.15,.32,.28],scale:[.065,.065,.07],color:'#c6b87a'},{at:[side*.15,.33,.335],scale:[.028,.035,.018],color:'#182e26'});
      for(const front of [true,false]){
        const a=front?[side*.17,.17,.18]:[side*.22,.12,-.13],elbow=[side*(front?.31:.37),.06,front?.12:-.28],toe=[side*.27,.025,front?.37:-.02];
        rod(frog,a,elbow,.032,green);rod(frog,elbow,toe,.025,green);
        for(let j=-1;j<=1;j++){const end=[toe[0]+j*.055,.02,toe[2]+.10];rod(frog,toe,end,.012,green);shapes.push({at:end,scale:[.025,.014,.026],color:'#a3b577'});}
      }
    }
    const limbs=new THREE.InstancedMesh(cylinder,green,frog.userData.rods.length);frog.userData.rods.forEach((m,j)=>limbs.setMatrixAt(j,m));limbs.castShadow=true;frog.add(limbs);
    const skin=new THREE.InstancedMesh(sphere,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85}),shapes.length);
    shapes.forEach((p,j)=>{dummy.position.fromArray(p.at);dummy.scale.fromArray(p.scale);dummy.updateMatrix();skin.setMatrixAt(j,dummy.matrix);skin.setColorAt(j,new THREE.Color(p.color));});skin.castShadow=true;frog.add(skin);
    const belly=new THREE.Mesh(sphere,glow);belly.position.set(0,.12,.15);belly.scale.set(.17,.065,.20);frog.add(belly);
    nests.push({nest,frog,water,leaf});
  }
  group.userData={nests,glow,reading:null};return group;
}
export function updateMossFrogs(group,city,tick,climate,light){
  const reading=frogReading(city,tick,climate);
  for(const {frog,water,leaf} of group.userData.nests){
    frog.visible=reading.canopy;frog.position.set(0,reading.sheltered?-.10:.10,reading.sheltered?0:.60);frog.scale.setScalar(reading.sheltered?.72:1);
    water.position.y=reading.sheltered?-.11:.015;water.scale.setScalar(reading.sheltered?.83:1);
    leaf.visible=reading.canopy;
  }
  group.userData.glow.emissiveIntensity=light==='night'?.65:0;
  group.userData.reading=reading;
}
