import { useState } from "react";
import type { Manifest } from "../../lib/data";

// The same scale as the map colours and the legend, so the line of one town compares with the line of another.
const LOW = 0.1;
const HIGH = 0.45;
const WIDTH = 296;
const HEIGHT = 166;
const LEFT = 34;
const RIGHT = 10;
const TOP = 34;
const BOTTOM = 44;

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default function SoilWaterLine({ name, values, shares, windows, index }: {
  name: string;
  values: (number | null)[];
  shares: number[];
  windows: Manifest["windows"];
  index: number;
}) {
  const [hover, setHover] = useState<number>();
  const x = (i: number) => LEFT + (i * (WIDTH - LEFT - RIGHT)) / Math.max(1, values.length - 1);
  const y = (value: number) => TOP + ((HIGH - Math.min(HIGH, Math.max(LOW, value))) * (HEIGHT - TOP - BOTTOM)) / (HIGH - LOW);
  // A window with no value ends the line. The next value starts a new piece, so a gap is never drawn as zero.
  const path = values.map((value, i) => value == null ? "" : `${values[i - 1] == null ? "M" : "L"}${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const selected = values[index];
  const withData = values.filter((value) => value != null).length;
  const end = values.findLastIndex((value) => value != null);
  const july = windows.findIndex((window) => window.start >= "2026-07-20" && window.start < "2026-08-01");
  const reading = hover === undefined ? undefined : values[hover];
  const pointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const at = (event.clientX - box.left) * WIDTH / box.width;
    setHover(Math.max(0, Math.min(values.length - 1, Math.round((at - LEFT) / Math.max(1, x(values.length - 1) - LEFT) * (values.length - 1)))));
  };

  return (
    <figure className="soil-line chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        data-testid="soil-line"
        onPointerMove={pointer}
        onPointerLeave={(event) => { if (event.pointerType === "mouse") setHover(undefined); }}
        onPointerDown={pointer}
        // The name has no "window" or "town" in it: the slider and the list are found by those labels.
        aria-label={`Soil water of ${name}: ${values.length} values, ${day(windows[0].start)} to ${day(windows[windows.length - 1].end)}, ${withData} with data. Range: ${LOW} to ${HIGH} m³/m³. Selected: ${selected == null ? "no data" : `${selected.toFixed(3)} m³/m³`}.`}
      >
        <text className="tick" x={LEFT} y={14}>m³/m³</text>
        {[HIGH, (LOW + HIGH) / 2, LOW].map((tick) => (
          <g key={tick}>
            <line className="grid" x1={LEFT} x2={WIDTH - RIGHT} y1={y(tick)} y2={y(tick)} />
            <text className="tick" x={LEFT - 6} y={y(tick) + 3.5} textAnchor="end">{tick.toFixed(2)}</text>
          </g>
        ))}
        <line className="guide" data-testid="soil-line-window" x1={x(index)} x2={x(index)} y1={TOP} y2={HEIGHT - BOTTOM} />
        <path className="line" d={path} />
        {values.map((value, i) => value != null && (
          <circle
            key={i}
            data-window={i}
            className={[i === index ? "selected" : "", shares[i] < 0.5 ? "low" : ""].join(" ").trim() || undefined}
            cx={x(i)}
            cy={y(value)}
            r={i === index ? 6 : 3}
          />
        ))}
        {end >= 0 && <text className="line-label" x={x(end)} y={HEIGHT - 24} textAnchor="end">2026, NISAR</text>}
        {july >= 0 && values[july] != null && <g className="finding">
          <line x1={x(july)} x2={x(july)} y1={TOP - 10} y2={y(values[july]) - 5} />
          <text x={LEFT + 30} y={26}>Late July{values[july - 1] != null && values[july]! < values[july - 1]! ? " fall" : ""}: {values[july]!.toFixed(3)}</text>
        </g>}
        <text className="tick" x={LEFT} y={HEIGHT - 6}>{day(windows[0].start)}</text>
        <text className="tick" x={WIDTH - RIGHT} y={HEIGHT - 6} textAnchor="end">{day(windows[windows.length - 1].end)}</text>
      </svg>
      <output className="chart-readout">{hover !== undefined && <>{day(windows[hover].start)}: {reading == null ? "No data" : `${reading.toFixed(3)} m³/m³`}</>}</output>
      <figcaption>
        Soil water in m³/m³ for each 12-day window. A gap is a window with no data.
        {shares.some((share, i) => values[i] != null && share < 0.5) && " An open circle has data on less than half of the town."}
      </figcaption>
    </figure>
  );
}
