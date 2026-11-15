import { expect, test, type Page } from "@playwright/test";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useOfflineBasemap } from "./offline-basemap";
import { waitForLgusSource } from "./wait-for-lgus-source";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

// Screen position of mock Bogo City (124.0 E, 11.05 N), from the map's own projection.
async function bogo(page: Page) {
  await waitForLgusSource(page);
  return page.evaluate(() => {
    const p = window.hubasMap!.project([124.0, 11.05]);
    return { x: p.x, y: p.y };
  });
}

test("map loads, slider and town panel work, no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await useOfflineBasemap(page);
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  expect((await page.locator(".map canvas").boundingBox())!.height).toBeGreaterThan(300);
  await expect(page.getByText("provisional")).toBeVisible();

  // A click on the town shape opens its panel.
  await page.locator(".map canvas").click({ position: await bogo(page) });
  await expect(page.getByLabel("Town")).toHaveValue("mock-bogo-city");

  await page.getByLabel("Town").selectOption({ label: "Bogo City, Cebu" });
  await expect(page.getByTestId("rank")).toHaveText(/^#\d+ of \d+$/);
  const before = await page.getByTestId("moisture").textContent();

  await page.getByLabel("Window").fill("10");
  await expect(page.getByTestId("moisture")).not.toHaveText(before!);

  await page.getByLabel("Town").selectOption({ label: "Carmen, Bohol" });
  await expect(page.getByTestId("rank")).toHaveText("Not ranked");

  expect(errors).toEqual([]);
});
