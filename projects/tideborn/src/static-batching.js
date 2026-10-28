import * as THREE from '../assets/vendor/three.module.js';

// Only explicitly registered static meshes are merged; animated parents and policy visibility survive.
export function batchStaticMeshes(meshes) {
  const parents=new Map();let removed=0,batches=0;
  for(const mesh of meshes){
    if(!mesh.parent||mesh.material.transparent)continue;
    if(!parents.has(mesh.parent))parents.set(mesh.parent,new Map());
    const materials=parents.get(mesh.parent);
    if(!materials.has(mesh.material))materials.set(mesh.material,[]);
    materials.get(mesh.material).push(mesh);
  }
  for(const [parent,materials] of parents)for(const [material,group] of materials){
    if(group.length<2)continue;
    const positions=[],normals=[];
    for(const mesh of group){
      mesh.updateMatrix();
      const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrix);
      for(const n of geometry.attributes.position.array)positions.push(n);
      for(const n of geometry.attributes.normal.array)normals.push(n);
      geometry.dispose();parent.remove(mesh);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    const batch=new THREE.Mesh(geometry,material);batch.castShadow=batch.receiveShadow=true;
    parent.add(batch);removed+=group.length;batches++;
  }
  return {meshes:removed,batches,savedDraws:removed-batches};
}

export function removeSubmergedFaces(geometry,waterFloor=-1) {
  const p=geometry.attributes.position,index=geometry.index.array,visible=[];
  for(let i=0;i<index.length;i+=3){
    if([index[i],index[i+1],index[i+2]].some(j=>p.getY(j)>=waterFloor))visible.push(index[i],index[i+1],index[i+2]);
  }
  geometry.setIndex(visible);
}
