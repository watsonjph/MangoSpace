"use client";

import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Timeline, { type Note, usePlayback } from "./Timeline";

export type Line = { label: string; color: string; dashed?: boolean; points: [number, number][] };

export const NOW = "var(--water)";
export const DRY = "var(--dry)";
export const VIOLET = "var(--violet)";
const RAIN = "#8fb4d9";

// True only after hydration, so tests know the slider and buttons respond.
export const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export const fmt = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function Chart({ lines, domain, format, rain, selected, onSelect, label }: {
  lines: Line[];
  domain: [number, number];
  format: (value: number) => string;
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
  const x = (time: number) => left + (t0 === t1 ? 0.5 : (time - t0) / (t1 - t0)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - domain[0]) / (domain[1] - domain[0])) * plot;
  const months: number[] = [];
  if (t0 === t1) months.push(t0);
  else for (let d = new Date(t0), m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); m <= t1; m = Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1)) months.push(m);
  const every = Math.ceil(months.length / ((width - left - right) / 38));
  const ticks = [0, 1, 2, 3].map((i) => domain[0] + ((domain[1] - domain[0]) * i) / 3);
  const rainMax = rain ? Math.max(...rain.map(([, mm]) => mm)) : 1;
  const picked = selected === undefined ? undefined : lines[0].points[selected];

  return (
    <div ref={box} className="dam-chart" data-testid="dam-chart">
      <svg width={width} height={height} role="img" aria-label={label}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" />
            <text x={left - 6} y={y(tick) + 4} textAnchor="end">{format(tick)}</text>
          </g>
        ))}
        {months.map((month, i) => i % every === 0 && (
          <text key={month} x={x(month)} y={height - 6} textAnchor="middle">
            {new Date(month).toLocaleDateString("en-GB", { month: "short", year: (new Date(month).getUTCMonth() === 0 || t0 === t1) ? "numeric" : undefined, timeZone: "UTC" })}
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
        {picked && <circle cx={x(picked[0])} cy={y(picked[1])} r={6} fill={NOW} stroke="var(--ground)" strokeWidth={2} />}
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

export function Radar({ src, caption, testId }: { src: string; caption: string; testId?: string }) {
  return (
    <figure className="dam-radar" data-testid={testId}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/data/${src}`} alt={caption} width={440} height={440} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export type Band = "hh" | "hv";
const FRAME_MS = 300;

// The band buttons are left out when setBand is absent: a Sentinel-1 date has one band.
// The height of a value on the timeline staff, inside the same range as its chart.
export const note = (value: number, [low, high]: [number, number]): Note => ({ at: Math.max(0, Math.min(1, (value - low) / (high - low))) });

export function Picker({ label, max, index, setIndex, notes, band, setBand, children }: {
  label: string; max: number; index: number; setIndex: (index: number) => void; notes?: Note[];
  band: Band; setBand?: (band: Band) => void; children?: ReactNode;
}) {
  const play = usePlayback(max + 1, index, setIndex, FRAME_MS);
  return (
    <div className="dam-picker">
      <Timeline id="date" name="Date" count={max + 1} index={index} onIndex={setIndex} label={label} play={play} notes={notes} />
      {children}
      {setBand && (
        <div role="group" aria-label="Radar band">
          {(["hh", "hv"] as const).map((b) => (
            <button key={b} type="button" aria-pressed={band === b} onClick={() => setBand(b)}>{b.toUpperCase()}</button>
          ))}
        </div>
      )}
    </div>
  );
}
