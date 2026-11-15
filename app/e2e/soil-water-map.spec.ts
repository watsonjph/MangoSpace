import { expect, test, type Page } from "@playwright/test";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Lgu } from "../lib/data";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

async function projectedTownPoints(page: Page) {
  return page.evaluate(() => {
    const map = window.hubasMap!;
    const rect = map.getCanvas().getBoundingClientRect();
    return [
      { name: "Cebu", point: map.project([123.88, 10.31]) },
      { name: "Bohol", point: map.project([124.12, 9.85]) },
    ].map(({ name, point }) => ({
      name,
      x: rect.left + point.x,
      y: rect.top + point.y,
      map: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
    }));
  });
}

async function expectIslandsVisible(page: Page) {
  const points = await projectedTownPoints(page);
  const overlays = await Promise.all(
    [".tag", ".legend", ".panel", ".slider"].map(async (selector) => ({
      selector,
      rect: await page.locator(selector).boundingBox(),
    })),
  );

  for (const { name, x, y, map } of points) {
    expect(x, `${name} center should be in the map viewport`).toBeGreaterThanOrEqual(map.left);
    expect(x, `${name} center should be in the map viewport`).toBeLessThanOrEqual(map.right);
    expect(y, `${name} center should be in the map viewport`).toBeGreaterThanOrEqual(map.top);
    expect(y, `${name} center should be in the map viewport`).toBeLessThanOrEqual(map.bottom);

    for (const { selector, rect } of overlays) {
      if (!rect) continue;
      const covered = x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
      expect(covered, `${name} center should not be covered by ${selector}`).toBe(false);
    }
  }
}

test("soil water legend and map framing work at desktop and mobile widths", async ({ page, request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const bogo = lgus.find((l) => l.name === "City of Bogo")!;
  const cebuCity = lgus.find((l) => l.name === "City of Cebu")!;
  // The map state of a town is its soil water in lgus.json for the window, null included.
  const mapShows = (lgu: Lgu, i: number) =>
    page.waitForFunction(([id, sm]) => window.hubasMap?.getFeatureState({ source: "lgus", id }).sm === sm, [lgu.psgc, lgu.soilMoisture[i]] as const);
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await page.waitForFunction(() => window.hubasMap?.isSourceLoaded("lgus"));
  await mapShows(bogo, 0);

  const colorExpression = JSON.stringify(await page.evaluate(() => window.hubasMap!.getPaintProperty("soil", "fill-color")));
  expect(colorExpression).toContain("#9aa5a2");
  expect(colorExpression).toContain("#b07a1f");
  expect(colorExpression).toContain("#c8c48a");
  expect(colorExpression).toContain("#0d6f7d");
  await expect(page.getByTestId("soil-water-legend")).toContainText("0.10 m³/m³ · drier");
  await expect(page.getByTestId("soil-water-legend")).toContainText("0.45 m³/m³ · wetter");
  await expect(page.getByTestId("soil-water-legend")).toContainText("Gray: less than half the pixels have data");
  await expect(page.getByText("provisional")).toBeVisible();

  await page.getByLabel("Window").fill("4");
  await mapShows(cebuCity, 4);
  await page.getByLabel("Window").fill("0");

  await expectIslandsVisible(page);
  await saveProof(page, "sc-78-map-desktop.png");

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await expectIslandsVisible(page);

  const mapBox = await page.locator(".map").boundingBox();
  const panelBox = await page.locator(".panel").boundingBox();
  const sliderBox = await page.locator(".slider").boundingBox();
  expect(mapBox && panelBox && sliderBox).toBeTruthy();
  expect(panelBox!.y).toBeGreaterThanOrEqual(mapBox!.y + mapBox!.height);
  expect(sliderBox!.y).toBeGreaterThanOrEqual(panelBox!.y + panelBox!.height);

  await saveProof(page, "sc-78-map-mobile.png");
  expect(errors).toEqual([]);
});
