// Provider wire contracts reviewed against official documentation on 2026-10-02.
// This file runs on the SERVER. Never return signed provider URLs or keys to clients.
import WebSocket from 'ws';
import {randomUUID} from 'node:crypto';

export const voicePlatforms = ['grok', 'elevenlabs', 'vapi', 'deepgram', 'hume', 'dify'];
export const required = {
  grok: ['XAI_API_KEY'], elevenlabs: ['ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID'],
  vapi: ['VAPI_API_KEY', 'VAPI_ASSISTANT_ID'], deepgram: ['DEEPGRAM_API_KEY'],
  hume: ['HUME_API_KEY', 'HUME_SECRET_KEY', 'HUME_CONFIG_ID'], dify: ['DIFY_API_KEY'],
};
export const inputRates = {grok: 24000, elevenlabs: 16000, vapi: 16000, deepgram: 16000, hume: 16000, dify: 16000};

export function pcmBytes(audio) {
  if (typeof audio !== 'string' || !audio.length || audio.length > 256 * 1024 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(audio) || audio.length % 4) throw new Error('Invalid PCM base64');
  const bytes = Buffer.from(audio, 'base64');
  if (bytes.length % 2 || bytes.toString('base64') !== audio) throw new Error('Incomplete PCM16 samples');
  return bytes;
}
export function pcmWav(bytes, rate = 16000) {
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(bytes.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36);
  header.writeUInt32LE(bytes.length, 40); return Buffer.concat([header, bytes]);
}
export function wavPcm(bytes) {
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error('Expected WAV, not raw PCM or compressed audio');
  let format, data;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > bytes.length) throw new Error('Truncated WAV');
    const name = bytes.toString('ascii', offset, offset + 4);
    if (name === 'fmt ') {
      if (size < 16) throw new Error('Invalid WAV format');
      format = {codec: bytes.readUInt16LE(start), channels: bytes.readUInt16LE(start + 2),
        rate: bytes.readUInt32LE(start + 4), bits: bytes.readUInt16LE(start + 14)};
    }
    if (name === 'data') data = bytes.subarray(start, start + size);
    offset = start + size + size % 2;
  }
  if (!format || !data || format.codec !== 1 || format.channels !== 1 || format.bits !== 16 ||
      format.rate < 8000 || format.rate > 48000 || data.length % 2) throw new Error('Require mono PCM16 WAV, 8-48 kHz');
  return {bytes: data, rate: format.rate};
}
export function grokSettings(env = {}) {
  return {type: 'session.update', session: {voice: env.XAI_VOICE || 'eve',
    instructions: env.AGENT_INSTRUCTIONS || 'You are a helpful assistant.', turn_detection: {type: 'server_vad'},
    audio: {input: {format: {type: 'audio/pcm', rate: 24000}}, output: {format: {type: 'audio/pcm', rate: 24000}}}}};
}
export function deepgramSettings(env = {}) {
  return {type: 'Settings', audio: {input: {encoding: 'linear16', sample_rate: 16000},
    output: {encoding: 'linear16', sample_rate: 24000, container: 'none'}}, agent: {
    language: env.AGENT_LANGUAGE || 'en', listen: {provider: {type: 'deepgram', model: env.DEEPGRAM_STT_MODEL || 'nova-3'}},
    think: {provider: {type: 'open_ai', model: env.DEEPGRAM_LLM_MODEL || 'gpt-4o-mini'},
      prompt: env.AGENT_INSTRUCTIONS || 'You are a helpful assistant.'},
    speak: {provider: {type: 'deepgram', model: env.DEEPGRAM_TTS_MODEL || 'aura-2-thalia-en'}}}};
}
function rateFromFormat(value) {
  const match = /^pcm_(\d+)$/.exec(value || '');
  const rate = Number(match?.[1]);
  if (!match || rate < 8000 || rate > 48000) throw new Error('Configure ElevenLabs agent input/output as PCM, not MP3 or ulaw');
  return rate;
}
// Chunk large WAV replies before the shared sink. No second audio player.
function audioEvents(bytes, rate, emit) {
  if (bytes.length % 2 || bytes.length > rate * 2 * 30) throw new Error('Invalid or oversized provider audio');
  const chunkSize = Math.floor(rate / 50) * 2;
  for (let n = 0; n < bytes.length; n += chunkSize)
    emit({type: 'audio', audio: bytes.subarray(n, n + chunkSize).toString('base64'), sampleRate: rate});
}
function endpoint(value, fallback) {
  const url = new URL(value || fallback);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))
    throw new Error('Use HTTPS for server-configured API endpoint');
  return url.href.replace(/\/$/, '');
}
async function checkedJson(fetcher, url, init) {
  const response = await fetcher(url, {...init, signal: AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('Provider HTTP request rejected');
  return response.json();
}
async function endVapiCall(call, env, fetcher) {
  if (!call?.monitor?.controlUrl) return;
  try {
    const control = new URL(call.monitor.controlUrl);
    if (control.protocol !== 'https:' || !(control.hostname === 'api.vapi.ai' || control.hostname.endsWith('.vapi.ai')))
      throw new Error('Unexpected control URL');
    const response = await fetcher(control, {method: 'POST', headers: {Authorization: 'Bearer ' + env.VAPI_API_KEY,
      'Content-Type': 'application/json'}, body: JSON.stringify({type: 'end-call'}), signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('End rejected');
  } catch {console.error('Vapi call end not confirmed; inspect authorized provider call dashboard (details redacted)');}
}

export async function openVoicePlatform({provider, env, emit, onClose,
  connect = (url, options) => new WebSocket(url, options), fetcher = fetch}) {
  if (provider === 'dify') return openDify({env, emit, fetcher});
  let url, headers = {}, call;
  if (provider === 'grok') {
    url = 'wss://api.x.ai/v1/realtime?model=' + encodeURIComponent(env.XAI_VOICE_MODEL || 'grok-voice-latest');
    headers.Authorization = 'Bearer ' + env.XAI_API_KEY;
  } else if (provider === 'elevenlabs') {
    const signed = await checkedJson(fetcher, 'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=' +
      encodeURIComponent(env.ELEVENLABS_AGENT_ID), {headers: {'xi-api-key': env.ELEVENLABS_API_KEY}});
    url = signed.signed_url;
    if (new URL(url).origin !== 'wss://api.elevenlabs.io') throw new Error('Unexpected signed URL origin');
  } else if (provider === 'vapi') {
    call = await checkedJson(fetcher, 'https://api.vapi.ai/call', {method: 'POST',
      headers: {Authorization: 'Bearer ' + env.VAPI_API_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({assistantId: env.VAPI_ASSISTANT_ID, transport: {provider: 'vapi.websocket',
        audioFormat: {format: 'pcm_s16le', container: 'raw', sampleRate: Number(env.VAPI_SAMPLE_RATE || 16000)}}})});
    url = call.transport?.websocketCallUrl;
    try {if (new URL(url).origin !== 'wss://api.vapi.ai') throw new Error('Unexpected Vapi transport origin');}
    catch {await endVapiCall(call, env, fetcher); throw new Error('Invalid Vapi transport; call termination requested');}
  } else if (provider === 'deepgram') {
    url = 'wss://agent.deepgram.com/v1/agent/converse'; headers.Authorization = 'Token ' + env.DEEPGRAM_API_KEY;
  } else if (provider === 'hume') {
    const access = await checkedJson(fetcher, 'https://api.hume.ai/oauth2-cc/token', {method: 'POST',
      headers: {Authorization: 'Basic ' + Buffer.from(env.HUME_API_KEY + ':' + env.HUME_SECRET_KEY).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'}, body: 'grant_type=client_credentials'});
    url = 'wss://api.hume.ai/v0/evi/chat?config_id=' + encodeURIComponent(env.HUME_CONFIG_ID) +
      '&access_token=' + encodeURIComponent(access.access_token);
  } else throw new Error('Unknown voice platform');
  let ws;
  try {ws = connect(url, {headers, maxPayload: 4 * 1024 * 1024, handshakeTimeout: 15000});}
  catch {await endVapiCall(call, env, fetcher); throw new Error('Provider transport construction failed');}
  let closed = false, ready = false, rate = inputRates[provider], outputRate = rate;
  if (provider === 'vapi') rate = Number(env.VAPI_SAMPLE_RATE || 16000);
  let blockedResponse = null, activeResponse = null;
  const send = value => {if (!closed && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value));};
  const readyEvent = () => {ready = true; emit({type: 'ready', inputRate: rate});};
  const fail = () => {void close(); onClose();};
  async function close() {
    if (closed) return;
    closed = true; clearInterval(keepAlive);
    await endVapiCall(call, env, fetcher);
    // Closing transport terminates the provider conversation, never only mute it.
    ws.close();
  }
  const keepAlive = setInterval(() => {if (ready && provider === 'deepgram') send({type: 'KeepAlive'});}, 8000);
  keepAlive.unref?.();
  ws.on('open', () => {
    if (closed) return ws.close();
    if (provider === 'grok') send(grokSettings(env));
    if (provider === 'elevenlabs') send({type: 'conversation_initiation_client_data'});
    if (provider === 'deepgram') send(deepgramSettings(env));
    if (provider === 'hume') {send({type: 'session_settings', audio: {format: 'linear16', sample_rate: rate, channels: 1}}); readyEvent();}
    if (provider === 'vapi') readyEvent();
  });
  ws.on('message', (bytes, binary) => {
    if (closed) return;
    try {
      if (binary) {
        if (!ready || !['vapi', 'deepgram'].includes(provider)) throw new Error('Unexpected binary frame');
        return audioEvents(Buffer.from(bytes), provider === 'deepgram' ? 24000 : rate, emit);
      }
      const e = JSON.parse(bytes.toString());
      if (e.type === 'error' || e.type === 'Error') throw new Error('Provider error');
      if (provider === 'grok') {
        if (e.type === 'session.updated') readyEvent();
        if (e.type === 'response.created') {activeResponse = e.response?.id; blockedResponse = null;}
        if (['response.output_audio.delta', 'response.audio.delta'].includes(e.type) &&
            !(blockedResponse && (e.response_id || activeResponse) === blockedResponse))
          audioEvents(pcmBytes(e.delta), 24000, emit);
        if (e.type === 'input_audio_buffer.speech_started') {blockedResponse = activeResponse; emit({type: 'interrupt'});}
      }
      if (provider === 'elevenlabs') {
        if (e.type === 'conversation_initiation_metadata') {
          rate = rateFromFormat(e.conversation_initiation_metadata_event.user_input_audio_format);
          outputRate = rateFromFormat(e.conversation_initiation_metadata_event.agent_output_audio_format); readyEvent();
        }
        if (e.type === 'ping') send({type: 'pong', event_id: e.ping_event.event_id});
        if (e.type === 'interruption') emit({type: 'interrupt'});
        if (e.type === 'audio') {if (!ready) throw new Error('Audio before metadata');
          audioEvents(pcmBytes(e.audio_event.audio_base_64), outputRate, emit);}
      }
      if (provider === 'deepgram') {
        if (e.type === 'SettingsApplied') readyEvent();
        if (e.type === 'UserStartedSpeaking') emit({type: 'interrupt'});
      }
      if (provider === 'hume') {
        if (['user_interruption', 'user_message'].includes(e.type)) emit({type: 'interrupt'});
        if (e.type === 'audio_output') {
          const bytes = Buffer.from(e.data, 'base64');
          const decoded = wavPcm(bytes);
          if (decoded.bytes.length > decoded.rate * 2 * 30) throw new Error('Hume reply exceeds 30 seconds');
          emit({type: 'encoded_audio', audio: e.data}); // complete WAV goes through bounded FIFO, never raw-header playback
        }
      }
      if (provider === 'vapi' && ['user-interrupted', 'speech-update'].includes(e.type) &&
          (e.type === 'user-interrupted' || (e.role === 'user' && e.status === 'started'))) emit({type: 'interrupt'});
    } catch {fail();}
  });
  ws.on('error', fail); ws.on('close', () => {if (!closed) fail();});
  return {sendMic(e) {
    if (!ready || closed) return;
    if (e.sampleRate !== rate || ws.bufferedAmount > 256 * 1024) return fail();
    const bytes = pcmBytes(e.audio);
    if (['vapi', 'deepgram'].includes(provider)) ws.send(bytes);
    if (provider === 'grok') send({type: 'input_audio_buffer.append', audio: e.audio});
    if (provider === 'elevenlabs') send({user_audio_chunk: e.audio});
    if (provider === 'hume') send({type: 'audio_input', data: e.audio});
  }, interrupt() {
    if (provider === 'grok') {blockedResponse = activeResponse; send({type: 'response.cancel'});}
    // Other agents cancel on actual user speech. Do NOT invent a provider cancel event.
    emit({type: 'interrupt'});
  }, close};
}

export function openDify({env, emit, fetcher = fetch}) {
  const base = endpoint(env.DIFY_API_BASE, 'https://api.dify.ai/v1');
  const headers = {Authorization: 'Bearer ' + env.DIFY_API_KEY};
  let chunks = [], length = 0, epoch = 0, request, busy = false, closed = false, conversation = '';
  const user = 'kasamila-demo-' + randomUUID(); // one conversation per Runtime, no shared user ID
  const interrupt = () => {epoch++; request?.abort(); chunks = []; length = 0; emit({type: 'interrupt'});};
  return {sendMic(e) {
    if (closed || busy) return;
    if (e.sampleRate !== 16000) throw new Error('Dify recording requires 16k PCM');
    const part = pcmBytes(e.audio);
    length += part.length;
    if (length > 16000 * 2 * 15) {interrupt(); throw new Error('Dify utterance exceeds 15 seconds');}
    chunks.push(part);
  }, async commit(text) {
    if (closed || busy) return;
    const generation = epoch; busy = true; request = new AbortController();
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
    try {
      let query = text;
      if (!query) {
        if (!length) return;
        const form = new FormData(); form.append('file', new Blob([pcmWav(Buffer.concat(chunks))], {type: 'audio/wav'}), 'utterance.wav');
        form.append('user', user); chunks = []; length = 0;
        const r = await fetcher(base + '/audio-to-text', {method: 'POST', headers, body: form, signal});
        if (!r.ok) throw new Error('Enable Dify speech-to-text for this app'); query = (await r.json()).text;
      }
      const answer = await fetcher(base + '/chat-messages', {method: 'POST', signal,
        headers: {...headers, 'Content-Type': 'application/json'}, body: JSON.stringify({inputs: {}, query,
          response_mode: 'streaming', conversation_id: conversation, user})});
      if (!answer.ok) throw new Error('Dify chat request rejected');
      let buffer = '', full = '', messageId, count = 0;
      const decoder = new TextDecoder();
      for await (const bytes of answer.body) {
        count += bytes.length; if (count > 1024 * 1024) throw new Error('Dify response too large');
        buffer += decoder.decode(bytes, {stream: true}).replace(/\r/g, '');
        let i;
        while ((i = buffer.indexOf('\n\n')) >= 0) {
          const event = buffer.slice(0, i); buffer = buffer.slice(i + 2);
          const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
          if (!data || data === '[DONE]') continue;
          const e = JSON.parse(data);
          if (e.event === 'error') throw new Error('Dify stream error');
          if (e.event === 'message' || e.event === 'agent_message') full += e.answer || '';
          if (e.conversation_id) conversation = e.conversation_id;
          if (e.message_id) messageId = e.message_id;
        }
      }
      if (generation !== epoch || !full) return;
      emit({type: 'transcript', text: full.slice(0, 4000)});
      const voice = await fetcher(base + '/text-to-audio', {method: 'POST', signal,
        headers: {...headers, 'Content-Type': 'application/json'}, body: JSON.stringify({message_id: messageId,
          text: full, user})});
      if (!voice.ok) throw new Error('Enable Dify text-to-speech for this app');
      let parts = [], size = 0;
      for await (const bytes of voice.body) {size += bytes.length;
        if (size > 4 * 1024 * 1024) throw new Error('Dify speech too large'); parts.push(bytes);}
      if (generation === epoch) emit({type: 'encoded_audio', audio: Buffer.concat(parts).toString('base64')});
    } finally {busy = false;}
  }, interrupt, close() {closed = true; interrupt();}};
}
