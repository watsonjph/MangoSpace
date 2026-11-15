import type { Target } from "../../../lib/data";

export function withDamFixture(dam: Target, fixture: string): Target {
  if (fixture === "empty") {
    return { ...dam, nisar: { ...dam.nisar, waterAreaKm2: undefined } };
  }

  if (fixture === "single-date") {
    return {
      ...dam,
      nisar: {
        ...dam.nisar,
        dates: dam.nisar.dates.slice(0, 1),
        images: dam.nisar.images.slice(0, 1),
        waterAreaKm2: dam.nisar.waterAreaKm2?.slice(0, 1),
      },
      rainMm: dam.rainMm.slice(0, 1),
      history: [],
      scenarios: [],
    };
  }

  return dam;
}
