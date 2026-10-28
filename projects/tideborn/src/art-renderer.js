import * as THREE from '../assets/vendor/three.module.js';
import {artStyle,artApplies} from './art-styles.js';

const fragmentShader=`
uniform sampler2D sceneColor;
uniform vec2 resolution;
uniform float pixelRatio;
uniform int style;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 readScene(vec2 uv){
  vec3 c=texture2D(sceneColor,clamp(uv,vec2(.00001),vec2(.99999))).rgb;
  #ifdef TONE_MAPPING
    c=toneMapping(c);
  #endif
  return clamp(sRGBTransferOETF(vec4(c,1.)).rgb,0.,1.);
}
vec3 saturated(vec3 c,float amount){return mix(vec3(lum(c)),c,amount);}
vec3 poster(vec3 c,float steps){return floor(c*steps+.5)/steps;}
float line(float coordinate,float width){return 1.-smoothstep(width,width+1.,abs(fract(coordinate)-.5)*8.);}
void main(){
  vec2 pixel=1./resolution, p=gl_FragCoord.xy/pixelRatio;
  vec3 c=readScene(vUv),l=readScene(vUv-vec2(pixel.x,0.)),r=readScene(vUv+vec2(pixel.x,0.));
  vec3 b=readScene(vUv-vec2(0.,pixel.y)),t=readScene(vUv+vec2(0.,pixel.y));
  float edge=length(r-l)+length(t-b), y=lum(c);
  float water=smoothstep(.015,.10,c.b-c.r)*smoothstep(.01,.10,c.g-c.r);
  float paper=hash(floor(p))-.5;
  vec3 ink=vec3(.12,.18,.20), outColor=c;

  if(style==1){
    vec2 cell=floor(p/vec2(5.,3.)),jitter=vec2(hash(cell),hash(cell+7.))-.5;
    vec2 brush=vec2(2.5+jitter.x*2.,.6+jitter.y)*pixel*pixelRatio;
    vec3 wash=(c*2.+l+r+t+b+readScene(vUv+brush)+readScene(vUv-brush))/8.;
    wash=mix(wash,vec3(.88,.84,.76),.13);
    float stroke=sin((p.x+jitter.x*7.)*1.5+p.y*.7);
    outColor=saturated(wash,1.18)+vec3(.05,.025,.045)*(hash(cell)-.5)+stroke*.012+paper*.018;
  }else if(style==2){
    float angle=.65*sin(p.x*.012)+.8*cos(p.y*.014)+atan(p.y-resolution.y/pixelRatio*.55,p.x-resolution.x/pixelRatio*.45)*.45;
    vec2 axis=vec2(cos(angle),sin(angle)),brush=axis*3.5*pixel*pixelRatio;
    vec3 paint=(c*2.+readScene(vUv+brush)+readScene(vUv-brush))/4.;
    paint=saturated(paint,1.65);
    paint=mix(paint,vec3(.10,.27,.57),water*.48);
    paint+=vec3(.10,.07,-.05)*smoothstep(.55,.85,y);
    vec2 tuft=floor(p/vec2(12.,8.)),local=mod(p,vec2(12.,8.))-vec2(6.,4.);
    float stroke=sin(dot(local,vec2(-axis.y,axis.x))*2.+hash(tuft)*6.);
    float bristle=sin(dot(local,axis)*.48+stroke*.5);
    float pigment=.4+.6*y;
    outColor=paint*(.98+stroke*.05*pigment)+bristle*.014*pigment;
  }else if(style==3){
    vec3 land=mix(vec3(.33,.45,.39),vec3(.88,.80,.60),smoothstep(.27,.85,y));
    vec3 sea=mix(vec3(.12,.25,.39),vec3(.42,.65,.68),smoothstep(.25,.68,y));
    outColor=mix(land,sea,water);
    outColor=poster(outColor,7.);
    outColor=mix(outColor,vec3(.10,.19,.27),smoothstep(.12,.42,edge)*.85);
    float wood=sin(p.y*1.8+sin(p.x*.018)*2.);
    outColor+=wood*.009+paper*.025;
  }else if(style==4){
    vec3 rice=vec3(.93,.91,.84);
    float density=pow(clamp(1.-y,0.,1.),1.15)*(1.-water*.91);
    float dry=line(p.x*.17+p.y*.07,.45)*smoothstep(.23,.65,density);
    outColor=mix(rice,vec3(.20,.26,.23),density*.94+dry*.10);
    outColor=mix(outColor,vec3(.28,.32,.28),smoothstep(.10,.46,edge)*.50*(1.-water*.6));
    outColor+=paper*.037;
  }else if(style==5){
    vec2 grid=p/3.6,cell=floor(grid),f=fract(grid)-.5;
    vec2 center=(cell+.5)*3.6*pixelRatio/resolution;
    vec3 pigment=readScene(center);
    float h=hash(cell);
    pigment=saturated(pigment,1.45)+vec3(h-.5,.5-h,sin(h*24.)*.4)*.16;
    float dotShape=1.-smoothstep(.34,.48,length(f+vec2(hash(cell+3.),hash(cell+5.))*.12));
    outColor=mix(mix(c,vec3(.94,.86,.68),.30),pigment,dotShape*.88)+paper*.02;
  }else if(style==6){
    float shade=floor(y*4.)/4.;
    vec2 screen=vec2(p.x+p.y,p.y-p.x)/6.;
    float dots=1.-smoothstep(.12+shade*.30,.17+shade*.30,length(fract(screen)-.5));
    float tone=mix(.96,shade*.65,dots*(1.-shade));
    tone=mix(tone,.09,smoothstep(.10,.34,edge));
    outColor=mix(vec3(.09,.10,.11),vec3(.96,.94,.88),tone);
  }else if(style==7){
    vec3 painted=poster(saturated(c,1.45),4.);
    painted=mix(painted,vec3(.14,.52,.72),water*.26);
    outColor=mix(painted,vec3(.10,.17,.22),smoothstep(.12,.34,edge)*.92);
  }else if(style==8){
    vec3 painted=poster(c,6.);
    painted=mix(painted,vec3(.98,.91,.73),.22);
    painted=mix(painted,vec3(.43,.70,.77),water*.32);
    outColor=mix(painted,vec3(.18,.25,.28),smoothstep(.10,.29,edge)*.68);
  }else if(style==9){
    vec3 printColor=vec3(readScene(vUv+vec2(pixel.x*pixelRatio,0.)).r,c.g,readScene(vUv-vec2(pixel.x*pixelRatio,0.)).b);
    printColor=poster(saturated(printColor,1.35),5.);
    vec2 screen=mat2(.866,-.5,.5,.866)*p/5.;
    float dots=1.-smoothstep(.14,.33,length(fract(screen)-.5));
    outColor=mix(printColor,vec3(.96,.83,.61),.14);
    outColor*=1.-dots*(1.-y)*.27;
    outColor=mix(outColor,vec3(.18,.15,.13),smoothstep(.16,.42,edge)*.8)+paper*.035;
  }else if(style==10){
    float highlight=smoothstep(.42,.66,y);
    float hatch=line((p.x+p.y)/7.,.55)+line((p.x-p.y)/9.,.4)*(1.-highlight);
    outColor=mix(vec3(.045,.08,.11),vec3(.91,.86,.73),highlight);
    outColor=mix(outColor,vec3(.10,.17,.20),water*.35);
    outColor=mix(outColor,vec3(.035,.06,.08),clamp(hatch*(1.-highlight*.6)*.55+smoothstep(.12,.38,edge),0.,1.));
    outColor+=paper*.012;
  }
  gl_FragColor=vec4(clamp(outColor,0.,1.),1.);
}`;

export function createArtRenderer(renderer,lightweight=false){
  let selected='original',target=null,draws=0;
  const size=new THREE.Vector2();
  const uniforms={sceneColor:{value:null},resolution:{value:new THREE.Vector2(1,1)},pixelRatio:{value:1},style:{value:0}};
  const material=new THREE.ShaderMaterial({uniforms,fragmentShader,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2));
  const screen=new THREE.Scene();screen.add(new THREE.Mesh(geometry,material));
  const camera=new THREE.Camera();
  return {
    setStyle(id){selected=artStyle(id).id;uniforms.style.value=artStyle(selected).mode;if(selected==='original'&&target){target.dispose();target=null;}return selected;},
    render(scene,view,layer){
      if(!artApplies(selected,layer)){renderer.render(scene,view);return;}
      renderer.getDrawingBufferSize(size);
      if(!target)target=new THREE.WebGLRenderTarget(size.x,size.y,{type:!lightweight&&renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});
      if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);
      uniforms.sceneColor.value=target.texture;uniforms.resolution.value.copy(size);uniforms.pixelRatio.value=renderer.getPixelRatio();
      const autoReset=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();
      try{renderer.setRenderTarget(target);renderer.render(scene,view);renderer.setRenderTarget(null);renderer.render(screen,camera);draws++;}
      finally{renderer.setRenderTarget(null);renderer.info.autoReset=autoReset;}
    },
    stats(layer){return {selected,applied:artApplies(selected,layer),target:target?[target.width,target.height]:null,draws};},
    dispose(){target?.dispose();geometry.dispose();material.dispose();},
  };
}
