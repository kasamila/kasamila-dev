import {patchUrlMappings} from './discord-sdk.js?v=1';
import {installRuntimeNetwork} from './runtime-network.js?v=1';
import {drivePcm} from '/web/portal/examples/audio-bridge/bridge.mjs';
import {disposeDemoAvatar} from '/web/portal/demo-startup.js?v=20261017';

// Keep the unmodified renderer's parent in this origin. Discord RPC stays in
// the outer Activity; no SDK globals or parent properties are overridden.
let session,player,source,admission,closed=false;
patchUrlMappings([{prefix:'/kasamila',target:'kasamila.com'},{prefix:'/kasamila-www',target:'www.kasamila.com'}],{patchSrcAttributes:true});
installRuntimeNetwork(()=>session);
window.kasamilaDiscordStage={async create(result,activitySession){
 session=activitySession;admission=result;
 const {loadKasamila}=await import('/sdk/bootstrap/1/loader.mjs');
 const descriptor={...result.runtime.sdk,loader_url:new URL(result.runtime.sdk.loader_url,location.origin).pathname};
 const Kasamila=await loadKasamila(descriptor,location.origin);
 if(closed)throw new Error('discord_stage_closed');
 const element=document.createElement('kasamila-avatar');document.getElementById('avatar').replaceChildren(element);
 player=await Kasamila.create({element,sessionToken:result.runtime.client_token,providerPreview:true});
 if(closed){await disposeDemoAvatar(player,result);throw new Error('discord_stage_closed');}
 source=drivePcm(player,{sampleRate:16000,maxQueuedMs:400,playback:false});
 return {player,source};
}};
window.addEventListener('pagehide',()=>{closed=true;source?.abort();void disposeDemoAvatar(player,admission);});
