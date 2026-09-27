export function openaiSession(model) {
  return {type: "session.update", session: {
    type: "realtime", model, output_modalities: ["audio"],
    audio: {
      input: {format: {type: "audio/pcm", rate: 24000}, turn_detection: {type: "server_vad"}},
      output: {format: {type: "audio/pcm", rate: 24000}, voice: "marin"},
    },
  }};
}
export function openaiOutput(event) {
  if (event.type === "response.output_audio.delta") return [{type: "audio", audio: event.delta, sampleRate: 24000}];
  if (event.type === "input_audio_buffer.speech_started") return [{type: "interrupt"}];
  if (event.type === "error") throw new Error("OpenAI rejected the realtime request; inspect server-side provider diagnostics");
  return [];
}
