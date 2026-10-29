import * as THREE from '../assets/vendor/three.module.js';
import {CITIES,ISLANDS,LANDMARKS} from '../src/world-data.js';
import {terrainAt,clamp,reedRiverX} from '../src/terrain.js';
import {ELEMENTS} from './elements.js';
import {habitatOf} from './habitat.js';
import {EMBER_REACH} from '../src/ember-river.js';
import {WIND_GRASS_FOCUS} from '../src/wind-grass.js';
import {FROG_FOCUS} from '../src/moss-frogs.js';
import {BUTTERFLY_FOCUS} from '../src/spire-butterflies.js';
import {SWALLOW_FOCUS} from '../src/ember-swallows.js';

// The settled town, working river and original vegetation keep their ground.
export function landscapeRegions(layouts,trees=[],rocks=[]){
  const protectedPoints=[...EMBER_REACH.map(p=>({...p,r:4})),...[WIND_GRASS_FOCUS,FROG_FOCUS,BUTTERFLY_FOCUS,SWALLOW_FOCUS].map(p=>({...p,r:7})),...trees.map(p=>({...p,r:1.7})),...rocks.map(p=>({...p,r:1.8})),...LANDMARKS.map(p=>({...p,r:12}))];
  for(const l of layouts){
    for(const p of l.homes)protectedPoints.push({...p,r:3.8});
    for(const p of l.fields)protectedPoints.push({...p,r:4});
    for(const s of Object.values(l.sites))for(const p of s.footprint)protectedPoints.push({...p,r:3.5});
    for(const points of [...l.paths,l.approach?.points??[],l.civicApproach?.points??[]])for(const [x,z] of points)protectedPoints.push({x,z,r:3});
    protectedPoints.push({...l.port,r:9});
  }
  const cells=new Map();for(const p of protectedPoints)for(let x=Math.floor((p.x-p.r)/4);x<=Math.floor((p.x+p.r)/4);x++)for(let z=Math.floor((p.z-p.r)/4);z<=Math.floor((p.z+p.r)/4);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);}
  const free=(x,z)=>!(cells.get(Math.floor(x/4)+','+Math.floor(z/4))??[]).some(p=>(p.x-x)**2+(p.z-z)**2<p.r**2)&&!(z>=21&&z<=60&&Math.abs(x-reedRiverX(z))<4);
  return CITIES.map(c=>{
    const island=ISLANDS.find(i=>i.id===c.id),candidates=[];
    for(let x=island.x-island.rx;x<=island.x+island.rx;x+=2)for(let z=island.z-island.rz;z<=island.z+island.rz;z+=2){const t=terrainAt(x,z);if(t.island.id!==c.id||t.height<4||(x-c.x)**2+(z-c.z)**2<17**2||!free(x,z))continue;let count=0;for(let dx=-5;dx<=5;dx+=2)for(let dz=-5;dz<=5;dz+=2)if(dx*dx+dz*dz<=36&&free(x+dx,z+dz)&&terrainAt(x+dx,z+dz).height>2)count++;candidates.push({x,z,y:t.height,score:count});}
    candidates.sort((a,b)=>b.score-a.score||a.x-b.x||a.z-b.z);
    const point=candidates[0];if(!point)throw new Error(`${c.name}没有安全的元素地貌区域`);
    const patches=[point];for(const p of candidates){if(patches.length===3)break;if(patches.every(q=>(p.x-q.x)**2+(p.z-q.z)**2>=15**2))patches.push(p);}
    return {id:c.id,...point,patches,radius:9,free};
  });
}
export function landHeight(x,z,region,shares,intensity=1){
  const patch=(region.patches??[region]).reduce((a,b)=>(a.x-x)**2+(a.z-z)**2<=(b.x-x)**2+(b.z-z)**2?a:b);
  const dx=x-patch.x,dz=z-patch.z,d=Math.hypot(dx,dz),radius=(region.radius??7)*(.55+.45*Math.min(1,intensity)),mask=Math.max(0,1-d/radius)**2*intensity;
  if(!mask||!region.free(x,z)||terrainAt(x,z).height<2.5||(region.id&&terrainAt(x,z).island.id!==region.id))return 0;
  const s=id=>shares[id]??0;
  return mask*(s('earth')*7+s('fire')*(3+Math.abs(Math.sin(dx*1.1))*3)+s('wind')*(1+Math.sin(dx*.8+dz*.3))*2+s('wood')*1.2+s('ice')*(2+Math.abs(Math.sin(dz)))*2-s('water')*1.5);
}
export function createElementLandscape({scene,terrain,layouts,treeList,rockList}){
  const regions=landscapeRegions(layouts,treeList,rockList),geo=terrain.geometry,position=geo.attributes.position,colors=geo.attributes.color;
  const baseHeight=Array.from(position.array),baseColor=Array.from(colors.array),palette=Object.fromEntries(ELEMENTS.map(e=>[e.id,new THREE.Color(e.color)]));
  const root=new THREE.Group();root.name='element-landscapes';scene.add(root);
  const props=regions.map(r=>{const g=new THREE.Group();root.add(g);const items=[];
    // Vegetation, pools and mineral outcrops: environmental forms, not extra spirits.
    for(const [i,e] of ELEMENTS.entries())for(let n=0;n<6;n++){
      const p=r.patches[n%r.patches.length],angle=i*Math.PI/3+n*.3,dist=2+(n>=3?2.3:0);let x=p.x+Math.cos(angle)*dist,z=p.z+Math.sin(angle)*dist;
      if(!r.free(x,z)||terrainAt(x,z).height<3){x=p.x;z=p.z;}
      const geometry=e.id==='water'?new THREE.CircleGeometry(1,16).rotateX(-Math.PI/2):e.id==='wood'?new THREE.ConeGeometry(.7,2,6):e.id==='fire'?new THREE.ConeGeometry(.8,1.6,5):e.id==='earth'?new THREE.DodecahedronGeometry(.7,0):e.id==='wind'?new THREE.TorusGeometry(.7,.12,4,12).rotateX(Math.PI/2):new THREE.OctahedronGeometry(.7,0);
      const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:e.color,roughness:e.id==='water'?.35:1,side:THREE.DoubleSide}));m.position.set(x,terrainAt(x,z).height+.2,z);g.add(m);items.push({m,e,x,z,n,waterBase:e.id==='water'?Array.from(geometry.attributes.position.array):null});}
    return {region:r,items};
  });
  let signature='',last=[];
  return {
    update(data){if(!data)return;const next=JSON.stringify(data.islands.map(c=>[c.count,c.totalForce,c.averageLevel,c.forces.map(e=>[e.share,e.count,e.averageLevel])]));if(next===signature)return;signature=next;last=data.islands;
      for(let i=0;i<position.count;i++){position.setY(i,baseHeight[i*3+1]);colors.setXYZ(i,...baseColor.slice(i*3,i*3+3));}
      for(const group of props){const r=group.region,c=data.islands.find(c=>c.city===r.id),shares=Object.fromEntries(c.forces.map(e=>[e.element,e.share])),habitat=habitatOf(c),intensity=habitat.intensity;
        const tint=new THREE.Color(0,0,0);for(const e of c.forces)tint.add(palette[e.element].clone().multiplyScalar(e.share));
        for(let i=0;i<position.count;i++){const x=position.getX(i),z=position.getZ(i),distance=Math.min(...r.patches.map(p=>Math.hypot(x-p.x,z-p.z)));if(distance>=r.radius||!r.free(x,z)||terrainAt(x,z).height<2.5||terrainAt(x,z).island.id!==r.id)continue;const h=landHeight(x,z,r,shares,intensity);position.setY(i,baseHeight[i*3+1]+h);const mix=new THREE.Color(...baseColor.slice(i*3,i*3+3)).lerp(tint,clamp((1-distance/r.radius)*.6*intensity));colors.setXYZ(i,mix.r,mix.g,mix.b);}
        for(const {m,e,x,z,n,waterBase} of group.items){const f=c.forces.find(f=>f.element===e.id),share=f.share; m.visible=n<Math.min(6,Math.ceil(f.count/4));if(!m.visible)continue;
          const size=(.35+share*.9)*(.7+(f.averageLevel??1)*.16)*(.65+intensity*.35);
          if(e.id==='water'){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){const dx=waterBase[i*3]*size,dz=waterBase[i*3+2]*size;a.setXYZ(i,dx,terrainAt(x+dx,z+dz).height+landHeight(x+dx,z+dz,r,shares,intensity)+.09,dz);}a.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();m.position.y=0;}
          else{m.scale.setScalar(size);m.position.y=terrainAt(x,z).height+landHeight(x,z,r,shares,intensity)+size*(e.id==='wind'?.12:.65);}
        }
      }
      position.needsUpdate=colors.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
    },
    point:id=>regions.find(r=>r.id===id),
    stats:()=>regions.map(r=>({city:r.id,x:r.x,z:r.z,patches:r.patches.length,vertices:r.score,visibleForms:props.find(p=>p.region===r).items.filter(i=>i.m.visible).length,reading:last.find(c=>c.city===r.id)})),
    dispose(){root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});root.removeFromParent();}
  };
}
