"use client";

import { type ReactNode, useEffect, useState } from "react";

export const STEP_MS = 450;
const SPEEDS = [1, 2, 0.5] as const;

export type Playback = ReturnType<typeof usePlayback>;

export function usePlayback(count: number, index: number, setIndex: (index: number) => void, stepMs = STEP_MS) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [loop, setLoop] = useState(false);
  const last = count - 1;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index < last) setIndex(index + 1);
      else if (loop) setIndex(0);
      else setPlaying(false);
    }, stepMs / speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, loop, speed, stepMs, setIndex]);

  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  const toggle = () => {
    if (!playing && index === last) setIndex(0);
    setPlaying(!playing);
  };

  return {
    playing, speed, loop, toggle,
    start: () => { setIndex(0); setPlaying(true); },
    nextSpeed: () => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]),
    toggleLoop: () => setLoop(!loop),
  };
}

// at: height on the staff, 0 (bottom) to 1 (top). weak: a value from less data than the others.
export type Note = { at: number; weak?: boolean } | null;

export default function Timeline({ id, name, count, index, onIndex, label, play, notes, ticks, className, children }: {
  id: string;
  name: string;
  count: number;
  index: number;
  onIndex: (index: number) => void;
  label: string;
  play: Playback;
  notes?: Note[];
  ticks?: { index: number; label: string }[];
  className?: string;
  children?: ReactNode;
}) {
  const last = Math.max(count - 1, 1);
  // The same inset as half of the range thumb, so a note sits under the thumb of its step.
  const left = (i: number) => `calc(5px + (100% - 10px) * ${i / last})`;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // On a button, a list or a slider, the space key already has a job.
      if (event.code !== "Space" || (event.target as Element).closest("button, input, select, textarea, a")) return;
      event.preventDefault();
      play.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <form className={`timeline ${className ?? ""}`.trim()} onSubmit={(event) => event.preventDefault()}>
      <button type="button" className="play" aria-pressed={play.playing} onClick={play.toggle}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          {play.playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M5 3l8 5-8 5z" />}
        </svg>
        <span className="sr">{play.playing ? "Pause" : "Play"}</span>
      </button>
      <div className="track">
        <div className="staff" aria-hidden="true">
          {notes?.map((note, i) => note && (
            <i key={i} className={[i === index ? "now" : "", note.weak ? "weak" : ""].join(" ").trim() || undefined}
              style={{ left: left(i), bottom: `${note.at * 100}%` }} />
          ))}
        </div>
        <input id={id} type="range" min={0} max={count - 1} value={index} onChange={(event) => onIndex(Number(event.target.value))} />
        {ticks && (
          <div className="ticks" aria-hidden="true">
            {ticks.map((tick) => <span key={tick.index} style={{ left: left(tick.index) }}>{tick.label}</span>)}
          </div>
        )}
      </div>
      <div className="readout">
        <label htmlFor={id}>{name} <output htmlFor={id}>{label}</output></label>
        <div className="controls">
          <button type="button" onClick={play.nextSpeed} aria-label={`Speed ${play.speed}×. Change the speed.`}>{play.speed}×</button>
          <button type="button" aria-pressed={play.loop} onClick={play.toggleLoop}>Loop</button>
          {children}
        </div>
      </div>
    </form>
  );
}
