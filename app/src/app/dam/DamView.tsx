"use client";

import { useEffect, useRef, useState } from "react";
import type { Target } from "../../../lib/data";
import MapLink from "../MapLink";

type Line = { label: string; color: string; dashed?: boolean; points: [number, number][] };

const NOW = "#0d6f7d";
const EVENT_COLOR: Record<string, string> = { "2015–16": "#b07a1f", "2023–24": "#6b5b95" };
const RAIN = "#8fb4d9";

const fmt = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const pct = (value: number, base: number) => (value / base - 1) * 100;
const signed = (value: number) => {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${Math.abs(rounded)}%`;
};

function Chart({ lines, domain, unit, rain, selected, onSelect, label }: {
  lines: Line[];
  domain: [number, number];
  unit: "km²" | "%";
  rain?: [number, number][];
  selected?: number;
  onSelect?: (index: number) => void;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current!);
    return () => observer.disconnect();
  }, []);

  const left = 44, right = 10, top = 8, plot = 170, rainHeight = rain ? 56 : 0, height = top + plot + rainHeight + 22;
  const times = lines.flatMap((line) => line.points.map(([time]) => time));
  const t0 = Math.min(...times), t1 = Math.max(...times);
  const x = (time: number) => left + ((time - t0) / (t1 - t0)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - domain[0]) / (domain[1] - domain[0])) * plot;
  const months: number[] = [];
  for (let d = new Date(t0), m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); m <= t1; m = Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1)) months.push(m);
  const every = Math.ceil(months.length / ((width - left - right) / 38));
  const ticks = [0, 1, 2, 3].map((i) => domain[0] + ((domain[1] - domain[0]) * i) / 3);
  const rainMax = rain ? Math.max(...rain.map(([, mm]) => mm)) : 1;
  const picked = selected === undefined ? undefined : lines[0].points[selected];

  return (
    <div ref={box} className="dam-chart" data-testid="dam-chart">
      <svg width={width} height={height} role="img" aria-label={label}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#d3dcd9" />
            <text x={left - 6} y={y(tick) + 4} textAnchor="end">{unit === "%" ? signed(tick) : tick.toFixed(2)}</text>
          </g>
        ))}
        {months.map((month, i) => i % every === 0 && (
          <text key={month} x={x(month)} y={height - 6} textAnchor="middle">
            {new Date(month).toLocaleDateString("en-GB", { month: "short", year: new Date(month).getUTCMonth() ? undefined : "2-digit", timeZone: "UTC" })}
          </text>
        ))}
        {rain?.map(([time, mm]) => (
          <rect key={time} x={x(time) - 4} width={8} y={top + plot + 14 + (1 - mm / rainMax) * (rainHeight - 14)}
            height={(mm / rainMax) * (rainHeight - 14)} fill={RAIN} />
        ))}
        {rain && <text x={left - 6} y={top + plot + 26} textAnchor="end">rain</text>}
        {picked && <line x1={x(picked[0])} x2={x(picked[0])} y1={top} y2={top + plot + rainHeight} stroke={NOW} strokeDasharray="3 3" />}
        {lines.map((line) => (
          <g key={line.label}>
            <polyline fill="none" stroke={line.color} strokeWidth={2} strokeDasharray={line.dashed ? "6 5" : undefined}
              points={line.points.map(([time, value]) => `${x(time)},${y(value)}`).join(" ")} />
            {!line.dashed && line.points.map(([time, value]) => <circle key={time} cx={x(time)} cy={y(value)} r={2.5} fill={line.color} />)}
          </g>
        ))}
        {picked && <circle cx={x(picked[0])} cy={y(picked[1])} r={6} fill={NOW} stroke="#fff" strokeWidth={2} />}
        {onSelect && (
          <rect x={left - 12} width={x(lines[0].points.at(-1)![0]) - left + 24} y={top} height={plot + rainHeight} fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={(event) => {
              const at = event.clientX - event.currentTarget.ownerSVGElement!.getBoundingClientRect().left;
              const distances = lines[0].points.map(([time]) => Math.abs(x(time) - at));
              onSelect(distances.indexOf(Math.min(...distances)));
            }} />
        )}
      </svg>
      <ul className="dam-key">
        {lines.map((line) => (
          <li key={line.label}><span style={{ borderTop: `3px ${line.dashed ? "dashed" : "solid"} ${line.color}` }} />{line.label}</li>
        ))}
        {rain && <li><span style={{ borderTop: `8px solid ${RAIN}` }} />Rain in the 12 days before (GPM)</li>}
      </ul>
    </div>
  );
}

function Radar({ src, caption, testId }: { src: string; caption: string; testId?: string }) {
  return (
    <figure className="dam-radar" data-testid={testId}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/data/${src}`} alt={caption} width={440} height={440} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Causes() {
  return (
    <section className="dam-causes">
      <h2>What can cause a change</h2>
      <p>A smaller water area can have several causes, including less rain, more water use, or dam work.
        The radar images alone do not establish the cause.</p>
      <p className="dam-note">The lowest 2026 value, on 18 September, is a small dip. The radar alone cannot tell
        if there was less water or if wind or the radar caused it. <MapLink href="/method">Method and limits</MapLink></p>
    </section>
  );
}

export default function DamView({ dam }: { dam: Target }) {
  const { dates, images } = dam.nisar;
  const areas = dam.nisar.waterAreaKm2 ?? [];
  const last = dates.length - 1;
  const [picked, setPicked] = useState<number>();
  const [band, setBand] = useState<"hh" | "hv">("hh");

  if (!areas.length) return (
    <main className="dam-page">
      <p className="eyebrow">Malinao Dam · Pilar, Bohol</p>
      <h1>Malinao Dam water area</h1>
      <p data-testid="dam-empty">No water area has been measured for this dam yet.</p>
      <Causes />
    </main>
  );

  const observed: Line = { label: "Measured in 2026 (NISAR)", color: NOW, points: dates.map((date, i) => [Date.parse(date), areas[i]]) };
  const rain = dam.rainMm.length === dates.length ? dates.map((date, i): [number, number] => [Date.parse(date), dam.rainMm[i]]) : undefined;
  const scenarios: Line[] = (dam.scenarios ?? []).filter((scenario) => scenario.waterAreaKm2.length).map((scenario) => ({
    label: scenario.label,
    color: EVENT_COLOR[scenario.basedOn],
    dashed: true,
    // The first scenario month is the latest measured date, so the dashed line starts at the last point.
    points: scenario.months.map((month, i) => [Date.parse(i === 0 ? dates[last] : `${month}-15`), scenario.waterAreaKm2[i]]),
  }));
  const events = (dam.history ?? []).filter((event) => event.waterAreaKm2?.length).map((event) => {
    const values = event.waterAreaKm2!;
    const low = values.indexOf(Math.min(...values));
    return { ...event, values, low, lowDate: event.dates[low], fall: pct(values[low], values[0]) };
  });
  // One slider runs through the past events and then 2026. The past frames come first.
  const past = events.flatMap((event) => event.dates.map((date, i) => ({
    date, sensor: event.sensor, src: event.images[i], change: pct(event.values[i], event.values[0]), base: event.dates[0],
  })));
  const frame = picked ?? past.length + last;
  const old = past.at(frame);
  const index = Math.max(frame - past.length, 0);
  const jumps = [
    ...events.map((event, i) => ({
      label: `Lowest in ${event.event}`,
      frame: events.slice(0, i).reduce((count, earlier) => count + earlier.dates.length, 0) + event.low,
    })),
    { label: "Now", frame: past.length + last },
  ];
  const lowest = Math.min(...areas, ...scenarios.flatMap((line) => line.points.map(([, value]) => value)));

  return (
    <main className="dam-page">
      <p className="eyebrow">Malinao Dam · Pilar, Bohol</p>
      <h1>The water area is steady now. In past dry events it fell in March.</h1>
      <dl className="dam-stats">
        <div>
          <dt>Now, {fmt(dates[last])}</dt>
          <dd data-testid="dam-now">{areas[last].toFixed(2)} km²</dd>
          <small>2026 so far: {Math.min(...areas).toFixed(2)} to {Math.max(...areas).toFixed(2)} km²</small>
        </div>
        {events.map((event) => (
          <div key={event.event} data-testid="dam-event">
            <dt>Lowest in {event.event}</dt>
            <dd style={{ color: EVENT_COLOR[event.event] }}>{signed(event.fall)}</dd>
            <small>{fmt(event.lowDate)}, against {fmt(event.dates[0])}</small>
          </div>
        ))}
      </dl>

      <h2>{scenarios.length ? "Measured this year, and if a past event repeats" : "Measured this year"}</h2>
      <Chart lines={[observed, ...scenarios]} domain={[Math.min(0.6, Math.floor(lowest * 10 - 2) / 10), 0.9]} unit="km²"
        rain={rain} selected={old ? undefined : index} onSelect={(i) => setPicked(past.length + i)}
        label="Water area of Malinao Dam on each radar date of 2026, with lines for a repeat of two past dry events" />
      {scenarios.length > 0 && <p className="dam-note" data-testid="scenario-note">Dashed lines: this is what happened before. It is not a forecast.</p>}

      <h2>The radar image of each date</h2>
      <div className="dam-image">
        <Radar testId="dam-radar" src={old ? old.src : images[index][band]}
          caption={`${old ? `${old.sensor} VV` : `NISAR ${band.toUpperCase()}`}, ${fmt(old ? old.date : dates[index])}. Dark areas can be water, flooded fields, or radar shadow.`} />
        <div>
          <div className="dam-picker">
            <label>
              <span>Date <output>{fmt(old ? old.date : dates[index])}</output></span>
              <input type="range" min={0} max={past.length + last} value={frame} onChange={(e) => setPicked(Number(e.target.value))} />
            </label>
            {past.length > 0 && (
              <div role="group" aria-label="Go to">
                {jumps.map((jump) => (
                  <button key={jump.label} type="button" aria-pressed={frame === jump.frame} onClick={() => setPicked(jump.frame)}>{jump.label}</button>
                ))}
              </div>
            )}
            {!old && (
              <div role="group" aria-label="Radar band">
                {(["hh", "hv"] as const).map((b) => (
                  <button key={b} type="button" aria-pressed={band === b} onClick={() => setBand(b)}>{b.toUpperCase()}</button>
                ))}
              </div>
            )}
          </div>
          {old ? (
            <>
              <dl className="dam-stats">
                <div><dt>Water area, against {fmt(old.base)}</dt><dd data-testid="dam-change">{signed(old.change)}</dd></div>
              </dl>
              <p className="dam-note">Sentinel-1 and NISAR can give different areas in km², so a past event is given as a change in percent.</p>
            </>
          ) : (
            <>
              <dl className="dam-stats">
                <div><dt>Water area</dt><dd data-testid="dam-area">{areas[index].toFixed(2)} km²</dd></div>
                {rain && <div><dt>Rain in the 12 days before</dt><dd data-testid="dam-rain">{dam.rainMm[index].toFixed(0)} mm</dd></div>}
              </dl>
              <p className="dam-note">Changing the water or outline threshold by 1 dB changes a one-date estimate by up to 0.09 km². This is threshold sensitivity, not accuracy against ground truth. Click a point of the chart, or move the slider.</p>
            </>
          )}
        </div>
      </div>
      <Causes />
    </main>
  );
}
