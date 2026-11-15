import path from "node:path";
import { expect, test } from "@playwright/test";
import type { Lgu, Manifest } from "../lib/data";
import { useOfflineBasemap } from "./offline-basemap";

const BOGO = "0702211000";
const TUBIGON = "0701245000";

test("every town has real soil water and coverage for each window", async ({ request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
  expect(manifest.sme2Status).toBe("provisional");
  expect(manifest.windows[0].start).toBe("2026-06-21");

  for (const lgu of lgus) {
    expect(lgu.soilMoisture, lgu.name).toHaveLength(manifest.windows.length);
    expect(lgu.validShare, lgu.name).toHaveLength(manifest.windows.length);
    expect(lgu.soilMoisture.some((value) => value !== null), lgu.name).toBe(true);
    lgu.soilMoisture.forEach((value, i) => {
      const share = lgu.validShare[i];
      expect(share, lgu.name).toBeGreaterThanOrEqual(0);
      expect(share, lgu.name).toBeLessThanOrEqual(1);
      expect(value === null, `${lgu.name} window ${i}`).toBe(share === 0);
      if (value !== null) {
        expect(value, lgu.name).toBeGreaterThan(0);
        expect(value, lgu.name).toBeLessThan(1);
      }
    });
  }
});

test("the map and the panel show a town with data and a town with no data in a window", async ({ page, request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const bogo = lgus.find((l) => l.psgc === BOGO)!;
  const tubigon = lgus.find((l) => l.psgc === TUBIGON)!;
  expect(bogo.soilMoisture[0]).not.toBeNull();
  expect(tubigon.soilMoisture[3]).toBeNull();
  const state = (psgc: string) => page.evaluate((id) => window.hubasMap!.getFeatureState({ source: "lgus", id }).sm, psgc);
  const proof = (name: string) => page.screenshot({ path: path.resolve(process.cwd(), "..", "docs", "proof", name), fullPage: true });

  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await page.waitForFunction(() => window.hubasMap?.isSourceLoaded("lgus"));

  await page.getByLabel("Town").selectOption(BOGO);
  await expect(page.getByTestId("moisture")).toHaveText(`${bogo.soilMoisture[0]!.toFixed(3)} m³/m³`);
  await expect.poll(() => state(BOGO)).toBe(bogo.soilMoisture[0]);
  await page.waitForFunction(() => window.hubasMap!.loaded());
  await proof("sc-71-map-window-1.png");

  await page.getByLabel("Window").fill("3");
  await page.getByLabel("Town").selectOption(TUBIGON);
  await expect(page.getByTestId("moisture")).toHaveText("No good pixels");
  await expect.poll(() => state(TUBIGON)).toBeNull();
  await expect.poll(() => state(BOGO)).toBe(bogo.soilMoisture[3]);
  await page.waitForFunction(() => window.hubasMap!.loaded());
  await proof("sc-71-map-window-4.png");
});
