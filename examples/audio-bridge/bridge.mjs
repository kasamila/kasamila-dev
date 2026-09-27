// Transport-neutral example; no credentials or permanent Kasamila Key.
export function createPcmSource({ sampleRate = 16000, maxQueuedMs = 2000 } = {}) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 48000) throw new RangeError("Unsupported PCM sample rate");
  if (!Number.isFinite(maxQueuedMs) || maxQueuedMs <= 0 || maxQueuedMs > 10000) throw new RangeError("Invalid queue limit");
  const capacity = Math.ceil(sampleRate * maxQueuedMs / 1000);
  let controller, stopped = false;
  const stream = new ReadableStream({
    start(value) { controller = value; },
    cancel() { stopped = true; },
  }, { highWaterMark: capacity, size(chunk) { return chunk.data.length; } });
  return {
    stream,
    push(samples) {
      if (stopped) throw new Error("PCM source is closed");
      if (!(samples instanceof Int16Array)) throw new TypeError("Use mono Int16Array PCM, not compressed audio");
      if (samples.length > (controller.desiredSize ?? 0)) throw new RangeError("PCM queue overflow: pause the upstream producer");
      if (samples.length) controller.enqueue({ data: new Int16Array(samples), sampleRate });
    },
    close() { if (!stopped) { stopped = true; controller.close(); } },
    abort(reason = new Error("Audio interrupted")) { if (!stopped) { stopped = true; controller.error(reason); } },
  };
}
export async function connectRemoteAudio(player, track) {
  // SDK owns the capture graph, not the upstream RTC track.
  if (!track || track.kind !== "audio") throw new TypeError("An audio MediaStreamTrack is required");
  await player.setMediaStreamTrack(track);
  return () => player.stop();
}
export function drivePcm(player, options = {}) {
  const source = createPcmSource(options);
  const finished = player.setPcmStream(source.stream, {
    sampleRate: options.sampleRate ?? 16000, mode: "pcm_stream", playback: options.playback !== false,
  });
  // Observe immediately; callers still await finished and handle reconnects.
  finished.catch(() => {});
  return { ...source, finished };
}
export async function endRuntime(player) {
  // stop() alone does NOT stop Runtime billing.
  await player.destroy();
}
