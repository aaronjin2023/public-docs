import {batchStaticMeshes,removeSubmergedFaces} from './static-batching.js';
import {createShipmentOverlay} from './shipment-scene.js';
import {walkStops} from './city-walk.js';
import {createHarbourDetails} from './harbour-scene.js';
import {harbourPort,harbourApproach,civicApproach,nearApproach,groundPathGeometry,createPathSteps} from './harbour-approach.js?v=mobile-4';
import {createEmberSwallows,updateEmberSwallows,SWALLOW_FOCUS} from './ember-swallows.js';
import {createEmberRiver,updateEmberRiver,nearEmberRiver} from './ember-river.js';
import {createReedRiver,nearReedRiver} from './reed-river.js';
import {createReedHerons,updateReedHerons,HERON_FOCUS} from './reed-herons.js';
import {createWindGrass,updateWindGrass,WIND_GRASS_FOCUS} from './wind-grass.js';
import {createMossFrogs,updateMossFrogs,FROG_FOCUS} from './moss-frogs.js';
import {createSpireButterflies,updateSpireButterflies,BUTTERFLY_FOCUS} from './spire-butterflies.js';
import {updateNurseryFish} from './nursery-fish.js';
import {GARDEN,createGarden,nearGarden} from './garden.js';
import {FOLD,createFoldCliff} from './fold-cliff.js';
import {placeMapLabel} from './map-labels.js';
import {BELL,BELL_STEPS,createBellRuin,bellInscription} from './bell-ruin.js';
import {createSeaRouter,createSeaJourney} from './sea-routes.js';
import {createFoodStore,updateFoodStore,createFields,updateFields} from './food-scene.js';
import {bindOrbitPointers} from './orbit-input.js';
import {openGraphicsContext} from './render-support.js?v=mobile-4';
import {createArtRenderer} from './art-renderer.js?v=mobile-4';
import * as THREE from '../assets/vendor/three.module.js';
import { CITIES, ISLANDS, LANDMARKS, SEED } from './world-data.js';
import { terrainAt, baseTerrainAt, elevation, noise, random, clamp, reedRiverX } from './terrain.js';
import { settlementLayout, infrastructureSite, fieldPlots } from './settlement-layout.js';
import {pendingPetitions} from './residents.js';
import {waterHeightAt,transportFor} from './simulation.js';
import {createCivicTraces,syncCivicTraces,CIVIC_RIVER_Z} from './civic-traces.js';

const TAU=Math.PI*2;
const color=c=>new THREE.Color(c);
const mat=(c,other={})=>new THREE.MeshStandardMaterial({color:c,roughness:1,...other});
const dummy=new THREE.Object3D();

export function createScene(container, onSelect, lightweight=false, extensionFactory=null) {
  const scene=new THREE.Scene();
  scene.background=color('#c6d8d6');
  scene.fog=new THREE.FogExp2('#c6d8d6',.0018);
  const surface=document.createElement('canvas');
  const graphics=openGraphicsContext(surface,lightweight);lightweight=graphics.lightweight;
  const renderer=new THREE.WebGLRenderer({canvas:surface,context:graphics.context});
  const art=createArtRenderer(renderer,lightweight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,lightweight?1:1.7));
  renderer.setSize(container.clientWidth,container.clientHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=!lightweight; renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label','可旋转、缩放的潮生群岛。城镇也可从导航列表进入。');
  renderer.domElement.setAttribute('role','img');
  container.append(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(42,container.clientWidth/container.clientHeight,.5,1800);
  const hemi=new THREE.HemisphereLight('#e3f1ed','#50635a',2.25); scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff0d0',3.2);
  sun.position.set(-90,150,70); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-145,right:145,top:130,bottom:-130,near:1,far:400});
  sun.shadow.bias=-.001; sun.shadow.normalBias=.45; scene.add(sun);

  const landGeometry=new THREE.PlaneGeometry(268,226,268,226); landGeometry.rotateX(-Math.PI/2);
  const positions=landGeometry.attributes.position, colors=[];
  const palettes={
    meadow:['#b6b782','#719c76','#597b64','#969384'],
    forest:['#a7b78a','#689471','#476f5d','#7a8970'],
    volcanic:['#b4a895','#8f9579','#727e6b','#6e7472'],
    alpine:['#bfc4a6','#96aa83','#8f9990','#d6d7c5'],
    wetland:['#b4bd8b','#8aaa70','#698a5e','#8ca379'],
    dry:['#d1c5a1','#b9b48a','#9f9e7c','#b3ad94'],
    ruins:['#b9bb99','#8fa284','#738d7a','#a8aa97'],
  };
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),z=positions.getZ(i),{height:h,island}=terrainAt(x,z);
    positions.setY(i,h);
    const p=palettes[island.biome];
    let c=h<0?color('#528e86'):h<1.6?color('#ded3ad'):h<4?color(p[0]):h<12?color(p[1]):h<20?color(p[2]):color(p[3]);
    c.multiplyScalar(.90+noise(x*.6,z*.6)*.18);
    colors.push(c.r,c.g,c.b);
  }
  landGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  landGeometry.computeVertexNormals();
  if(lightweight)removeSubmergedFaces(landGeometry);
  const terrain=new THREE.Mesh(landGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));
  terrain.receiveShadow=true; scene.add(terrain);

  const depthData=new Uint8Array(positions.count);
  for(let i=0;i<positions.count;i++)depthData[i]=Math.round(clamp((positions.getY(i)+4)/44)*255);
  const depthMap=new THREE.DataTexture(depthData,269,227,THREE.RedFormat);
  depthMap.magFilter=depthMap.minFilter=THREE.LinearFilter;depthMap.needsUpdate=true;
  const waterMaterial=new THREE.ShaderMaterial({
    uniforms:{time:{value:0},light:{value:1},waterColor:{value:color('#19535c')},shallowColor:{value:color('#529b91')},depthMap:{value:depthMap}},
    vertexShader:`varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform float time;uniform float light;uniform vec3 waterColor;uniform vec3 shallowColor;uniform sampler2D depthMap;varying vec3 vWorld;
      void main(){vec2 p=vWorld.xz;float wave=sin(p.x*.55+p.y*.24+time*.65)*sin(p.y*.44-p.x*.15+time*.4);
      float shimmer=pow(max(0.,sin(p.x*.37+p.y*.15+sin(p.y*.19)+time)*sin(p.y*.49-p.x*.12+time*.37)),25.);
      float broad=sin(p.x*.032+p.y*.05+time*.07)*.025;
      vec2 uv=(p+vec2(134.,113.))/vec2(268.,226.);
      float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
      float h=texture2D(depthMap,uv).r*44.-4.;
      float shoal=smoothstep(-3.8,.5,h)*inside;
      vec3 c=mix(waterColor,shallowColor,shoal*.72)+wave*.004+broad*.20+shimmer*.025;
      gl_FragColor=vec4(c*light,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),waterMaterial);ocean.rotation.x=-Math.PI/2;ocean.position.y=.4;scene.add(ocean);
  const shorePositions=[];
  for(let z=-110;z<110;z+=1.4)for(let x=-132;x<132;x+=1.4){
    const h=elevation(x,z);
    if(h>-.20&&h<.25){shorePositions.push(x,.56,z,x+1.1,.56,z+.16);}
  }
  const foamGeo=new THREE.BufferGeometry();foamGeo.setAttribute('position',new THREE.Float32BufferAttribute(shorePositions,3));
  const foam=new THREE.LineSegments(foamGeo,new THREE.LineBasicMaterial({color:'#cbded0',transparent:true,opacity:.3}));scene.add(foam);

  const layouts=CITIES.map(c=>{
    const layout=settlementLayout(c),occupied=[];
    layout.sites={};
    for(const [index,id] of [[0,'water'],[1,'commons'],[2,'school'],[4,'mine']]){
      const site=infrastructureSite(c,layout.homes,index,occupied);occupied.push(site);layout.sites[id]=site;
    }
    if(c.id==='reed')layout.sites.civic={x:reedRiverX(CIVIC_RIVER_Z),z:CIVIC_RIVER_Z,footprint:[-2,0,2,4].flatMap(dx=>[-3,0,3].map(dz=>({x:reedRiverX(CIVIC_RIVER_Z)+dx,z:CIVIC_RIVER_Z+dz})))};
    else layout.sites.civic=infrastructureSite(c,layout.homes,5,occupied);
    layout.fields=fieldPlots(c,layout);
    layout.port=harbourPort(c);layout.approach=harbourApproach(c,layout,layout.port);layout.civicApproach=civicApproach(c,layout);
    return layout;
  });
  const rng=random(SEED), treeList=[], rockList=[];
  for(let i=0;i<21000;i++){
    const x=rng()*246-123,z=rng()*206-103,{height:h,island}=baseTerrainAt(x,z);
    if(h<2||h>28||nearEmberRiver(x,z)||CITIES.some((c,i)=>Math.hypot(x-c.x,z-c.z)<4||layouts[i].homes.some(p=>Math.hypot(x-p.x,z-p.z)<2)||layouts[i].fields.some(p=>Math.abs(x-p.x)<2.3&&Math.abs(z-p.z)<2.3)||Object.values(layouts[i].sites).some(site=>site.footprint.some(p=>Math.hypot(x-p.x,z-p.z)<2.4)))||LANDMARKS.some(c=>Math.hypot(x-c.x,z-c.z)<4))continue;
    const r=rng();
    if(r<.15){rockList.push({x,z,h,s:.4+rng()*1.5});continue;}
    const density=island.biome==='forest'?.75:island.biome==='dry'?.07:island.biome==='volcanic'?.18:.40;
    if(rng()>density||noise(x*.21,z*.21)<.28)continue;
    if(island.id==='reed'&&z>23&&Math.abs(x-reedRiverX(z))<2)continue;
    treeList.push({x,z,h,island:island.id,s:.55+rng()*.9,pine:island.biome==='alpine'||island.biome==='volcanic',v:rng()});
  }
  // Filter after all random draws so a new path never reshuffles retained trees or house dimensions.
  for(const list of [treeList,rockList])for(let i=list.length-1;i>=0;i--)if(nearReedRiver(list[i].x,list[i].z,list[i].s)||nearGarden(list[i].x,list[i].z,list[i].s+.35)||layouts.some(l=>[l.approach,l.civicApproach].some(r=>r&&nearApproach(list[i].x,list[i].z,r,list[i].s+.35))))list.splice(i,1);
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.20,1,5),mat('#685e47'),treeList.length);
  const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),mat('#557e62'),treeList.length);
  const pine=new THREE.InstancedMesh(new THREE.ConeGeometry(1,2.8,6),mat('#526f5d'),treeList.filter(t=>t.pine).length);
  let pi=0;
  treeList.forEach((t,i)=>{
    dummy.position.set(t.x,t.h+t.s*.7,t.z);dummy.rotation.set(0,t.v*TAU,0);dummy.scale.set(t.s,t.s*1.6,t.s);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);
    dummy.position.y=t.h+t.s*2.0;dummy.scale.set(t.s,t.s*.95,t.s);dummy.updateMatrix();
    if(t.pine){t.pineIndex=pi;pine.setMatrixAt(pi++,dummy.matrix);dummy.scale.setScalar(0);dummy.updateMatrix();}
    leaves.setMatrixAt(i,dummy.matrix);
    const c=color(t.v>.65?'#80936a':t.v>.3?'#577e5e':'#3f6e59');leaves.setColorAt(i,c);
  });
  for(const mesh of [trunk,leaves,pine]){mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}
  const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),mat('#a4a99a'),rockList.length);
  rockList.forEach((r,i)=>{dummy.position.set(r.x,r.h+.15,r.z);dummy.rotation.set(r.x,r.z,0);dummy.scale.set(r.s,r.s*.65,r.s*.7);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);});
  rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);

  const emberRiver=createEmberRiver();scene.add(emberRiver);
  const reedHerons=createReedHerons();scene.add(reedHerons);
  const windGrass=createWindGrass();scene.add(windGrass);
  const mossFrogs=createMossFrogs();scene.add(mossFrogs);
  const spireButterflies=createSpireButterflies();scene.add(spireButterflies);
  const emberSwallows=createEmberSwallows();scene.add(emberSwallows);
  const cityGroups=[],ports=layouts.map(l=>l.port),animators=[],fields=[],beacons=[];
  const lanternMaterial=mat('#e9cf94',{emissive:'#ffca72',emissiveIntensity:0});
  const windowMaterial=new THREE.MeshStandardMaterial({color:'#334c44',roughness:1,emissive:'#e8bc72',emissiveIntensity:0});
  const houseGeometry=new THREE.BoxGeometry(1,1,1);
  const roofGeometry=new THREE.BufferGeometry();
  roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
    -.6,0,-.6,.6,0,-.6,0,.55,-.6, -.6,0,.6,0,.55,.6,.6,0,.6,
    -.6,0,-.6,0,.55,-.6,0,.55,.6, -.6,0,-.6,0,.55,.6,-.6,0,.6,
    .6,0,-.6,.6,0,.6,0,.55,.6, .6,0,-.6,0,.55,.6,0,.55,-.6,
  ],3));
  const roofIndices=[];for(let i=0;i<roofGeometry.attributes.position.count;i+=3)roofIndices.push(i,i+2,i+1);
  roofGeometry.setIndex(roofIndices);roofGeometry.computeVertexNormals();
  const staticMeshes=[];
  function mesh(geo,material,x,y,z,parent=scene){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);staticMeshes.push(m);return m;}
  const stone=mat('#dedac4'),darkStone=mat('#8d9c96'),wood=mat('#806c51'),cloth=mat('#f0e8ce'),brass=mat('#b49c67');
  const pathsMaterial=mat('#c4bea0');
  function path(points,width=.6){
    const m=new THREE.Mesh(groundPathGeometry(points,width),pathsMaterial);m.receiveShadow=true;scene.add(m);return m;
  }
  function hall(x,z,sx,sz,height,wall,roof,parent){
    const hs=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,b])=>elevation(x+a*sx/2,z+b*sz/2));
    const floor=Math.max(...hs),low=Math.min(...hs)-.2;
    mesh(new THREE.BoxGeometry(sx+.2,floor-low+.1,sz+.2),darkStone,x,(floor+low)/2,z,parent);
    mesh(new THREE.BoxGeometry(sx,height,sz),wall,x,floor+height/2,z,parent);
    mesh(roofGeometry,roof,x,floor+height,z,parent).scale.set(sx/1.05,1.8,sz/1.05);
    return floor;
  }
  CITIES.forEach((c,ci)=>{
    const layout=layouts[ci],g=new THREE.Group();scene.add(g);cityGroups.push(g);
    const wall=mat(ci===1?'#9d9c8a':ci===2?'#b9b696':ci===5?'#d1c19b':'#e1d9bd');
    const roof=mat(['#ab7960','#7e8d86','#6f8d7c','#7e9499','#8f9a6f','#a39d82'][ci]);
    const houses=new THREE.InstancedMesh(houseGeometry,wall,66),roofs=new THREE.InstancedMesh(roofGeometry,roof,66);
    const footings=new THREE.InstancedMesh(houseGeometry,darkStone,66);
    const windows=new THREE.InstancedMesh(new THREE.BoxGeometry(.22,.26,.035),windowMaterial,132);
    const doors=new THREE.InstancedMesh(new THREE.BoxGeometry(.23,.50,.04),wood,66);
    layout.homes.forEach(({x,z,yaw},idx)=>{
      const sx=.95+rng()*.55,sz=.8+rng()*.5,sy=.85+rng()*.65,co=Math.cos(yaw),si=Math.sin(yaw);
      const point=(a,b)=>[x+a*co+b*si,z-a*si+b*co];
      const hs=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,b])=>elevation(...point(a*sx/2,b*sz/2)));
      const h=Math.max(...hs),low=Math.min(...hs)-.15;
      dummy.rotation.set(0,yaw,0);dummy.position.set(x,(h+low)/2,z);dummy.scale.set(sx+.12,h-low+.15,sz+.12);dummy.updateMatrix();footings.setMatrixAt(idx,dummy.matrix);
      dummy.position.set(x,h+sy/2,z);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();houses.setMatrixAt(idx,dummy.matrix);
      houses.setColorAt(idx,color('#ffffff').multiplyScalar(.84+rng()*.16));
      dummy.position.set(x,h+sy,z);dummy.updateMatrix();roofs.setMatrixAt(idx,dummy.matrix);
      roofs.setColorAt(idx,color('#ffffff').multiplyScalar(.76+rng()*.24));
      for(let k=0;k<2;k++){const [wx,wz]=point((k?-.3:.3)*sx,sz/2+.02);dummy.position.set(wx,h+sy*.67,wz);dummy.scale.set(1,1,1);dummy.updateMatrix();windows.setMatrixAt(idx*2+k,dummy.matrix);}
      const [dx,dz]=point(0,sz/2+.03);dummy.position.set(dx,h+.25,dz);dummy.updateMatrix();doors.setMatrixAt(idx,dummy.matrix);
    });
    for(const m of [houses,roofs,footings,windows,doors]){m.castShadow=true;m.receiveShadow=true;g.add(m);}
    g.userData={houses,roofs,footings,windows,doors,buildingCount:layout.homes.length,policies:{}};
    const y=elevation(c.x,c.z);
    mesh(new THREE.CylinderGeometry(2.8,2.9,.35,32),stone,c.x,y+.1,c.z,g);
    if(ci===0){
      mesh(new THREE.CylinderGeometry(.9,1.2,7,10),stone,c.x,y+3.5,c.z,g);
      mesh(new THREE.CylinderGeometry(1.1,1.1,.9,10),lanternMaterial,c.x,y+7,c.z,g);
      mesh(new THREE.ConeGeometry(1.4,1.4,10),roof,c.x,y+8,c.z,g);
      for(let k=0;k<5;k++){const a=k*.6,x=c.x+Math.cos(a)*4,z=c.z+Math.sin(a)*4;
        hall(x,z,1.6,1.2,.65,wood,cloth,g);}
    }else if(ci===1){
      for(let k=0;k<3;k++){
        const x=c.x+(k-1)*1.6,z=c.z,y=elevation(x,z);
        mesh(new THREE.SphereGeometry(.95,10,6,0,TAU,0,Math.PI/2),darkStone,x,y+.2,z,g);
        mesh(new THREE.CylinderGeometry(.25,.4,2.2,6),darkStone,x,y+1.6,z,g);
        mesh(new THREE.BoxGeometry(.45,.3,.1),mat('#d18952'),x,y+.4,z+.8,g);
      }
    }else if(ci===2){
      hall(c.x,c.z,4.4,2.8,1.2,wood,roof,g);
      for(let k=0;k<5;k++)mesh(new THREE.CylinderGeometry(.1,.13,2,5),wood,c.x-2+k,y+.9,c.z+1.8,g);
      const awning=mesh(new THREE.BoxGeometry(4.8,.15,1.3),roof,c.x,y+2.1,c.z+1.8,g);awning.rotation.x=.17;
    }else if(ci===3){
      mesh(new THREE.CylinderGeometry(1.4,1.9,8,8),stone,c.x,y+4,c.z,g);
      mesh(new THREE.SphereGeometry(2,16,8,0,TAU,0,Math.PI/2),brass,c.x,y+8,c.z,g).scale.y=.7;
      for(let k=0;k<3;k++)mesh(new THREE.TorusGeometry(1.5,.12,5,16),brass,c.x,y+1.7+k*2,c.z,g).rotation.x=Math.PI/2;
      for(let k=0;k<7;k++)mesh(new THREE.BoxGeometry(2.7,.18,1.4),stone,c.x,y+.12*k,c.z+2+k*.55,g);
    }else if(ci===4){
      hall(c.x,c.z,3.5,2.8,1.7,wood,roof,g);
      for(const dx of [-1.1,1.1])for(const dz of [-.9,.9])mesh(new THREE.CylinderGeometry(.15,.23,2.4,5),wood,c.x+dx,y-.4,c.z+dz,g);
    }else{
      mesh(new THREE.CylinderGeometry(.8,1.5,5,8),wall,c.x,y+2.5,c.z,g);
      mesh(new THREE.ConeGeometry(1.5,1.4,8),roof,c.x,y+5.5,c.z,g);
      const blades=new THREE.Group();blades.position.set(c.x,y+4,c.z+1.25);g.add(blades);
      for(let k=0;k<4;k++){const arm=new THREE.Group();arm.rotation.z=k*Math.PI/2;mesh(new THREE.BoxGeometry(.65,3,.1),cloth,0,1.8,0,arm);blades.add(arm);}
      animators.push(t=>{blades.rotation.z=t*.22;});
      for(let k=0;k<3;k++){
        const x=c.x-4+k*2,z=c.z-3,h=elevation(x,z);
        for(const dx of [-.8,.8])mesh(new THREE.CylinderGeometry(.07,.1,3.3,4),wood,x+dx,h+1.5,z,g);
        mesh(new THREE.BoxGeometry(1.6,1.8,.06),cloth,x,h+2,z,g);
      }
    }
    layout.paths.forEach(points=>path(points,.3));
    if(ci===4){
      g.add(createReedRiver());
      for(const z of [29,39]){
        const x=reedRiverX(z),h=Math.max(elevation(x-2,z),elevation(x+2,z))+.6;
        mesh(new THREE.BoxGeometry(4.7,.25,1.15),wood,x,h,z);
        for(const side of [-1,1])mesh(new THREE.BoxGeometry(4.7,.12,.12),wood,x,h+.65,z+side*.6);
      }
      const wheel=new THREE.Group(),z=34,x=reedRiverX(z)-.8,h=elevation(x,z)+.9;wheel.position.set(x,h,z);g.add(wheel);
      mesh(new THREE.TorusGeometry(.95,.14,5,12),wood,0,0,0,wheel).rotation.y=Math.PI/2;
      for(let k=0;k<8;k++){const blade=mesh(new THREE.BoxGeometry(.8,.18,1.9),wood,0,0,0,wheel);blade.rotation.x=k*Math.PI/4;}
      animators.push(t=>{wheel.rotation.x=t*.18;});
    }
    if(layout.fields.length){
      const group=createFields(layout.fields,wood);g.add(group);fields.push({ci,group});
    }
    const port=layout.port,angle=port.angle;
    g.userData.walk=walkStops(c,layout,{...port,angle});
    const store=createFoodStore(port,angle,wood,cloth);g.add(store);g.userData.foodStore=store;
    const dock=mesh(new THREE.BoxGeometry(1.7,.32,7),wood,port.x,.9,port.z);dock.rotation.y=angle;
    for(let k=0;k<4;k++)mesh(new THREE.CylinderGeometry(.13,.13,2.2,5),wood,port.x+Math.sin(angle)*k*1.5,.25,port.z+Math.cos(angle)*k*1.5);
    path(layout.approach.points,.14);g.add(createPathSteps(layout.approach,wood));
    const traces=createCivicTraces(c,layout.sites.civic,port,angle,{stone,darkStone,wood,cloth,brass});
    g.userData.traces=traces;g.userData.ferry=traces.ferry;
    Object.values(traces).forEach(trace=>g.add(trace));
    if(layout.civicApproach){const access=new THREE.Group();access.add(path(layout.civicApproach.points,.14),createPathSteps(layout.civicApproach,stone,layout.civicApproach.height));g.add(access);g.userData.civicAccess=access;}

    const harbour=createHarbourDetails(c,port,angle,lanternMaterial);g.add(harbour);g.userData.harbour=harbour;
    const lightX=port.x+(c.id==='spire'?2.6:1.8);
    const beacon=new THREE.PointLight('#ffcf87',0,12,2);beacon.position.set(lightX,3.5,port.z);scene.add(beacon);beacons.push(beacon);
    for(const id of ['water','commons','school','port','mine']){
      const levels=[];g.userData.policies[id]=levels;
      for(let level=0;level<3;level++){
        const group=new THREE.Group();group.visible=false;g.add(group);levels.push(group);
        const site=layout.sites[id];
        if(id==='port'){
          group.position.set(port.x+Math.sin(angle)*3,.9,port.z+Math.cos(angle)*3);group.rotation.y=angle;
          const offset=level*3+1.5;
          mesh(new THREE.BoxGeometry(5,.3,2.7),wood,0,0,offset,group);
          for(const side of [-1,1]){
            mesh(new THREE.CylinderGeometry(.13,.13,2.2,5),wood,side*2.1,-.6,offset,group);
            mesh(new THREE.BoxGeometry(.8,.7,.8),brass,side*1.7,.5,offset,group);
          }
          continue;
        }
        const x=site.x+(level-1)*1.7,z=site.z,h=elevation(x,z);
        if(id==='water'){
          mesh(new THREE.CylinderGeometry(.9,.95,.5,12),stone,x,h+.2,z,group);
          mesh(new THREE.CylinderGeometry(.72,.72,.04,12),mat('#579a92'),x,h+.47,z,group);
          mesh(new THREE.BoxGeometry(.7,.25,3.8),stone,x,h+.1,z+1.9,group);
          mesh(new THREE.BoxGeometry(.4,.04,3.7),mat('#579a92'),x,h+.24,z+1.9,group);
          for(const dz of [1.2,3.5]){
            const base=elevation(x,z+dz),height=Math.max(.15,h+.1-base);
            mesh(new THREE.CylinderGeometry(.16,.22,height,5),stone,x,h+.1-height/2,z+dz,group);
          }
        }else if(id==='commons'){
          for(let k=0;k<3;k++){
            const tz=z+(k-1)*1.7,ty=elevation(x,tz);
            mesh(new THREE.CylinderGeometry(.1,.16,1.3,5),wood,x,ty+.65,tz,group);
            mesh(new THREE.IcosahedronGeometry(.95,0),mat('#65945f'),x,ty+1.9,tz,group);
          }
        }else if(id==='school'){
          hall(x,z,1.5,3.2,1.5,stone,roof,group);
          for(const dz of [-.8,.8])mesh(new THREE.CylinderGeometry(.1,.15,1.8,5),stone,x+.9,h+.8,z+dz,group);
        }else{
          mesh(new THREE.CylinderGeometry(.65,.85,1.1,8),darkStone,x,h+.5,z,group);
          mesh(new THREE.CylinderGeometry(.2,.32,3.5,6),darkStone,x,h+2.1,z,group);
          mesh(new THREE.BoxGeometry(.48,.38,.10),mat('#cc8554',{emissive:'#a65220',emissiveIntensity:.5}),x,h+.45,z+.67,group);
        }
      }
    }
  });

  const walkers=[];
  layouts.forEach((layout,ci)=>{
    const routes=layout.paths.map(points=>points.filter(([x,z])=>elevation(x,z)>1).map(([x,z])=>new THREE.Vector3(x,elevation(x,z)+.12,z))).filter(p=>p.length>1);
    for(let i=0;i<15;i++)walkers.push({ci,index:i,points:routes[i%routes.length],phase:rng(),speed:.7+rng()*.6,visible:i<12});
  });
  const coats=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.2,.43,5),mat('#d5c3a1'),walkers.length);
  const heads=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.13,0),mat('#b18b6c'),walkers.length);
  coats.castShadow=heads.castShadow=true;coats.frustumCulled=heads.frustumCulled=false;scene.add(coats,heads);
  walkers.forEach((w,i)=>coats.setColorAt(i,color(['#c29b72','#879795','#a9b18b','#ddd4b3','#b7a176','#d0c4a6'][w.ci]).multiplyScalar(.7+w.phase*.35)));

  // The abandoned city is low enough to meet the visible tide.
  for(let i=0;i<13;i++){
    const x=-3+Math.cos(i*2.4)*Math.sqrt(i)*1.5,z=69+Math.sin(i*2.4)*Math.sqrt(i)*1.5,h=elevation(x,z);
    mesh(new THREE.BoxGeometry(.9,1.5+(i%4)*.6,.9),darkStone,x,h+.7,z);
  }
  const oldPortSteps=BELL_STEPS.map(s=>s.top);
  for(const {x,z,top,bottom} of BELL_STEPS)mesh(new THREE.BoxGeometry(3,top-bottom,.44),darkStone,x,(top+bottom)/2,z);
  scene.add(createBellRuin(bellInscription(document.createElement('canvas'))));
  const garden=createGarden(lanternMaterial);scene.add(garden);beacons.push(garden.userData.light);

  scene.add(createFoldCliff());

  const routes=[],boats=[];
  const seaRoute=createSeaRouter(ports);
  const connections=[[0,1],[0,2],[0,3],[0,4],[3,5],[4,5],[2,4]];
  connections.forEach(([a,b],i)=>{
    const path=seaRoute(ports[a],ports[b]);if(!path||path.length<2)return;const pts=path.map(p=>new THREE.Vector3(p.x,1.5,p.z));
    const geom=new THREE.BufferGeometry().setFromPoints(pts);
    const line=new THREE.Line(geom,new THREE.LineDashedMaterial({color:'#b6c2bd',dashSize:1.2,gapSize:1.6,transparent:true,opacity:.45}));
    line.computeLineDistances();line.visible=false;scene.add(line);routes.push(line);
    const journey=createSeaJourney(pts);
    for(let j=0;j<2;j++){
      const boat=new THREE.Group();scene.add(boat);
      const hull=mesh(new THREE.ConeGeometry(.65,2.2,4),wood,0,.2,0,boat);hull.rotation.x=Math.PI/2;hull.scale.y=.9;
      mesh(new THREE.CylinderGeometry(.05,.06,2.7,4),wood,0,1.5,0,boat);
      const sailGeo=new THREE.BufferGeometry();sailGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,2.8,0,0,.9,0,1.3,1.05,0],3));sailGeo.computeVertexNormals();
      mesh(sailGeo,new THREE.MeshStandardMaterial({color:j?'#e5b881':'#f4e9c9',side:THREE.DoubleSide,roughness:1}),0,0,0,boat);
      boats.push({boat,journey,phase:rng(),speed:.45+rng()*.3,a,b});
    }
  });
  const shipments=createShipmentOverlay(ports,seaRoute);shipments.group.visible=false;scene.add(shipments.group);
  const birds=[];
  for(let k=0;k<20;k++){
    const birdGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.8,0,0),new THREE.Vector3(0,.18,.15),new THREE.Vector3(.8,0,0)]);
    const bird=new THREE.Line(birdGeo,new THREE.LineBasicMaterial({color:'#e8e9d6'}));scene.add(bird);birds.push(bird);
  }
  const clouds=new THREE.Group();scene.add(clouds);
  const cloudMat=new THREE.MeshBasicMaterial({color:'#e8eeea',transparent:true,opacity:.28,depthWrite:false});
  for(let i=0;i<15;i++){
    const cg=new THREE.Group();cg.position.set(rng()*280-140,35+rng()*12,rng()*220-110);
    for(let k=0;k<4;k++){const m=mesh(new THREE.IcosahedronGeometry(1,1),cloudMat,k*3,0,rng()*2,cg);m.scale.set(6+rng()*4,1+rng(),3+rng()*3);m.castShadow=false;}
    clouds.add(cg);
  }

  const batching=lightweight?batchStaticMeshes(staticMeshes):{meshes:0,batches:0,savedDraws:0};staticMeshes.length=0;
  const labels=document.createElement('div');labels.className='world-labels';container.append(labels);
  const mapOverlays=[...container.parentElement.querySelectorAll('.map-settings,.map-tools,.map-caption,#layer-legend,.artist-panel')];
  const labelObjects=[];
  [...CITIES,...LANDMARKS].forEach(c=>{
    const el=document.createElement('button');el.type='button';el.className=`map-label ${CITIES.includes(c)?'city-label':'landmark-label'}`;
    el.innerHTML=`<span class="map-dot"></span><span>${c.name}</span><span class="letter-mark" hidden>来信</span>`;el.setAttribute('aria-label',`探索${c.name}`);
    el.addEventListener('click',()=>onSelect(c.id));labels.append(el);
    labelObjects.push({el,id:c.id,pos:new THREE.Vector3(c.x,elevation(c.x,c.z)+(CITIES.includes(c)?8:c.id==='bell'?8.2:5),c.z)});
  });

  let target=new THREE.Vector3(0,1,0),goalTarget=target.clone(),distance=270,goalDistance=270;
  let azimuth=.68,goalAzimuth=.68,polar=.68,goalPolar=.68,selected=null,layer='terrain',lightMode='day',motion=true,walkFocus=null;
  function frameShipment(entry){
    const cities=CITIES.filter(c=>c.id===entry.from||c.id===entry.to),points=[...entry.points,...cities.map(c=>new THREE.Vector3(c.x,elevation(c.x,c.z)+2,c.z))];
    const box=new THREE.Box3().setFromPoints(points),size=box.getSize(new THREE.Vector3());box.getCenter(goalTarget);
    goalDistance=Math.max(60,(size.length()/2+12)/(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect)));
    goalPolar=.55;goalAzimuth=.3;
  }
  const canvas=renderer.domElement;
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  bindOrbitPointers(canvas,(dx,dy)=>{
    goalAzimuth-=dx*.005;goalPolar=clamp(goalPolar+dy*.004,.18,1.28);
  },ratio=>{goalDistance=clamp(goalDistance*ratio,18,900);});
  canvas.addEventListener('wheel',e=>{e.preventDefault();goalDistance=clamp(goalDistance*Math.exp(e.deltaY*.001),18,900);},{passive:false});
  const overviewDistance=aspect=>Math.max(270,145/(Math.tan(camera.fov*Math.PI/360)*aspect));
  const resize=()=>{
    const width=container.clientWidth,height=container.clientHeight;if(!width||!height)return;
    const previousFit=overviewDistance(camera.aspect);camera.aspect=width/height;
    if(shipments.focused)frameShipment(shipments.focused);
    else if(!selected){const ratio=overviewDistance(camera.aspect)/previousFit;distance=clamp(distance*ratio,18,900);goalDistance=clamp(goalDistance*ratio,18,900);}
    camera.updateProjectionMatrix();if(lightweight)renderer.setPixelRatio(Math.min(devicePixelRatio,1,Math.sqrt(650000/(width*height))));renderer.setSize(width,height);
  };
  const observer=new ResizeObserver(resize);observer.observe(container);
  let lastTime=0,visualTime=0,raf=0,latestState=null,frameCount=0,lastRender=0,waterTarget=.4;
  let resolveReady,rejectReady;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;motion=!reduced;
  function render(ms){
    raf=requestAnimationFrame(render);
    if(document.hidden){lastTime=ms;return;}
    if(ms-lastRender<1000/(lightweight?30:60))return;lastRender=ms;
    const dt=Math.min((ms-lastTime)/1000,.05)||.016;lastTime=ms;
    if(motion)visualTime+=dt;
    const damp=motion?1-Math.exp(-dt*4):1;
    target.lerp(goalTarget,damp);distance+=(goalDistance-distance)*damp;azimuth+=(goalAzimuth-azimuth)*damp;polar+=(goalPolar-polar)*damp;
    camera.position.set(target.x+distance*Math.sin(polar)*Math.sin(azimuth),target.y+distance*Math.cos(polar),target.z+distance*Math.sin(polar)*Math.cos(azimuth));camera.lookAt(target);
    waterMaterial.uniforms.time.value=visualTime;
    ocean.position.y+=(waterTarget-ocean.position.y)*damp;foam.position.y=ocean.position.y-.4;
    emberRiver.userData.plume.position.y=ocean.position.y+.018;
    const nursery=cityGroups[0].userData.traces.nursery;
    if(nursery.visible)nursery.children.forEach(m=>{if(m.userData.waterline!==undefined)m.position.y=ocean.position.y+m.userData.waterline;});
    const night=lightMode==='night',dusk=lightMode==='dusk';
    const ambient=night?.22:dusk?.8:2.25, sunlight=night?.18:dusk?1.7:3.2;
    hemi.intensity+=(ambient-hemi.intensity)*damp;sun.intensity+=(sunlight-sun.intensity)*damp;
    sun.color.lerp(color(dusk?'#ffc194':night?'#91b9d1':'#fff0d0'),damp);
    const bg=color(night?'#1b3036':dusk?'#c2b8a9':'#c6d8d6');scene.background.lerp(bg,damp);scene.fog.color.copy(scene.background);
    waterMaterial.uniforms.light.value+=( (night?.32:dusk?.76:1)-waterMaterial.uniforms.light.value)*damp;
    windowMaterial.emissiveIntensity=night?2:dusk?.6:0;lanternMaterial.emissiveIntensity=night?3:dusk?1:0;
    beacons.forEach(b=>{b.intensity=night?9:dusk?3:0;});
    boats.forEach(({boat,journey,phase,speed})=>{
      const progress=(visualTime*speed+phase*journey.length*2)%(journey.length*2),forward=progress<journey.length;
      const p=journey.at(forward?progress/journey.length:2-progress/journey.length);
      boat.position.set(p.x,ocean.position.y+.5+Math.sin(visualTime*2+phase)*.09,p.z);
      boat.rotation.y=p.heading+(forward?0:Math.PI);
    });
    birds.forEach((b,i)=>{const t=visualTime*.12+i*1.4,r=18+i*1.3;b.position.set(Math.cos(t)*r-8,18+Math.sin(t*.6)*2+i%5,Math.sin(t)*r+15);b.rotation.y=-t;b.scale.y=motion?1+Math.sin(visualTime*5+i)*.65:1;});
    walkers.forEach((w,i)=>{
      const end=w.points.length-1,progress=(visualTime*w.speed+w.phase*end*2)%(end*2),position=progress<end?progress:end*2-progress,index=Math.min(Math.floor(position),end-1);
      dummy.position.lerpVectors(w.points[index],w.points[index+1],position-index);dummy.position.y+=.25;
      dummy.rotation.set(0,0,Math.sin(visualTime*6+w.phase*TAU)*.07);dummy.scale.setScalar(w.visible?1:0);dummy.updateMatrix();coats.setMatrixAt(i,dummy.matrix);
      dummy.position.y+=.35;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);
    });
    coats.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;
    animators.forEach(fn=>fn(visualTime));
    clouds.visible=layer==='terrain'&&!selected;clouds.position.x=Math.sin(visualTime*.009)*12;
    const projected=new THREE.Vector3(),labelBoxes=[],view=container.getBoundingClientRect();
    const controlBoxes=mapOverlays.filter(el=>el.getClientRects().length).map(el=>{
      const r=el.getBoundingClientRect();return{left:r.left-view.left,right:r.right-view.left,top:r.top-view.top,bottom:r.bottom-view.top};
    });
    const labelSizes=labelObjects.map(l=>({width:l.el.offsetWidth,height:l.el.offsetHeight}));
    labelObjects.forEach((l,i)=>{
      projected.copy(l.pos).project(camera);
      const screenX=(projected.x*.5+.5)*container.clientWidth,screenY=(-projected.y*.5+.5)*container.clientHeight;
      const {width,height}=labelSizes[i],halfWidth=width/2;
      let visible=!walkFocus&&projected.z<1&&screenX>halfWidth+17&&screenX<container.clientWidth-halfWidth-17&&screenY>42&&screenY<container.clientHeight-30&&(shipments.focused?[shipments.focused.from,shipments.focused.to].includes(l.id):(!selected||selected===l.id||distance>140));
      const landmark=l.el.classList.contains('landmark-label');
      const placement=visible?placeMapLabel(screenX,screenY,width,height,view,landmark?controlBoxes:[...controlBoxes,...labelBoxes]):null;
      visible=visible&&!!placement;
      if(visible&&landmark&&labelBoxes.some(b=>placement.box.left<b.right+4&&placement.box.right>b.left-4&&placement.box.top<b.bottom+4&&placement.box.bottom>b.top-4))visible=false;
      if(visible)labelBoxes.push(placement.box);
      // Hidden labels retain their measured size, including pending-letter badges.
      l.el.style.visibility=visible?'':'hidden';
      if(placement)l.el.style.transform=`translate(${placement.x}px,${placement.y}px) translate(-50%,-100%)`;
      l.el.classList.toggle('selected',selected===l.id);
    });
    try{if(resolveReady&&graphics.context.isContextLost())throw new Error('绘图上下文已丢失，浏览器停止了三维渲染。');art.render(scene,camera,layer);}
    catch(error){if(rejectReady){cancelAnimationFrame(raf);rejectReady(error);resolveReady=rejectReady=null;return;}throw error;}
    frameCount++;
    if(resolveReady){resolveReady();resolveReady=rejectReady=null;}
  }
  const extension=extensionFactory?.({scene,terrain,layouts,treeList,rockList});
  raf=requestAnimationFrame(render);
  return {
    updateElements(data){extension?.update(data);},
    focusElements(id){const p=extension?.point(id);if(!p)return false;selected=id;walkFocus=null;shipments.clearFocus();goalTarget.set(p.x,p.y+1,p.z);goalDistance=29;goalPolar=.65;goalAzimuth=.68;return true;},
    ready,
    setArtStyle(id){return art.setStyle(id);},
    focus(id){walkFocus=null;shipments.clearFocus();selected=id;const c=[...CITIES,...LANDMARKS].find(c=>c.id===id);if(c){goalTarget.set(c.x,elevation(c.x,c.z)+1,c.z);goalDistance=CITIES.some(city=>city.id===id)?72:55;goalPolar=.89;goalAzimuth=.68;}const p=id==='garden'?GARDEN.focus:id==='fold'?FOLD.focus:id==='bell'?BELL.focus:null;if(p){goalTarget.set(p.x,p.y,p.z);goalDistance=p.distance;goalPolar=p.polar;goalAzimuth=p.azimuth;}},
    focusWalk(cityId,index){
      const stop=cityGroups[CITIES.findIndex(c=>c.id===cityId)]?.userData.walk[index];if(!stop)return false;
      shipments.clearFocus();selected=cityId;walkFocus=stop.key;goalTarget.set(stop.x,stop.y,stop.z);goalDistance=stop.distance;goalPolar=stop.polar;goalAzimuth=stop.azimuth;return true;
    },
    focusTrace(petition,choice){walkFocus=null;shipments.clearFocus();
      const trace=cityGroups.flatMap(g=>Object.values(g.userData.traces)).find(g=>g.visible&&g.userData.petition===petition&&g.userData.choice===choice);
      if(!trace)return false;const p=trace.userData.focus;goalTarget.set(p.x,p.y,p.z);goalDistance=choice==='nursery'?18:24;goalPolar=.82;goalAzimuth=trace.rotation.y+.68;return true;
    },
    focusFood(cityId,kind){walkFocus=null;shipments.clearFocus();
      const group=kind==='fields'?fields.find(f=>CITIES[f.ci].id===cityId)?.group:cityGroups[CITIES.findIndex(c=>c.id===cityId)]?.userData.foodStore;
      if(!group)return false;const p=group.userData.focus;goalTarget.set(p.x,p.y,p.z);goalDistance=kind==='fields'?20:18;goalPolar=.62;goalAzimuth=group.rotation.y+.68;return true;
    },
    focusEmberSwallows(){if(selected!=='ember')return;walkFocus=null;shipments.clearFocus();const p=SWALLOW_FOCUS;goalTarget.set(p.x,p.y,p.z);goalDistance=p.distance;goalPolar=p.polar;goalAzimuth=p.azimuth;},
    focusRiver(){walkFocus=null;shipments.clearFocus();const p=emberRiver.userData.focus;goalTarget.set(p.x,p.y,p.z);goalDistance=38;goalPolar=.7;goalAzimuth=.55;},
    focusHerons(){if(selected!=='reed')return;walkFocus=null;shipments.clearFocus();const p=HERON_FOCUS;goalTarget.set(p.x,p.y,p.z);goalDistance=p.distance;goalPolar=p.polar;goalAzimuth=p.azimuth;},
    focusWindGrass(){if(selected!=='wind')return;walkFocus=null;shipments.clearFocus();const p=WIND_GRASS_FOCUS;goalTarget.set(p.x,p.y,p.z);goalDistance=p.distance;goalPolar=p.polar;goalAzimuth=p.azimuth;},
    focusMossFrogs(){if(selected!=='moss')return;walkFocus=null;shipments.clearFocus();const p=FROG_FOCUS;goalTarget.set(p.x,p.y,p.z);goalDistance=p.distance;goalPolar=p.polar;goalAzimuth=p.azimuth;},
    focusSpireButterflies(){if(selected!=='spire')return;walkFocus=null;shipments.clearFocus();const p=BUTTERFLY_FOCUS;goalTarget.set(p.x,p.y,p.z);goalDistance=p.distance;goalPolar=p.polar;goalAzimuth=p.azimuth;},
    focusGardenWater(){walkFocus=null;shipments.clearFocus();const p=garden.userData.waterFocus;goalTarget.set(p.x,p.y,p.z);goalDistance=p.distance;goalPolar=p.polar;goalAzimuth=p.azimuth;},
    focusBell(view){const p={tower:BELL.focus,tablet:BELL.tabletFocus,steps:BELL.stepsFocus}[view];if(selected!=='bell'||!p)return;walkFocus=null;shipments.clearFocus();goalTarget.set(p.x,p.y,p.z);goalDistance=p.distance;goalPolar=p.polar;goalAzimuth=p.azimuth;},
    focusShipment(key){const e=shipments.focus(key);if(!e)return false;walkFocus=null;frameShipment(e);return true;},
    home(){walkFocus=null;shipments.clearFocus();selected=null;goalTarget.set(0,1,0);goalDistance=overviewDistance(camera.aspect);goalPolar=.68;goalAzimuth=.68;},
    zoom(delta){goalDistance=clamp(goalDistance*delta,18,900);},
    rotate(dx,dy){goalAzimuth+=dx;goalPolar=clamp(goalPolar+dy,.18,1.28);},
    setLayer(value){layer=value;routes.forEach(r=>{r.visible=value==='trade';r.material.opacity=.38;});shipments.group.visible=value==='trade';if(value!=='trade')shipments.clearFocus();
      const arr=landGeometry.attributes.color;
      for(let i=0;i<positions.count;i++){
        if(value==='terrain'||value==='trade'){arr.setXYZ(i,colors[i*3],colors[i*3+1],colors[i*3+2]);continue;}
        const x=positions.getX(i),z=positions.getZ(i),h=positions.getY(i),{island}=terrainAt(x,z);
        const c=latestState?.cities.find(c=>c.id===island.id),v=value==='ecology'?(c?.ecology??.8):clamp(h/28);
        const col=h<.5?color('#648e8b'):color(value==='ecology'?'#bd946d':'#b6c5b0').lerp(color(value==='ecology'?'#4d9174':'#ece7d5'),v);
        arr.setXYZ(i,col.r,col.g,col.b);
      }arr.needsUpdate=true;
    },
    setLight(v){lightMode=v;if(latestState){updateWindGrass(windGrass,latestState.cities.find(c=>c.id==='wind').ecology,v);updateMossFrogs(mossFrogs,latestState.cities.find(c=>c.id==='moss'),latestState.tick,latestState.climate,v);updateSpireButterflies(spireButterflies,latestState.cities.find(c=>c.id==='spire'),latestState.tick,v);}},setMotion(v){motion=v;},
    update(state){
      latestState=state;shipments.update(state.shipments?.legs);waterTarget=waterHeightAt(state.tick);if(layer==='ecology')this.setLayer(layer);
      const letters=pendingPetitions(state),firstReceiver=transportFor(state,'haven')?.queue[0]?.id??null;
      labelObjects.forEach(l=>{const pending=letters.some(p=>p.city===l.id);l.el.querySelector('.letter-mark').hidden=!pending;});
      cityGroups.forEach((g,i)=>{
        const city=state.cities[i],scale=clamp(city.population/CITIES[i].population,.4,1.5),d=g.userData,n=Math.min(d.buildingCount,Math.round(44*scale));
        d.houses.count=d.roofs.count=d.footings.count=d.doors.count=n;d.windows.count=n*2;
        syncCivicTraces(d.traces,state.decisions,city.pollution,firstReceiver);if(d.civicAccess)d.civicAccess.visible=Object.values(d.traces).some(t=>t.visible&&Math.hypot(t.position.x-layouts[i].sites.civic.x,t.position.z-layouts[i].sites.civic.z)<.1);updateFoodStore(d.foodStore,city);
        for(const [id,levels] of Object.entries(d.policies))levels.forEach((group,j)=>{group.visible=j<city.policies[id];});
      });
      walkers.forEach(w=>{w.visible=w.index<Math.round(clamp(state.cities[w.ci].population/CITIES[w.ci].population,.3,1.25)*12);});
      treeList.forEach((t,i)=>{
        const ci=CITIES.findIndex(c=>c.id===t.island),ecology=ci<0?1:clamp(state.cities[ci].ecology/CITIES[ci].ecology,0,1.2);
        t.alive=t.v<ecology;
        const scale=t.alive?t.s*Math.sqrt(ecology):0;
        dummy.position.set(t.x,t.h+t.s*2,t.z);dummy.rotation.set(0,t.v*TAU,0);dummy.scale.set(scale,scale*.95,scale);dummy.updateMatrix();
        if(t.pine)pine.setMatrixAt(t.pineIndex,dummy.matrix);
        else leaves.setMatrixAt(i,dummy.matrix);
      });
      for(const mesh of [leaves,pine]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
      fields.forEach(f=>updateFields(f.group,state.cities[f.ci],state.tick));
      updateEmberRiver(emberRiver,state.cities.find(c=>c.id==='ember'));
      updateEmberSwallows(emberSwallows,state.cities.find(c=>c.id==='ember'));
      updateReedHerons(reedHerons,state.cities.find(c=>c.id==='reed'),state.tick);
      updateWindGrass(windGrass,state.cities.find(c=>c.id==='wind').ecology,lightMode);
      updateMossFrogs(mossFrogs,state.cities.find(c=>c.id==='moss'),state.tick,state.climate,lightMode);
      updateSpireButterflies(spireButterflies,state.cities.find(c=>c.id==='spire'),state.tick,lightMode);
      updateNurseryFish(cityGroups[0].userData.traces.nursery,state.tick);
    },
    stats(){return {
      elements:extension?.stats()??null,
      view:{selected,target:goalTarget.toArray(),distance:goalDistance,azimuth:goalAzimuth,polar:goalPolar},
      walk:walkFocus?{city:selected,stop:walkFocus,target:goalTarget.toArray(),camera:camera.position.toArray(),distance:goalDistance}:null,
      shipments:shipments.stats(),
      herons:{...reedHerons.userData.reading,birds:reedHerons.userData.birds.filter(b=>b.visible).length,seedHeads:reedHerons.userData.reeds.every(r=>r.heads.visible)},
      windGrass:{growth:windGrass.userData.growth,dropsVisible:windGrass.userData.drops.visible,leafColor:windGrass.userData.blades.material.color.getHexString()},
      spireButterflies:{...spireButterflies.userData.reading,poses:spireButterflies.userData.butterflies.map(({butterfly,wings})=>({visible:butterfly.visible,wings:wings.map(w=>w.wing.rotation.z)}))},
      mossFrogs:{...mossFrogs.userData.reading,glow:mossFrogs.userData.glow.emissiveIntensity,poses:mossFrogs.userData.nests.map(({frog,water})=>({visible:frog.visible,y:frog.position.y,z:frog.position.z,waterY:water.position.y}))},
      nursery:{visible:cityGroups[0].userData.traces.nursery.visible,...cityGroups[0].userData.traces.nursery.userData.tideReading,fish:cityGroups[0].userData.traces.nursery.userData.fish.map(g=>({y:g.position.y,heading:g.rotation.y}))},
      seaTravel:{visualTime,routes:routes.map(r=>r.geometry.attributes.position.count),boats:boats.map(({boat,journey,speed,a,b})=>({from:CITIES[a].id,to:CITIES[b].id,x:boat.position.x,z:boat.position.z,heading:boat.rotation.y,length:journey.length,speed}))},
      emberSwallows:{...emberSwallows.userData.reading,color:emberSwallows.userData.clay.color.getHexString(),visible:emberSwallows.userData.bird.visible},
      emberRiver:{pollution:emberRiver.userData.pollution,waterColor:emberRiver.userData.water.color.getHexString(),bankColor:emberRiver.userData.bank.color.getHexString(),plumeOpacity:emberRiver.userData.plume.material.opacity,plumeHeight:emberRiver.userData.plume.position.y},
      graphics:{lightweight,batching,pixelRatio:renderer.getPixelRatio(),antialias:graphics.context.getContextAttributes()?.antialias,shadows:renderer.shadowMap.enabled},
      art:art.stats(layer),
      waterHeight:ocean.position.y,exposedSteps:oldPortSteps.filter(top=>top>ocean.position.y).length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,trees:treeList.length,leafyTrees:treeList.filter(t=>t.alive).length,boats:boats.length,walkers:walkers.filter(w=>w.visible).length,frameCount,
      cities:cityGroups.map((g,i)=>({id:CITIES[i].id,homes:g.userData.houses.count,capacity:g.userData.buildingCount,publicFerry:g.userData.ferry?.visible??false,civicAccess:g.userData.civicAccess?.visible??false,foodStore:{seasons:g.userData.foodStore.userData.seasons,levels:g.userData.foodStore.userData.levels},field:fields.find(f=>f.ci===i)?{stage:fields.find(f=>f.ci===i).group.userData.stage,height:fields.find(f=>f.ci===i).group.userData.height,plots:layouts[i].fields.length}:null,civicTraces:Object.values(g.userData.traces).filter(t=>t.visible).map(t=>({choice:t.userData.choice,label:t.userData.label,firstReceiver:t.userData.firstReceiver??null})),trees:treeList.filter(t=>t.island===CITIES[i].id&&t.alive).length,construction:Object.fromEntries(Object.entries(g.userData.policies).map(([id,levels])=>[id,levels.filter(group=>group.visible).length]))})),
    };},
    dispose(){extension?.dispose();cancelAnimationFrame(raf);observer.disconnect();art.dispose();renderer.dispose();labels.remove();canvas.remove();},
  };
}
