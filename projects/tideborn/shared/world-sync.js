export const SYNC_INTERVAL_MS=15*60*1000;

// Timers request whole named resources. No cursors, long polls or per-player deltas.
export function createWorldSync({request,identity,active,visible=()=>[],onState,onClock,onStatus,intervalMs=SYNC_INTERVAL_MS,retryMinMs=30000,timeoutMs=10000}){
  let state=null,owner=identity(),generation=0,controller=null,pending=null,timer=null,paused=false,failures=0,nextPullAt=0,inflight=[],clockOffset=0;
  const base=()=>['world',...(identity()?['person']:[])];
  function cancel(){generation++;clearTimeout(timer);timer=null;controller?.abort();controller=null;pending=null;inflight=[];}
  function schedule(){
    clearTimeout(timer);timer=null;if(paused||!active())return;
    let at=nextPullAt,resources=[...base(),...visible()];
    for(const [boundary,scopes] of [[state?.nextAt,[...base(),...visible()]],[state?.person?.encounter?.expiresAt,['person',...visible()]]]){
      if(Number.isFinite(boundary)&&boundary>Date.now()+clockOffset){const due=boundary-clockOffset+250;if(due<at){at=due;resources=scopes;}}
    }
    timer=setTimeout(()=>pull(resources),Math.max(0,at-Date.now()));
  }
  function pull(resources){
    if(pending)return pending;clearTimeout(timer);timer=null;
    const id=identity();if(id!==owner){owner=id;state=null;resources=[...base(),...resources];}
    inflight=[...new Set(resources)];const version=++generation;controller=new AbortController();
    const control=controller,deadline=setTimeout(()=>control.abort(),timeoutMs),scopes=inflight;
    pending=Promise.resolve().then(async()=>{
      try{
        const p=await request({resources:scopes,signal:control.signal});
        if(version!==generation||identity()!==id)return;
        if(!p||!Number.isFinite(p.serverNow)||!p.changes||typeof p.changes!=='object')throw new Error('状态协议需要重新校准');
        state={...state,...p.changes,serverNow:p.serverNow};failures=0;clockOffset=p.serverNow-Date.now();
        if(scopes.includes('world')||!nextPullAt)nextPullAt=Date.now()+intervalMs;
        onClock(p.serverNow);onState(state);onStatus('connected');return state;
      }catch(e){
        if(version!==generation)return;
        failures++;nextPullAt=Date.now()+Math.min(300000,retryMinMs*2**Math.min(failures-1,5)*(1+Math.random()*.2));
        onStatus('reconnecting',e);
      }finally{clearTimeout(deadline);if(version===generation){controller=null;pending=null;inflight=[];schedule();}}
    });return pending;
  }
  return {
    refresh(resources=[...base(),...visible()]){const merged=[...inflight,...resources];cancel();return pull(merged);},
    pause(){paused=true;cancel();},
    resume(){paused=false;if(!active()||pending)return pending;if(!state||identity()!==owner||Date.now()>=nextPullAt||state.nextAt<=Date.now()+clockOffset||state.person?.encounter?.expiresAt<=Date.now()+clockOffset)return pull([...base(),...visible()]);onStatus(failures?'reconnecting':'connected');schedule();},
    close(){paused=true;cancel();},
  };
}
