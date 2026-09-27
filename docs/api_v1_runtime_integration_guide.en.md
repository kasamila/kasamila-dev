[English](api_v1_runtime_integration_guide.en.md) | [简体中文](api_v1_runtime_integration_guide.md)

# Kasamila Runtime API, Web SDK and MCP/Agent integration

> SDK 2.0.0 released: read the [new Runtime release contract](sdk_2_runtime_release_contract.en.md) before integration. SDK 1 and mutable entry URLs are retired. This guide's fixed version checks apply only to explicitly pinned examples, not to a server-global latest version. Forward the Session response's sdk object from your backend and load it with the bootstrap. HLS is bundled. Production supports this release; use the one-time migration checklist.


Applies to Kasamila API v1 and Web SDK **2.0.0**. Geometry templates are the supported production mode. Audio2Viseme inference and WebGL rendering run in the end user's browser.

The application backend holds a permanent API Key; the browser receives only a short-lived Runtime Token.
See the [geometry/HLS guide](api_v1_geometry_runtime_guide.en.md), [upgrade guide](sdk_1_11_0_third_party_migration.en.md), and [concurrency guide](runtime_concurrency_api_sdk_upgrade_20260923.en.md).
Machine-readable schemas: [OpenAPI](https://www.kasamila.com/openapi.json); interactive reference: [API docs](https://www.kasamila.com/docs).

## 1. Choose the right interface

| Interface | Runs on | Credential | Purpose |
| --- | --- | --- | --- |
| Runtime Session API | Your backend | `ks_live_…` / `ks_test_…` | Authorize one template, Origin and set of input modes |
| Web Runtime SDK | End user's browser | `ks_rt_…` | Audio input, inference and rendering |
| MCP/Agent API | Agent backend / MCP host | Permanent API Key | Discover templates, create sessions and enqueue audio |

Never put permanent Keys in HTML, frontend JavaScript, URLs, mobile packages, model context or logs. MCP is a server-side orchestration interface, not a replacement for the browser SDK.

## 2. Session lifecycle and billing

1. Create an API Key in Portal and configure the exact allowed page Origin.
2. The browser requests a session from your authenticated backend.
3. Your backend calls `POST /api/v1/runtime/sessions`.
4. Return only the short-lived `data.client_token` and your trusted HLS descriptor to the browser.
5. Initialize `Kasamila.create()`.
6. Supply an authorized audio source. The SDK renders and sends accounting heartbeats approximately every 25 seconds.
7. Call `destroy()` when the page/component is finished.

A Token is bound to one template, one Origin, input modes and output mode. Requested leases are 60–900 seconds. If the balance is insufficient, the granted duration may be shortened to the remaining balance, with a one-second minimum.

### Free Portal previews versus API/SDK use

Authenticated previews opened inside Kasamila Portal do not consume inference time. Preview Tokens also require a valid Portal login Cookie for the same Workspace; they cannot be reused on third-party sites or backends.

New accounts receive one shared **free API/SDK hour**, valid for 30 days after registration, and no private-template creation credits. Packs expire independently; the earliest-expiring usable time is consumed first.

Ordinary API/SDK billing starts when the Session is created, using server elapsed time, including listening, speaking, silence and hidden canvases. The lease reserves time up front. SDK `destroy()` sends `end`; alternatively use `POST /api/v1/runtime/sessions/end` with the authorized Runtime context. Early termination returns unused seconds idempotently. Without termination, the full lease is consumed at expiry.

Heartbeats are statistics, not permission to self-report a shorter billed duration. `stop()` stops audio, not the Session or billing.

### Concurrency and request rate

A Workspace starts with 100 simultaneous valid Sessions. Each new API Key defaults to an allocation of 20. Administrators can allocate 0 up to the available Workspace seats. Concurrency is independent of inference-time balance.

Key and Workspace active-session limits are separate gates. Session creation also has a separate limit of 60 attempts per Key per 60 seconds, including failed attempts. Observe `Retry-After`; do not retry indefinitely. See the [full allocation and refund rules](runtime_concurrency_api_sdk_upgrade_20260923.en.md).

## 3. Discover ready templates

Your backend queries with the same permanent Key used to create Sessions:

```http
GET /api/v1/runtime/catalog?visibility=all&orientation=all&limit=50
Authorization: Bearer ks_live_REDACTED
```

| Parameter | Values | Meaning |
| --- | --- | --- |
| `visibility` | `all`, `public`, `private` | Accessible templates, public templates, or this Workspace's private templates |
| `orientation` | `all`, `landscape`, `portrait` | Square/unknown dimensions appear only in `all` |
| `limit` | 1–100; default 50 | Avatars per page |
| `cursor` | 12-digit Avatar ID | Use the previous response's `next_cursor` |

Responses nest templates under avatars:

```json
{
  "data": {
    "filters": {"visibility": "public", "orientation": "portrait"},
    "items": [{
      "avatar_id": "999000000001",
      "name": "Example avatar",
      "visibility": "public",
      "access": "public",
      "portrait_url": "/api/v1/runtime/catalog/media/999000000001?kind=portrait",
      "templates": [{
        "template_code": "001",
        "template_id": "999000000001-001",
        "orientation": "portrait",
        "resolution": {"width": 1080, "height": 1920},
        "available_output_modes": ["original", "transparent"],
        "transparent_behavior": "alpha_composite",
        "build_mode": "geometry",
        "media_delivery": "hls",
        "mouth_profile": "C",
        "mouth_parameters": {
          "teeth_scale": 1, "mask_offset": 0,
          "openness_scale": 1, "width_scale": 1,
          "left_openness_scale": 1, "left_width_scale": 1
        }
      }]
    }],
    "next_cursor": null
  }
}
```

`999000000001` is a fictional placeholder. Use IDs returned by your authorized catalog.
Portrait, full-body, thumbnail and template-image URLs are protected relative API addresses, not anonymous asset links. Fetch them on your backend with the same Key; never expose that Key to the browser. Images use private caching and Workspace/public-template authorization.

`build_mode=geometry` and `media_delivery=hls` require caller-hosted `templateMedia`. Do not infer delivery mode from duration. Retired fine-tuned templates are not runnable.

`transparent_behavior=alpha_composite` identifies a template with approved matte/alpha assets. `original_passthrough` means requesting transparent output will safely return the original video, not transparent pixels.

## 4. Create a Runtime Session

```http
POST /api/v1/runtime/sessions
Authorization: Bearer ks_live_REDACTED
Content-Type: application/json

{
  "avatar_id": "999000000001",
  "template_code": "001",
  "origin": "https://app.example.com",
  "input_modes": ["file", "audio_url", "pcm_stream", "tts_stream"],
  "output_mode": "original",
  "max_duration_seconds": 600
}
```

Input modes may include `file`, `audio_url`, `microphone`, `pcm_stream`, `tts_stream` and `rtc`. Request only those you need. Output mode is `original` or `transparent`; inspect the actual response rather than assuming the requested mode was granted.

Important response fields:

```json
{
  "data": {
    "session_id": "rts_…",
    "client_token": "ks_rt_…",
    "expires_at": "…",
    "build_mode": "geometry",
    "media_delivery": "hls",
    "requested_output_mode": "transparent",
    "output_mode": "original",
    "output_behavior": "original_passthrough",
    "available_output_modes": ["original", "transparent"],
    "mouth_profile": "C",
    "mouth_parameters": {
      "teeth_scale": 1, "mask_offset": 0,
      "openness_scale": 1, "width_scale": 1,
      "left_openness_scale": 1, "left_width_scale": 1
    }
  }
}
```

Portal Key management also supports `POST /api/v1/api-keys/{key_id}/test-tokens` with an authenticated Portal session and CSRF protection. This does not send the permanent Key back to the browser. Production third-party integrations must use their own authenticated backend and the ordinary Session endpoint.

### Backend examples

The following snippets assume an already authorized `sessionRequest` matching the JSON above. Configure timeouts, check non-2xx responses and redact upstream failures.

Node.js 20+:

```javascript
const response = await fetch('https://www.kasamila.com/api/v1/runtime/sessions', {
  method: 'POST',
  signal: AbortSignal.timeout(15000),
  headers: {
    Authorization: `Bearer ${process.env.KASAMILA_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(sessionRequest)
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.error?.code || 'runtime_failed');
const data = payload.data;
// Return the descriptor matching the ACTUAL output mode from your trusted store.
return {
  sessionToken: data.client_token,
  expiresAt: data.expires_at,
  mediaDelivery: data.media_delivery,
  templateMedia: await trustedMediaStore.get(
    `${sessionRequest.avatar_id}-${sessionRequest.template_code}`, data.output_mode)
};
```

Python 3 with `requests`:

```python
import os
import requests
response = requests.post(
    "https://www.kasamila.com/api/v1/runtime/sessions",
    headers={"Authorization": f"Bearer {os.environ['KASAMILA_API_KEY']}"},
    json=session_request, timeout=15,
)
response.raise_for_status()
runtime = response.json()["data"]
```

Java 11+:

```java
var request = HttpRequest.newBuilder()
    .uri(URI.create("https://www.kasamila.com/api/v1/runtime/sessions"))
    .timeout(java.time.Duration.ofSeconds(15))
    .header("Authorization", "Bearer " + System.getenv("KASAMILA_API_KEY"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(sessionRequestJson)).build();
var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
if (response.statusCode() >= 300) throw new RuntimeException("Runtime request failed");
```

Go:

```go
req, err := http.NewRequest("POST", endpoint, bytes.NewReader(sessionRequestJSON))
if err != nil { return err }
req.Header.Set("Authorization", "Bearer "+os.Getenv("KASAMILA_API_KEY"))
req.Header.Set("Content-Type", "application/json")
client := &http.Client{Timeout: 15 * time.Second}
resp, err := client.Do(req)
if err != nil { return err }
defer resp.Body.Close()
if resp.StatusCode >= 300 { return fmt.Errorf("Kasamila HTTP %d", resp.StatusCode) }
```

PHP 8:

```php
$ch = curl_init('https://www.kasamila.com/api/v1/runtime/sessions');
curl_setopt_array($ch, [
  CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . getenv('KASAMILA_API_KEY'),
    'Content-Type: application/json'
  ],
  CURLOPT_POSTFIELDS => json_encode($sessionRequest), CURLOPT_TIMEOUT => 15
]);
$body = curl_exec($ch);
if ($body === false || curl_getinfo($ch, CURLINFO_RESPONSE_CODE) >= 300) {
  throw new RuntimeException('Runtime request failed');
}
$runtime = json_decode($body, true)['data'];
```

C# / .NET 6+:

```csharp
using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
http.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("KASAMILA_API_KEY"));
var response = await http.PostAsync(endpoint,
    new StringContent(sessionRequestJson, Encoding.UTF8, "application/json"));
response.EnsureSuccessStatusCode();
var body = await response.Content.ReadAsStringAsync();
```

cURL:

```bash
curl --fail-with-body --max-time 15 \
  'https://www.kasamila.com/api/v1/runtime/sessions' \
  -H "Authorization: Bearer ${KASAMILA_API_KEY}" \
  -H 'Content-Type: application/json' --data @runtime-session.json
```

## 5. Initialize the browser SDK

```html
<div id="avatar" style="width:540px;height:960px"></div>
<script type="module">
  import { loadKasamila } from "https://www.kasamila.com/sdk/bootstrap/1/loader.mjs";
  const response = await fetch("/api/runtime-token", {
    method: "POST", credentials: "same-origin"
  });
  const bootstrap = await response.json();
  if (!response.ok) throw new Error("Runtime bootstrap failed");
  const Kasamila = await loadKasamila(bootstrap.sdk, "https://www.kasamila.com");
  const player = await Kasamila.create({
    element: document.querySelector("#avatar"),
    sessionToken: bootstrap.sessionToken,
    templateMedia: bootstrap.templateMedia
  });
  window.addEventListener("pagehide", () => player.destroy(), { once: true });
</script>
```

`/api/runtime-token` is your own protected backend endpoint, not a Kasamila API path. `trustedMediaStore` in backend examples is application code, not an SDK utility. If descriptor lookup or initialization fails after Session creation, terminate that Session rather than abandoning a billable lease.

Start audio and request microphone permission from a trusted user gesture. Use HTTPS, except supported localhost development. Embedded microphone access also needs `allow="microphone"` and appropriate Permissions-Policy.

### Mouth configuration

Portal can compare C/G/H/I and adjust:

| Field | Range |
| --- | --- |
| `teeth_scale` | 0.00–1.50 |
| `mask_offset` | -0.20–0.50 |
| `openness_scale`, `width_scale`, `left_openness_scale`, `left_width_scale` | 0.50–2.00 |

Saving to the template affects subsequent Sessions, Catalog and Manifest. The SDK applies the saved configuration after initialization, retaining geometric safety limits. An already initialized player is not silently reset by a server change.

`setProfile()` and `setMouthParameters()` modify only that player. Template `mouth_parameters` PATCH merges supplied fields; omitted fields remain unchanged. Unknown fields, out-of-range values and explicit `null` return `422 validation_error`. Refer to OpenAPI for the authorized template-management endpoints.

### Audio adapters

```javascript
await player.setAudioFile(file);
await player.setAudioUrl(corsEnabledTemporaryUrl);
await player.setMicrophone();
await player.setMediaStreamTrack(remoteRtcAudioTrack);
await player.setPcmStream(readable, { sampleRate: 16000 });
await player.setPcmStream(ttsReadable, { mode: 'tts_stream', sampleRate: 16000 });
await player.connectAudioNode(node, audioContext, { mode: 'tts_stream' });
player.setPhonemeTimeline(optionalCues);
player.stop();                 // Stops audio, not billing.
await player.destroy();       // Ends the Runtime lifecycle.
```

Use decodable audio or mono Int16/Float32 PCM for production TTS; supply its real sample rate. Optional timed phoneme cues can augment audio-driven inference. Web Speech `speechSynthesis` cannot export PCM through a standard browser API. `speakWithBrowserTts()` uses boundary/estimated timing and is a demo, not a production lip-sync quality benchmark.

## 6. Browser capabilities

| Platform | Acceptance checks |
| --- | --- |
| Windows Chrome/Edge | WebGL, audio unlock, microphone/RTC and HLS buffering |
| macOS Chrome/Safari | Audio gesture; native HLS where available; packed-matte output |
| iOS browsers | Feature-detect the installed browser engine; verify audio unlock and background resume on actual devices |
| Android Chrome | Device-dependent voices, frame rate, long-run memory and RTC |

Feature-detect secure context, WebGL, AudioContext, AudioWorklet, mediaDevices and optional speechSynthesis. Do not use a User-Agent string as the sole compatibility decision.
For geometry transparent output, provide matching packed-matte HLS; never assume an ordinary color HLS stream carries alpha.

## 7. MCP / Agent API

`POST https://www.kasamila.com/api/v1/mcp/rpc` uses permanent server-side API Key authorization, JSON-RPC 2.0 and MCP Streamable HTTP without SSE.

Tools: `list_avatars`, `list_avatar_templates`, `create_runtime_session`, `get_runtime_session_status`, `enqueue_audio_source`, `stop_runtime_session`.

```json
{"jsonrpc":"2.0","id":"init-1","method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"your-agent","version":"1.0.0"}}}
```

```json
{
  "jsonrpc": "2.0", "id": "session-1", "method": "tools/call",
  "params": {
    "name": "create_runtime_session",
    "arguments": {
      "avatar_id": "999000000001", "template_code": "001",
      "origin": "https://app.example.com",
      "input_modes": ["audio_url"], "output_mode": "original",
      "max_duration_seconds": 600
    }
  }
}
```

Transfer the client Token securely to the authorized page. The initialized SDK polls persisted commands. Audio delivery needs `audio_url` authorization and a browser-readable HTTPS URL with CORS for the page Origin. Prefer short-lived, read-only single-object URLs.

MCP does not generate text, call an LLM or perform TTS; it orchestrates caller-provided audio. Automatic command playback acknowledges `acknowledged` after successful submission to the player, or `failed` on failure; acknowledgment is not proof that the entire audio finished playing.

With `autoPlayAgentCommands: false`, the `kasamila-audio-source` event delivers commands without automatic acknowledgment. After handling the command:

```javascript
await player.ackAgentCommand(command.command_id);
// On failure:
await player.ackAgentCommand(command.command_id, {
  status: 'failed', error_code: 'audio_playback_failed'
});
```

Agent discovery returns active, accessible avatars with runnable ready geometry templates and the same mouth/output configuration as Runtime. Do not maintain a separate Agent calibration table.

## 8. Troubleshooting and release checklist

| Symptom | Check |
| --- | --- |
| File does not play | `file` permission, user gesture, decodable format |
| Microphone fails | HTTPS, browser/OS permission, available device, exclusive use |
| `NotAllowedError` / `NotFoundError` / `NotReadableError` | Permission/security, missing input, device/OS access respectively |
| Browser TTS voices empty | Wait for `voiceschanged`; check installed language packs |
| `runtime_origin_mismatch` | Exact page Origin must match the Token |
| Transparent request returns original | Inspect `output_behavior=original_passthrough` |
| Geometry initialization requires media | Supply matching HLS `templateMedia`; Portal provider preview is not the third-party production path |
| Periodic stalls or speed changes | Blob Worker CSP, geometry Range `206`, HLS prefetch; remove manual internal-video clock corrections |
| Lip motion but no teeth | SDK version, texture HTTP 200, `teeth_scale > 0`, no legacy mouth overlays |

Before release: protect/rotate Keys, authorize your token exchange, minimize Origin/input permissions, configure CSP/CORS, and verify original plus transparent output. Test short and long templates through initial playback, seek, loop, network loss, signed-URL expiry, Token expiry and long-run memory on real devices. Use actual TTS audio/PCM, not browser-TTS approximation. End Sessions on component teardown; changing SPA routes must not leak canvases, Workers, audio nodes or billing heartbeats.
