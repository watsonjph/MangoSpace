import { expect, test } from "@playwright/test";
import type { Lgu } from "../lib/data";

test("the town borders and the town list have the same 101 real towns", async ({ request }) => {
  const response = await request.get("/data/lgus.geojson");
  const borders: { features: { properties: { psgc: string; name: string } }[] } = await response.json();
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();

  expect((await response.body()).length).toBeLessThan(1_000_000);
  expect(lgus.filter((l) => l.province === "Cebu")).toHaveLength(53);
  expect(lgus.filter((l) => l.province === "Bohol")).toHaveLength(48);
  for (const l of lgus) {
    expect(l.psgc, l.name).toMatch(/^07\d{8}$/);
    expect(l.population, l.name).toBeGreaterThan(0);
  }
  expect(borders.features.map((f) => f.properties.psgc).sort()).toEqual(lgus.map((l) => l.psgc).sort());
  expect(new Set(lgus.map((l) => l.psgc)).size).toBe(101);
});
