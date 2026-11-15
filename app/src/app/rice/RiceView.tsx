"use client";

import { useState } from "react";
import type { Target } from "../../../lib/data";
import MapLink from "../MapLink";
import { type RadarDisplay, Chart, DRY, fmt, type Line, NOW, note, Picker, Radar, useHydrated } from "../TargetParts";

const NAME: Record<string, string> = { "ubay-rice": "Ubay", "pilar-rice": "Pilar" };
const COLOR = [NOW, DRY];
const db = (value: number) => `${value.toFixed(1).replace("-", "−")} dB`;

export default function RiceView({ parcels }: { parcels: Target[] }) {
  const [parcel, setParcel] = useState(0);
  const [picked, setPicked] = useState<number>();
  const [display, setDisplay] = useState<RadarDisplay>("hh");
  const ready = useHydrated();
  const [readyRadar, setReadyRadar] = useState("");

  if (!parcels.length) return (
    <main className="dam-page" data-ready={ready}>
      <p className="eyebrow">Rice parcels · Ubay and Pilar, Bohol</p>
      <h1>Rice parcels</h1>
      <p data-testid="rice-empty">No radar signal has been measured for the rice parcels yet.</p>
    </main>
  );

  const target = parcels[parcel];
  const { dates, images } = target.nisar;
  const index = Math.min(picked ?? dates.length - 1, dates.length - 1);
  const frameSrcs = images.map((image) => display === "color" ? [image.hh, image.hv] : [image[display]]);
  const frameKey = frameSrcs[index]?.join("|") ?? "";
  const lines: Line[] = parcels.map((item, i) => ({
    label: `${NAME[item.id]}, NISAR HV`,
    color: COLOR[i],
    points: item.nisar.dates.map((date, j): [number, number] => [Date.parse(date), item.nisar.meanHvDb![j]]),
  }));
  const all = lines.flatMap((line) => line.points.map(([, value]) => value));
  const rain = target.rainMm.length === dates.length ? dates.map((date, i): [number, number] => [Date.parse(date), target.rainMm[i]]) : undefined;
  const interpretation = {
    seen: parcels.map((item) => {
      const values = item.nisar.meanHvDb!;
      const high = values.indexOf(Math.max(...values));
      const last = values.length - 1;
      return `${NAME[item.id]} HV rose from ${db(values[0])} on ${fmt(item.nisar.dates[0])} to ${db(values[high])} on ${fmt(item.nisar.dates[high])}, then fell to ${db(values[last])} on ${fmt(item.nisar.dates[last])}.`;
    }).join(" "),
    cause: "The rising cross-polarized HV signal fits more plant material. Before 5 November, the GPM cells had 39.6 mm near Ubay and 46.4 mm near Pilar. These totals do not measure water in the parcels. A harvest or standing water could also lower HV.",
    limit: "No field observations confirm the crop, planting date or growth stage of these parcels, and the signal alone cannot confirm a harvest or separate water, other plants, surface roughness, and radar noise.",
  };

  return (
    <main className="dam-page rice-page" data-ready={ready}>
      <p className="eyebrow">Rice parcels · Ubay and Pilar, Bohol</p>
      <h1 data-testid="view-finding">The radar signal of 2 rice parcels rose to its highest in September or October, then fell on 5 Nov 2026.</h1>
      <p className="dam-note">No field observations confirm the crop or its growth stage. <MapLink href="/method">Read the method and limits</MapLink></p>
      <dl className="dam-stats">
        {parcels.map((item, i) => {
          const values = item.nisar.meanHvDb!;
          const low = values.indexOf(Math.min(...values)), high = values.indexOf(Math.max(...values));
          return (
            <div key={item.id} data-testid="rice-parcel">
              <dt>{NAME[item.id]} parcel</dt>
              <dd style={{ color: COLOR[i] }}>{db(values[low])} to {db(values[high])}</dd>
              <small>Lowest {fmt(item.nisar.dates[low])}, highest {fmt(item.nisar.dates[high])}</small>
            </div>
          );
        })}
      </dl>

      <h2>Radar signal (HV) on each date</h2>
      {/* The selected parcel is first, so a click on the chart and the marker follow its line. */}
      <Chart lines={[lines[parcel], ...lines.filter((_, i) => i !== parcel)]}
        domain={[Math.floor(Math.min(...all) / 3) * 3, Math.ceil(Math.max(...all) / 3) * 3]}
        format={(value) => value.toFixed(1).replace("-", "−")} rain={rain} selected={index} onSelect={setPicked}
        unit="dB" finding={{ time: Date.parse(dates.at(-1)!), text: `Fall on ${fmt(dates.at(-1)!)}` }}
        label="Mean HV radar signal of the Ubay and Pilar rice parcels on each radar date of 2026" />
      <p className="dam-note">Higher HV can come from more plant material or a rougher surface. Water and other vegetation also affect it.</p>

      <h2>The radar image behind each point</h2>
      <div className="dam-image">
        {display === "color" ? (
          <Radar testId="rice-radar" display="color" sources={images[index]}
            frameKey={frameKey} onReady={setReadyRadar}
            caption={`${NAME[target.id]} parcel, NISAR HH/HV color composite, ${fmt(dates[index])}. A small parcel, enlarged: each square is one pixel.`} />
        ) : (
          <Radar testId="rice-radar" display={display} sources={images[index]}
            frameKey={frameKey} onReady={setReadyRadar}
            caption={`${NAME[target.id]} parcel, NISAR ${display.toUpperCase()}, ${fmt(dates[index])}. A small parcel, enlarged: each square is one pixel.`} />
        )}
        <div>
          <div className="dam-picker" role="group" aria-label="Parcel">
            <div>
              {parcels.map((item, i) => (
                <button key={item.id} type="button" aria-pressed={parcel === i} onClick={() => setParcel(i)}>{NAME[item.id]}</button>
              ))}
            </div>
          </div>
          <Picker label={fmt(dates[index])} max={dates.length - 1} index={index} setIndex={setPicked} display={display} setDisplay={setDisplay} ready={readyRadar === frameKey}
            sounds={target.nisar.meanHvDb!.map((hv, i) => ({ low: note(hv, [Math.min(...all) - 1, Math.max(...all) + 1]).at, rain: target.rainMm[i] }))}
            pitch="A higher pitch means a higher HV radar signal. Soft high notes show rain."
            notes={target.nisar.meanHvDb!.map((hv) => note(hv, [Math.min(...all) - 1, Math.max(...all) + 1]))} />
          <dl className="dam-stats">
            <div><dt>Mean HV signal</dt><dd data-testid="rice-hv">{db(target.nisar.meanHvDb![index])}</dd></div>
            {rain && <div><dt>Rain in the 12 days before</dt><dd data-testid="rice-rain">{target.rainMm[index].toFixed(0)} mm</dd></div>}
          </dl>
        </div>
      </div>

      <section className="interpretation" aria-labelledby="rice-interpretation">
        <h2 id="rice-interpretation">Why the HV signal can change</h2>
        <p><strong>What we see.</strong> {interpretation.seen}</p>
        <p><strong>What can cause it.</strong> {interpretation.cause}</p>
        <p><strong>What we cannot tell.</strong> {interpretation.limit}</p>
        <p className="dam-note">Each parcel is a small sample, not a whole town. Soil water, standing water,
          other plants and radar noise also change the signal. <MapLink href="/method">Method and limits</MapLink></p>
      </section>
    </main>
  );
}
