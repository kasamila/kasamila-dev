export function tenOutput(event) {
  if (event.type === "audio") {
    const m = event.metadata;
    if (m?.channels !== 1 || m?.bytes_per_sample !== 2 || !m.sample_rate) {
      throw new TypeError("Configure TEN TTS for mono PCM16 and include audio metadata");
    }
    return [{type: "audio", audio: event.audio, sampleRate: m.sample_rate}];
  }
  // In your TEN main_control extension, send this explicit custom command
  // on VAD/barge-in. Do not assume every TEN graph emits it by default.
  if (event.type === "cmd" && event.name === "kasamila_interrupt") return [{type: "interrupt"}];
  return [];
}
