// Optional OBS Studio WebSocket 5 control. Browser Source needs no OBS RPC.
export async function switchObsScene(scene, env = process.env) {
  if (typeof scene !== 'string' || !scene.trim() || scene.length > 120) throw new Error('Invalid OBS scene');
  const url = new URL(env.OBS_WS_URL || 'ws://127.0.0.1:4455');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('OBS control is loopback-only');
  const {default: OBSWebSocket} = await import('obs-websocket-js/json');
  const obs = new OBSWebSocket();
  try {
    await obs.connect(url.href, env.OBS_WS_PASSWORD, {rpcVersion: 1});
    await obs.call('SetCurrentProgramScene', {sceneName: scene});
  } finally {await obs.disconnect();}
}
