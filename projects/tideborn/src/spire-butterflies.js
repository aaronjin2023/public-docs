import * as THREE from '../assets/vendor/three.module.js';
import {SEASONS} from './world-data.js';

export const BUTTERFLY_ROCKS=[
  {x:28.942846183665097,z:-46.747813845053315,h:26.11581334295189,s:1.664233475900255},
  {x:32.085669089108706,z:-49.14307111175731,h:25.603743283706304,s:1.4673532227519899},
];
export const BUTTERFLY_FOCUS={x:30.5,y:27.1,z:-47.9,distance:18,polar:.68,azimuth:.3};
export function butterflyReading(city,tick,light){
  const resting=city.ecology<.25?0:city.ecology<.6?1:2,open=light==='day'&&tick%4!==3;
  return {resting,open,season:SEASONS[tick%4],label:!resting?'岩面暂空':open?`日光展翼 · ${resting}处停栖身影`:`收翼停歇 · ${resting}处停栖身影`};
}
// Use the same rock transform as the forest scatter; feet sit on its actual upper face.
export function butterflyLanding(rock){
  const geometry=new THREE.DodecahedronGeometry(1,0),mesh=new THREE.Mesh(geometry);
  mesh.position.set(rock.x,rock.h+.15,rock.z);mesh.rotation.set(rock.x,rock.z,0);mesh.scale.set(rock.s,rock.s*.65,rock.s*.7);mesh.updateMatrixWorld(true);
  const p=geometry.attributes.position,faces=new Map(),normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for(let i=0;i<p.count;i+=3){
    const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);
    const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize().applyMatrix3(normalMatrix).normalize();
    const key=normal.toArray().map(v=>v.toFixed(4)).join(','),face=faces.get(key)??{normal,points:[]};
    face.points.push(...[a,b,c].map(v=>v.applyMatrix4(mesh.matrixWorld)));faces.set(key,face);
  }
  const face=[...faces.values()].sort((a,b)=>b.normal.y-a.normal.y)[0],points=[...new Map(face.points.map(p=>[p.toArray().map(v=>v.toFixed(5)).join(','),p])).values()];
  const center=points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(points.length);
  geometry.dispose();return {center,normal:face.normal};
}
export function createSpireButterflies(){
  const group=new THREE.Group(),butterflies=[];
  const wingMaterial=new THREE.MeshStandardMaterial({color:'#e8e0b8',roughness:.85,side:THREE.DoubleSide}),bodyMaterial=new THREE.MeshStandardMaterial({color:'#303b39',roughness:1});
  const ink=new THREE.LineBasicMaterial({color:'#344343'});
  const outline=[[0,.12],[.18,.48],[.38,.62],[.61,.58],[.78,.36],[.72,.15],[.36,-.08],[.61,-.27],[.51,-.43],[.31,-.49],[.12,-.38],[0,-.08]];
  const wing=new THREE.BufferGeometry(),positions=[],indices=[];
  for(const [x,z] of [[.12,0],...outline])positions.push(x,0,z);
  for(let i=1;i<=outline.length;i++)indices.push(0,i,i===outline.length?1:i+1);
  wing.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));wing.setIndex(indices);wing.computeVertexNormals();
  const veins=[];
  for(const path of [[[.06,.08],[.28,.21],[.42,.42],[.38,.62]],[[.28,.21],[.52,.25],[.78,.36]],[[.42,.42],[.61,.58]],[[.06,-.04],[.28,-.17],[.31,-.49]],[[.28,-.17],[.61,-.27]]])for(let i=1;i<path.length;i++)veins.push(path[i-1][0],.008,path[i-1][1],path[i][0],.008,path[i][1]);
  for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];veins.push(a[0],.008,a[1],b[0],.008,b[1]);}
  const veinsGeometry=new THREE.BufferGeometry();veinsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(veins,3));
  for(const [i,rock] of BUTTERFLY_ROCKS.entries()){
    const {center,normal}=butterflyLanding(rock),butterfly=new THREE.Group();butterfly.position.copy(center);butterfly.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);group.add(butterfly);
    const pose=new THREE.Group();pose.rotation.y=i?-.5:.45;butterfly.add(pose);
    const body=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),bodyMaterial);body.scale.set(.065,.075,.32);body.position.y=.13;body.castShadow=true;pose.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),bodyMaterial);head.position.set(0,.16,.32);pose.add(head);
    const wings=[];for(const side of [-1,1]){const w=new THREE.Group();w.position.set(side*.035,.15,0);const plane=new THREE.Mesh(wing,wingMaterial);plane.castShadow=true;plane.scale.x=side;const lines=new THREE.LineSegments(veinsGeometry,ink);lines.scale.x=side;w.add(plane,lines);pose.add(w);wings.push({wing:w,side});}
    const legs=[];for(const side of [-1,1])for(const z of [-.18,0,.18])legs.push(side*.045,.12,z,side*.16,0,z+.04);
    legs.push(0,.19,.36,-.12,.26,.52,0,.19,.36,.12,.26,.52);
    const lineGeometry=new THREE.BufferGeometry();lineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(legs,3));pose.add(new THREE.LineSegments(lineGeometry,ink));
    butterflies.push({butterfly,wings,normal:normal.toArray(),center:center.toArray()});
  }
  group.userData={butterflies,reading:null};return group;
}
export function updateSpireButterflies(group,city,tick,light){
  const reading=butterflyReading(city,tick,light);
  group.userData.butterflies.forEach(({butterfly,wings},i)=>{butterfly.visible=i<reading.resting;for(const {wing,side} of wings)wing.rotation.z=side*(reading.open?.10:1.30);});
  group.userData.reading=reading;
}
