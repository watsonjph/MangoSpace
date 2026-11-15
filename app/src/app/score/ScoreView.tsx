"use client";

import { useEffect, useRef, useState } from "react";
import type { IsoDate } from "../../../lib/data";
import MapLink from "../MapLink";
import { playTone, type Voice } from "../soil-tone";
import { fmt, useHydrated } from "../TargetParts";
import Timeline, { place, usePlayback } from "../Timeline";

export type ScoreNote = { date: IsoDate; at: number; label: string; weak?: boolean; series?: string };
export type Part = { voice: "soil" | "dam" | "rice"; title: string; sentence: string; notes: ScoreNote[] };

const VOICES: Record<Part["voice"], Voice & { name: string }> = {
  soil: { name: "Soil", base: 220, wave: "sine" },
  dam: { name: "Dam", base: 110, wave: "triangle" },
  rice: { name: "Rice", base: 330, wave: "triangle" },
};
const OFF = { soil: false, dam: false, rice: false };
const DAY = 86_400_000;

export default function ScoreView({ parts, rain, steps, start, end }: {
  parts: Part[];
  rain: { date: IsoDate; mm: number }[];
  steps: IsoDate[];
  start: IsoDate;
  end: IsoDate;
}) {
  const ready = useHydrated();
  const [index, setIndex] = useState(0);
  const play = usePlayback(steps.length, index, setIndex);
  const audio = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(OFF);
  const [error, setError] = useState("");
  const date = steps[index];
  const day = (iso: IsoDate) => Math.round((Date.parse(iso) - Date.parse(start)) / DAY);
  const max = day(end);
  const left = (iso: IsoDate) => place(day(iso), max);
  const rainTop = Math.max(...rain.map((r) => r.mm));
  const months = [];
  for (let m = new Date(start); ; ) {
    m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
    if (m.getTime() > Date.parse(end)) break;
    months.push(m.toISOString().slice(0, 10));
  }

  useEffect(() => () => {
    void audio.current?.close().catch(() => {});
    audio.current = null;
  }, []);

  useEffect(() => {
    const context = audio.current;
    if (!play.playing || !context || context.state !== "running") return;
    // The rice voice plays the mean of its two parcels.
    const stops = parts.filter((part) => on[part.voice]).map((part) => {
      const now = part.notes.filter((note) => note.date === date);
      return now.length ? playTone(context, now.reduce((sum, note) => sum + note.at, 0) / now.length, VOICES[part.voice]) : undefined;
    });
    return () => stops.forEach((stop) => stop?.());
  }, [play.playing, date, on, parts]);

  async function toggle(voice: Part["voice"]) {
    setError("");
    if (!audio.current) {
      try {
        const context = new AudioContext();
        audio.current = context;
        await context.resume();
        if (context.state !== "running") throw new Error("Audio did not start");
      } catch {
        void audio.current?.close().catch(() => {});
        audio.current = null;
        setError("Sound could not start in this browser. The score still plays without it.");
        return;
      }
    }
    setOn((voices) => ({ ...voices, [voice]: !voices[voice] }));
  }

  // The value of a part at the playhead: its latest note on or before that date.
  const reading = (part: Part) => {
    const past = part.notes.filter((note) => note.date <= date);
    const latest = past.at(-1)?.date;
    return latest ? past.filter((note) => note.date === latest).map((note) => note.label).join(" · ") : "No reading yet";
  };
  const lastRain = rain.filter((r) => r.date <= date).at(-1);

  return (
    <main className="dam-page score-page" data-ready={ready}>
      <p className="eyebrow">The score · 2026 wet season, Cebu and Bohol</p>
      <h1>The soil, the dam and the rice, played together</h1>
      <p className="dam-note">Each note sits on its real NISAR date. The soil has 12-day windows. The dam and the rice have 11 radar passes.
        So the lines do not meet on the same days.</p>

      <Timeline className="score" id="score-date" name="Date" count={steps.length} index={index} onIndex={setIndex}
        label={fmt(date)} play={play} axis={{ at: steps.map(day), max }} staff={
          <div className="staves" aria-hidden="true">
            {parts.map((part) => (
              <div key={part.voice} className="stave" data-voice={part.voice}>
                <span>{VOICES[part.voice].name}</span>
                <div className="staff">
                  {part.notes.map((note) => (
                    <i key={`${note.series ?? ""}${note.date}`} data-date={note.date}
                      className={[note.date === date ? "now" : "", note.weak ? "weak" : "", note.series?.toLowerCase() ?? ""].join(" ").trim() || undefined}
                      style={{ left: left(note.date), bottom: `${note.at * 100}%` }} />
                  ))}
                </div>
              </div>
            ))}
            <div className="stave" data-voice="rain">
              <span>Rain</span>
              <div className="staff rain">
                {rain.map((r) => (
                  <b key={r.date} data-date={r.date} className={r.date === date ? "now" : undefined}
                    style={{ left: left(r.date), height: `${(r.mm / rainTop) * 100}%` }} />
                ))}
              </div>
            </div>
            <div className="ticks">
              {months.map((m) => <span key={m} style={{ left: left(m) }}>
                {new Date(m).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</span>)}
            </div>
          </div>
        } />

      <ul className="dam-key">
        <li><span className="key-ubay" />Ubay rice parcel</li>
        <li><span className="key-pilar" />Pilar rice parcel</li>
        <li><span className="key-rain" />Rain in the 12 days before each pass (GPM)</li>
        <li><span className="key-weak" />Soil mean from fewer towns</li>
      </ul>

      <div className="score-voices" role="group" aria-label="Voices">
        {parts.map((part) => (
          <button key={part.voice} type="button" aria-pressed={on[part.voice]} onClick={() => toggle(part.voice)}>
            {VOICES[part.voice].name} voice
          </button>
        ))}
      </div>
      <p className="dam-note">Sound is off at the start. Turn on a voice, then press play. A higher note is a higher value.</p>
      {error && <p role="alert">{error}</p>}

      <dl className="dam-stats score-readout">
        <div><dt>Date</dt><dd data-testid="score-date">{fmt(date)}</dd></div>
        {parts.map((part) => (
          <div key={part.voice}><dt>{part.title}</dt><dd data-testid={`score-${part.voice}`}>{reading(part)}</dd></div>
        ))}
        <div><dt>Rain in the 12 days before the last pass</dt><dd data-testid="score-rain">{lastRain ? `${lastRain.mm.toFixed(0)} mm` : "No reading yet"}</dd></div>
      </dl>

      <section>
        <h2>What you hear</h2>
        <ul className="score-sentences">
          {parts.map((part) => <li key={part.voice} data-voice={part.voice}>{part.sentence}</li>)}
        </ul>
        <p className="dam-note">The soil is the mean of the towns with data on half of their area or more. <MapLink href="/method">Method and limits</MapLink></p>
      </section>
    </main>
  );
}
