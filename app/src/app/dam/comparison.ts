import type { Target } from "../../../lib/data";

export type Point = { date: string; value: number | null };
export type PercentSeries = { label: string; baseline: string; points: Point[]; sensor?: NonNullable<Target["history"]>[number]["sensor"] };
type HistoryEvent = NonNullable<Target["history"]>[number]["event"];
const events: HistoryEvent[] = ["1997–98", "2015–16", "2023–24"];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function area(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
export function percentSeries(dates: string[], areas: unknown[], baseline: number): Point[] {
  return dates.map((date, index) => {
    const value = area(areas[index]);
    return { date, value: value === null ? null : (value / baseline - 1) * 100 };
  });
}
export function parseComparison(history: unknown, scenarios: unknown, latest: { date: string; area: number | null }) {
  const past: PercentSeries[] = [];
  for (const entry of Array.isArray(history) ? history : []) {
    if (!record(entry) || typeof entry.event !== "string" || !events.some(event => event === entry.event) ||
        !["Sentinel-1", "RADARSAT-1"].includes(String(entry.sensor)) ||
        !Array.isArray(entry.dates) || !entry.dates.length || !entry.dates.every(validDate) ||
        !Array.isArray(entry.waterAreaKm2)) continue;
    const dates: string[] = entry.dates;
    if (dates.some((date, index) => index > 0 && date <= dates[index - 1])) continue;
    if (entry.sensor !== "Sentinel-1" && entry.sensor !== "RADARSAT-1") continue;
    const baseline = area(entry.waterAreaKm2[0]);
    if (baseline === null || baseline <= 0) continue;
    past.push({ sensor: entry.sensor, label: entry.event, baseline: entry.dates[0], points: percentSeries(entry.dates, entry.waterAreaKm2, baseline) });
  }
  const future: PercentSeries[] = [];
  if (latest.area === null || latest.area <= 0) return { past, future };
  for (const entry of Array.isArray(scenarios) ? scenarios : []) {
    if (!record(entry) || !["2015–16", "2023–24"].includes(String(entry.basedOn)) ||
        !Array.isArray(entry.months) || !entry.months.length || !Array.isArray(entry.waterAreaKm2) ||
        entry.months.length !== entry.waterAreaKm2.length || entry.months[0] !== latest.date.slice(0, 7) ||
        entry.months.some((month: unknown) => typeof month !== "string" || !validDate(`${month}-01`))) continue;
    const first = area(entry.waterAreaKm2[0]);
    if (first === null || Math.abs(first - latest.area) > 0.001) continue;
    const months: string[] = entry.months;
    if (months.some((month, index) => index > 0 && month <= months[index - 1])) continue;
    const points = percentSeries(months.map((month, index) => index === 0 ? latest.date : `${month}-01`), entry.waterAreaKm2, latest.area);
    const withGaps = points.flatMap((point, index) => {
      if (!index) return [point];
      const previous = new Date(`${months[index - 1]}-01T00:00:00Z`);
      previous.setUTCMonth(previous.getUTCMonth() + 1);
      return months[index] === previous.toISOString().slice(0, 7) ? [point] : [{ date: previous.toISOString().slice(0, 10), value: null }, point];
    });
    future.push({ label: `If ${entry.basedOn} repeats`, baseline: latest.date, points: withGaps });
  }
  return { past, future };
}
