import {createHmac, timingSafeEqual} from 'node:crypto';

export function signSession(value, secret) {
  const body = Buffer.from(JSON.stringify(value)).toString('base64url');
  return body + '.' + createHmac('sha256', secret).update(body).digest('base64url');
}
export function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048) throw new Error('discord_session_invalid');
  const [body, signature, extra] = token.split('.');
  const expected = createHmac('sha256', secret).update(body || '').digest();
  const received = Buffer.from(signature || '', 'base64url');
  if (extra || expected.length !== received.length || !timingSafeEqual(expected, received)) throw new Error('discord_session_invalid');
  const value = JSON.parse(Buffer.from(body, 'base64url'));
  if (!Number.isFinite(value.expires) || value.expires <= now) throw new Error('discord_session_expired');
  return value;
}

// Discord's decoder supplies 48 kHz stereo; reduce to mono 16 kHz without a process per speaker.
export function mono16k(stereo) {
  if (stereo.length % 12) throw new Error('invalid_pcm_frame');
  const output = Buffer.alloc(stereo.length / 6);
  for (let input = 0, index = 0; input < stereo.length; input += 12, index += 2) {
    let sum = 0;
    for (let offset = 0; offset < 12; offset += 2) sum += stereo.readInt16LE(input + offset);
    output.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sum / 6))), index);
  }
  return output;
}
export function pcmPacket(pcm, sequence, timestamp = Date.now()) {
  const packet = Buffer.alloc(12 + pcm.length);
  packet.writeUInt32LE(sequence >>> 0, 0);
  packet.writeDoubleLE(timestamp, 4);
  pcm.copy(packet, 12);
  return packet;
}

export function assertInstance(instance, config, userId, instanceId) {
  if (instance.application_id !== config.application_id || instance.instance_id !== instanceId ||
      instance.location?.guild_id !== config.guild_id || instance.location?.channel_id !== config.channel_id ||
      !instance.users?.includes(userId)) throw new Error('discord_instance_denied');
}
