import type { Manifest } from "../../lib/data";

// The same scale as the map colours and the legend, so the line of one town compares with the line of another.
const LOW = 0.1;
const HIGH = 0.45;
const WIDTH = 296;
const HEIGHT = 132;
const LEFT = 34;
const RIGHT = 10;
const TOP = 10;
const BOTTOM = 24;

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default function SoilWaterLine({ name, values, shares, windows, index }: {
  name: string;
  values: (number | null)[];
  shares: number[];
  windows: Manifest["windows"];
  index: number;
}) {
  const x = (i: number) => LEFT + (i * (WIDTH - LEFT - RIGHT)) / Math.max(1, values.length - 1);
  const y = (value: number) => TOP + ((HIGH - Math.min(HIGH, Math.max(LOW, value))) * (HEIGHT - TOP - BOTTOM)) / (HIGH - LOW);
  // A window with no value ends the line. The next value starts a new piece, so a gap is never drawn as zero.
  const path = values.map((value, i) => value == null ? "" : `${values[i - 1] == null ? "M" : "L"}${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const selected = values[index];
  const withData = values.filter((value) => value != null).length;

  return (
    <figure className="soil-line">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        data-testid="soil-line"
        // The name has no "window" or "town" in it: the slider and the list are found by those labels.
        aria-label={`Soil water of ${name}: ${values.length} values, ${day(windows[0].start)} to ${day(windows[windows.length - 1].end)}, ${withData} with data. Selected: ${selected == null ? "no data" : `${selected.toFixed(3)} m³/m³`}.`}
      >
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
            r={i === index ? 5 : 3}
          />
        ))}
        <text className="tick" x={LEFT} y={HEIGHT - 6}>{day(windows[0].start)}</text>
        <text className="tick" x={WIDTH - RIGHT} y={HEIGHT - 6} textAnchor="end">{day(windows[windows.length - 1].start)}</text>
      </svg>
      <figcaption>
        Soil water in m³/m³ for each 12-day window. A gap is a window with no data.
        {shares.some((share, i) => values[i] != null && share < 0.5) && " An open circle has data on less than half of the town."}
      </figcaption>
    </figure>
  );
}
