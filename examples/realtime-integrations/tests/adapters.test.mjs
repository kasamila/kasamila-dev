import {test} from "node:test";
import assert from "node:assert/strict";
import {decodePcm16, AvatarAudioSink} from "../common/audio.mjs";
import {openaiSession, openaiOutput} from "../providers/openai.mjs";
import {qwenOutput} from "../providers/qwen.mjs";
import {geminiOutput} from "../providers/gemini.mjs";
import {tenOutput} from "../providers/ten.mjs";
import {bindLiveKit} from "../providers/livekit.mjs";
import {bindPipecat} from "../providers/pipecat.mjs";
import {EventEmitter} from "node:events";

const audio = Buffer.from([0, 128, 255, 127, 0, 0]).toString("base64");
test("PCM decoder uses signed little endian and refuses malformed chunks", () => {
  assert.deepEqual([...decodePcm16(audio)], [-32768, 32767, 0]);
  assert.throws(() => decodePcm16("AA=="));
  assert.throws(() => decodePcm16("MP3 is not PCM"));
});
test("OpenAI GA and Qwen events stay distinct", () => {
  assert.equal(openaiSession("configured-model").session.audio.input.format.rate, 24000);
  assert.equal(openaiOutput({type: "response.output_audio.delta", delta: audio})[0].sampleRate, 24000);
  assert.deepEqual(openaiOutput({type: "response.audio.delta", delta: audio}), []);
  assert.equal(qwenOutput({type: "response.audio.delta", delta: audio})[0].audio, audio);
  assert.deepEqual(qwenOutput({type: "input_audio_buffer.speech_started"}), [{type: "interrupt"}]);
});
test("Gemini consumes all parts, ignores text, interruption drops stale audio", () => {
  const parts = [{text: "hi"}, {inlineData: {mimeType: "audio/pcm;rate=24000", data: audio}},
    {inlineData: {mimeType: "audio/pcm;rate=24000", data: audio}}];
  assert.equal(geminiOutput({serverContent: {modelTurn: {parts}}}).length, 2);
  assert.deepEqual(geminiOutput({serverContent: {interrupted: true, modelTurn: {parts}}}), [{type: "interrupt"}]);
});
test("TEN validates metadata and explicit graph interrupt", () => {
  assert.throws(() => tenOutput({type: "audio", audio}));
  assert.equal(tenOutput({type: "audio", audio, metadata: {sample_rate: 16000, channels: 1, bytes_per_sample: 2}})[0].sampleRate, 16000);
  assert.deepEqual(tenOutput({type: "cmd", name: "kasamila_interrupt"}), [{type: "interrupt"}]);
});
test("interrupt settles old reader before next stream; close does not leak tasks", async () => {
  const samples = [], player = {
    stop() {},
    async setPcmStream(stream) {
      const reader = stream.getReader();
      try {while (true) {const v = await reader.read(); if (v.done) break; samples.push(v.value);}}
      finally {reader.releaseLock();}
    },
  };
  const sink = new AvatarAudioSink(player);
  await sink.audio(audio, 24000);
  await sink.interrupt();
  await sink.audio(audio, 16000);
  await sink.close();
  assert.deepEqual(samples.map(v => v.sampleRate), [24000, 16000]);
  await assert.rejects(sink.audio(audio, 16000));
});
test("queue overflow fails closed", async () => {
  const player = {stop() {}, async setPcmStream(stream) {const reader = stream.getReader(); try {while (!(await reader.read()).done) {}} finally {reader.releaseLock();}}};
  const sink = new AvatarAudioSink(player, {maxQueuedMs: 1});
  await assert.rejects(sink.audio(Buffer.alloc(4000).toString("base64"), 16000), /overflow/);
  await sink.close();
});
test("LiveKit selects exact agent, not another human; cleanup removes listeners", async () => {
  const room = new EventEmitter(); room.remoteParticipants = new Map();
  const events = {TrackSubscribed: "sub", TrackUnsubscribed: "unsub"};
  const tracks = [], player = {async setMediaStreamTrack(t) {tracks.push(t);}, stop() {}};
  const unbind = bindLiveKit({room, RoomEvent: events, player, agentIdentity: "agent", onError: e => {throw e;}});
  room.emit("sub", {kind: "audio", mediaStreamTrack: "human"}, null, {identity: "human"});
  room.emit("sub", {kind: "audio", mediaStreamTrack: "bot"}, null, {identity: "agent"});
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(tracks, ["bot"]);
  await unbind(); assert.equal(room.listenerCount("sub"), 0);
});
test("Pipecat selects tracks().bot.audio, not local microphone", async () => {
  const client = new EventEmitter(); client.tracks = () => ({local: {audio: "mic"}, bot: {audio: "bot"}});
  const tracks = [], player = {async setMediaStreamTrack(t) {tracks.push(t);}, stop() {}};
  const unbind = bindPipecat({client, RTVIEvent: {TrackStarted: "track", BotReady: "ready", TrackStopped: "stop"},
    player, onError: e => {throw e;}});
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(tracks, ["bot"]);
  await unbind(); assert.equal(client.eventNames().length, 0);
});
