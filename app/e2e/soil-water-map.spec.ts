import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useOfflineBasemap } from "./offline-basemap";
import { waitForLgusSource } from "./wait-for-lgus-source";

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

test("soil water legend and map framing work at desktop and mobile widths", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await waitForLgusSource(page);
  await page.waitForFunction(() => window.hubasMap?.getFeatureState({ source: "lgus", id: "mock-bogo-city" }).sm === 0.34);

  const mapState = await page.evaluate(() => ({
    fillColor: window.hubasMap!.getPaintProperty("soil", "fill-color"),
    bogoMoisture: window.hubasMap!.getFeatureState({ source: "lgus", id: "mock-bogo-city" }).sm,
  }));
  const colorExpression = JSON.stringify(mapState.fillColor);
  expect(mapState.bogoMoisture).toBe(0.34);
  expect(colorExpression).toContain("#9aa5a2");
  expect(colorExpression).toContain("#b07a1f");
  expect(colorExpression).toContain("#c8c48a");
  expect(colorExpression).toContain("#0d6f7d");
  await expect(page.getByTestId("soil-water-legend")).toContainText("0.10 m³/m³ · drier");
  await expect(page.getByTestId("soil-water-legend")).toContainText("0.45 m³/m³ · wetter");
  await expect(page.getByTestId("soil-water-legend")).toContainText("Gray: no good pixels");
  await expect(page.getByText("provisional")).toBeVisible();

  await page.getByLabel("Window").fill("4");
  await page.waitForFunction(() => window.hubasMap?.getFeatureState({ source: "lgus", id: "mock-cebu-city" }).sm === null);
  await page.getByLabel("Window").fill("0");

  await expectIslandsVisible(page);
  await page.screenshot({
    path: path.resolve(process.cwd(), "..", "docs", "proof", "sc-78-map-desktop.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await expectIslandsVisible(page);

  const mapBox = await page.locator(".map").boundingBox();
  const panelBox = await page.locator(".panel").boundingBox();
  const sliderBox = await page.locator(".slider").boundingBox();
  expect(mapBox && panelBox && sliderBox).toBeTruthy();
  expect(panelBox!.y).toBeGreaterThanOrEqual(mapBox!.y + mapBox!.height);
  expect(sliderBox!.y).toBeGreaterThanOrEqual(panelBox!.y + panelBox!.height);

  await page.screenshot({
    path: path.resolve(process.cwd(), "..", "docs", "proof", "sc-78-map-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
