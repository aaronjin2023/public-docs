import * as THREE from '../assets/vendor/three.module.js';
import {reedRiverX,reedBedAt} from './terrain.js';

export const REED_REACH=Array.from({length:273},(_,i)=>{const z=24+i*.125;return {x:reedRiverX(z),y:reedBedAt(z)+.5,z};});

// Include object radius and the gaps between samples, not just the centre of a rock.
export const nearReedRiver=(x,z,radius=0)=>REED_REACH.some(p=>Math.hypot(x-p.x,z-p.z)<radius+.8);

export function createReedRiver(){
  const vertices=[];
  for(let i=1;i<REED_REACH.length;i++){
    const a=REED_REACH[i-1],b=REED_REACH[i];
    const al=[a.x-.65,a.y,a.z],ar=[a.x+.65,a.y,a.z],bl=[b.x-.65,b.y,b.z],br=[b.x+.65,b.y,b.z];
    vertices.push(...al,...bl,...ar,...ar,...bl,...br);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#579a92',roughness:.55}));mesh.receiveShadow=true;return mesh;
}
