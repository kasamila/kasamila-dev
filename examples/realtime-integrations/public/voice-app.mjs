import {AvatarHost, createRuntime, encodedPcm} from '/common/avatar-host.mjs';
const status = document.querySelector('#status'), loading = document.querySelector('#loading');
let socket, mic, context, node, camera, ending = false, ready = false, recording = false, recordTimer;
let rate = 16000, isDify = false;
const show = text => {status.textContent = text;};
const host = new AvatarHost({element: document.querySelector('#avatar'), report: show});
function send(e) {
  if (socket?.readyState !== WebSocket.OPEN) return;
  if (socket.bufferedAmount > 256 * 1024) {show('Input backpressure; ending'); void end(); return;}
  socket.send(JSON.stringify(e));
}
async function end() {
  if (ending) return; ending = true; ready = false; recording = false; clearTimeout(recordTimer);
  socket?.close(); socket = null; node?.disconnect(); node = null;
  mic?.getTracks().forEach(t => t.stop()); mic = null;
  camera?.getTracks().forEach(t => t.stop()); camera = null;
  await context?.close().catch(() => {}); context = null;
  try {await host.end(); show('Session ended.');} catch {show('Release not confirmed; inspect Runtime Sessions before leaving.');}
  document.querySelector('#start').disabled = false;
  document.querySelector('#end').disabled = document.querySelector('#interrupt').disabled = true;
  loading.hidden = true; ending = false;
}
document.querySelector('#start').onclick = async () => {
  document.querySelector('#start').disabled = true; loading.hidden = false; loading.value = 1;
  document.querySelector('#end').disabled = false;
  try {
    context = new AudioContext(); await context.resume();
    await host.start(() => createRuntime(document.querySelector('#avatar')));
    if (ending || host.state !== 'running') return;
    const boot = host.lease.bootstrap; rate = boot.inputRate; isDify = boot.provider === 'dify';
    document.querySelector('#dify').hidden = !isDify; loading.value = 3;
    socket = new WebSocket(new URL('/api/provider?channel=' + boot.channel, location.href).href.replace(/^http/, 'ws'));
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Provider startup timeout')), 20000);
      socket.onmessage = async e => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'ready') {rate = event.inputRate || rate; ready = true; clearTimeout(timeout); resolve();}
          if (event.type === 'interrupt') await host.interrupt();
          if (event.type === 'audio') await host.push(event.audio, event.sampleRate);
          if (event.type === 'encoded_audio') await host.enqueueFile(event.audio, context);
          if (event.type === 'transcript') show(event.text);
          if (event.type === 'error') show(event.message);
        } catch (error) {reject(error); show(error.message); void end();}
      };
      socket.onerror = () => reject(new Error('Provider connection failed'));
      socket.onclose = () => {clearTimeout(timeout); reject(new Error('Provider disconnected')); void end();};
    });
    if (ending || !ready) return;
    mic = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}, video: false});
    if (ending || !ready) {mic.getTracks().forEach(t => t.stop()); return;}
    await context.audioWorklet.addModule('/public/mic-worklet.js');
    node = new AudioWorkletNode(context, 'pcm-microphone', {processorOptions: {rate}});
    const mute = context.createGain(); mute.gain.value = 0;
    context.createMediaStreamSource(mic).connect(node).connect(mute).connect(context.destination);
    node.port.onmessage = e => {if (ready && (!isDify || recording)) send({type: 'mic', audio: encodedPcm(e.data), sampleRate: rate});};
    loading.hidden = true; document.querySelector('#interrupt').disabled = false;
    show('Connected: ' + boot.provider + (isDify ? '. Record or type a question; configured Dify STT/TTS required.' : ''));
  } catch (error) {await end(); show(error.message);}
};
document.querySelector('#interrupt').onclick = () => {void host.interrupt(); send({type: 'interrupt'});};
document.querySelector('#end').onclick = () => {void end();};
document.querySelector('#record').onclick = () => {
  send({type: 'interrupt'}); recording = true; show('Recording (15-second limit)…');
  clearTimeout(recordTimer); recordTimer = setTimeout(() => {recording = false; send({type: 'input_end'});}, 15000);
};
document.querySelector('#commit').onclick = () => {recording = false; clearTimeout(recordTimer); send({type: 'input_end'});};
document.querySelector('#send-text').onclick = () => {recording = false; clearTimeout(recordTimer); send({type: 'input_end', text: document.querySelector('#question').value});};
if (document.querySelector('#camera')) document.querySelector('#camera').onclick = async () => {
  const video = document.querySelector('#self');
  if (camera) {camera.getTracks().forEach(t => t.stop()); camera = null; video.srcObject = null; video.hidden = true; return;}
  try {camera = await navigator.mediaDevices.getUserMedia({audio: false, video: true}); video.srcObject = camera; video.hidden = false;}
  catch {show('Camera unavailable; voice/avatar call still works.');}
};
window.addEventListener('pagehide', () => {socket?.close(); void end();}, {once: true});
