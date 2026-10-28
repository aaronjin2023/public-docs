import * as THREE from '../assets/vendor/three.module.js';
import {elevation,surfaceElevation} from './terrain.js';

const x=-78,z=-44,base=elevation(x,z),slope=Math.tan(.15);
const columns=[[-3.5,1.2,-1.1],[-2.9,1.5,-1.5],[-1.8,1.42,-1.6],[-.8,1.58,-1.45],[.5,1.5,-1.5],[1.7,1.45,-1.4],[2.8,1.6,-1.55],[3.5,1.3,-1.25]];
const bottom=Math.min(...columns.flatMap(([dx,front,back])=>[surfaceElevation(x+dx,z+front),surfaceElevation(x+dx,z+back)]))-.3;
export const FOLD={x,z,base,bottom,columns,contact:base+1.8,focus:{x:-79.6,y:base+.4,z:-42.6,distance:22,polar:1.08,azimuth:-.5}};

export function foldBoundary(index,dx){
  return [bottom,base-.4+dx*slope,base+.25+dx*slope,base+.9+dx*slope,base+1.8,base+2.35,base+2.9][index];
}

export function foldFront(dx){
  for(let i=1;i<columns.length;i++)if(dx<=columns[i][0]){
    const a=columns[i-1],b=columns[i],t=(dx-a[0])/(b[0]-a[0]);return z+a[1]+(b[1]-a[1])*t;
  }
  return z+columns.at(-1)[1];
}

function layerGeometry(index){
  const vertices=[],quad=(a,b,c,d)=>vertices.push(...a,...b,...c,...b,...d,...c);
  const point=(col,boundary,side)=>[x+col[0],foldBoundary(boundary,col[0]),z+col[side]];
  for(let i=1;i<columns.length;i++){
    const left=columns[i-1],right=columns[i];
    const lf=point(left,index,1),rf=point(right,index,1),lb=point(left,index,2),rb=point(right,index,2);
    const tf=point(left,index+1,1),uf=point(right,index+1,1),tb=point(left,index+1,2),ub=point(right,index+1,2);
    quad(lf,rf,tf,uf);quad(lb,tb,rb,ub);
    quad(tf,uf,tb,ub);quad(lf,lb,rf,rb);
    if(i===1)quad(lf,tf,lb,tb);
    if(i===columns.length-1)quad(rf,rb,uf,ub);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}

export function createFoldCliff(){
  const group=new THREE.Group();group.name='fold-cliff';
  for(const [i,color] of ['#969d89','#c0c0a5','#7b8c80','#c6c3a8','#777f76','#a8afa1'].entries()){
    const layer=new THREE.Mesh(layerGeometry(i),new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
    layer.name=`bed-${i}`;layer.castShadow=layer.receiveShadow=true;group.add(layer);
  }
  const fossil=[];
  for(let i=0;i<=160;i++){
    const angle=i/160*Math.PI*5,r=.025+i/160*.53,dx=-2.8+Math.cos(angle)*r;
    fossil.push(new THREE.Vector3(x+dx,base-1.55+Math.sin(angle)*r,foldFront(dx)+.035));
  }
  const shell=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fossil),160,.025,5,false),new THREE.MeshStandardMaterial({color:'#e2dbc0',roughness:1}));
  shell.name='fossil';group.add(shell);group.userData.fossil=fossil;
  return group;
}
