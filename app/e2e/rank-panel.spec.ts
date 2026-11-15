import { expect, test } from "@playwright/test";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Lgu } from "../lib/data";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

test("the rank preview is in the town panel only, and missing soil water is clear", async ({ page, request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const stable = lgus.find((town) => town.rank?.stable)!;
  const unranked = lgus.find((town) => town.rank == null)!;
  const tubigon = lgus.find((town) => town.psgc === "0701245000")!;

  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  // An old shared link can still carry mode=rank. The map ignores it.
  await page.goto(`/?town=${stable.psgc}&window=3&mode=rank`);
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await page.waitForFunction(() => window.hubasMap?.isSourceLoaded("lgus"));

  await expect(page.getByRole("button", { name: "Rank" })).toHaveCount(0);
  await expect(page.getByTestId("map-legend")).toContainText("0.10 m³/m³ · drier");
  await expect(page.getByTestId("map-legend")).not.toContainText("Rank");
  const fill = await page.evaluate(() => JSON.stringify(window.hubasMap!.getPaintProperty("soil", "fill-color")));
  expect(fill).toContain("#4cc3cf");
  expect(await page.evaluate((id) => window.hubasMap!.getFeatureState({ source: "lgus", id }), stable.psgc)).not.toHaveProperty("rankScore");
  expect(await page.evaluate(() => window.hubasMap!.getFilter("selected")), "the selected town has an outline").toEqual(["==", ["get", "psgc"], stable.psgc]);

  await expect(page.locator(".panel dt").filter({ hasText: "Rank preview" })).toContainText("7 Oct to 19 Oct 2026");
  await expect(page.getByTestId("rank")).toContainText(`#${stable.rank!.position} of ${stable.rank!.of} ranked · look here first`);
  await expect(page.locator(".stable-mark")).toHaveText("Stable");
  for (const [key, label] of [["dryness", "Dryness"], ["dryingSpeed", "Drying speed"], ["people", "People"]] as const) {
    const percent = Math.round(stable.rank!.parts[key] * 100);
    await expect(page.getByRole("progressbar", { name: `${label}: ${percent}%` })).toHaveAttribute("value", String(percent));
  }
  await expect(page.locator("main")).not.toContainText(/\b(?:risk|drought)\b/i);
  await saveProof(page, "sc-450-rank-in-panel-desktop.png");

  await page.getByLabel("Town").selectOption(unranked.psgc);
  await expect(page.getByTestId("rank")).toHaveText("Not ranked");

  await page.getByLabel("Town").selectOption(tubigon.psgc);
  await page.getByLabel("Window").fill("3");
  await expect(page.getByTestId("moisture")).toHaveText("No data");
  await expect(page.getByTestId("rank")).toContainText(`#${tubigon.rank!.position} of ${tubigon.rank!.of} ranked`);
  expect(tubigon.rank!.position).toBeGreaterThan(10);
  await expect(page.getByTestId("rank")).not.toContainText("look here first");
  await page.waitForFunction(() => window.hubasMap?.getFeatureState({ source: "lgus", id: "0701245000" }).sm === null);
  await saveProof(page, "sc-233-no-data-desktop.png");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByLabel("Town").selectOption(stable.psgc);
  await expect(page.getByRole("progressbar", { name: /^Dryness:/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await saveProof(page, "sc-450-rank-in-panel-mobile.png");
});

test("with no town selected the panel shows the mean of all the towns", async ({ page, request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const values = lgus.flatMap((town) => town.soilMoisture[4] != null && town.validShare[4] >= 0.5 ? [town.soilMoisture[4]!] : []);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  await useOfflineBasemap(page);
  await page.goto("/?window=4");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await expect(page.getByTestId("mean")).toHaveText(`${mean.toFixed(3)} m³/m³`);
  await expect(page.locator(".panel")).toContainText(`${values.length} of ${lgus.length}`);
});
