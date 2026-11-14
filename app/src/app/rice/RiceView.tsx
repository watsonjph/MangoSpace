"use client";

import { useEffect, useState } from "react";
import type { Target } from "../../../lib/data";
import { ObservationChart, RadarImage } from "../components/RadarObservations";
import { parseRice, type RiceSample } from "./rice-data";

type Band = keyof Target["nisar"]["images"][number];
type LoadState = { kind: "loading" } | { kind: "ready"; samples: RiceSample[] } | { kind: "error" };

function SampleViewer({ sample }: { sample: RiceSample }) {
  const [date, setDate] = useState(sample.observations.at(-1)?.date ?? "");
  const [band, setBand] = useState<Band>("hv");
  const selected = sample.observations.find(point => point.date === date);
  if (!selected) return <p role="status">No observations available for this sample.</p>;
  const values = sample.observations.flatMap(point => point.hv === null ? [] : [point.hv]);
  const min = Math.floor(Math.min(...values, -25) / 5) * 5;
  const max = Math.ceil(Math.max(...values, -10) / 5) * 5;
  return <>
    <div className="section-heading">
      <div><p className="eyebrow">01 / Selected field parcel</p><h2>{sample.name} sample</h2></div>
      <span className="section-tag">NISAR · {sample.observations.length} observations · Track {String(sample.track).padStart(3, "0")}</span>
    </div>
    <div className="dam-controls">
      <div><label htmlFor="rice-date">Date</label><select id="rice-date" value={date} onChange={event => setDate(event.target.value)}>
        {sample.observations.map(point => <option key={point.date} value={point.date}>{point.date}</option>)}
      </select></div>
      <fieldset><legend>Radar band</legend>
        <label><input type="radio" name="rice-band" checked={band === "hh"} onChange={() => setBand("hh")} /> HH</label>
        <label><input type="radio" name="rice-band" checked={band === "hv"} onChange={() => setBand("hv")} /> HV</label>
      </fieldset>
    </div>
    <div className="dam-grid">
      <figure className="radar-figure rice-image">
        <RadarImage key={selected.images[band]} src={`/data/${selected.images[band]}`} width={sample.pixels} height={sample.pixels}
          alt={`${sample.name} sample NISAR ${band.toUpperCase()} radar, ${selected.date}`} />
        <figcaption>NISAR · {band.toUpperCase()} · {selected.date}<br />North up. Dark = −30 dB; bright = 0 dB.<br />{sample.pixels} × {sample.pixels} output pixels, enlarged without added detail.</figcaption>
      </figure>
      <section className="current-area-card" aria-labelledby="hv-heading">
        <h2 id="hv-heading">Mean HV signal</h2>
        <p className="selected-area" data-testid="selected-hv" aria-live="polite">
          {selected.hv === null ? "Not available" : `${selected.hv.toFixed(3)} dB`}<span>{selected.date}</span>
        </p>
        <ObservationChart points={sample.observations.map(point => ({ date: point.date, value: point.hv }))} selectedDate={date}
          label={`${sample.name} mean HV over time, in decibels. Exact values are in the table below.`}
          title="Mean HV (dB)" unit="dB" domain={[min, max]} empty="No HV measurements available." />
        <p className="dam-note">The line always shows HV, even when the image is HH. Less negative values mean a stronger radar return.</p>
        <p className="rice-stage-notice">Planting and growth dates not verified. The signal alone does not confirm crop identity or crop stage.</p>
      </section>
    </div>
    <details className="dam-values"><summary>All dates and HV values</summary>
      <table><caption>{sample.name} sample · mean HV from unclipped measurements</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Mean HV (dB)</th></tr></thead>
        <tbody>{sample.observations.map(point => <tr key={point.date}><th scope="row">{point.date}</th><td>{point.hv === null ? "Not available" : point.hv.toFixed(3)}</td></tr>)}</tbody>
      </table>
    </details>
  </>;
}

export default function RiceView() {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [sampleId, setSampleId] = useState("ubay-rice");
  useEffect(() => {
    const controller = new AbortController();
    async function readSamples() {
      try {
        const response = await fetch("/data/targets.json", { signal: controller.signal });
        if (!response.ok) throw new Error("Targets unavailable");
        const data: unknown = await response.json();
        const samples = parseRice(data);
        setSampleId(samples[0]?.id ?? "");
        setLoad({ kind: "ready", samples });
      } catch {
        if (!controller.signal.aborted) setLoad({ kind: "error" });
      }
    }
    void readSamples();
    return () => controller.abort();
  }, []);
  const sample = load.kind === "ready" ? load.samples.find(item => item.id === sampleId) : undefined;
  return <main className="dam-page rice-page">
    <header className="dam-hero">
      <div><p className="eyebrow">BOHOL, PHILIPPINES / FIELD OBSERVATIONS</p><h1>Rice, through radar</h1>
        <p>Two small field parcels. A season of observations.<br />Explore how the radar signal changes in Ubay and Pilar.</p>
        <span className="rice-hero-note">Selected samples, not town-wide rice measurements.</span>
      </div>
      <div className="hero-mark" aria-hidden="true"><span>HUBAS</span><strong>A closer<br />look.</strong><span>NISAR · L-BAND</span></div>
    </header>
    {load.kind === "loading" && <p role="status">Loading rice observations…</p>}
    {load.kind === "error" && <p role="alert">Rice observations could not be loaded. Reload the page to try again.</p>}
    {load.kind === "ready" && !sample && <p role="status">Rice sample observations are not available.</p>}
    {load.kind === "ready" && sample && <>
      <div className="rice-sample-picker"><label htmlFor="rice-sample">Field sample</label>
        <select id="rice-sample" value={sampleId} onChange={event => setSampleId(event.target.value)}>
          {load.samples.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <p>One selected parcel in each municipality.</p>
      </div>
      <SampleViewer key={sample.id} sample={sample} />
      <section className="dam-limits-card" aria-labelledby="rice-limits"><h2 id="rice-limits">What the signal can tell us</h2>
        <p>Low HV followed by a rise can be consistent with wet fields and vegetation change. Field water, soil water, other vegetation and radar speckle also affect the signal. A rise does not establish a planting date or growth stage.</p>
        <p>These small samples do not represent either town’s rice production. Field bunds and other vegetation can remain in each sample. Resampling does not improve the native 10 m radar grid.</p>
        <p>Mean HV is calculated from unclipped radar measurements, not from the displayed PNG. Images use the same −30 to 0 dB grey scale as the Dam view. Rain observations and field validation are not available.</p>
      </section>
    </>}
  </main>;
}
