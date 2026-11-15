"use client";

import { type ReactNode, useEffect, useState } from "react";

export const STEP_MS = 450;
const SPEEDS = [1, 2, 0.5] as const;

export type Playback = ReturnType<typeof usePlayback>;

// ready: false holds the current step until it is ready, for example until its image has loaded.
export function usePlayback(count: number, index: number, setIndex: (index: number) => void, stepMs = STEP_MS, ready = true, onLoop?: (loopCount: number) => void) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [loop, setLoop] = useState(true);
  const [loopCount, setLoopCount] = useState(0);
  const last = count - 1;

  useEffect(() => {
    if (!playing || !ready) return;
    const timer = window.setTimeout(() => {
      if (index < last) setIndex(index + 1);
      else if (loop) {
        const nextLoop = loopCount + 1;
        setIndex(0); setLoopCount(nextLoop); onLoop?.(nextLoop);
      }
      else setPlaying(false);
    }, stepMs / speed);
    return () => window.clearTimeout(timer);
  }, [playing, ready, index, last, loop, loopCount, onLoop, speed, stepMs, setIndex]);

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
    playing, speed, loop, loopCount, toggle,
    start: () => { setIndex(0); setPlaying(true); },
    nextSpeed: () => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]),
    toggleLoop: () => setLoop((value) => !value),
  };
}

// at: height on the staff, 0 (bottom) to 1 (top). weak: a value from less data than the others.
export type Note = { at: number; weak?: boolean } | null;

// The same inset as half of the range thumb, so a note sits under the thumb of its step.
export const place = (x: number, max: number) => `calc(5px + (100% - 10px) * ${x / Math.max(max, 1)})`;

// axis: put step i at axis.at[i] on a 0 to axis.max scale (for example a day), not at i. staff replaces the one staff of notes.
export default function Timeline({ id, name, count, index, onIndex, label, play, notes, ticks, breaks, axis, staff, className, children }: {
  id: string;
  name: string;
  count: number;
  index: number;
  onIndex: (index: number) => void;
  label: string;
  play: Playback;
  notes?: Note[];
  ticks?: { index: number; label: string }[];
  breaks?: number[];
  axis?: { at: number[]; max: number };
  staff?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const at = (i: number) => axis ? axis.at[i] : i;
  const max = axis ? axis.max : count - 1;
  const left = (i: number) => place(at(i), max);
  // On an axis, a move goes to the next step in its direction, so one arrow key press is one step.
  const pick = (value: number) => {
    if (!axis) return value;
    const forward = value > at(index);
    const next = forward ? axis.at.findIndex((x) => x >= value) : axis.at.findLastIndex((x) => x <= value);
    return next >= 0 ? next : forward ? count - 1 : 0;
  };

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
        {staff ?? (
          <div className="staff" aria-hidden="true">
            {breaks?.map((index) => <span key={index} className="period-break" style={{ left: left(index - 0.5) }} />)}
            {notes?.map((note, i) => note && (
              <i key={i} className={[i === index ? "now" : "", note.weak ? "weak" : ""].join(" ").trim() || undefined}
                style={{ left: left(i), bottom: `${note.at * 100}%` }} />
            ))}
          </div>
        )}
        <input id={id} type="range" min={0} max={max} value={at(index)} aria-valuetext={axis ? label : undefined}
          onChange={(event) => onIndex(pick(Number(event.target.value)))} />
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
