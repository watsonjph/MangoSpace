"use client";

import { useEffect, useRef, useState } from "react";
import { playSoilTone } from "./soil-tone";

export default function SeasonSound({ value, index, playing, onStart }: {
  value: number | null | undefined;
  index: number;
  playing: boolean;
  onStart: () => void;
}) {
  const audio = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    const context = audio.current;
    audio.current = null;
    if (context) void context.close().catch(() => {});
  }, []);

  useEffect(() => {
    const context = audio.current;
    if (!enabled || !playing || !context || context.state !== "running") return;
    return playSoilTone(context, value);
  }, [enabled, playing, value, index]);

  async function toggle() {
    if (audio.current) {
      const context = audio.current;
      audio.current = null;
      setEnabled(false);
      void context.close().catch(() => {});
      return;
    }
    setStarting(true);
    setError("");
    try {
      const context = new AudioContext();
      audio.current = context;
      await context.resume();
      if (audio.current !== context) return;
      if (context.state !== "running") throw new Error("Audio did not start");
      setEnabled(true);
      onStart();
    } catch {
      const context = audio.current;
      audio.current = null;
      if (context) void context.close().catch(() => {});
      setError("Sound could not start in this browser. The slider still works.");
    } finally {
      setStarting(false);
    }
  }

  return <div className="season-sound">
    <button type="button" aria-pressed={enabled} disabled={starting} onClick={toggle}>Hear the season</button>
    <p>Sound {enabled ? "on" : "off"}. Wetter soil has a higher pitch; drier soil has a lower pitch.
      {value == null ? " No reading for this window: silence." : " Missing readings are silent."}</p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
