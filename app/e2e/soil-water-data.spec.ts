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

test("the rank is a full order of the towns with data, and the panel shows it", async ({ page, request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
  const ranked = lgus.filter((l) => l.rank !== null);
  expect(ranked.length).toBeGreaterThan(0);
  expect(ranked.map((l) => l.rank!.position).sort((a, b) => a - b)).toEqual(ranked.map((_, i) => i + 1));
  for (const { name, rank } of ranked) {
    expect(rank!.of, name).toBe(ranked.length);
    for (const part of Object.values(rank!.parts)) {
      expect(part, name).toBeGreaterThanOrEqual(0);
      expect(part, name).toBeLessThanOrEqual(1);
    }
  }
  const stable = ranked.filter((l) => l.rank!.stable);
  expect(stable.every((l) => l.rank!.position <= 10)).toBe(true);
  // A town with no data on half of its area in any window cannot have a rank.
  for (const l of lgus.filter((l) => l.validShare.every((share) => share < 0.5))) expect(l.rank, l.name).toBeNull();

  const first = ranked.find((l) => l.rank!.position === 1)!;
  const unranked = lgus.find((l) => l.rank === null)!;
  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await page.getByLabel("Window").fill("9");
  await page.getByLabel("Town").selectOption(unranked.psgc);
  await expect(page.getByTestId("rank")).toHaveText("Not ranked");
  await page.getByLabel("Town").selectOption(first.psgc);
  await expect(page.getByTestId("rank")).toHaveText(`#1 of ${ranked.length}`);
  const rankWin = manifest.windows[manifest.rankWindow!];
  await expect(page.locator(".panel dt").first()).toHaveText(`Rank, ${rankWin.start} → ${rankWin.end}`);
  await page.waitForFunction(() => window.hubasMap!.loaded());
  await page.screenshot({ path: path.resolve(process.cwd(), "..", "docs", "proof", "sc-120-rank-first-town.png"), fullPage: true });
});

test("the method page gives the SMAP check numbers", async ({ page }) => {
  await page.goto("/method");
  const check = page.getByTestId("smap-check");
  await expect(check).toContainText("lower than SMAP by 0.07 m³/m³");
  await expect(check).toContainText("0.11 m³/m³");
  await expect(check).toContainText("correlation 0.70");
  await expect(page.getByTestId("rank-smap")).toContainText("SMAP does not confirm which towns are drier");
  await check.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.resolve(process.cwd(), "..", "docs", "proof", "sc-163-method-smap.png") });
});
