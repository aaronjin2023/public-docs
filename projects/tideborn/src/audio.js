export function createSoundscape(){
  let ctx=null,timer=null,volume=null,filter=null,windGain=null,noteIndex=0,notesPlayed=0;
  let light='day',tide=.5;
  function setEnvironment(next){
    light=next.light??light;tide=next.tide??tide;
    if(!ctx)return;
    volume.gain.setTargetAtTime(light==='night'?.10:light==='dusk'?.13:.16,ctx.currentTime,2);
    filter.frequency.setTargetAtTime(light==='night'?250:light==='dusk'?430:700,ctx.currentTime,3);
    windGain.gain.setTargetAtTime(.07+Math.max(0,Math.min(1,tide))*.13,ctx.currentTime,3);
  }
  async function start(){
    if(ctx)return;
    ctx=new AudioContext();
    try{
    await ctx.resume();
    volume=ctx.createGain();volume.gain.value=0;volume.connect(ctx.destination);
    const buffer=ctx.createBuffer(1,ctx.sampleRate*5,ctx.sampleRate),data=buffer.getChannelData(0);
    let previous=0;for(let i=0;i<data.length;i++){previous=(previous+Math.random()*.04-.02)/1.02;data[i]=previous*3;}
    const wind=ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;
    filter=ctx.createBiquadFilter();filter.type='lowpass';
    windGain=ctx.createGain();windGain.gain.value=0;wind.connect(filter);filter.connect(windGain);windGain.connect(volume);wind.start();
    setEnvironment({light,tide});
    const tones=[0,7,12,16,19,24,19,16,12,7];
    function phrase(){
      if(!ctx||document.hidden)return;
      const now=ctx.currentTime,base=light==='night'?98:light==='dusk'?116.5409:130.8128;
      for(let i=0;i<3;i++){
        const osc=ctx.createOscillator(),gain=ctx.createGain(),start=now+i*1.6;
        osc.type='sine';osc.frequency.value=base*2**((tones[(noteIndex+i)%tones.length]+(i===1?12:0))/12);
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.10,start+.3);gain.gain.exponentialRampToValueAtTime(.0001,start+6);
        osc.connect(gain);gain.connect(volume);osc.start(start);osc.stop(start+6.2);notesPlayed++;
      }noteIndex=(noteIndex+2)%tones.length;
    }
    phrase();timer=setInterval(phrase,8500);
    }catch(error){await stop();throw error;}
  }
  async function stop(){clearInterval(timer);timer=null;const previous=ctx;ctx=null;if(previous)await previous.close();}
  async function setHidden(hidden){if(ctx){if(hidden)await ctx.suspend();else await ctx.resume();}}
  return {start,stop,setEnvironment,setHidden,stats:()=>({state:ctx?.state??'closed',light,tide,notesScheduled:notesPlayed,volume:ctx?volume.gain.value:0,windCutoff:ctx?filter.frequency.value:0})};
}
