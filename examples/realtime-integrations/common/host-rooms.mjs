import {randomUUID} from 'node:crypto';
import {WebSocketServer, WebSocket} from 'ws';
import {pcmBytes} from '../providers/voice-platforms.mjs';

export function hostCommand(e) {
  if (!e || !['start', 'end', 'interrupt', 'scene', 'mic', 'input_end', 'file', 'announcement'].includes(e.type))
    throw new Error('Unknown host command');
  if (e.type === 'scene' && !['entertainment', 'chat', 'commerce', 'game'].includes(e.scene)) throw new Error('Unknown scene');
  if (e.type === 'mic') {pcmBytes(e.audio); if (!Number.isInteger(e.sampleRate) || e.sampleRate < 8000 || e.sampleRate > 48000) throw new Error('Bad rate');}
  if (e.type === 'file' && (typeof e.audio !== 'string' || e.audio.length > 4 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(e.audio)))
    throw new Error('Bad file');
  if (e.type === 'announcement' && (typeof e.text !== 'string' || e.text.length > 500)) throw new Error('Bad announcement');
  if (e.type === 'input_end' && e.text != null && (typeof e.text !== 'string' || e.text.length > 4000)) throw new Error('Bad text');
  return Object.fromEntries(Object.entries(e).filter(([key]) => ['type', 'scene', 'audio', 'sampleRate', 'text', 'id'].includes(key)));
}
// Loopback demo capabilities: separate control and display tokens. Neither is a permanent API key.
// Production integrators must replace issuance with their own login/authorization.
export function createHostRooms({origin, release}) {
  const rooms = new Map(), keys = new Map();
  const wss = new WebSocketServer({noServer: true, maxPayload: 4 * 1024 * 1024});
  const send = (ws, e) => {
    if (ws?.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 4 * 1024 * 1024) return ws.close(1013, 'Host backpressure');
    ws.send(JSON.stringify(e));
  };
  const reply = (res, status, data) => {res.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}); res.end(JSON.stringify(data));};
  const lookup = key => rooms.get(keys.get(key));
  function endRoom(room) {
    if (!room) return;
    room.starting = false;
    if (room.channel) {release(room.channel); room.channel = null;}
    send(room.overlay, {type: 'end'}); send(room.control, {type: 'status', state: 'ending'});
  }
  return {async http(req, res, url) {
    if (!url.pathname.startsWith('/api/host/')) return false;
    if (req.headers.origin !== origin) {reply(res, 403, {error: 'Origin rejected'}); return true;}
    if (req.method === 'POST' && url.pathname === '/api/host/new') {
      if (rooms.size >= 4) {reply(res, 429, {error: 'Host room limit'}); return true;}
      const id = randomUUID(), controlKey = randomUUID(), overlayKey = randomUUID();
      const room = {id, controlKey, overlayKey, channel: null};
      rooms.set(id, room); keys.set(controlKey, id); keys.set(overlayKey, id);
      room.timer = setTimeout(() => {endRoom(room); room.control?.close(); room.overlay?.close();
        rooms.delete(id); keys.delete(controlKey); keys.delete(overlayKey);}, 600000);
      room.timer.unref(); reply(res, 200, {controlKey, overlayKey}); return true;
    }
    reply(res, 404, {error: 'Host route not found'}); return true;
  }, canStart(key) {const r = lookup(key); return !!r && r.overlayKey === key && !r.channel && !r.starting;},
  reserve(key) {const r = lookup(key); if (!r || r.overlayKey !== key || r.channel || r.starting) return false; r.starting = true; return true;},
  canBind(key) {const r = lookup(key); return !!r && r.starting && !!r.overlay;},
  bindRuntime(key, channel) {const r = lookup(key); if (r) {r.channel = channel; r.starting = false;}},
  cancelStart(key) {const r = lookup(key); if (r) r.starting = false;},
  unbindRuntime(channel) {for (const r of rooms.values()) if (r.channel === channel) r.channel = null;},
  upgrade(req, socket, head) {
    const url = new URL(req.url, origin);
    if (url.pathname !== '/api/host') return false;
    const key = url.searchParams.get('key'), room = lookup(key);
    const role = room?.controlKey === key ? 'control' : 'overlay';
    if (!room || req.headers.origin !== origin || room[role]) {socket.destroy(); return true;}
    wss.handleUpgrade(req, socket, head, ws => {
      room[role] = ws; send(room.control, {type: 'status', state: room.overlay ? 'overlay-connected' : 'waiting-overlay'});
      ws.on('message', raw => {
        try {
          const e = JSON.parse(raw);
          if (role === 'control') {
            const command = hostCommand(e);
            if (command.type === 'end') endRoom(room);
            else if (room.overlay) send(room.overlay, command);
            else send(ws, {type: 'status', state: 'waiting-overlay'});
          } else if (e.type === 'status') send(room.control, {type: 'status', state: String(e.state).slice(0, 200), inputRate: e.inputRate});
        } catch {ws.close(1008, 'Invalid host event');}
      });
      ws.on('close', () => {room[role] = null; endRoom(room);});
      ws.on('error', () => {endRoom(room);});
    }); return true;
  }, broadcastAnnouncement(text) {
    for (const room of rooms.values()) send(room.control, {type: 'announcement', text});
  }, close() {
    for (const room of rooms.values()) {clearTimeout(room.timer); endRoom(room); room.control?.close(); room.overlay?.close();}
    rooms.clear(); keys.clear(); wss.close();
  }};
}
