export function decodePcm16(base64) {
  if (typeof base64 !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4) {
    throw new TypeError("Expected base64 PCM16");
  }
  const raw = atob(base64);
  if (raw.length % 2) throw new TypeError("PCM16 must contain complete samples");
  const view = new DataView(Uint8Array.from(raw, c => c.charCodeAt(0)).buffer);
  return Int16Array.from({length: raw.length / 2}, (_, i) => view.getInt16(i * 2, true));
}

// One consumer for both speaker playback and mouth inference. No duplicate player.
// Interrupt aborts the SDK reader BEFORE resetting its audio worklet.
export class AvatarAudioSink {
  constructor(player, {maxQueuedMs = 2000} = {}) {
    this.player = player;
    this.maxQueuedMs = maxQueuedMs;
    this.active = null;
    this.destroyed = false;
    this.generation = 0;
    this.playUntil = 0;
  }
  async start(sampleRate) {
    if (this.destroyed) throw new Error("Sink closed");
    if (this.active?.rate === sampleRate) return;
    await this.interrupt();
    if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 48000) throw new RangeError("Unsupported sample rate");
    let controller;
    const stream = new ReadableStream({start(c) {controller = c;}}, {
      highWaterMark: Math.ceil(sampleRate * this.maxQueuedMs / 1000),
      size: chunk => chunk.data.length,
    });
    const task = this.player.setPcmStream(stream, {sampleRate, mode: "pcm_stream"});
    task.catch(() => {}); // immediately observe rejection
    this.active = {rate: sampleRate, controller, task};
  }
  async audio(base64, sampleRate) {
    await this.start(sampleRate);
    const generation = this.generation;
    const samples = decodePcm16(base64);
    // Pace bursts so the SDK audio worklet does not accumulate a full reply.
    const lead = this.playUntil - performance.now();
    if (lead > 150) await new Promise(resolve => setTimeout(resolve, lead - 150));
    if (generation !== this.generation || !this.active) return;
    if (samples.length > this.active.controller.desiredSize) {
      await this.interrupt();
      throw new Error("Audio queue overflow; stop upstream rather than accumulate latency");
    }
    if (samples.length) this.active.controller.enqueue({data: samples, sampleRate});
    this.playUntil = Math.max(performance.now(), this.playUntil) + samples.length / sampleRate * 1000;
  }
  async interrupt() {
    this.generation += 1;
    this.playUntil = 0;
    const active = this.active;
    this.active = null;
    if (active) {
      try {active.controller.error(new Error("Interrupted"));} catch {}
      await active.task.catch(() => {});
    }
    this.player.stop();
  }
  async close() { this.destroyed = true; await this.interrupt(); }
}
