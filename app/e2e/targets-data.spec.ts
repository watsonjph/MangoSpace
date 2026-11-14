import { expect, test } from "@playwright/test";
import type { Target } from "../lib/data";

test("every Malinao Dam date has a water area and HH and HV images that load", async ({ page, request }) => {
  const targets: Target[] = await (await request.get("/data/targets.json")).json();
  const { dates, images, waterAreaKm2 } = targets.find((target) => target.id === "malinao-dam")!.nisar;
  expect(dates.length).toBeGreaterThan(0);
  expect(images).toHaveLength(dates.length);
  expect(waterAreaKm2).toHaveLength(dates.length);

  for (const path of images.flatMap((image) => [image.hh, image.hv])) {
    await page.goto(`/data/${path}`);
    const size = await page.evaluate(() => [document.images[0].naturalWidth, document.images[0].naturalHeight]);
    expect(size, path).toEqual([440, 440]);
  }
});

for (const id of ["ubay-rice", "pilar-rice"]) {
  test(`${id} has aligned HV measurements and radar images that decode`, async ({ page, request }) => {
    const response = await request.get("/data/targets.json");
    expect(response.ok()).toBe(true);
    const targets: Target[] = await response.json();
    const target = targets.find((item) => item.id === id);
    if (!target) throw new Error(`Missing rice target: ${id}`);
    expect(target.kind).toBe("rice");

    const { dates, images, meanHvDb } = target.nisar;
    expect(dates.length).toBeGreaterThanOrEqual(2);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
    expect(images).toHaveLength(dates.length);
    expect(meanHvDb).toHaveLength(dates.length);
    if (!meanHvDb) throw new Error(`Missing HV measurements: ${id}`);
    for (const value of meanHvDb) expect(Number.isFinite(value)).toBe(true);

    let expectedSize: number[] | undefined;
    for (const path of images.flatMap((image) => [image.hh, image.hv])) {
      expect(path).not.toContain("placeholder");
      const imageResponse = await page.goto(`/data/${path}`);
      expect(imageResponse?.ok(), path).toBe(true);
      const size = await page.evaluate(() => [document.images[0].naturalWidth, document.images[0].naturalHeight]);
      expect(size[0], path).toBeGreaterThan(0);
      expect(size[1], path).toBeGreaterThan(0);
      if (expectedSize) expect(size, path).toEqual(expectedSize);
      else expectedSize = size;
    }

    const cBand = target.cBand;
    if (!cBand) throw new Error(`Missing Sentinel-1 pair: ${id}`);
    expect(dates).toContain(cBand.nisarDate);
    for (const value of Object.values(cBand.meanDb)) expect(Number.isFinite(value)).toBe(true);
    for (const path of [cBand.images.vv, cBand.images.vh]) {
      expect(path).toContain(cBand.date);
      const imageResponse = await page.goto(`/data/${path}`);
      expect(imageResponse?.ok(), path).toBe(true);
      const size = await page.evaluate(() => [document.images[0].naturalWidth, document.images[0].naturalHeight]);
      expect(size, path).toEqual(expectedSize);
    }
  });
}

test("every Malinao Dam history date has a water area and a Sentinel-1 image that loads", async ({ page, request }) => {
  const targets: Target[] = await (await request.get("/data/targets.json")).json();
  const history = targets.find((target) => target.id === "malinao-dam")!.history ?? [];
  expect(history.length).toBeGreaterThan(0);

  for (const { event, dates, images, waterAreaKm2 } of history) {
    expect(dates.length, event).toBeGreaterThan(0);
    expect(dates, event).toEqual([...dates].sort());
    expect(images, event).toHaveLength(dates.length);
    expect(waterAreaKm2, event).toHaveLength(dates.length);
    for (const path of images) {
      expect(path).not.toContain("placeholder");
      await page.goto(`/data/${path}`);
      const size = await page.evaluate(() => [document.images[0].naturalWidth, document.images[0].naturalHeight]);
      expect(size, path).toEqual([440, 440]);
    }
  }
});
