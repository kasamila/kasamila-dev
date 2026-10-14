import {DemoVideo} from './demo-video.js?v=1';
import {recoverableChatStart,chatFailurePhase,closeChatSocket} from './demo-chat-recovery.js?v=1';
import {DemoStartup,disposeDemoAvatar,releaseDemoRuntime,voiceTicket} from './demo-startup.js?v=2';
import { companionText } from './companion-copy.js';
import { language, localizedPortalUrl } from './i18n.js?v=20';
import { demoText } from './demo-copy.js?v=7';
import { drivePcm } from './examples/audio-bridge/bridge.mjs';
const $=selector=>document.querySelector(selector);
const chatPage=location.pathname.endsWith('/chat');
$('#gallery').hidden=chatPage;$('#chat-demo').hidden=!chatPage;
let catalog={avatars:[],channels:[]},player=null,socket=null,source=null,context=null,micStream=null,micNode=null,micInput=null;
let running=false,starting=false,ending=false,muted=false,ready=false,output=null,timeout=null,startup=null,pendingPlayer=null,media=null,mediaReady=false;
let inputRate=16000,bootstrap=null,playedStart=0,receivedMs=0,version=0;
function copy(){
 document.querySelectorAll('[data-companion-copy]').forEach(node=>node.textContent=companionText(node.dataset.companionCopy));
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
 const voiceOnly=catalog.channels.find(row=>row.id===$('#demo-channel').value)?.text_input===false;
 for(const id of ['demo-send','demo-text'])$('#'+id).disabled=!ready||ending||voiceOnly;
 $('#demo-channel-note').hidden=!voiceOnly;$('#demo-channel-note').textContent=demoText('voiceOnly');
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
 if(ending){version++;return;}ending=true;version++;ready=false;running=false;starting=false;clearTimeout(timeout);startup?.close();startup=null;media?.close();media=null;mediaReady=false;controls();
 await stopMic();const oldSocket=socket;socket=null;const disconnected=closeChatSocket(oldSocket);stopAudio();
 const oldPlayer=player||pendingPlayer;player=pendingPlayer=null;const oldBootstrap=bootstrap;bootstrap=null;
 const oldContext=context;context=null;
 await Promise.all([disposeDemoAvatar(oldPlayer,oldBootstrap),disconnected]);try{await oldContext?.close();}catch{}

 const image=document.createElement('img');image.id='demo-poster';image.src=catalog.avatars.find(row=>row.id===$('#demo-avatar').value)?.poster_url||'/web/portal/media/demo-portrait-friendly-v1.webp';image.alt='';$('#demo-stage').replaceChildren(image);
 ending=false;status(message);controls();
}
async function start(retried=false){
 if(starting||running||ending)return;starting=true;const attempt=++version;controls();status(demoText('connecting'));
 let phase='session';
 $('#demo-status').removeAttribute('data-failure-phase');
 const fail=async error=>{
  if(attempt!==version||ending)return;
  const retry=starting&&!retried&&recoverableChatStart(error);
  $('#demo-status').dataset.failurePhase=chatFailurePhase(phase);
  const message=demoText(retry?'retryingConnection':error?.code||'failed');
  await end(message);
  if(retry&&version===attempt+1&&!running&&!starting&&!ending)void start(true);
 };
 $('#demo-history').replaceChildren();muted=false;copy();
 const guard=startup=new DemoStartup($('#demo-end'),status,note=>{if(attempt===version)void end(note);});
 if(retried){guard.status=text=>status(guard.phase==='preparing'?demoText('retryingConnection'):text);guard.lastStatus=null;guard.update();}
 try{
  context=new AudioContext();guard.bind(null,context);await context.resume();if(attempt!==version)return;
  // Consume late admission responses so cancellation can release an allocated runtime.
  const response=await fetch('/portal/apps/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({avatar:$('#demo-avatar').value,channel:$('#demo-channel').value,locale:language(),consent:$('#demo-consent').checked})});
  const result=await response.json();if(!response.ok)throw Object.assign(new Error('Session unavailable'),{code:result.error?.code||'demo_unavailable'});
  if(attempt!==version){await releaseDemoRuntime(result);return;}
  bootstrap=result;
  phase='avatar';
  const apiBase=result.api_base||location.origin;const {loadKasamila}=await import(new URL('/sdk/bootstrap/1/loader.mjs',apiBase).href);const Kasamila=await loadKasamila(result.runtime.sdk,apiBase);
  if(attempt!==version)return;
  const element=document.createElement('kasamila-avatar');pendingPlayer=element;guard.bind(element,context);$('#demo-stage').replaceChildren(element);
  let initializing=true;
  // create() rejects with the initialization error. Handling its event as well
  // used to tear down the attempt before recovery could inspect the failure.
  element.addEventListener('kasamila-error',event=>{if(!initializing&&attempt===version&&(player===element||pendingPlayer===element))void fail(event.detail||new Error('Avatar failed'));});
  const presentation=media=new DemoVideo($('#demo-stage'),catalog.avatars.find(row=>row.id===$('#demo-avatar').value)?.poster_url||'/web/portal/media/demo-portrait-friendly-v1.webp',{
   onState(available){if(attempt!==version||ending)return;mediaReady=available;if(running){if(!available)interrupt();ready=available;status(demoText(available?'connected':'videoBuffering'));controls();}},
   onFailure(note){if(attempt===version)void end(note);}
  });
  let created;try{created=await Kasamila.create({element,sessionToken:result.runtime.client_token,templateMedia:result.template_media,providerPreview:!result.template_media});}finally{initializing=false;}
  if(attempt!==version){await disposeDemoAvatar(created,result);return;}player=created;pendingPlayer=null;
  phase='video';guard.video(presentation);await presentation.wait(created);if(attempt!==version)return;
  phase='voice';guard.connecting();const ticket=await voiceTicket('/portal/apps/voice-ticket',result,guard.signal);if(attempt!==version)return;
  socket=new WebSocket(location.protocol==='https:'?'wss://'+location.host+'/portal/apps/socket':'ws://'+location.host+'/portal/apps/socket');
  const ws=socket;ws.onopen=()=>{if(attempt===version&&socket===ws)send({ticket});};
  socket.onmessage=event=>{
   if(attempt!==version||socket!==ws)return;
   try{
    const message=JSON.parse(event.data);
    if(message.type==='ready'){guard.complete();ready=mediaReady;running=true;starting=false;inputRate=message.input_rate;status(demoText(mediaReady?'connected':'videoBuffering'));controls();timeout=setTimeout(()=>void end(),result.duration*1000);}
    else if(message.type==='error'){void fail({code:message.code||'provider_error'});}
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
  socket.onclose=()=>{if(attempt===version&&!ending&&(starting||running)){if(starting)void fail({code:'demo_connection_failed'});else void end(demoText('ended'));}};socket.onerror=()=>{if(attempt===version)void fail({code:'demo_connection_failed'});};
 }catch(error){await fail(error);}
}
$('#demo-avatar').addEventListener('change',renderChannels);$('#demo-consent').addEventListener('change',controls);
$('#demo-channel').addEventListener('change',controls);
$('#demo-start').addEventListener('click',()=>void start());$('#demo-end').addEventListener('click',()=>void end());$('#demo-interrupt').addEventListener('click',interrupt);
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
