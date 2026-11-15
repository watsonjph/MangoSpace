import { expect, test } from "@playwright/test";
import type { Lgu, Manifest } from "../lib/data";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";

const TUBIGON = "0701245000";
const MANDAUE = "0731300000";

// The number of pieces of the line: each run of windows with a value is one piece.
const pieces = (values: (number | null)[]) => values.filter((value, i) => value != null && values[i - 1] == null).length;

test("the panel opens for each town with its name, province and soil water line", async ({ page, request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await useOfflineBasemap(page);
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();

  for (const lgu of lgus) {
    await page.getByLabel("Town").selectOption(lgu.psgc);
    await expect(page.getByTestId("town-name"), lgu.name).toHaveText(`${lgu.name}${lgu.province}`);
    const line = page.getByTestId("soil-line");
    await expect(line, lgu.name).toHaveAccessibleName(new RegExp(`^Soil water of ${lgu.name}: ${lgu.soilMoisture.length} values`));
    await expect(line.locator("circle"), lgu.name).toHaveCount(lgu.soilMoisture.filter((value) => value != null).length);
    expect((await line.locator("path.line").getAttribute("d"))!.match(/M/g) ?? [], lgu.name).toHaveLength(pieces(lgu.soilMoisture));
  }
  expect(errors).toEqual([]);
});

// A 1080p laptop at 150% scaling. The tallest panel (a caption for open circles) must not cover the map attribution.
test("on a short screen the panel scrolls and the attribution stays visible", async ({ page }) => {
  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 1280, height: 650 });
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await page.getByLabel("Town").selectOption(MANDAUE);
  const panel = await page.locator(".panel").boundingBox();
  const attribution = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(attribution!.y);
  const sound = page.getByRole("button", { name: "Hear the season" });
  await sound.scrollIntoViewIfNeeded();
  await expect(sound).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
});

test("the line marks the selected window and leaves a gap where a window has no data", async ({ page, request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
  const tubigon = lgus.find((l) => l.psgc === TUBIGON)!;
  expect(tubigon.soilMoisture[3]).toBeNull();
  expect(tubigon.soilMoisture[4]).not.toBeNull();
  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await page.getByLabel("Town").selectOption(TUBIGON);
  const line = page.getByTestId("soil-line");
  const guideX = () => line.getByTestId("soil-line-window").getAttribute("x1");

  await page.getByLabel("Window").fill("4");
  await expect(line.locator("circle.selected")).toHaveAttribute("data-window", "4");
  expect(await guideX()).toBe(await line.locator("circle.selected").getAttribute("cx"));
  await expect(line).toHaveAccessibleName(new RegExp(`Selected: ${tubigon.soilMoisture[4]!.toFixed(3)} m³/m³\\.$`));
  await expect(page.locator(".panel dt", { hasText: "Pixels with data" })).toBeVisible();
  await expect(page.locator(".panel")).not.toContainText("Good pixels");
  await page.waitForFunction(() => window.hubasMap!.loaded());
  await saveProof(page, "sc-89-town-panel-desktop.png");

  // Window 3 has no pass over Tubigon: no circle and no zero there, and the dashed line still marks the window.
  const before = await guideX();
  await page.getByLabel("Window").fill("3");
  await expect(line.locator("circle.selected")).toHaveCount(0);
  await expect(line.locator('circle[data-window="3"]')).toHaveCount(0);
  await expect(line).toHaveAccessibleName(/Selected: no data\.$/);
  expect(Number(await guideX())).toBeLessThan(Number(before));
  expect((await line.locator("path.line").getAttribute("d"))!.match(/M/g)).toHaveLength(pieces(tubigon.soilMoisture));
  expect(pieces(tubigon.soilMoisture)).toBeGreaterThan(1);
  await expect(page.getByTestId("moisture")).toHaveText("No good pixels");

  // A town with data on less than half of its area keeps its values, as open circles.
  const mandaue = lgus.find((l) => l.psgc === MANDAUE)!;
  await page.getByLabel("Town").selectOption(MANDAUE);
  await expect(line.locator("circle.low")).toHaveCount(mandaue.validShare.filter((share, i) => mandaue.soilMoisture[i] != null && share < 0.5).length);
  await expect(page.locator(".soil-line figcaption")).toContainText("less than half of the town");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByLabel("Town").selectOption(TUBIGON);
  await page.getByLabel("Window").fill(String(manifest.windows.length - 2));
  await expect(line).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId("town-name").scrollIntoViewIfNeeded();
  await saveProof(page, "sc-89-town-panel-mobile.png", { fullPage: false });
});
