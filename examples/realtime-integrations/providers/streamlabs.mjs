// Socket API Socket.IO v2 transport; credentials are server-only.
import WebSocket from 'ws';
export function streamlabsAnnouncements(event) {
  if (!['donation', 'follow', 'subscription', 'bits', 'raids', 'superchat'].includes(event?.type) || !Array.isArray(event.message)) return [];
  return event.message.slice(0, 5).map(item => {
    const name = String(item.name || 'viewer').replace(/[\r\n<>]/g, ' ').slice(0, 60);
    // Do not forward donor message, amount, private identifiers, or untrusted prompt instructions.
    return `${event.type}: ${name}. Operator review required before speaking.`;
  });
}
export async function connectStreamlabs(token, publish, connect = (url, options) => new WebSocket(url, options)) {
  // Fixed endpoint; minimal receive-only Engine.IO v3 / Socket.IO v2 root namespace.
  // Avoid exposing the obsolete general-purpose Socket.IO client dependency.
  const url = new URL('wss://sockets.streamlabs.com/socket.io/');
  url.searchParams.set('EIO', '3'); url.searchParams.set('transport', 'websocket'); url.searchParams.set('token', token);
  const socket = connect(url.href, {maxPayload: 64 * 1024, handshakeTimeout: 15000});
  let closed = false, hello, ready = false, ping, pong;
  const startup = setTimeout(() => close(), 15000); startup.unref?.();
  function close() {
    if (closed) return; closed = true; clearTimeout(startup); clearTimeout(ping); clearTimeout(pong);
    if (socket.readyState === WebSocket.OPEN && ready) socket.send('41');
    socket.close();
  }
  function schedulePing() {
    clearTimeout(ping); clearTimeout(pong);
    ping = setTimeout(() => {
      if (closed) return;
      socket.send('2'); pong = setTimeout(close, hello.pingTimeout); pong.unref?.();
    }, hello.pingInterval); ping.unref?.();
  }
  socket.on('message', (raw, binary) => {
    if (closed) return;
    try {
      if (binary) throw new Error('Only JSON alerts supported');
      const packet = raw.toString();
      if (packet[0] === '0') {
        if (hello) throw new Error('Duplicate hello');
        hello = JSON.parse(packet.slice(1));
        for (const name of ['pingInterval', 'pingTimeout'])
          if (!Number.isInteger(hello[name]) || hello[name] < 1000 || hello[name] > 120000) throw new Error('Invalid heartbeat');
        schedulePing(); return;
      }
      if (packet === '40') {if (!hello) throw new Error('No engine hello'); ready = true; clearTimeout(startup); return;}
      if (packet === '3') {if (hello) schedulePing(); return;}
      if (packet[0] === '2') {socket.send('3' + packet.slice(1)); return;}
      if (['1', '41'].includes(packet) || packet.startsWith('44')) return close();
      if (ready && packet.startsWith('42[')) {
        const [name, event] = JSON.parse(packet.slice(2));
        if (name === 'event') for (const text of streamlabsAnnouncements(event)) publish(text);
      }
    } catch {close();}
  });
  socket.on('error', () => {console.error('Streamlabs connection failed (details redacted)'); close();});
  socket.on('close', close);
  return {close};
}
