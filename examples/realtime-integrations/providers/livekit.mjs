// Dependency injection keeps this adapter independent of your LiveKit version.
export function bindLiveKit({room, RoomEvent, player, agentIdentity, onError}) {
  if (!agentIdentity || !onError) throw new Error("Supply exact agentIdentity and onError");
  let activeTrack;
  let disposed = false;
  let serial = Promise.resolve();
  const attach = (track, _publication, participant) => {
    if (track.kind !== "audio" || participant.identity !== agentIdentity) return;
    serial = serial.then(async () => {
      if (disposed) return;
      activeTrack = track;
      // Do not also call track.attach(): SDK plays this track exactly once.
      await player.setMediaStreamTrack(track.mediaStreamTrack);
    }).catch(onError);
  };
  const detach = track => { if (track === activeTrack) { activeTrack = null; player.stop(); } };
  room.on(RoomEvent.TrackSubscribed, attach);
  room.on(RoomEvent.TrackUnsubscribed, detach);
  const participant = room.remoteParticipants.get(agentIdentity);
  for (const publication of participant?.trackPublications.values() || []) {
    if (publication.track) attach(publication.track, publication, participant);
  }
  return async () => {
    disposed = true;
    room.off(RoomEvent.TrackSubscribed, attach);
    room.off(RoomEvent.TrackUnsubscribed, detach);
    await serial;
    player.stop(); // does not unpublish/stop the upstream agent track
  };
}
