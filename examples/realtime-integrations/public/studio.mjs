import {encodedPcm} from '/common/avatar-host.mjs';
let socket, input, context, node, inputRate = 16000, active = false;
const status = document.querySelector('#status');
const send = value => {
  if (socket?.readyState !== WebSocket.OPEN) throw new Error('Create room / reconnect controller first');
  if (socket.bufferedAmount > 4 * 1024 * 1024) throw new Error('Control queue overflow');
  socket.send(JSON.stringify(value));
};
function stopInput() {node?.disconnect(); input?.getTracks().forEach(t => t.stop()); void context?.close();
  node = input = context = null; document.querySelector('#mic-stop').disabled = true;}
document.querySelector('#room').onclick = async () => {
  document.querySelector('#room').disabled = true;
  try {
    const response = await fetch('/api/host/new', {method: 'POST'}); if (!response.ok) throw new Error('Room creation rejected');
    const room = await response.json();
    const link = new URL('/public/overlay.html', location.href); link.hash = room.overlayKey;
    document.querySelector('#link').textContent = 'Paste into OBS / Streamlabs Browser Source (temporary capability, keep private):\n' + link.href;
    socket = new WebSocket(new URL('/api/host?key=' + room.controlKey, location.href).href.replace(/^http/, 'ws'));
    socket.onopen = () => document.querySelectorAll('button[disabled],input[disabled]').forEach(el => {if (el.id !== 'mic-stop') el.disabled = false;});
    socket.onmessage = e => {
      const event = JSON.parse(e.data);
      if (event.type === 'announcement') document.querySelector('#text').value = event.text;
      else {status.textContent = event.state; if (event.inputRate) inputRate = event.inputRate;
        if (event.state === 'running') active = true;
        if (['ended', 'ending', 'loading', 'loading-provider'].includes(event.state)) active = false;
        if (event.state === 'ended') stopInput();}
    };
    socket.onclose = () => {active = false; stopInput(); status.textContent = 'Controller disconnected; host end requested';};
  } catch (error) {status.textContent = error.message; document.querySelector('#room').disabled = false;}
};
document.querySelectorAll('[data-command]').forEach(button => button.onclick = () => {
  if (button.dataset.command === 'end') {active = false; stopInput();}
  try {send({type: button.dataset.command});} catch (error) {status.textContent = error.message;}
});
document.querySelector('#layout').onclick = () => send({type: 'scene', scene: document.querySelector('#scene').value});
document.querySelector('#obs').onclick = async () => {
  const response = await fetch('/api/obs/scene', {method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({scene: document.querySelector('#obs-scene').value})});
  status.textContent = response.ok ? 'OBS scene switched' : 'OBS switch failed; check server OBS settings';
};
document.querySelector('#mic').onclick = async () => {
  try {
    if (!active) throw new Error('Start host and wait for provider readiness first');
    stopInput(); const acquired = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true}, video: false});
    if (!active || socket?.readyState !== WebSocket.OPEN) {acquired.getTracks().forEach(t => t.stop()); throw new Error('Session ended during microphone permission');}
    input = acquired;
    context = new AudioContext(); await context.resume(); await context.audioWorklet.addModule('/public/mic-worklet.js');
    node = new AudioWorkletNode(context, 'pcm-microphone', {processorOptions: {rate: inputRate}});
    const mute = context.createGain(); mute.gain.value = 0;
    context.createMediaStreamSource(input).connect(node).connect(mute).connect(context.destination);
    node.port.onmessage = e => {try {send({type: 'mic', audio: encodedPcm(e.data), sampleRate: inputRate});}
      catch (error) {stopInput(); status.textContent = error.message;}};
    document.querySelector('#mic-stop').disabled = false;
  } catch (error) {status.textContent = error.message; stopInput();}
};
document.querySelector('#mic-stop').onclick = stopInput;
document.querySelector('#files').onchange = async e => {
  const files = [...e.target.files];
  if (!active || files.length > 4) {status.textContent = 'Start host; queue max four files'; return;}
  for (const file of files) {
    if (file.size > 3 * 1024 * 1024) {status.textContent = 'File too large'; continue;}
    const bytes = new Uint8Array(await file.arrayBuffer()); let raw = '';
    for (const byte of bytes) raw += String.fromCharCode(byte);
    send({type: 'file', id: crypto.randomUUID(), audio: btoa(raw)});
  }
  document.querySelector('#queue').textContent = files.length + ' files submitted; overlay validates duration and FIFO capacity';
};
document.querySelector('#send').onclick = () => send({type: 'input_end', text: document.querySelector('#text').value});
document.querySelector('#alert').onclick = () => {document.querySelector('#text').value = 'Synthetic donation: thank you for supporting the stream.';};
window.addEventListener('pagehide', () => {if (socket?.readyState === WebSocket.OPEN) send({type: 'end'}); socket?.close(); stopInput();}, {once: true});
