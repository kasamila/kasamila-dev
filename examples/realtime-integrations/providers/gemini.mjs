export function geminiOutput(event) {
  const content = event.serverContent;
  if (!content) return [];
  if (content.interrupted) return [{type: "interrupt"}]; // never replay stale parts
  const output = [];
  for (const part of content.modelTurn?.parts || []) {
    const blob = part.inlineData;
    if (!blob?.mimeType?.startsWith("audio/pcm")) continue;
    const rate = Number(/(?:^|;)rate=(\d+)/.exec(blob.mimeType)?.[1] || 24000);
    output.push({type: "audio", audio: blob.data, sampleRate: rate});
  }
  return output;
}
