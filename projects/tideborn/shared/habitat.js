// Describes elemental surface expression, not additional city food or weather resources.
export function habitatOf(local){
  const count=local.count??0,averageLevel=local.averageLevel??1;
  const intensity=count?Math.min(2.2,.25+Math.sqrt(local.totalForce/50)*.5+Math.min(count,96)/96*.35):0;
  const shares=Object.fromEntries(local.forces.map(e=>[e.element,e.share]));
  return {intensity,averageLevel,count,scale:intensity<.75?'轻微':intensity<1.25?'舒展':intensity<1.75?'鲜明':'强盛',
    moisture:Math.min(100,Math.round((shares.water*.85+shares.ice*.15)*intensity*100)),
    vegetation:Math.min(100,Math.round(shares.wood*intensity*100)),
    frost:Math.min(100,Math.round(shares.ice*intensity*100))};
}
