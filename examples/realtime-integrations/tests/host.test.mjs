import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AvatarHost, encodedPcm} from '../common/avatar-host.mjs';
import {hostCommand} from '../common/host-rooms.mjs';
function fixture() {
  const seen = []; let destroyed = 0, released = 0;
  const sink = {async audio(audio, rate) {seen.push({audio, rate});}, async interrupt() {seen.push('interrupt');}, async close() {seen.push('close');}};
  const player = {getOutput: () => ({mode: 'transparent', transparentCanvas: true}), async destroy() {destroyed++;}};
  const host = new AvatarHost({element: {dataset: {}}, sinkFactory: () => sink});
  return {host, sink, seen, lease: {player, async endLease() {released++;}}, destroyed: () => destroyed, released: () => released};
}
test('shared host has four layouts, a single audio sink and idempotent concurrent end', async () => {
  const f = fixture(); await f.host.start(async () => f.lease, {transparent: true});
  for (const name of ['entertainment', 'chat', 'commerce', 'game']) {f.host.scene(name); assert.equal(f.host.element.dataset.scene, name);}
  assert.throws(() => f.host.scene('invented'));
  await f.host.push(encodedPcm(new Int16Array([-32768, 32767])), 16000);
  assert.equal(f.seen[0].rate, 16000);
  await Promise.all([f.host.end(), f.host.end()]); assert.equal(f.destroyed(), 1); assert.equal(f.released(), 1);
});
test('host interrupt drops queued old PCM immediately; accepts next turn', async () => {
  const f = fixture(); await f.host.start(async () => f.lease);
  const old = f.host.push('AAAAAA==', 16000); const interruption = f.host.interrupt();
  await old; await interruption; assert.deepEqual(f.seen, ['interrupt']);
  await f.host.push('AAAAAA==', 16000); assert.equal(f.seen.length, 2); await f.host.end();
});
test('closing during async startup destroys late player and ends late lease', async () => {
  const f = fixture(); let resolve;
  const start = f.host.start(() => new Promise(r => {resolve = r;}));
  const end = f.host.end(); resolve(f.lease);
  await assert.rejects(start, /cancelled/); await end;
  assert.equal(f.destroyed(), 1); assert.equal(f.released(), 1); assert.equal(f.host.state, 'idle');
});
test('transparent output is proven by SDK output, not CSS or requestedMode', async () => {
  const f = fixture(); f.lease.player.getOutput = () => ({mode: 'original', requestedMode: 'transparent', transparentCanvas: false});
  await assert.rejects(f.host.start(async () => f.lease, {transparent: true}), /transparent canvas/);
  assert.equal(f.destroyed(), 1); assert.equal(f.released(), 1);
});
test('host queue rejects malformed PCM, absurd rates and excessive backlog', async () => {
  const f = fixture(); await f.host.start(async () => f.lease);
  await assert.rejects(f.host.push('AAAAAA==', 1), /backlog/);
  await assert.rejects(f.host.push(Buffer.alloc(16000 * 2 * 6).toString('base64'), 16000), /backlog/);
  assert.throws(() => f.host.push('bad', 16000)); await f.host.end();
});
test('host control allowlist refuses arbitrary commands, invalid scene and malformed mic', () => {
  assert.deepEqual(hostCommand({type: 'end', apiKey: 'must-not-forward'}), {type: 'end'});
  assert.throws(() => hostCommand({type: 'exec', command: 'anything'}));
  assert.throws(() => hostCommand({type: 'scene', scene: '../private'}));
  assert.throws(() => hostCommand({type: 'mic', audio: 'AQ==', sampleRate: 16000}));
});

test('complete file FIFO reserves arrival order before asynchronous decode; interrupt drops stale files', async () => {
  const f = fixture(); await f.host.start(async () => f.lease);
  const decoded = []; let release;
  const context = {async decodeAudioData(bytes) {
    const marker = new Uint8Array(bytes)[0]; decoded.push(marker);
    if (marker === 1) await new Promise(r => {release = r;});
    return {duration: 0.001, sampleRate: 16000, length: 2, numberOfChannels: 1, getChannelData: () => new Float32Array([marker / 10, 0])};
  }};
  const first = f.host.enqueueFile('AQ==', context), second = f.host.enqueueFile('Ag==', context);
  await new Promise(r => setImmediate(r)); assert.deepEqual(decoded, [1]);
  release(); await Promise.all([first, second]); assert.deepEqual(decoded, [1, 2]);
  assert.equal(f.seen.length, 2);
  const stale = f.host.enqueueFile('Aw==', context); await f.host.interrupt(); await stale;
  assert.deepEqual(decoded, [1, 2]); await f.host.end();
});
