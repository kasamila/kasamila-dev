// All capture/privileged code ships in the extension. No content scripts or host permissions.
let capturePort, panelPort, state = {type:'state', status:'idle', source:''};
let busy = false, ready = false, sequence = 0;
const pending=new Map();
let sourceTab=null, generation=0;
function publish() { panelPort?.postMessage(state); }
function setState(status, source = state.source) { state = {type:'state', status, source}; publish(); }
async function stop(status = 'idle') {
  generation++;sourceTab=null;
  ready = false; pending.clear();
  capturePort?.postMessage({type:'stop'});
  setState(status);
  await chrome.action.setBadgeText({text:''});
}
export function handleAction(tab) {
  // Open immediately in the original gesture; capture remains bound to this tab.
  chrome.sidePanel.open({windowId:tab.windowId}).catch(()=>{});
  if (busy || state.status === 'capturing') return;
  void (async()=>{
    busy = true;
    const attempt=++generation;sourceTab=tab.id;
    try {
      if (!/^https?:\/\//.test(tab.url || '') || new URL(tab.url).hostname === 'kasamila.com') throw new Error('Unsupported source');
      setState('connecting', new URL(tab.url).hostname);
      const contexts = await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']});
      if (!contexts.length) await chrome.offscreen.createDocument({url:'offscreen.html', reasons:['USER_MEDIA'], justification:'Capture the selected tab audio and preserve its playback while animating the avatar.'});
      const streamId = await chrome.tabCapture.getMediaStreamId({targetTabId:tab.id});
      if(attempt!==generation)return;
      const result = await chrome.runtime.sendMessage({target:'capture', type:'start', streamId});
      if (!result?.ok) throw new Error('Capture failed');
      if(attempt!==generation){capturePort?.postMessage({type:'stop'});return;}
      setState('capturing');
      await chrome.action.setBadgeText({text:'ON'});
      await chrome.action.setBadgeBackgroundColor({color:'#0f766e'});
    } catch { await stop('failed'); }
    finally { busy = false; }
  })();
}
chrome.action.onClicked.addListener(handleAction);
chrome.tabs.onRemoved.addListener(tabId=>{if(tabId===sourceTab)void stop();});
chrome.tabs.onUpdated.addListener((tabId,change)=>{if(tabId===sourceTab&&change.status==='loading')void stop();});
chrome.runtime.onConnect.addListener(port => {
  if (port.sender?.id !== chrome.runtime.id) return;
  if (port.name === 'capture' && port.sender.url === chrome.runtime.getURL('offscreen.html')) {
    capturePort = port;
    port.onMessage.addListener(message => {
      if (message.type === 'stopped') { void stop(); return; }
      if (message.type !== 'pcm' || !ready || !panelPort || state.status !== 'capturing') return;
      // Eight packets cap transport backlog at 320 ms. Do not silently drop
      // speech: stop when the consumer stalls so mouths never replay old audio.
      if(pending.size>=8){void stop('slow');return;}
      if (!Array.isArray(message.samples) || message.samples.length !== 640) return;
      const id=++sequence;pending.set(id,Date.now());
      panelPort.postMessage({type:'pcm', sequence:id, samples:message.samples});
    });
    port.onDisconnect.addListener(()=>{if(capturePort===port){capturePort=null;void stop('failed');}});
  } else if (port.name === 'panel' && port.sender.url?.startsWith(chrome.runtime.getURL('panel.html'))) {
    // Exactly one panel owns the avatar and receives audio.
    if (panelPort) { panelPort.postMessage({type:'replaced'}); panelPort.disconnect(); }
    ready = false; pending.clear(); panelPort = port; publish();
    port.onMessage.addListener(message=>{
      if (panelPort !== port) return;
      if (message.type === 'ready') { ready = true; pending.clear(); }
      if (message.type === 'ack') pending.delete(message.sequence);
      if (message.type === 'stop') void stop();
      if (message.type === 'float') {
        // The new window deliberately starts a new avatar session.
        ready = false;
        void chrome.windows.create({url:chrome.runtime.getURL('panel.html?floating=1'),type:'popup',width:440,height:760});
      }
    });
    port.onDisconnect.addListener(()=>{
      if(panelPort===port){panelPort=null;void stop();}
    });
  }
});
