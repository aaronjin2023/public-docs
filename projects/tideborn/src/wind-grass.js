import * as THREE from '../assets/vendor/three.module.js';
import {surfaceElevation,clamp} from './terrain.js';

export const WIND_GRASS_SITES=[[97,-35.5],[97.5,-36.5],[97,-37.5],[96.3,-38]];
export const WIND_GRASS_FOCUS={x:97,y:7.2,z:-36.7,distance:18,polar:1,azimuth:2.8};
export function createWindGrass(){
  const group=new THREE.Group(),stems=[],leaves=[];
  for(const [i,[x,z]] of WIND_GRASS_SITES.entries())for(let j=0;j<3;j++){
    const a=j*Math.PI*2/3+i*.4,sx=x+Math.cos(a)*.13,sz=z+Math.sin(a)*.13;
    const stem={x:sx,z:sz,y:surfaceElevation(sx,sz)-.04,height:1.15+(i+j)%3*.16};stems.push(stem);
    for(let level=0;level<3;level++)for(const side of [-1,1]){
      const angle=a+level*.9+(side===1?0:Math.PI),length=.38-level*.045;
      leaves.push({stem,level,base:[sx,stem.y+stem.height*(.35+level*.24),sz],tip:[sx+Math.cos(angle)*length,stem.y+stem.height*(.35+level*.24)+.15,sz+Math.sin(angle)*length]});
    }
  }
  const leaf=new THREE.BufferGeometry();
  leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.14,.45,0,0,.48,.035,.14,.45,0,0,1,0],3));
  leaf.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);leaf.computeVertexNormals();
  const stalks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.022,.033,1,5),new THREE.MeshStandardMaterial({color:'#625e43',roughness:1}),stems.length);
  const blades=new THREE.InstancedMesh(leaf,new THREE.MeshStandardMaterial({color:'#c7d1c2',roughness:.5,metalness:.15,side:THREE.DoubleSide}),leaves.length);
  const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(.065,7,5),new THREE.MeshStandardMaterial({color:'#b3d9df',roughness:.2,metalness:.15,emissive:'#48636b',emissiveIntensity:.32}),leaves.length);
  stalks.castShadow=blades.castShadow=true;stalks.receiveShadow=blades.receiveShadow=true;
  group.add(stalks,blades,drops);group.userData={stems,leaves,stalks,blades,drops};return group;
}
export function updateWindGrass(group,ecology,light){
  const {stems,leaves,stalks,blades,drops}=group.userData,growth=.45+.55*clamp(ecology),dummy=new THREE.Object3D();
  stems.forEach((s,i)=>{dummy.position.set(s.x,s.y+s.height*growth/2,s.z);dummy.scale.set(1,s.height*growth,1);dummy.quaternion.identity();dummy.updateMatrix();stalks.setMatrixAt(i,dummy.matrix);});
  leaves.forEach((p,i)=>{
    const from=new THREE.Vector3(p.base[0],p.stem.y+(p.base[1]-p.stem.y)*growth,p.base[2]);
    const to=new THREE.Vector3(p.stem.x+(p.tip[0]-p.stem.x)*growth,p.stem.y+(p.tip[1]-p.stem.y)*growth,p.stem.z+(p.tip[2]-p.stem.z)*growth),direction=to.clone().sub(from);
    const along=direction.clone().normalize(),across=new THREE.Vector3(-along.z,0,along.x).normalize(),up=across.clone().cross(along);
    dummy.position.copy(from);dummy.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,along,up));
    dummy.scale.set(growth,direction.length(),growth);dummy.updateMatrix();blades.setMatrixAt(i,dummy.matrix);
    dummy.position.copy(to);dummy.quaternion.identity();dummy.scale.setScalar(growth);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);
  });
  blades.material.color.set('#9c8e70').lerp(new THREE.Color('#c7d1c2'),clamp(ecology));
  drops.visible=light==='night';
  for(const mesh of [stalks,blades,drops]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  group.userData.growth=growth;
}
