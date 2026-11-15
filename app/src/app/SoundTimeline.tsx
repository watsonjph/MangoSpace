"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Playback } from "./Timeline";
import { STEP_MS } from "./Timeline";
import { playTone } from "./season-instrument";

export type SoundFrame = { low: number | null; high?: number | null; rain?: number };

export default function SoundTimeline({ frames, index, play, stepMs = STEP_MS, description }: {
  frames: SoundFrame[]; index: number; play: Playback; stepMs?: number; description: string;
}) {
  const audio = useRef<AudioContext | null>(null), master = useRef<GainNode | null>(null);
  const notes = useRef<{ stop: () => void; end: number }[]>([]);
  const beat = useRef<{ index: number; at: number } | null>(null);
  const live = useRef({ frames, speed: play.speed, stepMs });
  useEffect(() => { live.current = { frames, speed: play.speed, stepMs }; });
  const [enabled, setEnabled] = useState(true), [starting, setStarting] = useState(false), [volume, setVolume] = useState(35), [audioReady, setAudioReady] = useState(false), [error, setError] = useState("");
  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null; }, []);

  const ensureAudio = useCallback(async () => {
    if (audio.current) return master.current !== null;
    try {
      const context = new AudioContext(); audio.current = context;
      await context.resume();
      if (audio.current !== context) return false;
      if (context.state !== "running") throw new Error("Audio unavailable");
      const gain = context.createGain(); gain.gain.value = volume / 100; gain.connect(context.destination); master.current = gain;
      setAudioReady(true);
      return true;
    } catch {
      void audio.current?.close().catch(() => {}); audio.current = null; master.current = null; setAudioReady(false);
      setEnabled(false);
      setError("Sound could not start in this browser. The slider still works.");
      return false;
    }
  }, [volume]);

  useEffect(() => {
    if (enabled && play.playing && !audio.current) void ensureAudio();
  }, [enabled, ensureAudio, play.playing]);

  // Each step the timeline shows plays its own note, so a jump, a slow image or a loop cannot put the sound on another step.
  // A step that follows the last one on time keeps the beat on the audio clock, so the rhythm does not take the timer's jitter.
  useEffect(() => {
    const context = audio.current, output = master.current;
    if (!enabled || !play.playing || !context || !output) return;
    const { frames, speed, stepMs } = live.current;
    const interval = stepMs / speed / 1000, now = context.currentTime, last = beat.current;
    const next = last && (index === last.index + 1 || (index === 0 && last.index === frames.length - 1)) ? last.at + interval : null;
    const when = next != null && Math.abs(next - now) < interval / 2 ? Math.max(next, now + 0.005) : now + 0.02;
    beat.current = { index, at: when };
    notes.current = notes.current.filter((note) => note.end > now);
    const frame = frames[index];
    if (!frame) return;
    const add = (height: number | null | undefined, base: number, duration: number, at = when) => {
      const stop = playTone(context, height, { base, duration, when: at, destination: output });
      if (stop) notes.current.push({ stop, end: at + duration + 0.15 });
    };
    add(frame.low, 110, Math.min(0.65, interval * 1.4));
    add(frame.high, 220, Math.min(0.3, interval * 0.75));
    const rainNotes = Math.min(4, Math.ceil((frame.rain ?? 0) / 50));
    for (let i = 0; i < rainNotes; i++) add(0.5, 880, 0.06, when + i * interval / 5);
  }, [audioReady, enabled, play.playing, index]);

  useEffect(() => {
    if (enabled && play.playing) return;
    beat.current = null;
    notes.current.forEach((note) => note.stop());
    notes.current = [];
  }, [enabled, play.playing]);

  async function toggle() {
    if (enabled) {
      const context = audio.current; audio.current = null; master.current = null; setAudioReady(false); setEnabled(false); void context?.close().catch(() => {}); return;
    }
    setStarting(true); setError("");
    try {
      if (await ensureAudio()) { setEnabled(true); play.start(); }
    } catch { setError("Sound could not start in this browser. The slider still works."); }
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
