export function placeMapLabel(x,y,width,height,viewport,controls){
  const gap=6,margin=8;
  const box=(cx,bottom)=>({left:cx-width/2,right:cx+width/2,top:bottom-height,bottom});
  const clear=b=>b.left>=margin&&b.right<=viewport.width-margin&&b.top>=margin&&b.bottom<=viewport.height-margin&&
    controls.every(c=>b.right<=c.left-gap||b.left>=c.right+gap||b.bottom<=c.top-gap||b.top>=c.bottom+gap);
  const original=box(x,y);
  if(clear(original))return{x,y,box:original};
  const xs=[x,...controls.flatMap(c=>[c.left-gap-width/2,c.right+gap+width/2])];
  const ys=[y,...controls.flatMap(c=>[c.top-gap,c.bottom+gap+height])];
  let best=null,distance=Infinity;
  for(const cx of xs)for(const bottom of ys){
    const b=box(cx,bottom),d=(cx-x)**2+(bottom-y)**2;
    if(d<distance&&clear(b)){best={x:cx,y:bottom,box:b};distance=d;}
  }
  return best;
}
