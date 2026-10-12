// One foreground PiP renderer. Capture and permissions stay in extension code.
let capturePort,panelPort,state={type:'state',status:'idle',source:''};
let busy=false,ready=false,sequence=0,sourceTab=null,sourceOrigin='',generation=0,launchId='',lastLevel=0;
const pending=new Map();
function publish(){try{panelPort?.postMessage(state);}catch{}}
function setState(status,source=state.source,reason=''){state={type:'state',status,source,reason};publish();}
async function stop(status='idle',reason=''){
 generation++;ready=false;pending.clear();
 try{capturePort?.postMessage({type:'stop'});}catch{}
 setState(status,state.source,reason);await chrome.action.setBadgeText({text:status==='failed'?'!':''});
}
function failure(error,stage){
 const message=String(error?.message||'');
 if(/active stream|already.*captur/i.test(message))return 'in-use';
 if(/invoked|permission|notallowed|denied|access/i.test(message+' '+error?.name))return 'permission';
 return stage;
}
// Isolated script only creates our window after a toolbar gesture. No page text.
async function openMini(url){
 if(!window.documentPictureInPicture)throw new Error('Document PiP unavailable');
 const current=documentPictureInPicture.window;
 if(current&&current.document.querySelector('iframe')?.src===url){current.focus();return;}
 const mini=current||await documentPictureInPicture.requestWindow({width:280,height:330,disallowReturnToOpener:true});
 mini.document.title='Kasamila';
 mini.document.documentElement.style.cssText='height:100%;background:#091b20';
 mini.document.body.style.cssText='margin:0;height:100%;overflow:hidden';
 const frame=mini.document.createElement('iframe');
 frame.title='Kasamila Voice Companion';frame.allow='autoplay';frame.referrerPolicy='no-referrer';
 frame.style.cssText='border:0;width:100%;height:100%;display:block';frame.src=url;
 mini.document.body.replaceChildren(frame);
}
export function handleAction(tab){
 if(busy)return;
 let url;
 try{url=new URL(tab.url);if(!['https:','http:'].includes(url.protocol)||['kasamila.com','www.kasamila.com'].includes(url.hostname))throw new Error();}
 catch{void stop('failed','source');return;}
 if(panelPort&&sourceTab===tab.id&&state.status==='capturing'){
  void chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>documentPictureInPicture.window?.focus()});return;
 }
 if(panelPort){const previous=panelPort;panelPort=null;try{previous.postMessage({type:'replaced'});previous.disconnect();}catch{}}
 busy=true;const attempt=++generation;sourceTab=tab.id;sourceOrigin=url.origin;
 launchId=crypto.randomUUID();ready=false;pending.clear();setState('connecting',url.hostname);
 // Both browser grants are requested before the toolbar activation expires.
 const streamRequest=chrome.tabCapture.getMediaStreamId({targetTabId:tab.id});streamRequest.catch(()=>{});
 const windowRequest=chrome.scripting.executeScript({target:{tabId:tab.id},func:openMini,args:[chrome.runtime.getURL('panel.html')+'#'+launchId]});windowRequest.catch(()=>{});
 void (async()=>{
  let stage='pip';
  try{
   await windowRequest;if(attempt!==generation)return;
   stage='permission';const streamId=await streamRequest;stage='offscreen';
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
   if(message.type==='tick'){try{panelPort?.postMessage({type:'tick'});}catch{}return;}
   if(message.type!=='pcm'||!panelPort||state.status!=='capturing'||!Array.isArray(message.samples)||message.samples.length!==640)return;
   const now=Date.now();
   if(now-lastLevel>250){lastLevel=now;panelPort.postMessage({type:'level',audible:message.samples.some(v=>Math.abs(v)>100)});}
   if(!ready)return;
   // Lost ACKs must never permanently stop the next voice reply.
   for(const [id,sent] of pending)if(now-sent>1000)pending.delete(id);
   if(pending.size>=8)return;
   const id=++sequence;pending.set(id,now);panelPort.postMessage({type:'pcm',sequence:id,sentAt:now,samples:message.samples});
  });
  port.onDisconnect.addListener(()=>{if(capturePort===port){capturePort=null;void stop('failed','offscreen');}});
 }else if(port.name==='panel'&&launchId&&port.sender.url===chrome.runtime.getURL('panel.html')+'#'+launchId){
  if(panelPort&&panelPort!==port){port.disconnect();return;}
  panelPort=port;ready=false;pending.clear();publish();
  void chrome.storage.local.get('companion').then(value=>{if(panelPort===port)port.postMessage({type:'preferences',value:value.companion||null,host:sourceOrigin});});
  port.onMessage.addListener(message=>{
   if(panelPort!==port)return;
   if(message.type==='ready'){ready=true;pending.clear();}
   if(message.type==='not-ready'){ready=false;pending.clear();}
   if(message.type==='ack')pending.delete(message.sequence);
   if(message.type==='stop')void stop();
   if(message.type==='save'&&typeof message.avatar==='string'&&/^[\w-]{1,48}$/.test(message.avatar)&&typeof message.consent==='boolean'){
    void chrome.storage.local.set({companion:{avatar:message.avatar,consent:message.consent,version:1}});
   }
  });
  port.onDisconnect.addListener(()=>{if(panelPort===port){panelPort=null;launchId='';void stop();}});
 }else port.disconnect();
});
