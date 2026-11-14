import type { PercentSeries, Point } from "./comparison";

const colors = ["#a65b20", "#72558c"];
export function signed(value: number) { return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`; }
function dateLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
}
function PercentChart({ series, label, range }: { series: { label: string; points: Point[]; color: string; dashed?: boolean }[]; label: string; range?: { min: number; max: number } }) {
  const points = series.flatMap(line => line.points);
  const dates = points.map(point => Date.parse(point.date));
  const values = points.flatMap(point => point.value === null ? [] : [point.value]);
  if (!dates.length || !values.length) return <p>No comparison measurements available.</p>;
  const start = Math.min(...dates), end = Math.max(...dates);
  const min = range?.min ?? Math.floor(Math.min(...values, -5) / 10) * 10;
  const max = range?.max ?? Math.ceil(Math.max(...values, 5) / 10) * 10;
  const x = (date: string) => 110 + (Date.parse(date) - start) / (end - start || 1) * 588;
  const y = (value: number) => 230 - (value - min) / (max - min) * 180;
  return <svg className="comparison-chart" viewBox="0 0 760 292" role="img" aria-label={label}>
    {[min, 0, max].map(tick => <g key={tick}>
      <line x1="110" x2="698" y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? "#9eb5af" : "#e1e9e5"} strokeDasharray={tick === 0 ? "4 4" : undefined} />
      <text x="98" y={y(tick) + 5} textAnchor="end">{tick > 0 ? "+" : ""}{tick}%</text>
    </g>)}
    <text x="110" y="24">Change in water area</text>
    {series.map(line => <g key={line.label}>
      <path data-series={line.label} d={line.points.map((point, index) => point.value === null ? "" : `${!index || line.points[index - 1].value === null ? "M" : "L"}${x(point.date)},${y(point.value)}`).join(" ")}
        fill="none" stroke={line.color} strokeWidth="3" strokeDasharray={line.dashed ? "8 6" : undefined} />
      {line.points.map(point => point.value !== null && <circle key={point.date} cx={x(point.date)} cy={y(point.value)} r="3" fill={line.color}>
        <title>{line.label}, {point.date}: {signed(point.value)}</title>
      </circle>)}
    </g>)}
    {[0, 0.5, 1].map(fraction => <text key={fraction} x={110 + fraction * 588} y="266" textAnchor={fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"}>
      {dateLabel(new Date(start + (end - start) * fraction).toISOString().slice(0, 10))}
    </text>)}
  </svg>;
}
export default function ThenAndNow({ current, history, scenarios, latestDate }: { current: Point[]; history: PercentSeries[]; scenarios: PercentSeries[]; latestDate: string }) {
  const historyValues = history.flatMap(line => line.points.flatMap(point => point.value === null ? [] : [point.value]));
  const historyRange = { min: Math.floor(Math.min(...historyValues, -5) / 10) * 10, max: Math.ceil(Math.max(...historyValues, 5) / 10) * 10 };
  return <section className="then-and-now" aria-labelledby="then-heading" id="then-and-now">
    <div className="section-heading"><div><p className="eyebrow">02 / A longer view</p><h2 id="then-heading">Then and now</h2></div><span className="section-tag">Measured history · conditional scenarios</span></div>
    <div className="scenario-card">
      <div className="chart-heading"><div><h3>What if a past pattern repeats?</h3><p>Observed 2026 changes meet two possible seasonal paths.</p></div><span className="scenario-badge">Scenario, not forecast</span></div>
      {current.length ? <>
        <div className="chart-legend"><span><i style={{ borderColor: "#126b66" }} />2026 · observed</span>{scenarios.map((line, index) => <span key={line.label}><i className="dashed" style={{ borderColor: colors[index % colors.length] }} />{line.label}</span>)}</div>
        <PercentChart label="2026 observations and conditional scenario changes, in percent" series={[
          { label: "2026 observed", points: current, color: "#126b66" },
          ...scenarios.map((line, index) => ({ ...line, color: colors[index % colors.length], dashed: true })),
        ]} />
        <p className="baseline-note">0% is the measured NISAR area on {latestDate}. The solid line shows observations. Dashed lines apply each past event’s monthly average pattern to that starting area; points after the starting date are conditional monthly values, not observations.</p>
        {!scenarios.length && <p>No scenario data available.</p>}
      </> : <p>A positive latest water-area measurement is needed for this comparison.</p>}
      <p className="scenario-disclaimer">This is what happened before. It is not a forecast.</p>
    </div>
    <div className="section-heading history-heading"><div><h3>What the satellites recorded before</h3><p>Separate baselines, one percentage scale. Compare changes, not absolute sensor areas.</p></div></div>
    <div className="history-grid">{history.map((line, index) => {
      const measured = line.points.flatMap(point => point.value === null ? [] : [point.value]);
      const low = Math.min(...measured);
      const lowest = line.points.find(point => point.value === low);
      return <article className="history-card" key={line.label} aria-label={`${line.label} historical event`}>
        <div className="history-card-heading"><div><p className="eyebrow">{line.sensor} · measured</p><h4>{line.label}</h4></div><div className="history-low"><strong>{signed(low)}</strong><span>lowest vs first reading</span></div></div>
        <PercentChart label={`${line.label} historical water-area change, in percent`} range={historyRange} series={[{ ...line, color: colors[index % colors.length] }]} />
        <p className="baseline-note">0% = first reading on {line.baseline}. Lowest on {lowest?.date}. Radar shows the change, not its cause.</p>
        <details><summary>View percentage measurements</summary><table><caption>{line.label} · change from first reading</caption><thead><tr><th scope="col">Date</th><th scope="col">Change</th></tr></thead><tbody>{line.points.map(point => <tr key={point.date}><th scope="row">{point.date}</th><td>{point.value === null ? "Not available" : signed(point.value)}</td></tr>)}</tbody></table></details>
      </article>;
    })}</div>
    {!history.length && <p className="comparison-empty">Historical measurements are not available.</p>}
  </section>;
}
