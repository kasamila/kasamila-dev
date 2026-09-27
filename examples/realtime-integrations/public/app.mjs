import {AvatarAudioSink} from "/common/audio.mjs";
const status = document.querySelector("#status"), loading = document.querySelector("#loading");
let player, sink, socket, microphone, context, node, bootstrap;
let ending = false, chain = Promise.resolve();
let epoch = 0, pendingMs = 0;
const show = text => {status.textContent = text;};
async function end() {
  if (ending) return;
  ending = true;
  epoch += 1;
  socket?.close(); socket = null;
  node?.disconnect(); node = null;
  microphone?.getTracks().forEach(track => track.stop()); microphone = null;
  await context?.close().catch(() => {}); context = null;
  await chain.catch(() => {});
  await sink?.close(); sink = null;
  if (player) await player.destroy();
  else if (bootstrap) await fetch(new URL("/api/v1/runtime/sessions/end", bootstrap.apiBase), {
    method: "POST", headers: {Authorization: "Bearer " + bootstrap.sessionToken}, keepalive: true,
  }).catch(() => {});
  player = null; bootstrap = null;
  loading.hidden = true;
  document.querySelector("#start").disabled = false;
  document.querySelector("#end").disabled = true;
  document.querySelector("#interrupt").disabled = true;
  ending = false;
}
document.querySelector("#start").onclick = async () => {
  document.querySelector("#start").disabled = true;
  loading.hidden = false; loading.value = 0;
  show("Authorizing Kasamila Runtime…");
  try {
    const response = await fetch("/api/runtime-token", {method: "POST"});
    bootstrap = await response.json();
    if (!response.ok) {bootstrap = null; throw new Error("Runtime configuration/session failed");}
    loading.value = 1; show("Loading protected SDK 2.1.0…");
    const {loadKasamila} = await import(new URL("/sdk/bootstrap/1/loader.mjs", bootstrap.apiBase).href);
    const sdk = await loadKasamila(bootstrap.sdk, bootstrap.apiBase);
    loading.value = 2; show("Loading HLS, geometry and models…");
    player = await sdk.create({element: document.querySelector("#avatar"), sessionToken: bootstrap.sessionToken,
      templateMedia: bootstrap.templateMedia});
    loading.value = 4;
    sink = new AvatarAudioSink(player);
    socket = new WebSocket(new URL("/api/provider?channel=" + bootstrap.channel, location.href).href.replace(/^http/, "ws"));
    await new Promise((resolve, reject) => {
      socket.onmessage = event => {
        let value;
        try {value = JSON.parse(event.data);} catch {reject(new Error("Invalid relay message")); return;}
        if (value.type === "ready") return resolve();
        if (value.type === "interrupt") {
          epoch += 1;
          void sink?.interrupt();
          return;
        }
        const receivedEpoch = epoch;
        const duration = value.type === "audio" ? value.audio.length * 3 / 4 / 2 / value.sampleRate * 1000 : 0;
        pendingMs += duration;
        if (!Number.isFinite(pendingMs) || pendingMs > 5000) {
          show("Provider audio backlog exceeded five seconds"); void end(); return;
        }
        chain = chain.then(async () => {
          if (!sink || receivedEpoch !== epoch) return;
          if (value.type === "audio") await sink.audio(value.audio, value.sampleRate);
        }).catch(error => {show(error.message); void end();}).finally(() => {pendingMs -= duration;});
      };
      socket.onerror = () => reject(new Error("Provider connection failed"));
      socket.onclose = () => {reject(new Error("Provider disconnected")); show("Disconnected"); void end();};
    });
    microphone = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}, video: false});
    context = new AudioContext();
    await context.resume();
    await context.audioWorklet.addModule("/public/mic-worklet.js");
    node = new AudioWorkletNode(context, "pcm-microphone", {processorOptions: {rate: bootstrap.inputRate}});
    const source = context.createMediaStreamSource(microphone), mute = context.createGain();
    mute.gain.value = 0;
    source.connect(node).connect(mute).connect(context.destination);
    node.port.onmessage = event => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      if (socket.bufferedAmount > 256 * 1024) {show("Microphone queue overflow"); void end(); return;}
      const samples = event.data, bytes = new Uint8Array(samples.length * 2), view = new DataView(bytes.buffer);
      samples.forEach((sample, i) => view.setInt16(i * 2, sample, true));
      socket.send(JSON.stringify({type: "mic", audio: btoa(String.fromCharCode(...bytes)), sampleRate: bootstrap.inputRate}));
    };
    document.querySelector("#end").disabled = false;
    document.querySelector("#interrupt").disabled = false;
    show("Connected: " + bootstrap.provider + "\nBridge channel: " + bootstrap.channel);
  } catch (error) {show(error.message); await end();}
};
document.querySelector("#interrupt").onclick = () => {
  chain = chain.then(() => sink?.interrupt());
};
document.querySelector("#end").onclick = () => {void end(); show("Session ended; Runtime lease released.");};
window.addEventListener("pagehide", () => {
  if (bootstrap) void fetch(new URL("/api/v1/runtime/sessions/end", bootstrap.apiBase), {
    method: "POST", headers: {Authorization: "Bearer " + bootstrap.sessionToken}, keepalive: true,
  }).catch(() => {});
  void end();
}, {once: true});
