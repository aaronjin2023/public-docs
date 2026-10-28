import * as THREE from '../assets/vendor/three.module.js';
import {reedRiverX,reedBedAt,clamp} from './terrain.js';
import {SEASONS} from './world-data.js';

export const HERON_SITES=[42.25,43.75].map(z=>({x:reedRiverX(z),z,y:reedBedAt(z-.625)+.54}));
export const HERON_FOCUS={x:(HERON_SITES[0].x+HERON_SITES[1].x)/2,y:2.9,z:43,distance:18,polar:.95,azimuth:-.12};
export function heronReading(city,tick){
  const ecology=clamp(city.ecology),birds=ecology<.22?0:ecology<.55?1:2;
  return {birds,growth:.25+.75*ecology,season:SEASONS[tick%4],label:birds===2?'苇丛丰密 · 两处停栖身影':birds===1?'苇丛渐疏 · 一处停栖身影':'苇丛稀疏 · 停栖处暂空'};
}
const sphere=new THREE.SphereGeometry(1,8,6),cylinder=new THREE.CylinderGeometry(1,1,1,6),cone=new THREE.ConeGeometry(1,1,6);
function instances(parent,geometry,items){
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),items.length),dummy=new THREE.Object3D();
  items.forEach((p,i)=>{dummy.position.fromArray(p.at);dummy.scale.fromArray(p.scale);dummy.quaternion.copy(p.rotation??new THREE.Quaternion());dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(p.color));});
  mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function rod(a,b,r,color){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),direction=to.clone().sub(from);
  return {at:from.add(to).multiplyScalar(.5).toArray(),scale:[r,direction.length(),r],rotation:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()),color};
}
export function createReedHerons(){
  const group=new THREE.Group(),birds=[],reeds=[];
  for(const [i,site] of HERON_SITES.entries()){
    const mat=new THREE.Group();mat.position.set(site.x,site.y,site.z);group.add(mat);
    const root=new THREE.Mesh(new THREE.CylinderGeometry(.62,.67,.45,12),new THREE.MeshStandardMaterial({color:'#5c6550',roughness:1}));
    root.position.y=-.225;root.scale.z=.82;root.receiveShadow=true;mat.add(root);
    const bird=new THREE.Group();bird.rotation.y=i?.75:1.25;mat.add(bird);birds.push(bird);
    const bodies=[
      {at:[0,1.43,0],scale:[.24,.28,.42],color:'#d7dfd5'},
      ...[-1,1].map(s=>({at:[s*.20,1.45,-.1],scale:[.085,.24,.40],color:'#667c7a'})),
      {at:[0,2.23,.19],scale:[.15,.17,.23],color:'#ece9d8'},
      ...[-1,1].map(s=>({at:[s*.14,2.28,.25],scale:[.027,.027,.027],color:'#252c29'}))
    ];
    instances(bird,sphere,bodies);
    const rods=[rod([0,1.62,.2],[0,1.84,.39],.075,'#e3e4d5'),rod([0,1.84,.39],[0,2.13,.15],.065,'#e3e4d5')];
    const toes=[];
    for(const side of [-1,1]){
      const foot=[side*.14,.025,0];
      rods.push(rod([side*.12,1.25,-.06],[side*.14,.64,.08],.028,'#73664b'),rod([side*.14,.64,.08],foot,.023,'#73664b'));
      for(const end of [[side*.14-.16,.025,.31],[side*.14,.025,.39],[side*.14+.16,.025,.31],[side*.14,.025,-.22]]){rods.push(rod(foot,end,.018,'#998255'));toes.push({from:foot,to:end});}
    }
    instances(bird,cylinder,rods);bird.userData.toes=toes;
    instances(bird,cone,[rod([0,2.23,.38],[0,2.20,.91],.065,'#ba9b5e'),rod([0,1.48,-.35],[0,1.38,-.83],.16,'#647b78')]);
    const stalks=[[-.48,-.2],[.46,-.21],[-.43,.23],[.43,.22]].map(([x,z],j)=>({x,z,height:.7+j*.15}));
    const roots=Array.from({length:10},(_,j)=>{const a=j*Math.PI/5,x=Math.cos(a)*.64,z=Math.sin(a)*.52;return rod([x,-.05,z],[x*.95,-.4+(j%3)*.025,z*.95],.018,'#77704c');});
    const stalkMesh=instances(mat,cylinder,[...stalks.map(p=>({at:[p.x,p.height/2,p.z],scale:[.025,p.height,.025],color:'#526f4f'})),...roots]);
    const heads=instances(mat,sphere,stalks.map(p=>({at:[p.x,p.height,p.z],scale:[.04,.10,.04],color:'#b4a174'})));
    reeds.push({stalks,stalkMesh,heads});
  }
  group.userData={birds,reeds,reading:null};return group;
}
export function updateReedHerons(group,city,tick){
  const reading=heronReading(city,tick),dummy=new THREE.Object3D(),green=new THREE.Color('#998969').lerp(new THREE.Color('#526f4f'),city.ecology);
  group.userData.birds.forEach((bird,i)=>{bird.visible=i<reading.birds;});
  group.userData.reeds.forEach(({stalks,stalkMesh,heads})=>{
    stalks.forEach((p,i)=>{const height=p.height*reading.growth;dummy.position.set(p.x,height/2,p.z);dummy.scale.set(.025,height,.025);dummy.updateMatrix();stalkMesh.setMatrixAt(i,dummy.matrix);stalkMesh.setColorAt(i,green);dummy.position.y=height;dummy.scale.set(.04,.10,.04);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);});
    stalkMesh.instanceMatrix.needsUpdate=true;stalkMesh.instanceColor.needsUpdate=true;stalkMesh.computeBoundingSphere();heads.instanceMatrix.needsUpdate=true;heads.computeBoundingSphere();heads.visible=tick%4===2;
  });
  group.userData.reading=reading;
}
