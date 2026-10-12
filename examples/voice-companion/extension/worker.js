// Privileged capture stays local. Only a toolbar gesture selects a source tab.
let capturePort, panelPort, state={type:'state',status:'idle',source:''};
let busy=false,ready=false,sequence=0,sourceTab=null,sourceOrigin='',generation=0;
const pending=new Map();
async function openPanel(){
  const contexts=await chrome.runtime.getContexts({contextTypes:['TAB'],documentUrls:[chrome.runtime.getURL('panel.html')]});
  const existing=contexts.find(c=>c.windowId>=0);
  if(existing){try{await chrome.windows.update(existing.windowId,{focused:true});return;}catch{}}
  await chrome.windows.create({url:chrome.runtime.getURL('panel.html'),type:'popup',width:440,height:820});
}
function publish(){try{panelPort?.postMessage(state);}catch{}}
function setState(status,source=state.source,reason=''){state={type:'state',status,source,reason};publish();}
async function stop(status='idle',reason=''){
  generation++;sourceTab=null;sourceOrigin='';ready=false;pending.clear();
  try{capturePort?.postMessage({type:'stop'});}catch{}
  setState(status,state.source,reason);await chrome.action.setBadgeText({text:''});
}
function failure(error,stage){
  const message=String(error?.message||'');
  if(/active stream|already.*captur/i.test(message))return 'in-use';
  if(/invoked|permission|notallowed|denied|access/i.test(message+' '+error?.name))return 'permission';
  return stage;
}
export function handleAction(tab){
  // Keep the source selected by this gesture, before opening UI changes focus.
  const selected={id:tab.id,url:tab.url,windowId:tab.windowId};
  if(busy||state.status==='capturing'){
    void openPanel().catch(()=>{});return;
  }
  busy=true;const attempt=++generation;sourceTab=selected.id;
  let stage='source',streamRequest;
  try{
    const url=new URL(selected.url);
    if(!['http:','https:'].includes(url.protocol)||['kasamila.com','www.kasamila.com'].includes(url.hostname))throw new Error('Unsupported source');
    sourceOrigin=url.origin;setState('connecting',url.hostname);
    // Request permission before awaiting offscreen/UI creation.
    stage='permission';streamRequest=chrome.tabCapture.getMediaStreamId({targetTabId:selected.id});streamRequest.catch(()=>{});
  }catch(error){busy=false;void stop('failed',failure(error,stage));}
  void openPanel().catch(()=>{});
  if(!streamRequest)return;
  void (async()=>{
    try{
      const streamId=await streamRequest;stage='offscreen';
      const contexts=await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']});
      if(!contexts.length)await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['USER_MEDIA'],justification:'Capture selected tab audio and preserve its playback while animating the avatar.'});
      if(attempt!==generation)return;
      stage='capture';const result=await chrome.runtime.sendMessage({target:'capture',type:'start',streamId});
      if(!result?.ok)throw Object.assign(new Error('Capture failed'),{stage:result?.reason||stage});
      if(attempt!==generation){capturePort?.postMessage({type:'stop'});return;}
      setState('capturing');await chrome.action.setBadgeText({text:'ON'});await chrome.action.setBadgeBackgroundColor({color:'#0f766e'});
    }catch(error){if(attempt===generation)await stop('failed',error.stage||failure(error,stage));}
    finally{busy=false;}
  })();
}
chrome.action.onClicked.addListener(handleAction);
chrome.tabs.onRemoved.addListener(id=>{if(id===sourceTab)void stop();});
chrome.tabs.onUpdated.addListener((id,change)=>{
  // Same-origin conversation navigation/reloads do not end a session.
  if(id!==sourceTab||!change.url)return;
  try{if(new URL(change.url).origin!==sourceOrigin)void stop();}catch{void stop();}
});
chrome.runtime.onConnect.addListener(port=>{
  if(port.sender?.id!==chrome.runtime.id)return;
  if(port.name==='capture'&&port.sender.url===chrome.runtime.getURL('offscreen.html')){
    capturePort=port;
    port.onMessage.addListener(message=>{
      if(capturePort!==port)return;
      if(message.type==='stopped'){void stop();return;}
      // An independent timer keeps worker/Portal alive when an audio graph is silent.
      if(message.type==='tick'){try{panelPort?.postMessage({type:'tick'});}catch{}return;}
      if(message.type!=='pcm'||!ready||!panelPort||state.status!=='capturing')return;
      if(!Array.isArray(message.samples)||message.samples.length!==640)return;
      const now=Date.now();
      // Bound live audio latency; temporary backpressure is not a session failure.
      if(pending.size>=8)return;
      const id=++sequence;pending.set(id,now);
      panelPort.postMessage({type:'pcm',sequence:id,sentAt:now,samples:message.samples});
    });
    port.onDisconnect.addListener(()=>{if(capturePort===port){capturePort=null;void stop('failed','offscreen');}});
  }else if(port.name==='panel'&&port.sender.url?.startsWith(chrome.runtime.getURL('panel.html'))){
    const previous=panelPort;panelPort=port;ready=false;pending.clear();
    if(previous){try{previous.postMessage({type:'replaced'});previous.disconnect();}catch{}}
    publish();
    port.onMessage.addListener(message=>{
      if(panelPort!==port)return;
      if(message.type==='ready'){ready=true;pending.clear();}
      if(message.type==='not-ready'){ready=false;pending.clear();}
      if(message.type==='ack')pending.delete(message.sequence);
      if(message.type==='stop')void stop();
    });
    port.onDisconnect.addListener(()=>{if(panelPort===port){panelPort=null;void stop();}});
  }
});
