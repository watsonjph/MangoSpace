"use client";

import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Timeline, { type Note, usePlayback } from "./Timeline";

export type Line = { label: string; color: string; dashed?: boolean; points: [number, number][] };

export const NOW = "var(--water)";
export const DRY = "var(--dry)";
export const VIOLET = "var(--violet)";
const RAIN = "var(--rain)";

// True only after hydration, so tests know the slider and buttons respond.
export const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export const fmt = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function Chart({ lines, domain, format, rain, selected, onSelect, label, unit, finding }: {
  lines: Line[];
  domain: [number, number];
  format: (value: number) => string;
  rain?: [number, number][];
  selected?: number;
  onSelect?: (index: number) => void;
  label: string;
  unit: string;
  finding: { time: number; text: string };
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number>();
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(box.current!);
    return () => observer.disconnect();
  }, []);

  const left = 44, right = width < 500 ? 104 : 150, top = 42, plot = 170, rainHeight = rain ? 76 : 0, height = top + plot + rainHeight + 22;
  const times = lines.flatMap((line) => line.points.map(([time]) => time));
  const t0 = Math.min(...times), t1 = Math.max(...times);
  const x = (time: number) => left + (t0 === t1 ? 0.5 : (time - t0) / (t1 - t0)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - domain[0]) / (domain[1] - domain[0])) * plot;
  const months: number[] = [];
  if (t0 === t1) months.push(t0);
  else for (let d = new Date(t0), m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); m <= t1; m = Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1)) months.push(m);
  const every = Math.max(1, Math.ceil(months.length / ((width - left - right) / 38)));
  const ticks = [0, 1, 2, 3].map((i) => domain[0] + ((domain[1] - domain[0]) * i) / 3);
  const rainMax = Math.max(1, ...(rain ?? []).map(([, mm]) => mm));
  const picked = selected === undefined ? undefined : lines[0].points[selected];
  const pointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const at = event.clientX - event.currentTarget.getBoundingClientRect().left;
    const points = lines[0].points;
    const distances = points.map(([time]) => Math.abs(x(time) - at));
    setHover(distances.indexOf(Math.min(...distances)));
  };
  const reading = hover === undefined ? undefined : lines[0].points[hover];
  const findingPoint = lines[0].points.find(([time]) => time === finding.time);
  // A line that stops before the chart does (2026 before its scenarios) is named above its last point, not into the lines that go on.
  const early = (line: Line) => line.points.at(-1)![0] < t1;
  const ends = lines.filter((line) => !early(line)).map((line) => ({ line, y: y(line.points.at(-1)![1]) })).sort((a, b) => a.y - b.y);
  ends.forEach((end, i) => { end.y = Math.max(end.y, i ? ends[i - 1].y + 32 : top); });
  const overflow = Math.max(0, (ends.at(-1)?.y ?? 0) - (top + plot - 20));

  return (
    <div ref={box} className="dam-chart chart" data-testid="dam-chart">
      <svg width={width} height={height} role="img" aria-label={`${label}. Range: ${format(domain[0])} to ${format(domain[1])} ${unit}. Selected: ${picked ? `${fmt(new Date(picked[0]).toISOString())}, ${format(picked[1])} ${unit}` : "past event"}.`}
        onPointerMove={pointer} onPointerDown={pointer} onPointerLeave={(event) => { if (event.pointerType === "mouse") setHover(undefined); }}>
        <text x={left} y={14}>{unit}</text>
        <g className="finding">
          <text x={left} y={29}>{finding.text}</text>
          {findingPoint && <line x1={x(findingPoint[0])} x2={x(findingPoint[0])} y1={top - 8} y2={y(findingPoint[1]) - 6} />}
        </g>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="grid" x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} />
            <text x={left - 6} y={y(tick) + 4} textAnchor="end">{format(tick)}</text>
          </g>
        ))}
        {months.map((month, i) => i % every === 0 && (
          <text key={month} x={x(month)} y={height - 6} textAnchor="middle">
            {new Date(month).toLocaleDateString("en-GB", { month: "short", year: (new Date(month).getUTCMonth() === 0 || t0 === t1) ? "numeric" : undefined, timeZone: "UTC" })}
          </text>
        ))}
        {rain?.map(([time, mm]) => (
          <rect data-testid="rain-bar" key={time} x={x(time) - 4} width={8} y={top + plot + 28 + (1 - mm / rainMax) * (rainHeight - 28)}
            height={(mm / rainMax) * (rainHeight - 28)} fill={RAIN} />
        ))}
        {rain && <g className="rain-axis">
          <text x={left} y={top + plot + 19}>Rain, mm (12 days, GPM)</text>
          {[0, rainMax].map((mm) => <g key={mm}>
            <line className="grid" x1={left} x2={width - right} y1={top + plot + rainHeight - mm / rainMax * (rainHeight - 28)} y2={top + plot + rainHeight - mm / rainMax * (rainHeight - 28)} />
            <text x={left - 6} textAnchor="end" y={top + plot + rainHeight - mm / rainMax * (rainHeight - 28) + 4}>{Math.round(mm)}</text>
          </g>)}
        </g>}
        {picked && <line className="guide" x1={x(picked[0])} x2={x(picked[0])} y1={top} y2={top + plot} />}
        {lines.map((line) => (
          <g key={line.label}>
            <polyline className="line" fill="none" stroke={line.color} strokeDasharray={line.dashed ? "6 5" : undefined}
              points={line.points.map(([time, value]) => `${x(time)},${y(value)}`).join(" ")} />
            {!line.dashed && line.points.map(([time, value]) => <circle key={time} cx={x(time)} cy={y(value)} r={3} fill={line.color} />)}
            {early(line) ? <text className="line-label" x={x(line.points.at(-1)![0]) - 10} y={y(line.points.at(-1)![1]) - 10} textAnchor="end" style={{ fill: line.color }}>{line.label}</text> : <>
            <line x1={x(line.points.at(-1)![0])} x2={x(line.points.at(-1)![0]) + 6} y1={y(line.points.at(-1)![1])} y2={ends.find((end) => end.line === line)!.y - overflow} stroke={line.color} />
            <text className="line-label" x={x(line.points.at(-1)![0]) + 8} y={ends.find((end) => end.line === line)!.y - overflow + 4} style={{ fill: line.color }}>
              {line.label.split(" ").reduce<string[][]>((rows, word) => {
                if (rows.at(-1)!.join(" ").length + word.length > (width < 500 ? 12 : 20)) rows.push([]);
                rows.at(-1)!.push(word); return rows;
              }, [[]]).map((row, i) => <tspan key={i} x={x(line.points.at(-1)![0]) + 8} dy={i ? 12 : 0}>{row.join(" ")}</tspan>)}
            </text></>}
          </g>
        ))}
        {picked && <circle className="selected" cx={x(picked[0])} cy={y(picked[1])} r={6} fill={lines[0].color} />}
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
      <output className="chart-readout">{reading && <>{fmt(new Date(reading[0]).toISOString())}: {lines.map((line) => {
        const point = line.points.find(([time]) => time === reading[0]);
        return point ? `${line.label}: ${format(point[1])} ${unit}` : null;
      }).filter(Boolean).join("; ")}</>}</output>
    </div>
  );
}

export type Band = "hh" | "hv";
export type RadarDisplay = Band | "color";
type RadarImages = { hh: string; hv: string };
type RadarProps = { caption: string; testId?: string } & (
  | { display: "color"; sources: RadarImages }
  | { display: "history" | Band; src: string }
);

function ColorComposite({ sources, caption }: { sources: RadarImages; caption: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${src}`));
      image.src = `/data/${src}`;
    });

    Promise.all([load(sources.hh), load(sources.hv)]).then(([hh, hv]) => {
      if (!active) return;
      if (hh.naturalWidth !== hv.naturalWidth || hh.naturalHeight !== hv.naturalHeight) throw new Error("Radar image sizes differ");
      const output = canvas.current?.getContext("2d");
      const layer = document.createElement("canvas");
      const input = layer.getContext("2d", { willReadFrequently: true });
      if (!canvas.current || !output || !input) throw new Error("Canvas is unavailable");

      layer.width = hh.naturalWidth;
      layer.height = hh.naturalHeight;
      canvas.current.width = hh.naturalWidth;
      canvas.current.height = hh.naturalHeight;
      input.drawImage(hh, 0, 0);
      const red = input.getImageData(0, 0, layer.width, layer.height);
      input.drawImage(hv, 0, 0);
      const green = input.getImageData(0, 0, layer.width, layer.height);
      for (let i = 0; i < red.data.length; i += 4) {
        red.data[i + 1] = green.data[i];
        red.data[i + 2] = Math.max(0, Math.min(255, Math.round(2 * (red.data[i] - green.data[i]))));
        red.data[i + 3] = 255;
      }
      output.putImageData(red, 0, 0);
      setStatus("ready");
    }).catch(() => {
      if (active) setStatus("error");
    });

    return () => { active = false; };
  }, [sources.hh, sources.hv]);

  return (
    <div className="radar-composite" aria-busy={status === "loading"}>
      <canvas ref={canvas} role="img" aria-label={caption} width={440} height={440} hidden={status !== "ready"} />
      {status === "loading" && <span className="radar-status" role="status">Loading color image…</span>}
      {status === "error" && <span className="radar-status" role="alert">Color image unavailable. Switch to HH or HV.</span>}
    </div>
  );
}

function ColorLegend() {
  return (
    <div className="radar-color-legend">
      <ul>
        <li><span className="radar-swatch radar-red" />Red shows HH return from −30 to 0 dB; brighter red means a stronger HH return.</li>
        <li><span className="radar-swatch radar-green" />Green shows HV return from −30 to 0 dB; brighter green means a stronger HV return.</li>
        <li><span className="radar-swatch radar-blue" />Blue shows the HH/HV power ratio on a fixed 0–15 dB stretch; brighter blue means HH is stronger relative to HV.</li>
      </ul>
      <p>Weak returns in both bands can be consistent with water; a stronger HV return can be consistent with vegetation. These signals do not identify land cover, water, or crops.</p>
    </div>
  );
}

export function Radar(props: RadarProps) {
  return (
    <figure className="dam-radar" data-testid={props.testId}>
      {props.display === "color" ? (
        <ColorComposite key={`${props.sources.hh}:${props.sources.hv}`} sources={props.sources} caption={props.caption} />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={`/data/${props.src}`} alt={props.caption} width={440} height={440} />
      )}
      <figcaption>{props.caption}</figcaption>
      {props.display === "color" && <ColorLegend />}
    </figure>
  );
}

const FRAME_MS = 300;

// The display buttons are left out when setDisplay is absent: a Sentinel-1 date has one band.
// The height of a value on the timeline staff, inside the same range as its chart.
export const note = (value: number, [low, high]: [number, number]): Note => ({ at: Math.max(0, Math.min(1, (value - low) / (high - low))) });

export function Picker({ label, max, index, setIndex, notes, display, setDisplay, children }: {
  label: string; max: number; index: number; setIndex: (index: number) => void; notes?: Note[];
  display: RadarDisplay; setDisplay?: (display: RadarDisplay) => void; children?: ReactNode;
}) {
  const play = usePlayback(max + 1, index, setIndex, FRAME_MS);
  return (
    <div className="dam-picker">
      <Timeline id="date" name="Date" count={max + 1} index={index} onIndex={setIndex} label={label} play={play} notes={notes} />
      {children}
      {setDisplay && (
        <div role="group" aria-label="Radar display">
          {(["hh", "hv", "color"] as const).map((mode) => (
            <button key={mode} type="button" aria-pressed={display === mode} onClick={() => setDisplay(mode)}>{mode === "color" ? "Color" : mode.toUpperCase()}</button>
          ))}
        </div>
      )}
    </div>
  );
}
