import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import WebSocket, {WebSocketServer} from 'ws';
import {createHostRooms} from '../common/host-rooms.mjs';
import {switchObsScene} from '../common/obs.mjs';
const wait = () => new Promise(r => setImmediate(r));

test('room origin, role isolation, startup reservation and explicit end release', async () => {
  let origin, released = [];
  const rooms = createHostRooms({origin: 'http://operator.test', release: id => released.push(id)});
  const server = createServer(async (req, res) => {if (!await rooms.http(req, res, new URL(req.url, origin))) {res.writeHead(404); res.end();}});
  server.on('upgrade', (req, socket, head) => rooms.upgrade(req, socket, head));
  await new Promise(r => server.listen(0, '127.0.0.1', r)); origin = 'http://127.0.0.1:' + server.address().port;
  const sockets = [];
  const connect = async key => {
    const ws = new WebSocket(origin.replace('http', 'ws') + '/api/host?key=' + key, {headers: {Origin: 'http://operator.test'}});
    sockets.push(ws); await new Promise((r, j) => {ws.once('open', r); ws.once('error', j);}); return ws;
  };
  try {
    assert.equal((await fetch(origin + '/api/host/new', {method: 'POST', headers: {Origin: 'https://evil.test'}})).status, 403);
    const room = await (await fetch(origin + '/api/host/new', {method: 'POST', headers: {Origin: 'http://operator.test'}})).json();
    const controller = await connect(room.controlKey), overlay = await connect(room.overlayKey);
    assert.equal(rooms.reserve(room.controlKey), false); assert.equal(rooms.reserve(room.overlayKey), true);
    assert.equal(rooms.reserve(room.overlayKey), false); assert.equal(rooms.canBind(room.overlayKey), true);
    rooms.bindRuntime(room.overlayKey, 'synthetic-session');
    const command = new Promise(r => overlay.once('message', raw => r(JSON.parse(raw))));
    controller.send(JSON.stringify({type: 'scene', scene: 'commerce', secret: 'do-not-forward'}));
    assert.deepEqual(await command, {type: 'scene', scene: 'commerce'});
    controller.send(JSON.stringify({type: 'end'}));
    for (let i = 0; i < 30 && !released.length; i++) await wait();
    assert.deepEqual(released, ['synthetic-session']); assert.equal(rooms.canStart(room.overlayKey), true);
    assert.equal(rooms.reserve(room.overlayKey), true); rooms.cancelStart(room.overlayKey);
    assert.equal(rooms.canBind(room.overlayKey), false);
  } finally {
    for (const socket of sockets) socket.terminate(); rooms.close(); await new Promise(r => server.close(r));
  }
});

test('OBS scene switch uses real v5 request/response and disconnects; rejects remote host', async () => {
  await assert.rejects(switchObsScene('Scene', {OBS_WS_URL: 'ws://external.test:4455'}), /loopback/);
  const server = new WebSocketServer({host: '127.0.0.1', port: 0});
  await new Promise(r => server.once('listening', r)); let request;
  server.on('connection', ws => {
    ws.send(JSON.stringify({op: 0, d: {obsWebSocketVersion: '5.0.0', rpcVersion: 1}}));
    ws.on('message', raw => {
      const e = JSON.parse(raw);
      if (e.op === 1) ws.send(JSON.stringify({op: 2, d: {negotiatedRpcVersion: 1}}));
      if (e.op === 6) {request = e.d; ws.send(JSON.stringify({op: 7, d: {requestId: e.d.requestId,
        requestType: e.d.requestType, requestStatus: {result: true, code: 100}}}));}
    });
  });
  try {
    await switchObsScene('Commerce', {OBS_WS_URL: 'ws://127.0.0.1:' + server.address().port});
    assert.equal(request.requestType, 'SetCurrentProgramScene'); assert.deepEqual(request.requestData, {sceneName: 'Commerce'});
  } finally {for (const ws of server.clients) ws.terminate(); await new Promise(r => server.close(r));}
});
