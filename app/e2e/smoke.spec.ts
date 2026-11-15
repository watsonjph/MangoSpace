import { expect, test, type Page } from "@playwright/test";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Lgu, Manifest } from "../lib/data";
import { useOfflineBasemap } from "./offline-basemap";
import { waitForLgusSource } from "./wait-for-lgus-source";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

const BOGO = "0702211000";
const CARMEN_BOHOL = "0701212000"; // Cebu has a Carmen too

// The panel text for a town, from the data and not from fixed values: the pipeline changes the values.
const rankText = (lgu: Lgu) => (lgu.rank ? `#${lgu.rank.position} of ${lgu.rank.of} ranked${lgu.rank.position <= 10 ? " · look here first" : ""}${lgu.rank.stable ? " Stable" : ""}` : "Not ranked");
const moistureText = (lgu: Lgu, i: number) => (lgu.soilMoisture[i] == null ? "No data" : `${lgu.soilMoisture[i]!.toFixed(3)} m³/m³`);

// Screen position of a point inside the City of Bogo, from the map's own projection.
async function bogoPoint(page: Page) {
  await waitForLgusSource(page);
  return page.evaluate(() => {
    const p = window.hubasMap!.project([123.995, 11.017]);
    return { x: p.x, y: p.y };
  });
}

test("map loads, slider and town panel work, no console errors", async ({ page, request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
  const town = (psgc: string) => lgus.find((l) => l.psgc === psgc)!;
  const last = manifest.windows.length - 1;
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await useOfflineBasemap(page);
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  expect((await page.locator(".map canvas").boundingBox())!.height).toBeGreaterThan(300);
  await expect(page.getByText("provisional")).toBeVisible();

  // A click on the town shape opens its panel.
  await page.locator(".map canvas").click({ position: await bogoPoint(page) });
  await expect(page.getByLabel("Town")).toHaveValue(BOGO);
  await expect(page.getByTestId("rank")).toHaveText(rankText(town(BOGO)));
  await expect(page.getByTestId("moisture")).toHaveText(moistureText(town(BOGO), 0));

  await page.getByLabel("Window").fill(String(last));
  await expect(page.locator("output")).toHaveText("19 Oct to 31 Oct 2026");
  expect(manifest.windows[last].start).toBe("2026-10-19");
  await expect(page.getByTestId("moisture")).toHaveText(moistureText(town(BOGO), last));

  await page.getByLabel("Town").selectOption({ label: "Carmen, Bohol" });
  await expect(page.getByLabel("Town")).toHaveValue(CARMEN_BOHOL);
  await expect(page.getByTestId("rank")).toHaveText(rankText(town(CARMEN_BOHOL)));

  expect(errors).toEqual([]);
});
