import { elevation, reedRiverX } from './terrain.js';

// Positions are selected before rendering so homes stay on dry ground and leave public space.
export function settlementLayout(city) {
  const homes=[], paths=[];
  for(let j=0;j<180;j++) {
    let x,z,yaw=0;
    const col=j%12,row=Math.floor(j/12);
    switch(city.id) {
      case 'haven': {
        const a=-1.15+col*.22,r=4+row*2.7;
        x=city.x+Math.sin(a)*r;z=city.z+Math.cos(a)*r-4;yaw=a;
        break;
      }
      case 'ember': {
        const a=-1.2+col*.23,r=4+row*2.5;
        x=city.x+Math.sin(a)*r;z=city.z+Math.cos(a)*r-5;yaw=a;
        break;
      }
      case 'moss': {
        const clusters=[[-7,-3],[4,5],[-5,7],[5,-6]],c=clusters[j%4],n=Math.floor(j/4);
        x=city.x+c[0]+((n%4)-1.5)*1.9;z=city.z+c[1]+(Math.floor(n/4)-1.5)*2;yaw=(j%4)*.23;
        break;
      }
      case 'spire': x=city.x+(col-5.5)*2;z=city.z+(row-3)*2.8;yaw=.08;break;
      case 'reed': {
        const side=j%2?1:-1,n=Math.floor(j/2),r=n%12,c=Math.floor(n/12);
        z=city.z+(r-5.5)*2.5;x=reedRiverX(z)+side*(3.2+c*2.8);yaw=side*Math.PI/2;
        break;
      }
      default: {
        const a=(col-5.5)*1.9,b=(row-3)*2.7;
        x=city.x+a*.82-b*.57;z=city.z+a*.57+b*.82;yaw=-.6;
      }
    }
    const h=elevation(x,z);
    if(h<2||Math.hypot(x-city.x,z-city.z)<3||homes.some(p=>Math.hypot(x-p.x,z-p.z)<1.7))continue;
    homes.push({x,z,y:h,yaw});
    if(homes.length===66)break;
  }
  if(city.id==='moss') {
    for(const [dx,dz] of [[-7,-3],[4,5],[-5,7],[5,-6]])paths.push(Array.from({length:25},(_,i)=>[city.x+dx*i/24+Math.sin(i/24*Math.PI)*1.3,city.z+dz*i/24]));
  }else if(city.id==='reed'){
    for(const side of [-1,1])paths.push(Array.from({length:65},(_,i)=>{const z=city.z-14+i*.42;return [reedRiverX(z)+side*2,z];}));
  }else if(['haven','ember'].includes(city.id)){
    for(const r of [5.4,10.8,16.2])paths.push(Array.from({length:38},(_,i)=>{const a=-1.3+i*.073;return [city.x+Math.sin(a)*r,city.z+Math.cos(a)*r-4];}));
  }else if(city.id==='wind'){
    for(const b of [-6.75,-1.35,4.05])paths.push(Array.from({length:40},(_,i)=>{const a=-12+i*.6;return [city.x+a*.82-b*.57,city.z+a*.57+b*.82];}));
  }else{
    for(const row of [-7,-1.4,4.2])paths.push(Array.from({length:40},(_,i)=>[city.x-12+i*.6,city.z+row]));
  }
  return {homes,paths};
}

export function infrastructureSite(city, homes, index, occupied=[]) {
  // A later civic place must not displace the existing Haven terraces.
  if(city.id==='haven'&&index===5)occupied=[...occupied,...fieldPlots(city,{homes,sites:occupied})];
  const candidates=[];
  for(let r=8;r<=(index===5?36:26);r+=2)for(let j=0;j<36;j++){
    const a=j/36*Math.PI*2,x=city.x+Math.cos(a)*r,z=city.z+Math.sin(a)*r,h=elevation(x,z);
    if(h<2||homes.some(p=>Math.hypot(p.x-x,p.z-z)<3.4)||occupied.some(p=>Math.hypot(p.x-x,p.z-z)<6))continue;
    if(city.id==='reed'&&Math.abs(x-reedRiverX(z))<2.5)continue;
    for(const yaw of index===5?[0,Math.PI/4,Math.PI/2,Math.PI*.75]:[0]){
      const footprint=[];
      for(const dx of index===5?[-2.2,0,2.2]:[-1.7,0,1.7])for(const dz of index===0?[0,1.9,3.8]:index===1?[-1.7,0,1.7]:index===2?[-1.6,0,1.6]:index===5?(city.id==='ember'?[-.7,0,.7]:[-1.5,0,1.5]):[0])footprint.push({x:x+dx*Math.cos(yaw)+dz*Math.sin(yaw),z:z-dx*Math.sin(yaw)+dz*Math.cos(yaw)});
      if(footprint.some(p=>elevation(p.x,p.z)<1.5||homes.some(h=>Math.hypot(h.x-p.x,h.z-p.z)<1.8)||occupied.some(site=>site.footprint.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<1.8))))continue;
      let slope=0;
      if(index===2)for(const dx of [-1.7,0,1.7]){
        const corners=[-.75,.75].flatMap(a=>[-1.6,1.6].map(b=>elevation(x+dx+a,z+b)));
        slope=Math.max(slope,Math.max(...corners)-Math.min(...corners));
      }
      if(index===5){const heights=footprint.map(p=>elevation(p.x,p.z));slope=Math.max(...heights)-Math.min(...heights);if(slope>3)continue;}
      const ideal=index/5*Math.PI*2;
      candidates.push({x,z,y:h,yaw,score:r+10*(1-Math.cos(a-ideal))+slope*5,footprint});
    }
  }
  candidates.sort((a,b)=>a.score-b.score);
  if(!candidates.length)throw new Error(`No free infrastructure site in ${city.id}`);
  return candidates[0];
}

export function fieldPlots(city,layout){
  if(!['haven','reed'].includes(city.id))return [];
  const plots=[];
  for(let k=0;k<9;k++){
    const x=city.x+(city.id==='reed'?-11:12)+(k%3)*2.5,z=city.z-8+Math.floor(k/3)*2.7;
    const footprint=[-1.1,0,1.1].flatMap(dx=>[-1.15,0,1.15].map(dz=>({x:x+dx,z:z+dz}))),heights=footprint.map(p=>elevation(p.x,p.z));
    if(Math.min(...heights)<1.5||Math.max(...heights)-Math.min(...heights)>1.5||layout.homes.some(p=>Math.hypot(p.x-x,p.z-z)<2.4)||Object.values(layout.sites).some(s=>s.footprint.some(p=>Math.abs(p.x-x)<2.3&&Math.abs(p.z-z)<2.3)))continue;
    plots.push({x,z,y:Math.max(...heights)+.05,footprint});
  }
  return plots;
}
