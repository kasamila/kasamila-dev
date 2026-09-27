class PcmMicrophone extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.rate = options.processorOptions.rate;
    this.sum = 0; this.n = 0; this.phase = 0; this.chunk = [];
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      this.sum += sample; this.n += 1; this.phase += this.rate;
      if (this.phase >= sampleRate) {
        this.phase -= sampleRate;
        const value = Math.max(-1, Math.min(1, this.sum / this.n));
        this.chunk.push(Math.round(value < 0 ? value * 32768 : value * 32767));
        this.sum = 0; this.n = 0;
      }
      if (this.chunk.length >= this.rate / 50) { // 20ms; bounded latency
        const chunk = Int16Array.from(this.chunk);
        this.port.postMessage(chunk, [chunk.buffer]);
        this.chunk = [];
      }
    }
    return true;
  }
}
registerProcessor("pcm-microphone", PcmMicrophone);
