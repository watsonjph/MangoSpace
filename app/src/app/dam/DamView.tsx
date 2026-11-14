"use client";

import { useEffect, useState } from "react";
import type { Target } from "../../../lib/data";
import ThenAndNow from "./ThenAndNow";
import { RadarImage, ObservationChart } from "../components/RadarObservations";
import { parseComparison, percentSeries } from "./comparison";

type Band = keyof Target["nisar"]["images"][number];
type Observation = {
  date: string;
  images: Target["nisar"]["images"][number];
  area: number | null;
};
type Dam = { track: number; observations: Observation[]; comparison: ReturnType<typeof parseComparison> };
type LoadState = { kind: "loading" } | { kind: "ready"; dam: Dam } | { kind: "error" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDam(value: unknown): Dam {
  if (!Array.isArray(value)) throw new Error("Missing targets");
  const target: unknown = value.find((entry: unknown) => isRecord(entry) && entry.id === "malinao-dam");
  if (!isRecord(target) || !isRecord(target.nisar)) throw new Error("Missing dam");
  const { track, dates, images, waterAreaKm2 } = target.nisar;
  if (typeof track !== "number" || !Number.isInteger(track) || track < 1 ||
      !Array.isArray(dates) || !Array.isArray(images) || dates.length !== images.length) {
    throw new Error("Invalid dam series");
  }
  let previous = "";
  const observations = dates.map((date: unknown, index: number): Observation => {
    const image: unknown = images[index];
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date ||
        date <= previous || !isRecord(image) ||
        typeof image.hh !== "string" || typeof image.hv !== "string" ||
        !/^targets\/[\w.-]+\.png$/.test(image.hh) || !/^targets\/[\w.-]+\.png$/.test(image.hv)) {
      throw new Error("Invalid observation");
    }
    previous = date;
    const area: unknown = Array.isArray(waterAreaKm2) ? waterAreaKm2[index] : null;
    return {
      date,
      images: { hh: image.hh, hv: image.hv },
      area: typeof area === "number" && Number.isFinite(area) && area >= 0 ? area : null,
    };
  });
  return { track, observations, comparison: parseComparison(target.history, target.scenarios, observations.at(-1) ?? { date: "", area: null }) };
}

export default function DamView() {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [date, setDate] = useState("");
  const [band, setBand] = useState<Band>("hh");

  useEffect(() => {
    const controller = new AbortController();
    async function loadDam() {
      try {
        const response = await fetch("/data/targets.json", { signal: controller.signal });
        if (!response.ok) throw new Error("Targets unavailable");
        const data: unknown = await response.json();
        const dam = parseDam(data);
        setDate(dam.observations.at(-1)?.date ?? "");
        setLoad({ kind: "ready", dam });
      } catch {
        if (!controller.signal.aborted) setLoad({ kind: "error" });
      }
    }
    void loadDam();
    return () => controller.abort();
  }, []);

  const selected = load.kind === "ready" ? load.dam.observations.find((point) => point.date === date) : undefined;

  const latest = load.kind === "ready" ? load.dam.observations.at(-1) : undefined;
  const currentPoints = load.kind === "ready" && latest?.area && latest.area > 0
    ? percentSeries(load.dam.observations.map(point => point.date), load.dam.observations.map(point => point.area), latest.area)
    : [];

  return (
    <main className="dam-page">
      <header className="dam-hero">
        <div>
          <p className="eyebrow">BOHOL, PHILIPPINES / RESERVOIR OBSERVATORY</p>
          <h1>Malinao Dam</h1>
          <p>One reservoir. A changing surface.<br />Follow the water through radar observations, then look back at two past dry seasons.</p>
          <a href="#then-and-now">Explore then and now <span aria-hidden="true">↗</span></a>
        </div>
        <div className="hero-mark" aria-hidden="true">
          <span>HUBAS</span><strong>Water<br />in view.</strong><span>NISAR + SENTINEL-1</span>
        </div>
      </header>
      {load.kind === "loading" && <p role="status">Loading dam observations…</p>}
      {load.kind === "error" && <p role="alert">Dam observations could not be loaded. Reload the page to try again.</p>}
      {load.kind === "ready" && !selected && <p role="status">No dam observations available.</p>}
      {load.kind === "ready" && selected && <>
        <div className="section-heading">
          <div><p className="eyebrow">01 / The current record</p><h2>See the reservoir</h2></div>
          <span className="section-tag">NISAR · {load.dam.observations.length} observations · Track {String(load.dam.track).padStart(3, "0")}</span>
        </div>
        <p className="dam-section-intro">Estimated surface water area, not water volume. Select a date to inspect what the radar recorded.</p>
        <div className="dam-controls">
          <div><label htmlFor="dam-date">Date</label><select id="dam-date" value={date} onChange={(event) => setDate(event.target.value)}>
            {load.dam.observations.map((point) => <option key={point.date} value={point.date}>{point.date}</option>)}
          </select></div>
          <fieldset><legend>Radar band</legend>
            <label><input type="radio" name="band" checked={band === "hh"} onChange={() => setBand("hh")} /> HH</label>
            <label><input type="radio" name="band" checked={band === "hv"} onChange={() => setBand("hv")} /> HV</label>
          </fieldset>
        </div>
        <div className="dam-grid">
          <figure className="radar-figure">
            <RadarImage key={selected.images[band]} src={`/data/${selected.images[band]}`} alt={`Malinao Dam NISAR ${band.toUpperCase()} radar, ${selected.date}`} />
            <figcaption>NISAR · {band.toUpperCase()} · {selected.date} · Track {String(load.dam.track).padStart(3, "0")}<br />North up. Dark = −30 dB; bright = 0 dB.</figcaption>
          </figure>
          <section className="current-area-card" aria-labelledby="water-area-heading">
            <h2 id="water-area-heading">Water area</h2>
            <p className="selected-area" aria-live="polite" data-testid="selected-water-area">{selected.area === null ? "Not available" : `${selected.area.toFixed(3)} km²`}<span>{selected.date}</span></p>
            <ObservationChart points={load.dam.observations.map(point => ({ date: point.date, value: point.area }))}
              selectedDate={date} label="Water area over time, in square kilometres. Exact values are in the table below."
              title="Water area (km²)" unit="km²" domain={[0, Math.max(0.1, ...load.dam.observations.flatMap(point => point.area === null ? [] : [point.area])) * 1.1]}
              empty="No water-area measurements available." />
            <p className="dam-note">Areas are estimates from dark HH pixels after speckle reduction. Switching the image to HV does not change this HH-derived area.</p>
            <p className="dam-notice">Rain observations are not available yet. Placeholder rain values are not shown.</p>
          </section>
        </div>
        <ThenAndNow
          latestDate={latest?.date ?? ""}
          current={currentPoints}
          history={load.dam.comparison.past}
          scenarios={load.dam.comparison.future}
        />
        <section className="dam-limits-card" aria-labelledby="dam-causes"><h2 id="dam-causes">Possible causes and limits</h2>
          <p>A smaller water area can have several causes, including less rain, more water use, or dam work. The radar images alone do not establish the cause.</p>
          <p>Compare dates from the same satellite track for each target. Different radar viewing angles can change the image. NISAR and Sentinel-1 can give different water areas in km², so compare changes between sensors as percentages rather than absolute areas.</p>
          <p>For the published 26 June to 5 November 2026 analysis, moving the radar limits by 1 dB changed one area by up to 0.092 km². This measures sensitivity to those limits, not error against ground measurements. Wind, speckle and processing changes can also affect the result.</p>
        </section>
        <details className="dam-values"><summary>All dates and water areas</summary>
          <table><caption>Estimated surface water area from NISAR HH</caption><thead><tr><th scope="col">Date</th><th scope="col">Water area (km²)</th></tr></thead>
            <tbody>{load.dam.observations.map((point) => <tr key={point.date}><th scope="row">{point.date}</th><td>{point.area === null ? "Not available" : point.area.toFixed(3)}</td></tr>)}</tbody>
          </table>
        </details>
      </>}
    </main>
  );
}
