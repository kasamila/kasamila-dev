import {AvatarAudioSink, decodePcm16} from './audio.mjs';

export function encodedPcm(samples) {
  const bytes = new Uint8Array(samples.length * 2), view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, samples[i], true);
  let raw = ''; for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
}
// Reusable host for every scenario, including customer service and livestreaming.
// The SDK remains the only speaker AND mouth-inference consumer.
export class AvatarHost {
  constructor({element, report = () => {}, sinkFactory = p => new AvatarAudioSink(p)} = {}) {
    this.element = element; this.report = report; this.sinkFactory = sinkFactory;
    this.epoch = 0; this.pendingMs = 0; this.chain = Promise.resolve(); this.files = 0;
    this.state = 'idle'; this.starting = null; this.closing = null;
  }
  async start(createRuntime, {transparent = false} = {}) {
    if (this.state !== 'idle') throw new Error('Host already active');
    const epoch = ++this.epoch; this.state = 'loading'; this.report(this.state);
    this.starting = (async () => {
      const lease = await createRuntime();
      if (epoch !== this.epoch) {await lease.player.destroy(); await lease.endLease(); throw new Error('Start cancelled');}
      this.lease = lease; this.player = lease.player; this.sink = this.sinkFactory(this.player);
      if (transparent) {
        const output = this.player.getOutput();
        if (output.mode !== 'transparent' || output.transparentCanvas !== true) {
          await this.sink.close(); await this.player.destroy(); await lease.endLease();
          this.lease = this.player = this.sink = null;
          throw new Error('Actual transparent canvas required; CSS cannot remove an original background');
        }
      }
      this.state = 'running'; this.report(this.state);
    })();
    try {await this.starting;} catch (error) {if (epoch === this.epoch) this.state = 'idle'; throw error;}
    finally {this.starting = null;}
  }
  push(audio, rate) {
    if (this.state !== 'running') return Promise.reject(new Error('Host not running'));
    const duration = decodePcm16(audio).length / rate * 1000;
    if (!Number.isInteger(rate) || rate < 8000 || rate > 48000 || !Number.isFinite(duration) || this.pendingMs + duration > 5000)
      return Promise.reject(new Error('Host PCM backlog exceeds five seconds; stop upstream'));
    const epoch = this.epoch; this.pendingMs += duration;
    const task = this.chain.then(() => epoch === this.epoch ? this.sink.audio(audio, rate) : undefined);
    this.chain = task.catch(() => {}).finally(() => {this.pendingMs = Math.max(0, this.pendingMs - duration);});
    return task;
  }
  async interrupt() {
    this.epoch++;
    // Reset immediately, not behind already queued speech.
    const task = this.sink?.interrupt() || Promise.resolve();
    this.chain = Promise.resolve(task); await task;
    this.report('interrupted');
  }
  scene(name) {
    if (!['entertainment', 'chat', 'commerce', 'game'].includes(name)) throw new Error('Unknown scene');
    if (this.element) this.element.dataset.scene = name;
    this.report('scene:' + name);
  }
  async enqueueFile(base64, context) {
    if (this.files >= 4) throw new Error('Playback queue is full (four items)');
    const epoch = this.epoch; this.files++;
    const prior = this.fileChain || Promise.resolve();
    // Reserve FIFO position BEFORE decoding. Different codecs decode at different speeds.
    const task = prior.then(async () => {
      if (epoch !== this.epoch) return;
      const raw = atob(base64);
      if (raw.length > 3 * 1024 * 1024) throw new Error('File too large');
      const pcm = await context.decodeAudioData(Uint8Array.from(raw, c => c.charCodeAt(0)).buffer);
      if (pcm.duration > 30 || pcm.sampleRate < 8000 || pcm.sampleRate > 48000) throw new Error('Require an audio file <=30 seconds, 8-48 kHz');
      if (epoch !== this.epoch) return;
      const step = Math.floor(pcm.sampleRate / 50);
      for (let i = 0; i < pcm.length && epoch === this.epoch; i += step) {
        const samples = new Int16Array(Math.min(step, pcm.length - i));
        for (let n = 0; n < samples.length; n++) {
          let value = 0;
          for (let c = 0; c < pcm.numberOfChannels; c++) value += pcm.getChannelData(c)[i + n] / pcm.numberOfChannels;
          value = Math.max(-1, Math.min(1, value)); samples[n] = Math.round(value < 0 ? value * 32768 : value * 32767);
        }
        await this.push(encodedPcm(samples), pcm.sampleRate);
      }
      const tail = Math.max(0, (this.sink?.playUntil || 0) - performance.now());
      if (tail) await new Promise(resolve => setTimeout(resolve, Math.min(tail, 5000)));
    }).finally(() => {this.files--;});
    this.fileChain = task.catch(() => {}); return task;
  }
  async end() {
    if (this.closing) return this.closing;
    this.epoch++; this.state = 'ending'; this.report(this.state);
    this.closing = (async () => {
      await this.starting?.catch(() => {});
      try {
        await this.sink?.close();
        await this.chain.catch(() => {});
        await this.player?.destroy();
      } finally {await this.lease?.endLease();}
      this.player = this.sink = this.lease = null; this.pendingMs = 0;
      this.state = 'idle'; this.report('ended');
    })();
    try {await this.closing;} finally {this.closing = null;}
  }
}

export async function createRuntime(element, {room, output} = {}) {
  let bootstrap, player;
  const endLease = async () => {
    if (!bootstrap) return;
    const response = await fetch('/api/runtime-end', {method: 'POST', keepalive: true,
      headers: {'Content-Type': 'application/json'}, body: JSON.stringify({channel: bootstrap.channel})});
    if (!response.ok) throw new Error('Runtime release failed; use authorized session termination');
  };
  try {
    const response = await fetch('/api/runtime-token' + (room ? '?room=' + encodeURIComponent(room) : ''), {method: 'POST'});
    if (!response.ok) throw new Error('Runtime initialization rejected; check server/media configuration');
    bootstrap = await response.json();
    const {loadKasamila} = await import(new URL('/sdk/bootstrap/1/loader.mjs', bootstrap.apiBase).href);
    const sdk = await loadKasamila(bootstrap.sdk, bootstrap.apiBase);
    player = await sdk.create({element, sessionToken: bootstrap.sessionToken, templateMedia: bootstrap.templateMedia});
    if (output && player.getOutput().mode !== output) throw new Error('Requested output unavailable');
    return {player, bootstrap, endLease};
  } catch (error) {await player?.destroy().catch(() => {}); await endLease(); throw error;}
}
