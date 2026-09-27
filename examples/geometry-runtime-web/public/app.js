const status = document.querySelector('#status');

function show(value) {
  status.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}


const tokenResponse = await fetch('/api/runtime-token', {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
});
const bootstrap = await tokenResponse.json();
if (!tokenResponse.ok) throw new Error(bootstrap.error || 'Runtime Token creation failed');
let player = null;
const endLease = () => fetch(new URL('/api/v1/runtime/sessions/end', bootstrap.apiBase), {
  method: 'POST', mode: 'cors', keepalive: true,
  headers: { Authorization: 'Bearer ' + bootstrap.sessionToken },
}).catch(() => {});
window.addEventListener('pagehide', () => {
  if (player) void player.destroy();
  else void endLease();
}, { once: true });
let Kasamila;
try {
  const { loadKasamila } = await import(new URL('/sdk/bootstrap/1/loader.mjs', bootstrap.apiBase).href);
  Kasamila = await loadKasamila(bootstrap.sdk, bootstrap.apiBase);
} catch (error) {
  await endLease();
  throw error;
}
const component = document.createElement('kasamila-avatar');
component.style.width = '100%';
component.style.height = '100%';
document.querySelector('#avatar').replaceChildren(component);
component.addEventListener('kasamila-error', event => show({ error: event.detail?.message || String(event.detail) }));

const createOptions = {
  element: component,
  sessionToken: bootstrap.sessionToken,
};
if (bootstrap.mediaDelivery === 'hls') {
  createOptions.templateMedia = bootstrap.templateMedia;
}

player = await Kasamila.create(createOptions).catch(async error => {
  await component.destroy().catch(() => {});
  throw error;
});
const mouth = player.getMouthConfiguration();
if (!(mouth.parameters?.teeth_scale > 0)) {
  await player.destroy();
  throw new Error('Kasamila teeth are disabled by mouth calibration');
}
show({
  sdk: Kasamila.version,
  buildMode: bootstrap.buildMode,
  output: player.getOutput(),
  mouth,
  expiresAt: bootstrap.expiresAt,
});

document.querySelector('#play').addEventListener('click', async () => {
  const file = document.querySelector('#audio').files[0];
  if (!file) return show('请先选择音频文件');
  try {
    await player.setAudioFile(file);
    show(`正在播放：${file.name}`);
  } catch (error) {
    show({ error: error.message });
  }
});

document.querySelector('#stop').addEventListener('click', () => {
  player.stop();
  show('声音已停止；IDLE 模板视频继续按当前时间轴循环播放。');
});

document.querySelector('#profiles').addEventListener('click', async event => {
  const profile = event.target.dataset.profile;
  if (!profile) return;
  try {
    await player.setProfile(profile);
    show(player.getMouthConfiguration());
  } catch (error) {
    show({ error: error.message });
  }
});

