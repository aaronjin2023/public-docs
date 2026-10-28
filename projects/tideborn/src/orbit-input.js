// Keep each contact's last position so lifting a finger cannot strand the remaining drag.
export function bindOrbitPointers(canvas,rotate,zoom){
  const pointers=new Map();
  const span=()=>{const [a,b]=pointers.values();return Math.hypot(a.x-b.x,a.y-b.y);};
  canvas.addEventListener('pointerdown',e=>{
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    const previous=pointers.get(e.pointerId);if(!previous)return;
    const before=pointers.size===2?span():0;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){
      const after=span();if(before>0&&after>0)zoom(before/after);
    }else if(pointers.size===1)rotate(e.clientX-previous.x,e.clientY-previous.y);
  });
  const end=e=>pointers.delete(e.pointerId);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
}
