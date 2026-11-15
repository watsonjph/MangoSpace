export type Voice = { base?: number; wave?: OscillatorType; when?: number; duration?: number; destination?: AudioNode };

export function noteFrequency(height: number | null | undefined, base = 220) {
  if (height == null || !Number.isFinite(height) || height < 0 || height > 1) return null;
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  return base * 2 ** (scale[Math.round(height * (scale.length - 1))] / 12);
}

export function playTone(context: BaseAudioContext, height: number | null | undefined, { base = 220, when = context.currentTime, duration = 0.38, destination = context.destination }: Voice = {}) {
  const frequency = noteFrequency(height, base);
  if (frequency == null) return;
  const envelope = context.createGain(), delay = context.createDelay(0.5), echo = context.createGain();
  envelope.gain.setValueAtTime(0, when);
  envelope.gain.linearRampToValueAtTime(0.12, when + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  delay.delayTime.value = 0.11;
  echo.gain.value = 0.18;
  envelope.connect(destination); envelope.connect(delay); delay.connect(echo); echo.connect(destination);
  const tones = [1, 2, 3].map((harmonic, i) => {
    const tone = context.createOscillator(), partial = context.createGain();
    tone.type = "sine"; tone.frequency.value = frequency * harmonic; partial.gain.value = [0.75, 0.18, 0.07][i];
    tone.connect(partial); partial.connect(envelope); tone.start(when); tone.stop(when + duration + 0.01);
    return { tone, partial };
  });
  return () => {
    tones.forEach(({ tone, partial }) => { try { tone.stop(); } catch {} tone.disconnect(); partial.disconnect(); });
    envelope.disconnect(); delay.disconnect(); echo.disconnect();
  };
}
