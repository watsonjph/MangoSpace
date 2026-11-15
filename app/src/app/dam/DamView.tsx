"use client";

import { useState } from "react";
import type { Target } from "../../../lib/data";
import MapLink from "../MapLink";
import { type Band, Chart, DRY, fmt, type Line, NOW, note, Picker, Radar, useHydrated, VIOLET } from "../TargetParts";

const EVENT_COLOR: Record<string, string> = { "2015–16": DRY, "2023–24": VIOLET };
const pct = (value: number, base: number) => (value / base - 1) * 100;
const signed = (value: number) => {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${Math.abs(rounded)}%`;
};

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
  const ready = useHydrated();
  const [band, setBand] = useState<Band>("hh");

  if (!areas.length) return (
    <main className="dam-page" data-ready={ready}>
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
    date, sensor: event.sensor, src: event.images[i], share: event.values[i] / event.values[0], change: pct(event.values[i], event.values[0]), base: event.dates[0],
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
  // Each period is a share of its own first date: Sentinel-1 and NISAR areas do not compare in km².
  const frames = [...past.map((item) => item.share), ...areas.map((area) => area / areas[0])];
  const span: [number, number] = [Math.min(...frames) - 0.05, Math.max(...frames) + 0.05];

  return (
    <main className="dam-page" data-ready={ready}>
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
      <Chart lines={[observed, ...scenarios]} domain={[Math.min(0.6, Math.floor(lowest * 10 - 2) / 10), 0.9]} format={(value) => value.toFixed(2)}
        rain={rain} selected={old ? undefined : index} onSelect={(i) => setPicked(past.length + i)}
        label="Water area of Malinao Dam on each radar date of 2026, with lines for a repeat of two past dry events" />
      {scenarios.length > 0 && <p className="dam-note" data-testid="scenario-note">Dashed lines: this is what happened before. It is not a forecast. Each line applies past monthly-average changes to the latest NISAR area, so it can differ from the lowest reading on any one date of that event.</p>}

      <h2>The radar image of each date</h2>
      <div className="dam-image">
        <Radar testId="dam-radar" src={old ? old.src : images[index][band]}
          caption={`${old ? `${old.sensor} VV` : `NISAR ${band.toUpperCase()}`}, ${fmt(old ? old.date : dates[index])}. Dark areas can be water, flooded fields, or radar shadow.`} />
        <div>
          <Picker label={fmt(old ? old.date : dates[index])} max={past.length + last} index={frame} setIndex={setPicked} notes={frames.map((share) => note(share, span))}
            band={band} setBand={old ? undefined : setBand}>
            {past.length > 0 && (
              <div role="group" aria-label="Go to">
                {jumps.map((jump) => (
                  <button key={jump.label} type="button" aria-pressed={frame === jump.frame} onClick={() => setPicked(jump.frame)}>{jump.label}</button>
                ))}
              </div>
            )}
          </Picker>
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
              <p className="dam-note">Changing the water or outline threshold by 1 dB changes a one-date estimate by up to 0.09 km². This is threshold sensitivity, not accuracy against ground truth. Click a point of the chart, move the slider, or push play.</p>
            </>
          )}
        </div>
      </div>
      <Causes />
    </main>
  );
}
