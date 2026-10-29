import * as THREE from '../assets/vendor/three.module.js';
import {lookParts,appearanceOf} from './appearance.js';

// Small, disposable stage. No main-world mutations or second perpetual render loop.
export function createLifeStage(host,{appearance,city='haven',age=20,preview=false,reduced=false,kind='gathering',choice=null,motif=null}={}){
 const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;host.replaceChildren(renderer.domElement);
 renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label',preview?'可转动的三维人物造型预览':'由你的造型出演的人生短场景');
 const scene=new THREE.Scene();scene.background=new THREE.Color('#789a9b');
 const camera=new THREE.PerspectiveCamera(35,1,.1,60);camera.position.set(6,4.6,9);camera.lookAt(0,1,0);
 scene.add(new THREE.HemisphereLight('#fff4da','#405f63',2.5));const sun=new THREE.DirectionalLight('#ffe7c2',2.4);sun.position.set(-3,7,5);scene.add(sun);
 const materials=new Map(),geometries=new Set();let disposed=false,raf=0,paused=false,elapsed=7,last=0,pose='listen',built=false,actor=null,companion=null,drag=null,angle=0;
 const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.95}));return materials.get(color);};
 const mesh=(parent,geo,color,x=0,y=0,z=0)=>{geometries.add(geo);const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);parent.add(m);return m;};
 const box=(parent,x,y,z,w,h,d,color)=>mesh(parent,new THREE.BoxGeometry(w,h,d),color,x,y,z);
 const ball=(parent,x,y,z,r,color)=>mesh(parent,new THREE.SphereGeometry(r,10,8),color,x,y,z);
 const tube=(parent,x,y,z,rt,rb,h,color)=>mesh(parent,new THREE.CylinderGeometry(rt,rb,h,10),color,x,y,z);
 const ground=new THREE.Group();scene.add(ground);tube(ground,0,-.22,0,3.4,3.7,.35,'#688e90');tube(ground,0,-.05,0,2.8,3,.24,'#c4ba96');
 for(let i=0;i<7;i++)box(ground,-1.9+i*.62,.1,.2,.57,.12,2.2,'#9b8767');
 for(const x of [-2.1,2.1]){tube(ground,x,.54,-.9,.07,.09,1.1,'#716a55');box(ground,0,.86,-.9,4.3,.06,.06,'#b4aa87');}
 const backdrop=new THREE.Group();scene.add(backdrop);
 if(city==='spire'){tube(backdrop,-2,1,-2,.32,.55,2.2,'#d8d5b6');tube(backdrop,-2,2.22,-2,.45,.45,.15,'#829298');}
 else if(city==='ember'){box(backdrop,-2,.6,-1.9,.9,1.1,.8,'#8e7760');tube(backdrop,-2,1.4,-1.9,.22,.28,.6,'#6a6861');}
 else {for(const [x,z] of [[-2.4,-1.7],[2.3,-1.5]]){tube(backdrop,x,.5,z,.08,.13,.9,'#796d51');const crown=ball(backdrop,x,1.3,z,.65,city==='reed'?'#9b9e67':'#708d73');crown.scale.y=city==='wind'?1.6:1.1;}}
 const table=new THREE.Group();scene.add(table);box(table,0,.77,.15,1.15,.14,.7,'#b8a37e');for(const x of [-.43,.43])box(table,x,.4,.15,.08,.7,.5,'#8a7c62');
 const lamp=new THREE.Group();lamp.position.set(.16,.87,.12);table.add(lamp);tube(lamp,0,.03,0,.17,.2,.06,'#4b5f5e');tube(lamp,0,.25,0,.13,.13,.34,'#ecd89b');tube(lamp,0,.45,0,.03,.22,.15,'#526765');
 const paper=box(table,-.28,.86,.44,.5,.02,.36,'#e3dcc1');paper.rotation.y=.16;
 const props=new THREE.Group();scene.add(props);props.visible=!preview;
 if(kind==='chronicle'){
  lamp.visible=false;
  const theme=({haven:'water',ember:'fire',moss:'wood',spire:'ice',reed:'earth',wind:'wind'})[motif]??motif;
  if(theme==='water'){tube(props,1.8,.25,.5,.5,.4,.4,'#9d957d');tube(props,1.8,.46,.5,.43,.43,.02,'#78aab5');}
  if(theme==='fire'){tube(props,1.8,.4,.5,.35,.45,.6,'#a87859');tube(props,1.8,.72,.5,.26,.26,.06,'#e7b36b');}
  if(theme==='wood'){tube(props,1.8,.5,.5,.07,.1,.9,'#817659');for(const x of [1.5,1.9])ball(props,x,1.05,.5,.35,'#86a56e');}
  if(theme==='earth'){for(let i=0;i<3;i++)box(props,1.7+i*.12,.2+i*.22,.5,.9-i*.17,.23,.6,'#b4a481');}
  if(theme==='wind'){tube(props,1.8,.9,.5,.04,.05,1.8,'#817659');const flag=box(props,2.1,1.5,.5,.65,.35,.03,'#d4c797');flag.rotation.z=.16;}
  if(theme==='ice'){for(let i=0;i<3;i++)mesh(props,new THREE.OctahedronGeometry(.3+i*.07), '#b8d6d9',1.6+i*.25,.4+i*.2,.5);}
 }
 const home=['birth','gift','inherit','death'].includes(kind);
 if(home){backdrop.visible=false;box(props,0,1.1,-1.1,4.5,2.2,.12,'#c9bea1');box(props,-.8,1.35,-1.02,1.25,.95,.03,'#789a9b');box(props,-.8,1.35,-.98,.05,1,.05,'#8d795b');box(props,-.8,1.35,-.98,1.3,.05,.05,'#8d795b');}
 if(!preview&&age<2){box(props,-1.25,.5,.55,1.06,.15,.55,'#9b8665');box(props,-1.25,.6,.55,1,.08,.5,'#e1d7bb');for(const x of [-1.7,-.8])box(props,x,.43,.55,.07,.55,.5,'#9b8665');}
 if(kind==='scarcity')for(let i=0;i<3;i++){const sack=ball(props,-1.9+i*.42,.37,-.6,.25,'#b5a57b');sack.scale.y=1.5;tube(props,-1.9+i*.42,.7,-.6,.08,.12,.1,'#8f805f');}
 const boat=new THREE.Group();props.add(boat);boat.position.set(0,-.08,2.3);boat.visible=kind==='crossing';const hull=tube(boat,0,.05,0,.5,.27,.3,'#7e7058');hull.scale.set(2,1,.75);box(boat,0,.22,0,1.65,.08,.13,'#bfaa7e');
 if(kind==='death'){box(props,-1.05,.55,.55,.6,.13,.5,'#8d795b');box(props,-1.05,.96,.33,.6,.72,.08,'#8d795b');}
 const newTree=new THREE.Group();newTree.position.set(1.7,0,1.6);scene.add(newTree);tube(newTree,0,.45,0,.05,.09,.9,'#756748');ball(newTree,0,1,0,.47,'#7e9d68');newTree.visible=false;
 function person(look,years){
  const parts=lookParts(look,city),c=parts.outfit.color,trim=parts.outfit.trim,skin=parts.skin,hair=years>=65?'#a7aaa0':'#363c38';
  const group=new THREE.Group();scene.add(group);const body=new THREE.Group();group.add(body);
  if(years<2){const wrap=tube(body,0,.43,0,.22,.12,.66,c);wrap.rotation.z=-.16;ball(body,0,.85,0,.24,skin);ball(body,0,.95,-.04,.21,hair);const a=box(body,.12,.52,.18,.18,.08,.1,skin);return {group,body,left:a,right:a,legs:[],young:true};}
  const skirt=['star','grove','wind'].includes(parts.look.outfit),torso=tube(body,0,1,0,.29,skirt?.45:.34,skirt?1:.8,c);
  box(body,0,.94,.3,.48,.08,.08,trim);box(body,0,1.31,.25,.28,.16,.07,trim);
  const legs=[];for(const x of [-.17,.17]){const leg=new THREE.Group();leg.position.set(x,.65,0);body.add(leg);box(leg,0,-.28,0,.2,.57,.21,'#46534f');box(leg,0,-.53,.1,.23,.14,.36,'#4b4841');legs.push(leg);}
  const arms=[];for(const [x,sign] of [[-.39,1],[.39,-1]]){const arm=new THREE.Group();arm.position.set(x,1.31,0);body.add(arm);tube(arm,0,-.23,0,.12,.1,.45,c);ball(arm,0,-.52,.02,.105,skin);arm.rotation.z=sign*.12;arms.push(arm);}
  const head=new THREE.Group();head.position.set(0,1.75,0);body.add(head);const face=ball(head,0,0,0,.31,skin);face.scale.set(.88,1.1,.88);ball(head,0,.13,-.065,.3,hair);box(head,0,.17,.18,.43,.15,.18,hair);
  for(const x of [-.105,.105])ball(head,x,.01,.245,.022,'#293a36');ball(head,.01,-.055,.27,.038,skin);
  if(parts.look.hair==='bob')for(const x of [-.24,.24])box(head,x,-.01,-.07,.12,.41,.26,hair);
  if(parts.look.hair==='knot')ball(head,0,.36,-.07,.14,hair);
  if(parts.look.hair==='braid')for(let i=0;i<5;i++)ball(head,.25,-.05-i*.13,-.17,.083,hair);
  if(parts.look.outfit==='kiln'){box(body,0,1.03,.31,.43,.67,.055,trim);box(body,0,.95,.35,.23,.15,.025,c);}
  if(parts.look.outfit==='grove'||parts.look.outfit==='wind'){const cape=tube(body,0,1.2,-.08,.31,.59,.5,c);cape.scale.z=.7;}
  if(parts.look.outfit==='sail'){const strap=box(body,0,1.04,.34,.07,.73,.04,trim);strap.rotation.z=-.55;box(body,.35,.74,.17,.27,.26,.19,'#89755a');}
  if(parts.look.outfit==='star')box(body,.32,.88,.25,.2,.25,.09,trim);
  if(parts.look.outfit==='reed')box(body,0,1.02,.32,.06,.65,.04,trim);
  if(years<16)group.scale.setScalar(years<6?.66:.83);
  return {group,body,left:arms[0],right:arms[1],legs,young:false};
 }
 function removePerson(p){if(!p)return;p.group.traverse(n=>{if(n.isMesh){geometries.delete(n.geometry);n.geometry.dispose();}});scene.remove(p.group);}
 function actors(look){removePerson(actor);actor=person(appearanceOf(look,city),preview?24:age);actor.group.position.set(preview?0:age<2?-1.65:-1.08,age<2&&!preview?.7:.18,.55);actor.group.visible=kind!=='death';actor.group.rotation.y=preview?angle:.2;if(!preview&&!companion){companion=person({outfit:'sail',hair:'knot',tone:'clay'},52);companion.group.position.set(1.15,.18,-.15);companion.group.rotation.y=-.45;companion.group.visible=kind!=='death';}ground.visible=!preview;backdrop.visible=!preview&&!home;table.visible=!preview;newTree.visible=!preview&&built;camera.position.set(preview?3.5:6,preview?2.5:4.6,preview?5.8:9);camera.lookAt(0,preview?1.1:1,0);}
 function draw(t){
  const u=Math.min(t/2,1),e=1-(1-u)**3,subject=age<6&&!preview?companion:actor;newTree.visible=!preview&&built;
  for(const p of [actor,companion].filter(Boolean)){p.left.rotation.x=0;p.right.rotation.x=0;p.body.rotation.z=p.young?-Math.PI/2:0;for(const leg of p.legs)leg.rotation.x=0;}
  actor.group.position.x=preview?0:age<2?-1.65:-1.08-(pose==='arrive'?.8*(1-e):0);boat.position.x=kind==='crossing'&&choice==='escort'&&pose==='offer'?e*1.3:0;
  if(subject){if(pose==='offer'){subject.right.rotation.x=-1.1*e;}else if(pose==='work'){subject.left.rotation.x=-.9;subject.right.rotation.x=-1.1+Math.sin(t*6)*.25*Math.max(0,1-t/7);}else if(pose==='read'){subject.left.rotation.x=-1;subject.right.rotation.x=-1.1;}else if(pose==='light'){subject.right.rotation.x=-1.45*e;}else if(pose==='rest'){if(!subject.young)subject.body.rotation.z=-.055;}
   if(pose==='arrive'&&t<2)for(const [i,leg] of actor.legs.entries())leg.rotation.x=Math.sin(t*9+i*Math.PI)*.22*(1-u);
  }
  if(preview)actor.group.rotation.y=angle;
  renderer.render(scene,camera);
 }
 function loop(now){raf=0;if(disposed)return;if(document.hidden||paused){last=0;return;}if(now-last<32){raf=requestAnimationFrame(loop);return;}elapsed+=last?(now-last)/1000:0;last=now;draw(reduced?7:elapsed);if(!reduced&&elapsed<7)raf=requestAnimationFrame(loop);}
 function start(){cancelAnimationFrame(raf);last=0;draw(reduced?7:elapsed);if(!paused&&!reduced&&!document.hidden&&elapsed<7)raf=requestAnimationFrame(loop);}
 function resize(){const r=host.getBoundingClientRect();if(r.width<1||r.height<1)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();draw(reduced?7:elapsed);}
 actors(appearance);const observer=new ResizeObserver(resize);observer.observe(host);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else start();};document.addEventListener('visibilitychange',visibility);
 const down=e=>{if(!preview)return;drag=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);};const move=e=>{if(drag===null)return;angle+=(e.clientX-drag)*.013;drag=e.clientX;draw(elapsed);};const up=()=>drag=null;
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
 return {setLook(look){actors(look);resize();},beat(next,b=false){pose=next;built=b;elapsed=0;start();},pause(value){paused=value;start();},setReduced(value){reduced=value;start();},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
