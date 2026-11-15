import type { Lgu } from "../../lib/data";
import type { Note } from "./Timeline";

export const LOW = 0.1;
export const HIGH = 0.45;

export const soilHeight = (value: number) => Math.max(0, Math.min(1, (value - LOW) / (HIGH - LOW)));

// The mean of the towns with data on half of their area or more, the same rule as the map colors.
// A mean from fewer than 80% of the most towns in any window is weak.
export function soilMeans(windows: number, lgus: Lgu[]) {
  const means = Array.from({ length: windows }, (_, i) => {
    const values = lgus.flatMap((lgu) => lgu.soilMoisture[i] != null && lgu.validShare[i] >= 0.5 ? [lgu.soilMoisture[i]!] : []);
    return { towns: values.length, mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
  });
  const mostTowns = Math.max(...means.map((m) => m.towns));
  return means.map(({ towns, mean }) => {
    const note: Note = mean == null ? null : { at: soilHeight(mean), weak: towns < mostTowns * 0.8 };
    return { towns, mean, note };
  });
}
