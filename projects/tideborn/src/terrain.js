import { ISLANDS, SEED } from './world-data.js';

export const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
export const reedRiverX = z => 50 + Math.sin((z - 25) * .16) * 2.2;
export function random(seed = SEED) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const hash = (x, z) => {
  let n = Math.imul(x, 374761393) + Math.imul(z, 668265263) + SEED;
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967295;
};
export function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v * (1 - u) + (d - b) * u * v;
}
export function baseTerrainAt(x, z) {
  let height = -4, island = ISLANDS[0];
  for (const p of ISLANDS) {
    const c = Math.cos(p.angle), s = Math.sin(p.angle), dx = x - p.x, dz = z - p.z;
    const u = (dx * c - dz * s) / p.rx, v = (dx * s + dz * c) / p.rz;
    const r = Math.hypot(u, v);
    if (r > 1.65) continue;
    const coast = (noise(x * .09, z * .09) - .5) * .24 + (noise(x * .23, z * .23) - .5) * .10;
    const shape = 1 - r + coast;
    let h = shape * p.height;
    h += (noise(x * .13 + 70, z * .13 - 20) - .5) * 5 * clamp(shape * 2);
    h += (noise(x * .46, z * .46) - .5) * 1.2 * clamp(shape * 3);
    if (p.biome === 'volcanic') {
      h += Math.exp(-r * r * 18) * 10;
      h -= Math.exp(-r * r * 130) * 11;
    }
    if (p.biome === 'wetland') {
      h = h * .6 + Math.sin(x * .25 + z * .19) * .42;
      h -= Math.exp(-(((x-reedRiverX(z))/1.15)**2)) * clamp((z-22)/3);
    }
    if (h > height) { height = h; island = p; }
  }
  return {height, island};
}
// Keep the narrow channel downhill while leaving streets and building ground outside it intact.
const reedBed=[];
for(let i=0;i<=140;i++){
  const z=23+i*.25,h=baseTerrainAt(reedRiverX(z),z).height;
  reedBed.push(i?Math.min(h,reedBed[i-1]-.005):h);
}
export function reedBedAt(z){
  const p=clamp((z-23)*4,0,140),i=Math.floor(p);
  return reedBed[i]+((reedBed[i+1]??reedBed[i])-reedBed[i])*(p-i);
}
export function terrainAt(x,z){
  const data=baseTerrainAt(x,z),distance=Math.abs(x-reedRiverX(z));
  if(z>=23&&z<=58&&distance<1.8){
    const t=clamp((1.8-distance)/.65),weight=t*t*(3-2*t)*clamp(z-23);
    data.height-=Math.max(0,data.height-reedBedAt(z))*weight;
  }
  return data;
}
export const elevation = (x, z) => terrainAt(x, z).height;

// Match the two triangles in each one-unit rendered terrain cell.
export function surfaceElevation(x,z){
  const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz;
  const a=elevation(ix,iz),b=elevation(ix+1,iz),c=elevation(ix,iz+1),d=elevation(ix+1,iz+1);
  return u+v<=1?a+u*(b-a)+v*(c-a):d+(1-u)*(c-d)+(1-v)*(b-d);
}
