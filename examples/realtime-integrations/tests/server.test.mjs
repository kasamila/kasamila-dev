import {test} from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {spawn} from "node:child_process";
import {mkdtemp, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import WebSocket, {WebSocketServer} from "ws";

test("local TEN relay authorizes Kasamila, protects secrets and ends lease on disconnect", async () => {
  let requested, ended = 0;
  const api = createServer(async (req, res) => {
    let text = ""; for await (const chunk of req) text += chunk;
    if (req.url.endsWith("/sessions/end")) {ended++; res.end("{}"); return;}
    requested = JSON.parse(text);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({data: {client_token: "test-runtime-token", sdk: {version: "2.1.0"}}}));
  });
  await new Promise(resolve => api.listen(0, "127.0.0.1", resolve));
  const upstream = new WebSocketServer({host: "127.0.0.1", port: 0});
  await new Promise(resolve => upstream.once("listening", resolve));
  upstream.on("connection", ws => ws.on("message", raw => {
    const event = JSON.parse(raw);
    assert.ok(event.audio);
    ws.send(JSON.stringify({type: "audio", audio: "AAAAAA==", metadata: {sample_rate: 16000, channels: 1, bytes_per_sample: 2}}));
  }));
  const reserve = createServer(); await new Promise(resolve => reserve.listen(0, "127.0.0.1", resolve));
  const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
  const dir = await mkdtemp(join(tmpdir(), "kasamila-realtime-test-"));
  const media = join(dir, "media.json"); await writeFile(media, JSON.stringify({timelineId: "synthetic-test"}));
  const origin = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, ["server.mjs"], {env: {
    ...process.env, PORT: String(port), APP_ORIGIN: origin, PROVIDER: "ten",
    TEN_WS_URL: "ws://127.0.0.1:" + upstream.address().port,
    KASAMILA_API_BASE: "http://127.0.0.1:" + api.address().port,
    KASAMILA_API_KEY: "test-only-not-real", KASAMILA_AVATAR_ID: "synthetic-test",
    KASAMILA_MEDIA_DESCRIPTOR: media,
  }, stdio: ["ignore", "pipe", "pipe"]});
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Server startup timeout")), 10000);
      child.stdout.once("data", () => {clearTimeout(timeout); resolve();});
      child.once("error", reject);
    });
    assert.equal((await fetch(origin + "/")).status, 200);
    for (const page of ['studio.html', 'overlay.html', 'video-call.html'])
      assert.equal((await fetch(origin + '/public/' + page)).status, 200);
    assert.equal((await fetch(origin + "/.env")).status, 404);
    assert.equal((await fetch(origin + "/providers/doubao-hook.py")).status, 404);
    assert.equal((await fetch(origin + "/api/runtime-token", {method: "POST", headers: {Origin: "https://other.test"}})).status, 403);
    const response = await fetch(origin + "/api/runtime-token", {method: "POST", headers: {Origin: origin}});
    const bootstrap = await response.json();
    assert.equal(response.status, 200);
    assert.equal(requested.client.sdk_version, "2.1.0");
    assert.deepEqual(requested.input_modes, ["pcm_stream", "rtc"]);
    browser = new WebSocket(origin.replace("http", "ws") + "/api/provider?channel=" + bootstrap.channel, {headers: {Origin: origin}});
    const received = [];
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Relay timeout")), 10000);
      browser.on("error", reject);
      browser.on("message", raw => {
        const event = JSON.parse(raw); received.push(event);
        if (event.type === "ready") browser.send(JSON.stringify({type: "mic", audio: "AAAAAA==", sampleRate: 16000}));
        if (event.type === "audio") {clearTimeout(timeout); resolve();}
      });
    });
    assert.equal(received.at(-1).sampleRate, 16000);
    browser.close();
    for (let i=0; i<40 && !ended; i++) await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(ended, 1);
    assert.equal((await fetch(origin + '/api/runtime-end', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({channel: bootstrap.channel})})).status, 200);
    assert.equal(ended, 1, 'explicit end after disconnect is idempotent');
  } finally {
    browser?.terminate();
    child.kill();
    for (const ws of upstream.clients) ws.terminate();
    await new Promise(resolve => upstream.close(resolve));
    await new Promise(resolve => api.close(resolve));
    await rm(dir, {recursive: true, force: true}); // owned mkdtemp only
  }
});
