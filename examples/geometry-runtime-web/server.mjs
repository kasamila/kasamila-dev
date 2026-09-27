import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const publicRoot = join(root, 'public');
const port = Number(process.env.PORT || 8788);
const appOrigin = process.env.APP_ORIGIN || `http://127.0.0.1:${port}`;
const apiBase = (process.env.KASAMILA_API_BASE || 'https://www.kasamila.com').replace(/\/$/, '');
const apiKey = process.env.KASAMILA_API_KEY || '';
const avatarId = process.env.KASAMILA_AVATAR_ID || '';
const templateCode = process.env.KASAMILA_TEMPLATE_CODE || '001';
const outputMode = process.env.KASAMILA_OUTPUT_MODE || 'original';
const descriptorPath = process.env.KASAMILA_MEDIA_DESCRIPTOR || '';
const sdkVersion = process.env.KASAMILA_SDK_VERSION || '2.0.0';
const updatePolicy = process.env.KASAMILA_UPDATE_POLICY || 'pinned';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function templateMedia() {
  if (!descriptorPath) return null;
  const descriptor = JSON.parse(readFileSync(descriptorPath, 'utf8'));
  if (descriptor.timelineId === 'REPLACE_WITH_MEDIA_CONTRACT_TIMELINE_ID') {
    throw new Error('Copy the example descriptor and replace all placeholder values first');
  }
  return descriptor;
}

async function createRuntimeSession() {
  if (!apiKey || !avatarId) {
    throw new Error('KASAMILA_API_KEY and KASAMILA_AVATAR_ID are required');
  }
  const response = await fetch(`${apiBase}/api/v1/runtime/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      avatar_id: avatarId,
      template_code: templateCode,
      origin: appOrigin,
      input_modes: ['file', 'audio_url', 'pcm_stream', 'tts_stream'],
      output_mode: outputMode,
      max_duration_seconds: 600,
      client: {
        sdk_version: sdkVersion,
        protocol: 'kasamila-runtime-v1',
        geometry_contract: 'kasamila-geometry-track-v2',
        update_policy: updatePolicy,
        required_capabilities: ['geometry-v7', 'hls'],
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || `Kasamila API returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

function staticPath(urlPath) {
  if (urlPath === '/') return join(publicRoot, 'index.html');
  if (urlPath === '/vendor/hls.min.js') {
    return join(root, '..', '..', 'web', 'vendor', 'hls.js', 'hls.min.js');
  }
  let relative;
  try {
    relative = normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, '');
  } catch (_) {
    return null;
  }
  const candidate = resolve(publicRoot, relative);
  const boundary = resolve(publicRoot) + sep;
  return candidate.startsWith(boundary) ? candidate : null;
}

createServer(async (request, response) => {
  const url = new URL(request.url, appOrigin);
  if (request.method === 'POST' && url.pathname === '/api/runtime-token') {
    // Demo only. A production endpoint must authenticate your own end user,
    // authorize the requested avatar and apply rate limits before minting a token.
    try {
      // Validate local configuration BEFORE opening a billed Runtime session.
      const media = templateMedia();
      if (!media) {
        throw new Error('Geometry Runtime requires KASAMILA_MEDIA_DESCRIPTOR');
      }
      const runtime = await createRuntimeSession();
      json(response, 200, {
        sessionToken: runtime.client_token,
        expiresAt: runtime.expires_at,
        buildMode: runtime.build_mode,
        mediaDelivery: runtime.media_delivery,
        outputMode: runtime.output_mode,
        templateMedia: media,
        sdk: runtime.sdk,
        apiBase,
      });
    } catch (error) {
      json(response, Number(error.status) || 500, { error: error.message });
    }
    return;
  }
  if (request.method !== 'GET') {
    json(response, 405, { error: 'Method not allowed' });
    return;
  }
  const path = staticPath(url.pathname);
  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    json(response, 404, { error: 'Not found' });
    return;
  }
  response.writeHead(200, {
    'Content-Type': url.pathname === '/vendor/hls.min.js'
      ? 'text/javascript; charset=utf-8' : (types[extname(path)] || 'application/octet-stream'),
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(path).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Kasamila geometry demo: ${appOrigin}`);
});
