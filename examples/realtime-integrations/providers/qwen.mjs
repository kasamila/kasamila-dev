export function qwenSession() {
  return {type: "session.update", session: {
    modalities: ["text", "audio"], voice: "Cherry",
    input_audio_format: "pcm", output_audio_format: "pcm",
    turn_detection: {type: "server_vad", threshold: 0.5, silence_duration_ms: 800},
  }};
}
export function qwenOutput(event) {
  if (event.type === "response.audio.delta") return [{type: "audio", audio: event.delta, sampleRate: 24000}];
  if (event.type === "input_audio_buffer.speech_started") return [{type: "interrupt"}];
  if (event.type === "error") throw new Error("Qwen rejected the realtime request; check region/model entitlement on your server");
  return [];
}
