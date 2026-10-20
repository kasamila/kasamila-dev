// Loopback-only bridge. Portal owns encrypted configuration and Runtime admission.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {timingSafeEqual, randomUUID} from 'node:crypto';
import {Client, GatewayIntentBits, PermissionFlagsBits, ChannelType} from 'discord.js';
import {joinVoiceChannel, entersState, VoiceConnectionStatus, EndBehaviorType} from '@discordjs/voice';
import prism from 'prism-media';
import {WebSocketServer, WebSocket} from 'ws';
import {signSession, verifySession, assertInstance, assertVoicePresence, mono16k, pcmPacket} from './protocol.mjs';

const portal = process.env.KASAMILA_DISCORD_PORTAL || 'http://127.0.0.1:8000';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(portal)) throw new Error('Use a loopback Portal origin');
const secret = (process.env.KASAMILA_DISCORD_BRIDGE_SECRET || await readFile(new URL('../../.portal-discord-bridge-secret', import.meta.url), 'utf8')).trim();
if (secret.length < 40) throw new Error('Missing bridge credential');
let config = {enabled:false}, fingerprint='', client=null, connection=null, phase='not_configured', changing=false, presenter=null, sequence=0;
let receiveStream=null, decoder=null, lastPacket=0, packetCount=0, receiveError='', lastInstanceCheck=0;
const sockets = new Set();
function safeAuth(req) {
  const actual=Buffer.from(req.headers.authorization||''), expected=Buffer.from('Bearer '+secret);
  return actual.length===expected.length && timingSafeEqual(actual,expected);
}
function failure(code, status=400) { return Object.assign(new Error(code), {status}); }
function send(ws,value) {if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(value));}
function status() {return {phase, connected:connection?.state.status===VoiceConnectionStatus.Ready, viewers:sockets.size,
  presenter:presenter?{user_id:presenter.user_id,name:presenter.name,avatar:presenter.avatar}:null,
  packet_count:packetCount,last_packet:lastPacket,receive_error:receiveError,voice_state:connection?.state.status||'offline',sample_rate:16000};}
function broadcast(){for(const ws of sockets)send(ws,{type:'status',...status()});}
async function upstream(path, bearer, body) {
  const response=await fetch('https://discord.com/api/v10'+path,{method:body?'POST':'GET',headers:{Authorization:bearer,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(body?{body:new URLSearchParams(body)}:{}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw failure(response.status===429?'discord_rate_limited':response.status===401?'discord_credentials_invalid':'discord_upstream_'+response.status,response.status===429?429:502);
  return response.json();
}
async function checkInstance(identity) {
  const instance=await upstream('/applications/'+config.application_id+'/activity-instances/'+encodeURIComponent(identity.instance_id),'Bot '+config.bot_token);
  assertInstance(instance,config,identity.user_id,identity.instance_id);
  const member=client?.guilds.cache.get(config.guild_id)?.voiceStates.cache.get(identity.user_id);
  try {assertVoicePresence(member,config,identity.user_id);} catch {throw failure('discord_join_voice_first',403);}
  return identity;
}
async function identity(body) {
  if(!config.enabled||!client?.isReady())throw failure('discord_bot_not_ready',503);
  const value=verifySession(body.session,secret);
  if(value.origin!==body.origin||value.application_id!==config.application_id||value.guild_id!==config.guild_id||value.channel_id!==config.channel_id)throw failure('discord_session_invalid',403);
  return checkInstance(value);
}
function stopReceiving(){receiveStream?.destroy();receiveStream=null;decoder?.destroy();decoder=null;}
function stopPresenter(){stopReceiving();presenter=null;broadcast();}
function receive(userId) {
  if(!presenter||presenter.user_id!==userId||receiveStream||connection?.state.status!==VoiceConnectionStatus.Ready)return;
  const member=client.guilds.cache.get(config.guild_id)?.voiceStates.cache.get(userId);
  if(!member||member.channelId!==config.channel_id||member.selfMute||member.serverMute||member.suppress)return;
  const input=receiveStream=connection.receiver.subscribe(userId,{end:{behavior:EndBehaviorType.AfterSilence,duration:200}});
  const output=decoder=new prism.opus.Decoder({rate:48000,channels:2,frameSize:960});
  input.pipe(output);
  output.on('data',chunk=>{
    if(!presenter||presenter.user_id!==userId)return;
    try {
      const pcm=mono16k(chunk);lastPacket=Date.now();packetCount++;const frame=pcmPacket(pcm,sequence++);
      for(const ws of sockets)if(ws.identity.instance_id===presenter.instance_id&&ws.bufferedAmount<16000)ws.send(frame,{binary:true});
    } catch {receiveError='discord_decode_failed';}
  });
  const clean=()=>{if(receiveStream===input){receiveStream=null;decoder=null;}input.destroy();output.destroy();};
  input.on('error',()=>{receiveError='discord_receive_failed';clean();});output.on('error',()=>{receiveError='discord_decode_failed';clean();});output.on('end',clean);input.on('close',clean);
}
async function connectVoice(){
  if(connection?.state.status===VoiceConnectionStatus.Ready)return;
  const channel=await client.channels.fetch(config.channel_id);
  if(channel?.guildId!==config.guild_id||channel.type!==ChannelType.GuildVoice)throw failure('discord_voice_channel_invalid',422);
  const permissions=channel.permissionsFor(client.user);
  if(!permissions?.has(PermissionFlagsBits.ViewChannel)||!permissions?.has(PermissionFlagsBits.Connect))throw failure('discord_bot_permissions',403);
  connection?.destroy();
  connection=joinVoiceChannel({channelId:channel.id,guildId:config.guild_id,adapterCreator:channel.guild.voiceAdapterCreator,selfDeaf:false,selfMute:true,group:'kasamila-discord-demo'});
  connection.on('error',()=>{receiveError='discord_voice_failed';broadcast();});
  connection.on(VoiceConnectionStatus.Disconnected,()=>{stopPresenter();phase='voice_disconnected';broadcast();});
  await entersState(connection,VoiceConnectionStatus.Ready,20000);
  connection.receiver.speaking.on('start',receive);phase='voice_ready';broadcast();
}
async function refresh(){
  if(changing)return;changing=true;
  try{
    const response=await fetch(portal+'/portal/apps/discord/internal-config',{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('config_unavailable');
    const next=await response.json(), key=JSON.stringify(next);
    if(key===fingerprint)return;
    fingerprint=key;config=next;stopPresenter();connection?.destroy();connection=null;
    client?.destroy();client=null;for(const ws of sockets)ws.close(4001,'Configuration changed');
    if(!config.enabled){phase='disabled';return;}
    client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildVoiceStates]});
    client.on('error',()=>{phase='gateway_error';broadcast();});
    client.on('voiceStateUpdate',(_old,state)=>{if(presenter?.user_id===state.id&&(state.channelId!==config.channel_id||state.selfMute||state.serverMute||state.suppress)){stopReceiving();if(state.channelId!==config.channel_id)stopPresenter();}});
    phase='bot_connecting';await client.login(config.bot_token);await new Promise((resolve,reject)=>{if(client.isReady())return resolve();const timer=setTimeout(()=>reject(new Error('login_timeout')),20000);client.once('clientReady',()=>{clearTimeout(timer);resolve();});});
    if(client.application.id!==config.application_id)throw new Error('wrong_application');
    phase='bot_ready';receiveError='';
  } catch {
    stopPresenter();if(connection?.state.status!==VoiceConnectionStatus.Destroyed)connection?.destroy();connection=null;
    client?.destroy();client=null;for(const ws of sockets)ws.close(4001,'Configuration unavailable');
    phase='configuration_or_login_failed';fingerprint='';
  }
  finally {changing=false;broadcast();}
}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>8192)throw failure('discord_request_too_large',413);}return JSON.parse(text||'{}');}
const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(!safeAuth(req)){res.writeHead(403);res.end('{"code":"forbidden"}');return;}
  try{
    let value;
    if(req.method==='GET'&&req.url==='/status')value=status();
    else if(req.method==='POST'&&req.url==='/verify')value=await identity(await body(req));
    else if(req.method==='POST'&&req.url==='/state'){await identity(await body(req));value=status();}
    else if(req.method==='POST'&&req.url==='/auth'){
      if(!config.enabled||!client?.isReady())throw failure('discord_bot_not_ready',503);
      const input=await body(req);
      if(input.origin!=='https://'+config.application_id+'.discordsays.com'||!/^[-\w]{1,200}$/.test(input.instance_id))throw failure('discord_origin_denied',403);
      const token=await upstream('/oauth2/token','Basic '+Buffer.from(config.application_id+':'+config.client_secret).toString('base64'),{grant_type:'authorization_code',code:input.code});
      const user=await upstream('/users/@me','Bearer '+token.access_token);
      const claims={user_id:user.id,name:user.global_name||user.username,instance_id:input.instance_id,application_id:config.application_id,guild_id:config.guild_id,channel_id:config.channel_id,origin:input.origin,expires:Date.now()+600000,nonce:randomUUID()};
      await checkInstance(claims);value={session:signSession(claims,secret),access_token:token.access_token,user:{id:user.id,name:claims.name},expires:claims.expires};
    }else throw failure('not_found',404);
    res.end(JSON.stringify(value));
  }catch(error){res.writeHead(error.status||400);res.end(JSON.stringify({code:/^discord_[a-z0-9_]+$/.test(error.message)?error.message:'discord_request_failed'}));}
});
const wss=new WebSocketServer({noServer:true,maxPayload:4096});
server.on('upgrade',(req,socket,head)=>{if(!safeAuth(req)||req.url!=='/audio'){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
wss.on('connection',ws=>{
  let authenticated=false,busy=false,lastMessage=0;
  const timer=setTimeout(()=>ws.close(4003,'Admission timeout'),10000);
  ws.on('message',async(raw,binary)=>{
    if(binary||busy)return;busy=true;
    try{
      const message=JSON.parse(raw.toString());
      if(!authenticated){
        const value=await identity(message);
        if(sockets.size>=config.max_viewers)throw failure('discord_room_full',429);
        if(presenter&&presenter.instance_id!==value.instance_id)throw failure('discord_other_activity_active',409);
        if(sockets.size&&[...sockets].some(other=>other.identity.instance_id!==value.instance_id))throw failure('discord_other_activity_active',409);
        if(!config.avatars.includes(message.avatar))throw failure('discord_avatar_unavailable',403);
        ws.identity=value;ws.avatar=message.avatar;ws.lastPing=Date.now();authenticated=true;sockets.add(ws);clearTimeout(timer);broadcast();return;
      }
      if(message.type==='ping'){ws.lastPing=Date.now();send(ws,{type:'pong',server_time:Date.now(),echo:message.time});return;}
      if(Date.now()-lastMessage<500)return;lastMessage=Date.now();
      if(message.type==='present'){
        await checkInstance(ws.identity);
        if(presenter&&presenter.socket!==ws)throw failure('discord_presenter_busy',409);
        await connectVoice();presenter={...ws.identity,avatar:ws.avatar,socket:ws};receiveError='';broadcast();
      }else if(message.type==='stop'&&presenter?.socket===ws)stopPresenter();
    }catch(error){send(ws,{type:'error',code:/^discord_[a-z0-9_]+$/.test(error.message)?error.message:'discord_request_failed'});if(!authenticated)ws.close(4003,'Admission failed');}
    finally{busy=false;}
  });
  ws.on('close',()=>{clearTimeout(timer);sockets.delete(ws);if(presenter?.socket===ws)stopPresenter();if(!sockets.size){connection?.destroy();connection=null;phase=client?.isReady()?'bot_ready':phase;}broadcast();});
  ws.on('error',()=>{});
});
setInterval(()=>void refresh(),10000).unref();
setInterval(()=>{
  const now=Date.now();for(const ws of sockets){if(ws.identity.expires<=now||now-ws.lastPing>25000)ws.close(4001,'Session ended');}
  if(presenter&&now-lastPacket>1500)stopReceiving();
  broadcast();
  if(now-lastInstanceCheck>15000){lastInstanceCheck=now;for(const ws of sockets)checkInstance(ws.identity).catch(()=>ws.close(4003,'Left activity'));}
},2000).unref();
await refresh();server.listen(8791,'127.0.0.1',()=>console.log('Kasamila Discord bridge: loopback 8791; '+phase));
function shutdown(){stopPresenter();for(const ws of sockets)ws.close();connection?.destroy();client?.destroy();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
