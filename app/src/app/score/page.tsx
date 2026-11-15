import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import type { IsoDate, Lgu, Manifest, Target } from "../../../lib/data";
import { soilMeans } from "../soil-mean";
import ScoreView, { type Part } from "./ScoreView";

export const metadata: Metadata = { title: "Score · Hubas" };

async function load<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(process.cwd(), "public/data", file), "utf8"));
}

const YEAR = "2026";
const mid = (start: IsoDate, end: IsoDate) => new Date((Date.parse(start) + Date.parse(end)) / 2).toISOString().slice(0, 10);
const passes = (target: Target, values: number[]) =>
  target.nisar.dates.flatMap((date, i) => date.startsWith(YEAR) ? [{ date, value: values[i] }] : []);
const db = (value: number) => `${value.toFixed(1).replace("-", "−")} dB`;

export default async function Page() {
  const [manifest, lgus, targets] = await Promise.all([
    load<Manifest>("manifest.json"),
    load<Lgu[]>("lgus.json"),
    load<Target[]>("targets.json"),
  ]);
  const target = (id: Target["id"]) => targets.find((t) => t.id === id)!;
  const dam = target("malinao-dam");
  const water = passes(dam, dam.nisar.waterAreaKm2!);
  // Zero at the bottom of the dam staff, so a small change in area looks small.
  const top = Math.ceil(Math.max(...water.map((p) => p.value)));
  const rice = (["ubay-rice", "pilar-rice"] as const).map((id) => ({ name: id === "ubay-rice" ? "Ubay" : "Pilar", values: passes(target(id), target(id).nisar.meanHvDb!) }));
  const hv = rice.flatMap((r) => r.values.map((p) => p.value));
  const [low, high] = [Math.min(...hv) - 1, Math.max(...hv) + 1];

  const parts: Part[] = [
    {
      voice: "soil", title: "Soil water, mean of the towns", sentence: "The soil goes down at the end of July.",
      notes: soilMeans(manifest.windows.length, lgus).flatMap(({ mean, note }, i) => mean == null || !note ? [] : [{
        date: mid(manifest.windows[i].start, manifest.windows[i].end), at: note.at, weak: note.weak,
        label: `${mean.toFixed(3)} m³/m³${note.weak ? ", fewer towns" : ""}`,
      }]),
    },
    {
      voice: "dam", title: "Malinao Dam, water area", sentence: "The dam does not move.",
      notes: water.map(({ date, value }) => ({ date, at: value / top, label: `${value.toFixed(2)} km²` })),
    },
    {
      voice: "rice", title: "Rice, HV signal of Ubay and Pilar", sentence: "The rice goes up, then down in November.",
      notes: rice.flatMap(({ name, values }) => values.map(({ date, value }) => ({
        date, at: (value - low) / (high - low), label: `${name} ${db(value)}`, series: name,
      }))),
    },
  ];
  const rain = passes(dam, dam.rainMm).map(({ date, value }) => ({ date, mm: value }));
  const steps = [...new Set(parts.flatMap((part) => part.notes.map((note) => note.date)))].sort();

  return <ScoreView parts={parts} rain={rain} steps={steps} start={manifest.windows[0].start} end={water.at(-1)!.date} />;
}
