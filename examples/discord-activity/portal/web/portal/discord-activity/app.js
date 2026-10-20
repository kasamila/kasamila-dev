import {DiscordSDK,patchUrlMappings} from './discord-sdk.js?v=1';
import {createRuntimeFrame} from './stage-frame.js?v=1';
import {disposeDemoAvatar} from '/web/portal/demo-startup.js?v=20261017';
import {installRuntimeNetwork} from './runtime-network.js?v=1';
const $=id=>document.getElementById(id),base='/portal/apps/discord';
const en={tag:'Embedded validation · 0.1',title:'Your voice. Your digital presence.',intro:'Speak in your Discord voice channel and appear on this shared avatar stage.',placeholder:'Choose an avatar to enter the shared stage',setup:'Your avatar',avatar:'Avatar',consent:'While I actively present, I allow the bot to receive and relay my channel audio to animate my avatar. No audio recordings are saved.',connect:'Connect stage',present:'Drive with my MIC',stop:'Stop my avatar',disconnect:'Leave stage',sound:'Enable sound / resume playback',audioNote:'Discord channel audio stays on. The stage does not replay audio. One presenter is supported; each viewer uses a Runtime.',diagnostics:'Connection diagnostics',auth:'Discord authorization',voice:'Voice connection',frames:'Audio frames received',delay:'Audio relay time (excludes lip rendering)',viewers:'Stage participants',scope:'Only the active presenter is processed. Runtime ends on disconnect or expiry. Audio/video sync and mobile support are under validation.',connecting:'Connecting…',ready:'Stage ready. Click “Drive with my MIC” and speak in the voice channel.',outside:'Open this app from the Discord App Launcher in the configured voice channel.',disabled:'The administrator has not enabled this validation app.',loading:'Preparing avatar…',ended:'Stage ended. Reconnect to continue.',watching:'Watching: ',speaking:'Your avatar is on air. Speak using your Discord microphone.',failed:'Connection failed: ',busy:'Another presenter is active. You can watch their avatar.',join:'Join the configured voice channel first.',voiceReady:'Connected',voiceWaiting:'Waiting for presenter',authOK:'Verified',soundBlocked:'Click to enable playback',wrongAvatar:'Loading the presenter’s avatar…'};
const zh={connecting:'正在连接…',ready:'舞台已就绪。点击“用我的 MIC 驱动”，然后在语音频道讲话。',outside:'请从 Discord 配置的语音频道内，通过应用启动器打开本应用。',disabled:'管理员尚未启用本次内嵌验证。',loading:'正在准备数字人…',ended:'舞台已结束，可重新连接继续。',watching:'正在观看：',speaking:'你的分身已上场，请通过 Discord 麦克风讲话。',failed:'连接失败：',busy:'已有主播正在使用，可以观看其数字人。',join:'请先加入配置的语音频道。',voiceReady:'已连接',voiceWaiting:'等待主播',authOK:'已验证',soundBlocked:'点击启用播放',wrongAvatar:'正在加载主播的数字人…'};
document.querySelectorAll('[data-copy]').forEach(node=>{zh[node.dataset.copy]=node.textContent;});
let locale=navigator.language?.startsWith('zh')?'zh':'en';$('locale').value=locale;
const t=key=>(locale==='zh'?zh:en)[key]||en[key]||key;
function translate(){document.documentElement.lang=locale;for(const node of document.querySelectorAll('[data-copy]'))node.textContent=t(node.dataset.copy);$('retry-auth').textContent=locale==='zh'?'重新验证 Discord 连接':'Retry Discord connection';}
$('locale').onchange=()=>{locale=$('locale').value;translate();};translate();
let sdk,config,session,me,player,source,socket,admission,heartbeat,expiry,starting=false,version=0,currentAvatar='',ownAvatar='',owner=false,frames=0,clockOffset=0,frameAt=0;
let connectNetwork,runtimeFrame,authPending,sessionExpires=0;
function message(key,extra=''){$('status').textContent=t(key)+extra;}
async function api(path,body){const response=await fetch(base+path,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw new Error(data.error?.code||data.detail?.[0]?.msg||'discord_request_failed');return data;}
function controls(){$('connect').disabled=!session||!!authPending||starting||!!player||!$('consent').checked;$('present').disabled=!player||owner;$('stop').disabled=!owner;$('disconnect').disabled=!player&&!starting;$('avatar').disabled=!!player||starting;}
async function end(){version++;starting=false;owner=false;clearInterval(heartbeat);clearTimeout(expiry);socket?.close();socket=null;source?.abort();source=null;const previous=player,previousFrame=runtimeFrame;player=null;runtimeFrame=null;await disposeDemoAvatar(previous,admission);previousFrame?.remove();admission=null;$('stage').replaceChildren();$('runtime').textContent='—';controls();}
function showError(error){const hints={discord_join_voice_first:locale==='zh'?'请先加入服务器内带扬声器图标的“常规”语音频道，然后点击“重新验证 Discord 连接”。':'Join the configured voice channel (speaker icon), then retry the Discord connection.',discord_instance_denied:locale==='zh'?'未能验证当前 Activity 成员身份，请从测试服务器重新打开 Kasamila。':'The Activity membership could not be verified. Reopen Kasamila from the test server.',discord_session_expired:locale==='zh'?'连接验证已过期，请点击“重新验证 Discord 连接”后重试。':'Connection verification expired. Retry the Discord connection, then reconnect.'};message('failed',hints[error.message]||error.message);$('evidence').textContent=error.message;}
function clearSession(){session=null;sessionExpires=0;$('auth').textContent='—';$('retry-auth').hidden=false;}
async function authenticateDiscord(){
 if(authPending)return authPending;
 $('status').textContent=locale==='zh'?'正在验证 Discord 连接…':'Verifying Discord connection…';
 authPending=Promise.resolve().then(async()=>{
  const {code}=await sdk.commands.authorize({client_id:config.application_id,response_type:'code',state:crypto.randomUUID(),prompt:'none',scope:['identify']});
  const auth=await api('/auth',{code,instance_id:sdk.instanceId});
  await sdk.commands.authenticate({access_token:auth.access_token});
  session=auth.session;sessionExpires=Number(auth.expires)||0;me=auth.user;
  $('auth').textContent=t('authOK');$('retry-auth').hidden=true;
 });
 controls();
 try{await authPending;}catch(error){clearSession();throw error;}finally{authPending=null;controls();}
}
async function ensureSession(force=false){
 // Reserve the full renderer startup deadline. Never lengthen a signed session
 // in the browser: renew through Discord and the existing membership checks.
 if(force||!session||sessionExpires-Date.now()<=180000)await authenticateDiscord();
}
async function connect(override){
  if(starting)return;starting=true;controls();const run=++version;
  let result;
  try{
    await ensureSession();if(run!==version)return;
    for(let attempt=0;;attempt++){
     try{
      const state=await api('/state',{session});if(run!==version)return;
      currentAvatar=override||state.presenter?.avatar||$('avatar').value;ownAvatar=$('avatar').value;
      message('loading');await connectNetwork(session);if(run!==version)return;
      result=await api('/runtime',{session,avatar:currentAvatar,consent:$('consent').checked});break;
     }catch(error){
      if(error.message!=='discord_session_expired'||attempt!==0||run!==version)throw error;
      clearSession();await ensureSession(true);if(run!==version)return;
     }
    }
    if(run!==version){await disposeDemoAvatar(null,result);return;}admission=result;
    const host=createRuntimeFrame($('stage'));runtimeFrame=host.frame;
    const creating=host.create(result,session);
    creating.then(created=>{if(run!==version){created.source.abort();void disposeDemoAvatar(created.player,result);}}).catch(()=>{});
    let timeout;
    const created=await Promise.race([creating,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('discord_runtime_timeout')),180000);})]).finally(()=>clearTimeout(timeout));
    if(run!==version){created.source.abort();await disposeDemoAvatar(created.player,result);return;}player=created.player;source=created.source;
    player.addEventListener('kasamila-error',event=>{$('evidence').textContent=String(event.detail?.message||'runtime_error');});
    source.finished.catch(error=>{if(run===version){void end();showError(error);}});
    const url=new URL(base+'/socket',location.href);url.protocol='wss:';socket=new WebSocket(url);socket.binaryType='arraybuffer';
    socket.onopen=()=>{socket.send(JSON.stringify({ticket:admission.ticket}));heartbeat=setInterval(()=>{if(socket?.readyState===1)socket.send(JSON.stringify({type:'ping',time:Date.now()}));},5000);};
    socket.onmessage=event=>{
      if(run!==version)return;
      if(event.data instanceof ArrayBuffer){
        if(event.data.byteLength<14||(event.data.byteLength-12)%2)return;
        const now=Date.now(),view=new DataView(event.data);const age=Math.max(0,now+clockOffset-view.getFloat64(4,true));
        $('delay').textContent=Math.round(age)+' ms';$('frames').textContent=String(++frames);frameAt=now;
        if(age>800)return;
        try{source.push(new Int16Array(event.data.slice(12)));}catch(error){if(!(error instanceof RangeError))showError(error);}return;
      }
      const data=JSON.parse(event.data);
      if(data.type==='pong'){clockOffset=data.server_time-(Date.now()+data.echo)/2;return;}
      if(data.type==='error'){showError(new Error(data.code));return;}
      if(data.type==='status'){
        owner=data.presenter?.user_id===me.id;$('stop').disabled=!owner;$('present').disabled=!!data.presenter;
        $('viewers').textContent=data.viewers;$('voice').textContent=t(data.connected?'voiceReady':'voiceWaiting');
        $('evidence').textContent=[data.phase,data.receive_error].filter(Boolean).join(' · ');
        if(data.presenter?.avatar&&data.presenter.avatar!==currentAvatar){const target=data.presenter.avatar;message('wrongAvatar');void end().then(()=>connect(target));return;}
        if(data.presenter)message(owner?'speaking':'watching',owner?'':data.presenter.name);else message('ready');
      }
    };
    socket.onclose=()=>{if(run===version){void end();message('ended');}};
    socket.onerror=()=>{if(run===version)showError(new Error('discord_socket_failed'));};
    expiry=setTimeout(()=>{if(run===version){void end();message('ended');}},admission.duration*1000);
    $('runtime').textContent='Ready';starting=false;controls();message('ready');
  }catch(error){if(run===version){if(error.message==='discord_session_expired')clearSession();await end();showError(error);}}
}
$('consent').onchange=controls;
$('avatar').onchange=()=>{try{localStorage.setItem('kasamila-discord-avatar', $('avatar').value);}catch{}};
$('connect').onclick=()=>connect();$('disconnect').onclick=()=>{void end();message('ended');};
$('present').onclick=()=>{if(socket?.readyState===1)socket.send(JSON.stringify({type:'present'}));};
$('stop').onclick=()=>{if(socket?.readyState===1)socket.send(JSON.stringify({type:'stop'}));};
$('sound').onclick=async()=>{try{await player?.audioPlayer?.audioContext?.resume();}catch{}};
setInterval(()=>{const ctx=player?.audioPlayer?.audioContext;$('sound').hidden=!ctx||ctx.state==='running';if(frameAt&&Date.now()-frameAt>5000)$('delay').textContent='—';},1000);
window.addEventListener('pagehide',()=>{socket?.close();void end();});
async function initialize(){
  config=await api('/config');
  $('avatar').replaceChildren(...config.avatars.map(avatar=>new Option(avatar.names?.[locale]||avatar.name,avatar.id)));
  try{const saved=localStorage.getItem('kasamila-discord-avatar');if(config.avatars.some(a=>a.id===saved))$('avatar').value=saved;}catch{}
  if(!config.enabled){message('disabled');return;}
  if(!new URLSearchParams(location.search).has('frame_id')){message('outside');return;}
  if(!sdk){sdk=new DiscordSDK(config.application_id);patchUrlMappings([{prefix:'/kasamila',target:'kasamila.com'},{prefix:'/kasamila-www',target:'www.kasamila.com'}],{patchSrcAttributes:true});connectNetwork=installRuntimeNetwork(()=>session);}
  await Promise.race([sdk.ready(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('discord_handshake_timeout')),15000))]);
  await authenticateDiscord();message('ready');
}
function authFailed(error){showError(error);$('retry-auth').hidden=false;}
$('retry-auth').onclick=async()=>{$('retry-auth').disabled=true;try{await initialize();}catch(error){authFailed(error);}finally{$('retry-auth').disabled=false;}};
initialize().catch(authFailed);
