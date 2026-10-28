import * as THREE from '../assets/vendor/three.module.js';
import {waterHeightAt} from './simulation.js';

export function nurseryTideReading(tick){
  const rising=waterHeightAt(tick+1)>waterHeightAt(tick);
  return {rising,label:rising?'潮势渐涨 · 银鳞身影朝向湾内':'潮势渐退 · 银鳞身影朝向湾外'};
}
export function addNurseryFish(nursery,city){
  const body=new THREE.SphereGeometry(1,9,6),fins=new THREE.BufferGeometry();
  fins.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,-.25,-.16,0,-.50,.16,0,-.50,
    0,.035,.15,0,.13,-.10,0,.035,-.20,
    -.07,.015,.04,-.22,.015,-.15,-.08,.015,-.12,
    .07,.015,.04,.22,.015,-.15,.08,.015,-.12,
  ],3));fins.computeVertexNormals();
  const silver=new THREE.MeshStandardMaterial({color:'#b7cbca',roughness:.55,metalness:.12}),dark=new THREE.MeshStandardMaterial({color:'#647f80',roughness:.7,side:THREE.DoubleSide});
  const fish=[];
  for(const [x,z] of [[-.9,-.55],[.25,-.65],[.8,.3],[-.65,.6],[.1,.15]]){
    const g=new THREE.Group();g.position.set(x,.25,z);g.userData.waterline=.012;
    const shape=new THREE.Mesh(body,silver);shape.scale.set(.12,.05,.32);shape.castShadow=true;g.add(shape,new THREE.Mesh(fins,dark));nursery.add(g);fish.push(g);
  }
  nursery.userData.fish=fish;
  nursery.userData.inwardHeading=Math.atan2(city.x-nursery.position.x,city.z-nursery.position.z)-nursery.rotation.y;
}
export function updateNurseryFish(nursery,tick){
  const reading=nurseryTideReading(tick);
  for(const fish of nursery.userData.fish)fish.rotation.y=nursery.userData.inwardHeading+(reading.rising?0:Math.PI);
  nursery.userData.tideReading=reading;
}
