let stream, context, input, tap, stopping = false, generation = 0;
const port = chrome.runtime.connect({name:'capture'});
async function stop() {
  generation++; stopping = true;
  stream?.getTracks().forEach(track=>track.stop()); stream=null;
  input?.disconnect();tap?.disconnect();input=tap=null;
  const old=context;context=null;try{await old?.close();}catch{}
  stopping = false;
}
port.onMessage.addListener(message=>{if(message.type==='stop')void stop();});
port.onDisconnect.addListener(()=>void stop());
chrome.runtime.onMessage.addListener((message, sender, respond)=>{
  if(sender.id!==chrome.runtime.id||message.target!=='capture'||message.type!=='start')return;
  void (async()=>{
    await stop();const attempt=generation;
    try {
      const acquired=await navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:message.streamId}},video:false});
      if(attempt!==generation){acquired.getTracks().forEach(track=>track.stop());respond({ok:false});return;}
      stream=acquired;context=new AudioContext();await context.resume();
      await context.audioWorklet.addModule('capture-worklet.js');
      if(attempt!==generation){respond({ok:false});return;}
      input=context.createMediaStreamSource(stream);tap=new AudioWorkletNode(context,'companion-capture');
      // Restore source audio exactly once. Avatar playback stays disabled.
      input.connect(context.destination);input.connect(tap);tap.connect(context.destination);
      tap.port.onmessage=event=>{try{port.postMessage({type:'pcm',samples:Array.from(new Int16Array(event.data))});}catch{void stop();}};
      for(const track of stream.getTracks())track.onended=()=>{if(!stopping){void stop();port.postMessage({type:'stopped'});}};
      respond({ok:true});
    }catch{await stop();respond({ok:false});}
  })();
  return true;
});
