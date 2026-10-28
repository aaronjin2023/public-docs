import * as THREE from '../assets/vendor/three.module.js';
import {clamp} from './terrain.js';

export const SWALLOW_ROCK={x:-59.01525633316487,z:-45.16682720417157,h:19.655830184027653,s:1.6617833928670733};
// Center and outward normal of the existing rock's east face, using its original scatter transform.
export const SWALLOW_FACE={center:[-58.02531926461288,20.02258679342087,-45.4376268542361],normal:[.9997570404237349,.013774212060915617,-.017208463187496376]};
export const SWALLOW_FOCUS={x:-58,y:20.25,z:-45.4,distance:18,polar:1.05,azimuth:1.95};
export function swallowReading(city){
  const resting=city.ecology>=.35&&city.pollution<.2;
  return {resting,ash:clamp(city.pollution*2.5),label:resting?'岩巢边仍有停歇的身影':'岩巢暂空，泥沿仍在'};
}
export function createEmberSwallows(){
  const group=new THREE.Group(),nest=new THREE.Group(),normal=new THREE.Vector3(...SWALLOW_FACE.normal);
  const right=new THREE.Vector3(0,1,0).cross(normal).normalize(),up=normal.clone().cross(right).normalize();
  nest.position.fromArray(SWALLOW_FACE.center);nest.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,normal));group.add(nest);
  const clay=new THREE.MeshStandardMaterial({color:'#ac8e6b',roughness:1,side:THREE.DoubleSide});
  const mouth=new THREE.Mesh(new THREE.CircleGeometry(.54,24),new THREE.MeshStandardMaterial({color:'#353a35',roughness:1}));mouth.scale.y=.72;mouth.position.set(0,.20,.012);nest.add(mouth);
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(.5,24,8,0,Math.PI*2,Math.PI/2,Math.PI/2),clay);bowl.scale.set(1,.62,.8);bowl.position.z=.12;nest.add(bowl);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.5,.055,8,64),clay);rim.rotation.x=Math.PI/2;rim.scale.y=.8;rim.position.z=.12;nest.add(rim);rim.updateMatrixWorld(true);
  const bird=new THREE.Group();nest.add(bird);
  const parts=[
    {p:[0,.36,.48],s:[.18,.24,.31],c:'#697578'},
    {p:[0,.32,.66],s:[.14,.18,.13],c:'#d2cec0'},
    {p:[0,.61,.69],s:[.15,.14,.17],c:'#697578'},
    ...[-1,1].map(side=>({p:[side*.142,.65,.75],s:[.023,.023,.023],c:'#171f21'})),
    ...[-1,1].map(side=>({p:[side*.15,.37,.38],s:[.065,.17,.31],c:'#465357'})),
  ];
  const feathers=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),parts.length),pose=new THREE.Object3D();
  parts.forEach((part,i)=>{pose.position.fromArray(part.p);pose.scale.fromArray(part.s);pose.updateMatrix();feathers.setMatrixAt(i,pose.matrix);feathers.setColorAt(i,new THREE.Color(part.c));});bird.add(feathers);
  const tailGeometry=new THREE.BufferGeometry();tailGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.12,.35,.24,.12,.35,.24,-.19,.20,-.26, .12,.35,.24,.19,.20,-.26,-.12,.35,.24],3));tailGeometry.computeVertexNormals();
  bird.add(new THREE.Mesh(tailGeometry,new THREE.MeshStandardMaterial({color:'#465357',roughness:1,side:THREE.DoubleSide})));
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.045,.18,6),new THREE.MeshStandardMaterial({color:'#303635',roughness:1}));beak.rotation.x=Math.PI/2;beak.position.set(0,.61,.91);bird.add(beak);
  const feet=[-1,1].map(side=>[side*.08,0,.12+.8*Math.sqrt(.25-.08**2)]),lines=[];
  // Feet meet the rendered polygonal rim, rather than an idealized smooth torus.
  const localRim=rim.clone();localRim.updateMatrixWorld(true);
  for(const foot of feet){const hit=new THREE.Raycaster(new THREE.Vector3(foot[0],1,foot[2]),new THREE.Vector3(0,-1,0)).intersectObject(localRim)[0];foot[1]=hit.point.y;lines.push(foot[0],.23,.51,...foot,foot[0]-.045,foot[1],foot[2],foot[0]+.045,foot[1],foot[2]);}
  const legs=new THREE.BufferGeometry();legs.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));bird.add(new THREE.LineSegments(legs,new THREE.LineBasicMaterial({color:'#b49b75'})));
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  group.userData={nest,bird,rim,feet,clay,reading:null};return group;
}
export function updateEmberSwallows(group,city){
  const reading=swallowReading(city),d=group.userData;d.bird.visible=reading.resting;
  d.clay.color.set('#ac8e6b').lerp(new THREE.Color('#514b43'),reading.ash);d.reading=reading;
}
