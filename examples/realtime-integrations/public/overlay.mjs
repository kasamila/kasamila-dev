import {AvatarHost, createRuntime} from '/common/avatar-host.mjs';
const key = location.hash.slice(1); history.replaceState(null, '', location.pathname);
const status = document.querySelector('#status'), element = document.querySelector('#avatar');
let provider, audioContext, roomSocket, ending = false, rate = 16000, generation = 0;
const report = state => {status.textContent = ['running', 'ended'].includes(state) ? '' : state;
  if (roomSocket?.readyState === WebSocket.OPEN) roomSocket.send(JSON.stringify({type: 'status', state, inputRate: rate}));};
const host = new AvatarHost({element, report: state => report(state === 'running' ? 'loading-provider' : state)});
document.querySelector('#unlock').onclick = async () => {
  audioContext ||= new AudioContext(); await audioContext.resume();
  document.querySelector('#unlock').hidden = true; report('Audio unlocked; start from control panel');
};
async function end() {
  if (ending) return; ending = true; generation++;
  provider?.close(); provider = null;
  try {await host.end();} catch {report('Release not confirmed: inspect Runtime Sessions');}
  finally {ending = false;}
}
async function start() {
  if (!audioContext || audioContext.state !== 'running') return report('Use OBS Interact to enable audio first');
  const epoch = generation;
  await host.start(() => createRuntime(element, {room: key, output: 'transparent'}), {transparent: true});
  if (epoch !== generation) return end();
  const boot = host.lease.bootstrap; rate = boot.inputRate;
  provider = new WebSocket(new URL('/api/provider?channel=' + boot.channel, location.href).href.replace(/^http/, 'ws'));
  provider.onmessage = async e => {
    try {
      const event = JSON.parse(e.data);
      if (event.type === 'ready') {rate = event.inputRate || rate; report('running');}
      if (event.type === 'interrupt') await host.interrupt();
      if (event.type === 'audio') await host.push(event.audio, event.sampleRate);
      if (event.type === 'encoded_audio') await host.enqueueFile(event.audio, audioContext);
      if (event.type === 'error') report(event.message);
    } catch {report('Audio failed or queue overflow; ending'); void end();}
  };
  provider.onclose = () => {void end();}; provider.onerror = () => {void end();};
}
if (!key) report('Create an overlay link in /public/studio.html');
else {
  roomSocket = new WebSocket(new URL('/api/host?key=' + encodeURIComponent(key), location.href).href.replace(/^http/, 'ws'));
  roomSocket.onmessage = async e => {
    try {
      const event = JSON.parse(e.data);
      if (event.type === 'start') await start();
      if (event.type === 'end') await end();
      if (event.type === 'scene') host.scene(event.scene);
      if (event.type === 'interrupt') {
        await host.interrupt();
        if (provider?.readyState === WebSocket.OPEN) provider.send(JSON.stringify({type: 'interrupt'}));
      }
      if (['mic', 'input_end'].includes(event.type) && provider?.readyState === WebSocket.OPEN) provider.send(JSON.stringify(event));
      if (event.type === 'file') await host.enqueueFile(event.audio, audioContext);
      // Alerts are shown for operator moderation; they are never auto-spoken/prompts.
      if (event.type === 'announcement') report(event.text);
    } catch (error) {report(error.message);}
  };
  roomSocket.onclose = () => {void end();};
}
// Scene changes reuse this instance; hiding ends it, never implicitly restarts billing.
window.addEventListener('obsSceneChanged', e => report('OBS scene: ' + String(e.detail?.name || 'changed')));
window.addEventListener('obsSourceActiveChanged', e => {if (e.detail?.active === false) void end();});
window.addEventListener('obsSourceVisibleChanged', e => {if (e.detail?.visible === false) void end();});
document.addEventListener('visibilitychange', () => {if (document.hidden) void end();});
window.addEventListener('pagehide', () => {provider?.close(); roomSocket?.close(); void host.end();}, {once: true});
