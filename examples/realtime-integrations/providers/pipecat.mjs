export function bindPipecat({client, RTVIEvent, player, onError}) {
  if (!onError) throw new Error("Supply onError");
  let disposed = false, activeTrack = null, serial = Promise.resolve();
  const sync = () => {
    const track = client.tracks().bot?.audio;
    if (!track || track === activeTrack) return;
    activeTrack = track;
    serial = serial.then(async () => {
      if (!disposed) await player.setMediaStreamTrack(track);
    }).catch(onError);
  };
  const stopped = track => { if (track === activeTrack) { activeTrack = null; player.stop(); } };
  client.on(RTVIEvent.TrackStarted, sync);
  client.on(RTVIEvent.BotReady, sync);
  client.on(RTVIEvent.TrackStopped, stopped);
  sync();
  // Do not also mount PipecatClientAudio or another HTML audio player.
  return async () => {
    disposed = true;
    client.off(RTVIEvent.TrackStarted, sync);
    client.off(RTVIEvent.BotReady, sync);
    client.off(RTVIEvent.TrackStopped, stopped);
    await serial;
    player.stop();
  };
}
