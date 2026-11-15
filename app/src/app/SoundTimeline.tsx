"use client";

import { useEffect, useRef, useState } from "react";
import type { Playback } from "./Timeline";
import { STEP_MS } from "./Timeline";
import { playTone } from "./season-instrument";

export type SoundFrame = { low: number | null; high?: number | null; rain?: number };

export default function SoundTimeline({ frames, index, play, stepMs = STEP_MS, description }: {
  frames: SoundFrame[]; index: number; play: Playback; stepMs?: number; description: string;
}) {
  const audio = useRef<AudioContext | null>(null), master = useRef<GainNode | null>(null);
  const current = useRef(index);
  useEffect(() => { current.current = index; }, [index]);
  const [enabled, setEnabled] = useState(false), [starting, setStarting] = useState(false), [volume, setVolume] = useState(35), [error, setError] = useState("");
  const key = JSON.stringify(frames);
  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null; }, []);
  useEffect(() => {
    const context = audio.current, output = master.current;
    if (!enabled || !play.playing || !context || !output) return;
    const sequence: SoundFrame[] = JSON.parse(key);
    const stops: { stop: () => void; end: number }[] = [];
    const interval = stepMs / play.speed / 1000;
    let cursor = current.current, next = context.currentTime + 0.025;
    const schedule = () => {
      for (let i = stops.length - 1; i >= 0; i--) if (stops[i].end < context.currentTime) {
        stops[i].stop(); stops.splice(i, 1);
      }
      while (next < context.currentTime + 0.15 && cursor < sequence.length) {
        const frame = sequence[cursor];
        const add = (height: number | null | undefined, base: number, duration: number, when = next) => {
          const stop = playTone(context, height, { base, duration, when, destination: output });
          if (stop) stops.push({ stop, end: when + duration + 0.15 });
        };
        add(frame.low, 110, Math.min(0.65, interval * 1.4));
        add(frame.high, 220, Math.min(0.3, interval * 0.75));
        const rainNotes = Math.min(4, Math.ceil((frame.rain ?? 0) / 50));
        for (let i = 0; i < rainNotes; i++) add(0.5, 880, 0.06, next + i * interval / 5);
        next += interval; cursor++;
        if (cursor === sequence.length && play.loop) cursor = 0;
      }
    };
    // The timer only fills the look-ahead queue; oscillator times use the audio clock.
    schedule();
    const timer = window.setInterval(schedule, 40);
    return () => { window.clearInterval(timer); stops.forEach(({ stop }) => stop()); };
  }, [enabled, play.playing, play.speed, play.loop, key, stepMs]);

  async function toggle() {
    if (audio.current) { const context = audio.current; audio.current = null; master.current = null; setEnabled(false); void context.close().catch(() => {}); return; }
    setStarting(true); setError("");
    try {
      const context = new AudioContext(); audio.current = context;
      await context.resume();
      if (audio.current !== context) return;
      if (context.state !== "running") throw new Error("Audio unavailable");
      const gain = context.createGain(); gain.gain.value = volume / 100; gain.connect(context.destination); master.current = gain;
      setEnabled(true); play.start();
    } catch { void audio.current?.close().catch(() => {}); audio.current = null; setError("Sound could not start in this browser. The slider still works."); }
    finally { setStarting(false); }
  }
  return <div className="timeline-sound">
    <button type="button" aria-pressed={enabled} disabled={starting} onClick={toggle}>Hear the season</button>
    <label>Volume <input aria-label="Sound volume" type="range" min="0" max="100" value={volume} onChange={event => {
      const value = Number(event.target.value); setVolume(value); if (master.current) master.current.gain.value = value / 100;
    }} /></label>
    <p>Sound {enabled ? "on" : "off"}. {description} Missing readings are silent.</p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
