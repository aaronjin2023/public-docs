import * as THREE from '../assets/vendor/three.module.js';
import {clamp,elevation} from './terrain.js';

export const FIELD_STAGES=[
  {name:'育苗',soil:'#7d8565',crop:'#8ba96c',height:.18},
  {name:'青穗',soil:'#8b9270',crop:'#6a964e',height:.62},
  {name:'收割',soil:'#a99b6c',crop:'#cfb85a',height:.48},
  {name:'休田',soil:'#80796a',crop:'#ad9d72',height:.055},
];
export const foodSeasons=city=>city.food/(city.population*.24);
export const grainLevels=city=>Array.from({length:8},(_,i)=>clamp(foodSeasons(city)-i));
const shape=new THREE.Object3D();
function boxes(parent,material,items){
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,items.length);
  items.forEach(([x,y,z,w,h,d],i)=>{shape.position.set(x,y,z);shape.scale.set(w,h,d);shape.updateMatrix();mesh.setMatrixAt(i,shape.matrix);});
  mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}

// Eight open bays stand on the existing dock; each bay represents one season, capped at eight.
export function createFoodStore(port,angle,wood,cloth){
  const group=new THREE.Group();group.position.set(port.x,0,port.z);group.rotation.y=angle;
  const frame=[[0,1.12,1.55,1.68,.12,3.2],[0,2.05,-.04,1.6,.4,.08]];
  for(const x of [-.78,-.19,.19,.78])frame.push([x,1.43,1.55,.06,.52,3.2]);
  for(const x of [-.48,.48])for(let r=0;r<=4;r++)frame.push([x,1.43,.05+r*.75,.58,.52,.05]);
  for(const x of [-.72,.72])frame.push([x,1.7,-.04,.07,1.1,.08]);
  boxes(group,wood,frame);
  boxes(group,cloth,Array.from({length:8},(_,i)=>[-.56+i*.16,2.06,.01,.055,.22,.02]));
  const grainMaterial=new THREE.MeshStandardMaterial({color:'#d2b46b',roughness:1});
  const grain=boxes(group,grainMaterial,Array.from({length:8},()=>[0,0,0,0,0,0]));
  group.userData={grain,levels:[],focus:{x:port.x+Math.sin(angle)*1.55,y:1.5,z:port.z+Math.cos(angle)*1.55}};
  return group;
}
export function updateFoodStore(group,city){
  const levels=grainLevels(city),grain=group.userData.grain;
  levels.forEach((level,i)=>{
    const h=level*.48;shape.position.set(i%2?.48:-.48,1.2+h/2,.425+Math.floor(i/2)*.75);shape.scale.set(level?.50:0,h,.64);shape.updateMatrix();grain.setMatrixAt(i,shape.matrix);
  });
  grain.instanceMatrix.needsUpdate=true;grain.computeBoundingSphere();
  group.userData.levels=levels;group.userData.seasons=foodSeasons(city);
}
export function createFields(plots,wood){
  const group=new THREE.Group(),soil=new THREE.MeshStandardMaterial({color:'#8b9270',roughness:1});
  const terraces=[],rows=[],plants=[];
  for(const p of plots){
    const low=Math.min(...p.footprint.map(q=>elevation(q.x,q.z))),y=p.y;
    terraces.push([p.x,(y+low)/2,p.z,2.2,y-low+.08,2.3]);
    for(let row=0;row<6;row++){
      const z=p.z-1+row*.4;rows.push([p.x,y+.06,z,2.1,.06,.05]);
      for(let col=0;col<4;col++)plants.push({x:p.x-.8+col*.53,y:y+.1,z});
    }
  }
  boxes(group,soil,terraces);boxes(group,wood,rows);
  const crop=new THREE.InstancedMesh(new THREE.ConeGeometry(.12,1,4),new THREE.MeshStandardMaterial({color:'#6a964e',roughness:1}),plants.length);
  crop.castShadow=crop.receiveShadow=true;group.add(crop);
  group.userData={soil,crop,plants,focus:{x:plots.reduce((n,p)=>n+p.x,0)/plots.length,y:Math.max(...plots.map(p=>p.y))+1,z:plots.reduce((n,p)=>n+p.z,0)/plots.length}};
  return group;
}
export function updateFields(group,city,tick){
  const stage=FIELD_STAGES[tick%4],{soil,crop,plants}=group.userData,height=stage.height*(.3+.7*city.ecology);
  soil.color.set('#a18c6c').lerp(new THREE.Color(stage.soil),city.ecology);
  crop.material.color.set('#988e6c').lerp(new THREE.Color(stage.crop),city.ecology);
  plants.forEach((p,i)=>{shape.position.set(p.x,p.y+height/2,p.z);shape.scale.setScalar(1);shape.scale.y=height;shape.updateMatrix();crop.setMatrixAt(i,shape.matrix);});
  crop.instanceMatrix.needsUpdate=true;crop.computeBoundingSphere();
  group.userData.stage=stage.name;group.userData.height=height;
}
