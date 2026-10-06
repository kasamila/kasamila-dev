import { language, localizedPortalUrl } from './i18n.js?v=20';
import { demoText } from './demo-copy.js?v=2';
import { drivePcm } from './examples/audio-bridge/bridge.mjs';
const $=selector=>document.querySelector(selector);
const chatPage=location.pathname.endsWith('/chat');
$('#gallery').hidden=chatPage;$('#chat-demo').hidden=!chatPage;
let catalog={avatars:[],channels:[]},player=null,socket=null,source=null,context=null,micStream=null,micNode=null,micInput=null;
let running=false,starting=false,ending=false,muted=false,ready=false,output=null,timeout=null,startupTimeout=null;
let inputRate=16000,bootstrap=null,playedStart=0,receivedMs=0,version=0;
function copy(){
 document.querySelectorAll('[data-demo-copy]').forEach(node=>node.textContent=demoText(node.dataset.demoCopy));
 $('#demo-text').placeholder=demoText('input');
 $('#demo-mic').textContent=demoText(micStream?'micOff':'mic');$('#demo-mute').textContent=demoText(muted?'unmute':'mute');
 document.title=demoText(chatPage?'chat':'heading')+' · Kasamila';
 if(!running&&!starting)status(catalog.avatars.length?'':demoText('unavailable'));
 renderAvatars();
}
function status(text){$('#demo-status').textContent=text;}
function renderAvatars(){
 const selected=$('#demo-avatar').value;
 $('#demo-avatar').replaceChildren(...catalog.avatars.map(row=>new Option(row.names[language()]||row.name,row.id)));
 if(catalog.avatars.some(row=>row.id===selected))$('#demo-avatar').value=selected;
 renderChannels();
}
function renderChannels(){
 const avatar=catalog.avatars.find(row=>row.id===$('#demo-avatar').value);
 const selected=$('#demo-channel').value;
 $('#demo-channel').replaceChildren(...catalog.channels.filter(row=>avatar?.channels.includes(row.id)).map(row=>new Option(row.label,row.id)));
 if([...$('#demo-channel').options].some(row=>row.value===selected))$('#demo-channel').value=selected;
 $('#demo-avatar-name').textContent=avatar?.names[language()]||avatar?.name||'Kasamila';
 if(avatar?.poster_url&&!running&&!starting)$('#demo-poster')?.setAttribute('src',avatar.poster_url);
 controls();
}
function controls(){
 $('#demo-start').disabled=starting||running||ending||!$('#demo-consent').checked||!$('#demo-channel').value;
 $('#demo-end').disabled=!running&&!starting;
 for(const id of ['demo-mic','demo-interrupt','demo-mute','demo-send','demo-text'])$('#'+id).disabled=!ready||ending;
 for(const id of ['demo-avatar','demo-channel','demo-consent'])$('#'+id).disabled=running||starting||ending;
}
function bubble(role,text=''){
 const node=document.createElement('p');node.className='demo-bubble '+role;node.dir='auto';node.textContent=text;
 const log=$('#demo-history');log.append(node);while(log.children.length>80)log.firstChild.remove();log.scrollTop=log.scrollHeight;
 return node;
}
function send(value){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(value));}
function stopAudio(){
 const previous=source;source=null;previous?.abort();player?.stop();output=null;playedStart=0;receivedMs=0;
}
function interrupt(){
 const elapsed=playedStart?Math.min(receivedMs,Math.max(0,performance.now()-playedStart)):0;
 send({type:'interrupt',audio_end_ms:Math.floor(elapsed)});stopAudio();
}
function decodePcm(data){
 const bytes=Uint8Array.from(atob(data),letter=>letter.charCodeAt(0));if(bytes.length%2)throw new Error('Invalid PCM');
 return new Int16Array(bytes.buffer);
}
function encodePcm(buffer){
 const bytes=new Uint8Array(buffer);let result='';for(let i=0;i<bytes.length;i++)result+=String.fromCharCode(bytes[i]);return btoa(result);
}
async function stopMic(){
 micNode?.disconnect();micInput?.disconnect();micStream?.getTracks().forEach(track=>track.stop());micNode=null;micInput=null;micStream=null;
 send({type:'audio_end'});$('#demo-mic').setAttribute('aria-pressed','false');$('#demo-mic').textContent=demoText('mic');
}
async function end(message=demoText('ended')){
 if(ending)return;ending=true;version++;ready=false;running=false;starting=false;clearTimeout(timeout);clearTimeout(startupTimeout);controls();
 await stopMic();const oldSocket=socket;socket=null;oldSocket?.close();stopAudio();
 const oldPlayer=player;player=null;
 try{if(oldPlayer)await oldPlayer.destroy();else if(bootstrap)await fetch(new URL('/api/v1/runtime/sessions/end',bootstrap.api_base||location.origin),{method:'POST',keepalive:true,headers:{Authorization:'Bearer '+bootstrap.runtime.client_token}});}catch{}
 bootstrap=null;try{await context?.close();}catch{}context=null;
 const image=document.createElement('img');image.id='demo-poster';image.src=catalog.avatars.find(row=>row.id===$('#demo-avatar').value)?.poster_url||'/web/portal/media/demo-portrait-friendly-v1.webp';image.alt='';$('#demo-stage').replaceChildren(image);
 ending=false;status(message);controls();
}
async function start(){
 if(starting||running||ending)return;starting=true;const attempt=++version;controls();status(demoText('connecting'));
 $('#demo-history').replaceChildren();muted=false;copy();
 try{
  context=new AudioContext();await context.resume();
  const response=await fetch('/portal/apps/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({avatar:$('#demo-avatar').value,channel:$('#demo-channel').value,locale:language(),consent:$('#demo-consent').checked})});
  const result=await response.json();if(!response.ok)throw new Error('Session unavailable');
  if(attempt!==version){await fetch(new URL('/api/v1/runtime/sessions/end',result.api_base||location.origin),{method:'POST',headers:{Authorization:'Bearer '+result.runtime.client_token}});return;}
  bootstrap=result;
  const apiBase=result.api_base||location.origin;const {loadKasamila}=await import(new URL('/sdk/bootstrap/1/loader.mjs',apiBase).href);const Kasamila=await loadKasamila(result.runtime.sdk,apiBase);
  if(attempt!==version)return;
  const element=document.createElement('kasamila-avatar');$('#demo-stage').replaceChildren(element);
  element.addEventListener('kasamila-error',()=>void end(demoText('failed')));
  const created=await Kasamila.create({element,sessionToken:result.runtime.client_token,templateMedia:result.template_media,providerPreview:!result.template_media});
  if(attempt!==version){await created.destroy();return;}player=created;
  socket=new WebSocket(location.protocol==='https:'?'wss://'+location.host+'/portal/apps/socket':'ws://'+location.host+'/portal/apps/socket');
  socket.onopen=()=>send({ticket:result.ticket});
  startupTimeout=setTimeout(()=>void end(demoText('failed')),25000);
  socket.onmessage=event=>{
   try{
    const message=JSON.parse(event.data);
    if(message.type==='ready'){clearTimeout(startupTimeout);ready=true;running=true;starting=false;inputRate=message.input_rate;status(demoText('connected'));controls();timeout=setTimeout(()=>void end(),result.duration*1000);}
    else if(message.type==='error'){void end(demoText(message.code||'failed'));}
    else if(message.type==='interrupted'){stopAudio();}
    else if(message.type==='user_text'&&message.text){bubble('user',message.text);}
    else if(message.type==='text'&&message.delta){output=output||bubble('assistant');output.textContent+=message.delta;$('#demo-history').scrollTop=$('#demo-history').scrollHeight;}
    else if(message.type==='audio'){
     if(!player||!ready)return;
     if(!source){source=drivePcm(player,{sampleRate:message.sample_rate,maxQueuedMs:10000,playback:!muted});const current=source;current.finished.catch(()=>{if(source===current&&!ending)void end(demoText('failed'));});playedStart=performance.now();receivedMs=0;}
     const pcm=decodePcm(message.data);source.push(pcm);receivedMs+=pcm.length/message.sample_rate*1000;
    }else if(message.type==='done'){source?.close();source=null;output=null;}
   }catch{void end(demoText('failed'));}
  };
  socket.onclose=()=>{if(!ending&&(starting||running))void end();};socket.onerror=()=>void end(demoText('failed'));
 }catch{if(attempt===version)await end(demoText('failed'));}
}
$('#demo-avatar').addEventListener('change',renderChannels);$('#demo-consent').addEventListener('change',controls);
$('#demo-start').addEventListener('click',start);$('#demo-end').addEventListener('click',()=>void end());$('#demo-interrupt').addEventListener('click',interrupt);
$('#demo-mute').addEventListener('click',()=>{muted=!muted;stopAudio();$('#demo-mute').textContent=demoText(muted?'unmute':'mute');$('#demo-mute').setAttribute('aria-pressed',String(muted));});
$('#demo-mic').addEventListener('click',async()=>{
 if(micStream)return stopMic();if(!ready)return;const attempt=version;let acquired;
 try{
  const stream=acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
  if(attempt!==version||!ready){stream.getTracks().forEach(track=>track.stop());return;}
  await context.audioWorklet.addModule('/web/portal/demo-microphone.js?v=1');
  if(attempt!==version||!ready){stream.getTracks().forEach(track=>track.stop());return;}
  micStream=stream;micInput=context.createMediaStreamSource(stream);micNode=new AudioWorkletNode(context,'demo-microphone',{processorOptions:{sampleRate:inputRate}});
  micNode.port.onmessage=event=>{if(ready&&socket?.bufferedAmount<65536)send({type:'audio',data:encodePcm(event.data)});};
  micInput.connect(micNode);micNode.connect(context.destination);$('#demo-mic').textContent=demoText('micOff');$('#demo-mic').setAttribute('aria-pressed','true');
 }catch{acquired?.getTracks().forEach(track=>track.stop());await stopMic();status(demoText('failed'));}
});
$('#demo-text-form').addEventListener('submit',event=>{event.preventDefault();const text=$('#demo-text').value.trim();if(!text||!ready)return;if(source||output)interrupt();bubble('user',text);send({type:'text',text});$('#demo-text').value='';});
$('#demo-text').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#demo-text-form').requestSubmit();}});
window.addEventListener('kasamila:language-changed',()=>{history.replaceState(history.state,'',localizedPortalUrl(location.href,location.href));copy();});
window.addEventListener('pagehide',()=>void end());
copy();
if(chatPage)fetch('/portal/apps/catalog',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error();return response.json();}).then(value=>{catalog=value;copy();}).catch(()=>status(demoText('unavailable')));
