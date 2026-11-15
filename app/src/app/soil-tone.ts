export type Voice = { base?: number; wave?: OscillatorType };

// at: the height of the note, 0 to 1. The pitch goes up one octave from the base.
export function playTone(context: BaseAudioContext, at: number | null | undefined, { base = 220, wave = "sine" }: Voice = {}) {
  if (at == null || !Number.isFinite(at) || at < 0 || at > 1) return;
  const tone = context.createOscillator();
  const volume = context.createGain();
  const now = context.currentTime;
  tone.type = wave;
  tone.frequency.value = base * 2 ** at;
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
