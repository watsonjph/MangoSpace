import type { Target } from "../../../lib/data";
import { validDate } from "../dam/comparison";

export const samples = [
  { id: "ubay-rice", name: "Ubay", pixels: 16 },
  { id: "pilar-rice", name: "Pilar", pixels: 24 },
] satisfies { id: Target["id"]; name: string; pixels: number }[];
export type RiceObservation = { date: string; images: Target["nisar"]["images"][number]; hv: number | null };
export type RiceSample = { id: string; name: string; pixels: number; track: number; observations: RiceObservation[] };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseRice(value: unknown): RiceSample[] {
  if (!Array.isArray(value)) throw new Error("Missing targets");
  return samples.flatMap(sample => {
    const entry: unknown = value.find((item: unknown) => record(item) && item.id === sample.id);
    if (!record(entry) || entry.kind !== "rice" || !record(entry.nisar)) return [];
    const { track, dates, images, meanHvDb } = entry.nisar;
    if (typeof track !== "number" || !Number.isInteger(track) || track < 1 ||
        !Array.isArray(dates) || !Array.isArray(images) || dates.length !== images.length) return [];
    const observations: RiceObservation[] = [];
    for (const [index, date] of dates.entries()) {
      const image: unknown = images[index];
      if (!validDate(date) || (index > 0 && date <= dates[index - 1]) || !record(image) ||
          typeof image.hh !== "string" || typeof image.hv !== "string" ||
          !/^targets\/[\w.-]+\.png$/.test(image.hh) || !/^targets\/[\w.-]+\.png$/.test(image.hv)) return [];
      const hv: unknown = Array.isArray(meanHvDb) ? meanHvDb[index] : null;
      observations.push({ date, images: { hh: image.hh, hv: image.hv }, hv: typeof hv === "number" && Number.isFinite(hv) ? hv : null });
    }
    return [{ ...sample, track, observations }];
  });
}
