import test from "node:test";
import assert from "node:assert/strict";
import { createPcmSource, drivePcm, connectRemoteAudio, endRuntime } from "./bridge.mjs";
test("PCM copies input, retains rate and closes cleanly", async () => {
  const source = createPcmSource({ sampleRate: 24000 });
  const input = new Int16Array([10, -20]);
  source.push(input);
  input[0] = 999;
  const reader = source.stream.getReader();
  const { value } = await reader.read();
  assert.deepEqual([...value.data], [10, -20]);
  assert.equal(value.sampleRate, 24000);
  source.close();
  assert.equal((await reader.read()).done, true);
  assert.throws(() => source.push(input), /closed/);
  reader.releaseLock();
});
test("Buffer overflow is explicit, without silently dropping speech", async () => {
  const source = createPcmSource({ sampleRate: 16000, maxQueuedMs: 1 });
  source.push(new Int16Array(16));
  assert.throws(() => source.push(new Int16Array(1)), /overflow/);
  assert.throws(() => createPcmSource({ sampleRate: 0 }), /rate/);
  assert.throws(() => source.push(new Uint8Array(2)), /Int16Array/);
  const reader = source.stream.getReader();
  source.abort(new Error("interrupt"));
  await assert.rejects(reader.read(), /interrupt/);
  reader.releaseLock();
});
test("SDK contract and explicit Runtime shutdown are preserved", async () => {
  let stopped = 0, destroyed = 0, trackSeen;
  const player = {
    async setPcmStream(stream, options) {
      assert.equal(options.mode, "pcm_stream");
      const reader = stream.getReader();
      try { while (!(await reader.read()).done) {} } finally { reader.releaseLock(); }
    },
    async setMediaStreamTrack(track) { trackSeen = track; },
    stop() { stopped++; },
    async destroy() { destroyed++; },
  };
  const pcm = drivePcm(player);
  pcm.push(new Int16Array([1]));
  pcm.close();
  await pcm.finished;
  const track = { kind: "audio" };
  const disconnect = await connectRemoteAudio(player, track);
  disconnect();
  assert.equal(trackSeen, track);
  assert.equal(stopped, 1);
  assert.equal(destroyed, 0);
  await endRuntime(player);
  assert.equal(destroyed, 1);
});
