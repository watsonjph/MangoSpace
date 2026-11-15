export function playSoilTone(context: BaseAudioContext, value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0 || value > 1) return;
  const tone = context.createOscillator();
  const volume = context.createGain();
  const now = context.currentTime;
  const wetness = Math.max(0, Math.min(1, (value - 0.1) / 0.35));
  tone.frequency.value = 220 * 2 ** wetness;
  volume.gain.setValueAtTime(0, now);
  volume.gain.linearRampToValueAtTime(0.04, now + 0.02);
  volume.gain.linearRampToValueAtTime(0, now + 0.35);
  tone.connect(volume);
  volume.connect(context.destination);
  tone.start(now);
  tone.stop(now + 0.36);
  return () => {
    tone.disconnect();
    volume.disconnect();
  };
}
