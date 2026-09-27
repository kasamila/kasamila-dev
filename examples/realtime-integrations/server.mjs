import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname, resolve, sep, extname} from "node:path";
import {randomUUID, timingSafeEqual} from "node:crypto";
import WebSocket, {WebSocketServer} from "ws";
import {openaiSession, openaiOutput} from "./providers/openai.mjs";
import {qwenSession, qwenOutput} from "./providers/qwen.mjs";
import {geminiOutput} from "./providers/gemini.mjs";
import {tenOutput} from "./providers/ten.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8790);
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:" + port;
const apiBase = process.env.KASAMILA_API_BASE || "https://www.kasamila.com";
const provider = process.env.PROVIDER || "openai";
const channels = new Map();
const maxBytes = 256 * 1024;
function json(res, status, value) {
  res.writeHead(status, {"Content-Type": "application/json", "Cache-Control": "no-store"});
  res.end(JSON.stringify(value));
}
async function body(req) {
  let n = 0, parts = [];
  for await (const part of req) {
    n += part.length;
    if (n > maxBytes) throw new Error("Request too large");
    parts.push(part);
  }
  return JSON.parse(Buffer.concat(parts).toString());
}
function bridgeAuth(req) {
  const secret = process.env.BRIDGE_SECRET || "";
  const expected = Buffer.from("Bearer " + secret), actual = Buffer.from(req.headers.authorization || "");
  return secret.length >= 24 && expected.length === actual.length && timingSafeEqual(expected, actual);
}
function emit(socket, event) {
  if (socket.readyState !== WebSocket.OPEN) return;
  if (socket.bufferedAmount > maxBytes) { socket.close(1013, "Audio backpressure"); return; }
  socket.send(JSON.stringify(event));
}
async function endLease(token) {
  await fetch(apiBase + "/api/v1/runtime/sessions/end", {
    method: "POST", headers: {Authorization: "Bearer " + token}, signal: AbortSignal.timeout(10000),
  }).catch(() => {});
}
function requireConfig() {
  if (!["openai", "qwen", "gemini", "ten", "bridge"].includes(provider)) throw new Error("Unknown provider");
  const required = {openai: ["OPENAI_API_KEY"], qwen: ["DASHSCOPE_API_KEY"],
    gemini: ["GEMINI_API_KEY", "GEMINI_LIVE_MODEL"], ten: ["TEN_WS_URL"], bridge: ["BRIDGE_SECRET"]}[provider];
  for (const key of [...required, "KASAMILA_API_KEY", "KASAMILA_AVATAR_ID", "KASAMILA_MEDIA_DESCRIPTOR"]) {
    if (!process.env[key]) throw new Error("Missing server configuration: " + key);
  }
  if (provider === "bridge" && process.env.BRIDGE_SECRET.length < 24) throw new Error("BRIDGE_SECRET needs at least 24 characters");
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith("/api/bridge")) {
      if (!bridgeAuth(req)) return json(res, 401, {error: "Bridge authorization required"});
      if (req.method === "POST" && url.pathname === "/api/bridge") {
        const event = await body(req), state = channels.get(event.channel);
        if (state?.socket?.readyState !== WebSocket.OPEN) return json(res, 409, {error: "Browser disconnected"});
        if (event.type !== "interrupt" && !(event.type === "audio" && event.sampleRate >= 8000 && event.sampleRate <= 48000
            && typeof event.audio === "string" && event.audio.length <= maxBytes)) return json(res, 422, {error: "Expected PCM16 audio/interrupt"});
        emit(state.socket, event);
        res.writeHead(204); return res.end();
      }
      if (req.method === "GET" && url.pathname === "/api/bridge/input") {
        const state = channels.get(url.searchParams.get("channel"));
        if (!state?.socket) return json(res, 409, {error: "Browser disconnected"});
        if (state.input) return json(res, 409, {error: "Input reader already connected"});
        res.writeHead(200, {"Content-Type": "application/x-ndjson", "Cache-Control": "no-store"});
        res.flushHeaders();
        state.input = res;
        res.on("close", () => { if (state.input === res) state.input = null; });
        return;
      }
      return json(res, 405, {error: "Method not allowed"});
    }
    if (req.method === "POST" && url.pathname === "/api/runtime-token") {
      if (req.headers.origin !== origin) return json(res, 403, {error: "Origin rejected"});
      if (channels.size >= 4) return json(res, 429, {error: "Local demo session limit"});
      requireConfig();
      const media = JSON.parse(await readFile(resolve(root, process.env.KASAMILA_MEDIA_DESCRIPTOR), "utf8"));
      if (!media.timelineId || media.timelineId.startsWith("REPLACE")) throw new Error("Fill the real media descriptor first");
      const response = await fetch(apiBase + "/api/v1/runtime/sessions", {
        method: "POST", headers: {Authorization: "Bearer " + process.env.KASAMILA_API_KEY, "Content-Type": "application/json"},
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          avatar_id: process.env.KASAMILA_AVATAR_ID, template_code: process.env.KASAMILA_TEMPLATE_CODE || "001",
          origin, input_modes: ["pcm_stream", "rtc"], output_mode: process.env.KASAMILA_OUTPUT_MODE || "original",
          max_duration_seconds: 600, client: {sdk_version: "2.1.0", protocol: "kasamila-runtime-v1",
            geometry_contract: "kasamila-geometry-track-v2", update_policy: "pinned",
            required_capabilities: ["geometry-v7", "hls", "protected-runtime-v1", "license-grant-v1"]},
        }),
      });
      const result = await response.json();
      if (!response.ok) return json(res, response.status, {error: "Kasamila session rejected: " + (result.error?.code || response.status)});
      const channel = randomUUID(), token = result.data.client_token;
      const timeout = setTimeout(() => {
        const state = channels.get(channel);
        state?.socket?.close(1000, "Session expired");
        state?.input?.end(); channels.delete(channel); void endLease(token);
      }, 600000);
      timeout.unref();
      channels.set(channel, {token, timeout});
      return json(res, 200, {apiBase, sdk: result.data.sdk, sessionToken: token, templateMedia: media, channel,
        provider, inputRate: provider === "openai" ? 24000 : Number(process.env.BRIDGE_INPUT_RATE || 16000)});
    }
    if (req.method !== "GET") return json(res, 405, {error: "Method not allowed"});
    const path = resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/public/index.html" : url.pathname));
    if (!path.startsWith(root + sep) || !/[/\\](public|common|providers)[/\\]/.test(path) || extname(path) === ".py") {
      return json(res, 404, {error: "Not found"});
    }
    if (!(await stat(path)).isFile()) return json(res, 404, {error: "Not found"});
    res.writeHead(200, {"Content-Type": {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript"}[extname(path)] || "text/plain",
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"});
    res.end(await readFile(path));
  } catch { json(res, 500, {error: "Demo failed; check server configuration (credentials are never echoed)."}); }
});
const wss = new WebSocketServer({noServer: true, maxPayload: maxBytes});
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, origin), state = channels.get(url.searchParams.get("channel"));
  if (url.pathname !== "/api/provider" || req.headers.origin !== origin || !state || state.socket) {
    socket.destroy(); return;
  }
  wss.handleUpgrade(req, socket, head, ws => {state.socket = ws; void connect(ws, state, url.searchParams.get("channel"));});
});

async function connect(browser, state, channel) {
  let upstream = null, closed = false, ready = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    upstream?.close(); state.input?.end(); clearTimeout(state.timeout);
    channels.delete(channel); void endLease(state.token);
  };
  browser.on("close", cleanup);
  browser.on("error", cleanup);
  try {
    if (provider === "gemini") {
      const {GoogleGenAI, Modality} = await import("@google/genai");
      upstream = await new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY}).live.connect({
        model: process.env.GEMINI_LIVE_MODEL, config: {responseModalities: [Modality.AUDIO]},
        callbacks: {
          onmessage: event => { for (const output of geminiOutput(event)) emit(browser, output); },
          onerror: () => browser.close(1011, "Gemini failed"),
          onclose: () => browser.close(1000, "Provider disconnected"),
        },
      });
      if (closed) {upstream.close(); return;}
      ready = true;
    } else if (provider !== "bridge") {
      const url = provider === "openai" ? "wss://api.openai.com/v1/realtime?model=" + encodeURIComponent(process.env.OPENAI_REALTIME_MODEL || "gpt-realtime")
        : provider === "qwen" ? (process.env.QWEN_WS_URL || "wss://dashscope.aliyuncs.com/api-ws/v1/realtime") + "?model=" + encodeURIComponent(process.env.QWEN_REALTIME_MODEL || "qwen3-omni-flash-realtime")
        : process.env.TEN_WS_URL;
      const headers = provider === "ten" ? {} : {Authorization: "Bearer " + (provider === "openai" ? process.env.OPENAI_API_KEY : process.env.DASHSCOPE_API_KEY)};
      upstream = new WebSocket(url, {headers, maxPayload: maxBytes});
      upstream.on("open", () => {
        if (closed) return upstream.close();
        if (provider === "ten") {ready = true; emit(browser, {type: "ready"});}
      });
      upstream.on("message", bytes => {
        try {
          const event = JSON.parse(bytes.toString());
          if (event.type === "session.created") {
            upstream.send(JSON.stringify(provider === "openai" ? openaiSession(process.env.OPENAI_REALTIME_MODEL || "gpt-realtime") : qwenSession()));
          }
          if (event.type === "session.updated") {ready = true; emit(browser, {type: "ready"});}
          const outputs = (provider === "openai" ? openaiOutput : provider === "qwen" ? qwenOutput : tenOutput)(event);
          for (const output of outputs) emit(browser, output);
        } catch {browser.close(1011, "Invalid upstream event");}
      });
      upstream.on("error", () => browser.close(1011, "Provider failed"));
      upstream.on("close", () => browser.close(1000, "Provider disconnected"));
    } else {ready = true;}
    if (provider === "gemini" || provider === "bridge") emit(browser, {type: "ready"});
    const idle = setTimeout(() => {if (!ready) browser.close(1011, "Provider startup timeout");}, 20000);
    idle.unref();
    browser.once("close", () => clearTimeout(idle));
    browser.on("message", bytes => {
      try {
        const event = JSON.parse(bytes.toString());
        if (!ready || event.type !== "mic" || typeof event.audio !== "string") return;
        if (provider === "bridge") {
          if (state.input && !state.input.write(JSON.stringify({audio: event.audio, sampleRate: event.sampleRate}) + "\n")) browser.close(1013, "Input backpressure");
        } else if (provider === "gemini") {
          upstream.sendRealtimeInput({audio: {data: event.audio, mimeType: "audio/pcm;rate=" + event.sampleRate}});
        } else {
          if (upstream.bufferedAmount > maxBytes) return browser.close(1013, "Microphone backpressure");
          upstream.send(JSON.stringify(provider === "ten" ? {audio: event.audio, metadata: {sample_rate: event.sampleRate, channels: 1, bytes_per_sample: 2}}
            : {type: "input_audio_buffer.append", audio: event.audio}));
        }
      } catch {browser.close(1008, "Invalid microphone message");}
    });
  } catch {browser.close(1011, "Provider startup failed"); cleanup();}
}
// Local starter only. Production must authenticate users before session creation,
// authorize avatar access, use HTTPS/WSS and add per-user limits.
server.listen(port, "127.0.0.1", () => console.log("Local realtime demo: " + origin));
