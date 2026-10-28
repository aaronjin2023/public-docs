import {musicStyle,musicVolume,scoreBar} from './music.js';

// shortcut: harmonic synthesis approximates keys and strings; use instrument samples for acoustic realism.
export function createVoiceBank(ctx,output){
  const bus=ctx.createGain();bus.gain.value=1;bus.connect(output);
  const waves={},active=new Set();
  const timbres={keys:[1,.28,.11,.045,.02],felt:[1,.12,.025],pluck:[1,.48,.24,.13,.06,.025],reed:[1,0,.18,0,.06],bell:[1,0,.24,0,.055]};
  for(const [name,partials] of Object.entries(timbres))waves[name]=ctx.createPeriodicWave(new Float32Array(partials.length+1),new Float32Array([0,...partials]));
  function play(note,time,unit){
    const osc=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
    const attack=note.voice==='pluck'?.009:note.voice==='bell'?.12:.025;
    const end=time+Math.max(.18,note.duration*unit),peak=note.velocity;
    osc.setPeriodicWave(waves[note.voice]??waves.keys);osc.frequency.value=440*2**((note.midi-69)/12);
    pan.pan.value=note.pan;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(peak,time+attack);
    gain.gain.exponentialRampToValueAtTime(.0001,end);gain.gain.linearRampToValueAtTime(0,end+.04);
    osc.connect(gain);gain.connect(pan);pan.connect(bus);active.add(osc);
    osc.onended=()=>{osc.disconnect();gain.disconnect();pan.disconnect();active.delete(osc);};
    osc.start(time);osc.stop(end+.05);
  }
  function end(){
    const at=ctx.currentTime;
    bus.gain.cancelScheduledValues(at);bus.gain.setTargetAtTime(0,at,.035);
    for(const osc of active)osc.stop(at+.2);
    // A scheduled silent source releases the bank even while the page's JS timers are throttled.
    const cleanup=ctx.createOscillator();cleanup.onended=()=>{bus.disconnect();cleanup.disconnect();};cleanup.start(at);cleanup.stop(at+.21);
  }
  return {play,end,active:()=>active.size};
}

export function createSoundscape(){
  let ctx=null,timer=null,volume=null,filter=null,windGain=null,bank=null,notesPlayed=0;
  let light='day',tide=.5,style='ambient',level=.65,bar=0,nextTime=0,hidden=false;
  function setEnvironment(next){
    light=next.light??light;tide=next.tide??tide;
    if(!ctx||!volume)return;
    volume.gain.setTargetAtTime(level*(light==='night'?.65:light==='dusk'?.82:1),ctx.currentTime,.2);
    filter.frequency.setTargetAtTime(light==='night'?250:light==='dusk'?430:700,ctx.currentTime,3);
    windGain.gain.setTargetAtTime((style==='ambient'?.12:.035)*(.35+Math.max(0,Math.min(1,tide))),ctx.currentTime,1);
  }
  function schedule(){
    if(!ctx||!bank||hidden||ctx.state!=='running')return;
    if(nextTime<ctx.currentTime-.25)nextTime=ctx.currentTime+.04;
    if(nextTime>ctx.currentTime+.25)return;
    const score=scoreBar(style,bar++,light),unit=60/score.bpm;
    for(const note of score.notes){bank.play(note,nextTime+note.beat*unit,unit);notesPlayed++;}
    nextTime+=score.beats*unit;
  }
  function setStyle(id){
    const next=musicStyle(id).id;if(next===style)return;
    style=next;bar=0;
    if(ctx&&bank){bank.end();bank=createVoiceBank(ctx,volume);nextTime=ctx.currentTime+.22;setEnvironment({});schedule();}
  }
  function setVolume(value){level=musicVolume(value);setEnvironment({});}
  async function start(){
    if(ctx)return;
    ctx=new AudioContext();
    try{
      await ctx.resume();
      volume=ctx.createGain();volume.gain.value=0;
      const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=4;limiter.attack.value=.01;limiter.release.value=.2;
      volume.connect(limiter);limiter.connect(ctx.destination);
      const buffer=ctx.createBuffer(1,ctx.sampleRate*5,ctx.sampleRate),data=buffer.getChannelData(0);
      let previous=0;for(let i=0;i<data.length;i++){previous=(previous+Math.random()*.04-.02)/1.02;data[i]=previous*3;}
      const wind=ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;
      filter=ctx.createBiquadFilter();filter.type='lowpass';
      windGain=ctx.createGain();windGain.gain.value=0;wind.connect(filter);filter.connect(windGain);windGain.connect(volume);wind.start();
      bank=createVoiceBank(ctx,volume);bar=0;nextTime=ctx.currentTime+.04;hidden=typeof document!=='undefined'&&document.hidden;
      setEnvironment({});if(hidden)await ctx.suspend();schedule();timer=setInterval(schedule,100);
    }catch(error){await stop();throw error;}
  }
  async function stop(){
    clearInterval(timer);timer=null;const previous=ctx,master=volume;ctx=null;bank=null;volume=null;filter=null;windGain=null;
    if(previous?.state==='running'&&master){master.gain.cancelScheduledValues(previous.currentTime);master.gain.setTargetAtTime(0,previous.currentTime,.012);await new Promise(resolve=>setTimeout(resolve,80));}
    if(previous)await previous.close();
  }
  async function setHidden(value){hidden=value;if(ctx){if(hidden)await ctx.suspend();else{await ctx.resume();schedule();}}}
  return {start,stop,setStyle,setVolume,setEnvironment,setHidden,stats:()=>({state:ctx?.state??'closed',style,level,light,tide,bar,notesScheduled:notesPlayed,activeVoices:bank?.active()??0,volume:volume?.gain.value??0,windCutoff:filter?.frequency.value??0})};
}
