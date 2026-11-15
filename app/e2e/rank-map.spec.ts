import { expect, test } from "@playwright/test";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Lgu, Manifest } from "../lib/data";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

test("rank preview colors, parts, and missing soil water are clear", async ({ page, request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
  const stable = lgus.find((town) => town.rank?.stable)!;
  const unranked = lgus.find((town) => town.rank == null)!;
  const tubigon = lgus.find((town) => town.psgc === "0701245000")!;
  const rankWindow = manifest.windows[manifest.rankWindow!]!;

  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/?town=${stable.psgc}&window=3`);
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await page.waitForFunction(() => window.hubasMap?.isSourceLoaded("lgus"));

  await page.getByRole("button", { name: "Rank" }).click();
  await expect(page.getByRole("button", { name: "Rank" })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/mode=rank$/);
  await expect(page.getByTestId("map-legend")).toContainText("Rank preview");
  await expect(page.getByTestId("map-legend")).toContainText("Later on the list");
  await expect(page.getByTestId("map-legend")).toContainText("Look here first");
  await expect(page.getByTestId("map-legend")).toContainText("Not ranked");
  await expect(page.getByTestId("map-legend")).toContainText("Gold outline: stable in checks");
  await expect(page.locator(".panel dt").filter({ hasText: "Rank preview" })).toContainText(`${rankWindow.start} → ${rankWindow.end}`);
  await expect(page.getByTestId("rank")).toContainText(`#${stable.rank!.position} of ${stable.rank!.of} ranked · look here first`);
  await expect(page.locator(".stable-mark")).toHaveText("Stable");

  for (const [key, label] of [["dryness", "Dryness"], ["dryingSpeed", "Drying speed"], ["people", "People"]] as const) {
    const percent = Math.round(stable.rank!.parts[key] * 100);
    await expect(page.getByRole("progressbar", { name: `${label}: ${percent}%` })).toHaveAttribute("value", String(percent));
  }

  const rankColor = await page.evaluate(() => JSON.stringify(window.hubasMap!.getPaintProperty("soil", "fill-color")));
  const stableOutline = await page.evaluate(() => JSON.stringify(window.hubasMap!.getPaintProperty("soil", "fill-outline-color")));
  expect(rankColor).toContain("#45236c");
  expect(rankColor).toContain("#d4c5e8");
  expect(stableOutline).toContain("#d98d00");
  await expect(page.locator("main")).not.toContainText(/\b(?:risk|drought)\b/i);
  await saveProof(page, "sc-126-rank-map-desktop.png");

  await page.getByLabel("Town").selectOption(unranked.psgc);
  await expect(page.getByTestId("rank")).toHaveText("Not ranked");
  await page.waitForFunction((id) => window.hubasMap?.getFeatureState({ source: "lgus", id }).rankScore === null, unranked.psgc);

  await page.getByLabel("Town").selectOption(tubigon.psgc);
  await page.getByLabel("Window").fill("3");
  await expect(page.getByTestId("moisture")).toHaveText("No data");
  await expect(page.getByTestId("rank")).toContainText(`#${tubigon.rank!.position} of ${tubigon.rank!.of} ranked`);
  expect(tubigon.rank!.position).toBeGreaterThan(10);
  await expect(page.getByTestId("rank")).not.toContainText("look here first");
  await page.getByRole("button", { name: "Soil water" }).click();
  await expect(page.getByRole("button", { name: "Soil water" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("map-legend")).toContainText("Gray: less than half the pixels have data");
  await expect(page.getByTestId("moisture")).toHaveText("No data");
  await page.waitForFunction(() => window.hubasMap?.getFeatureState({ source: "lgus", id: "0701245000" }).sm === null);
  await saveProof(page, "sc-233-no-data-desktop.png");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Rank" }).click();
  await page.getByLabel("Town").selectOption(stable.psgc);
  await expect(page.getByRole("button", { name: "Rank" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("progressbar", { name: /^Dryness:/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await saveProof(page, "sc-126-rank-map-mobile.png");
});
