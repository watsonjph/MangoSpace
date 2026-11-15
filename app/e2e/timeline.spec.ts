import { expect, test } from "@playwright/test";
import type { Manifest, Target } from "../lib/data";
import { STEP_MS } from "../src/app/Timeline";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";

test("the map timeline plays the season in about five seconds, with speed, loop and the space key", async ({ page, request }) => {
  const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
  const last = manifest.windows.length - 1;
  expect(STEP_MS * last).toBeLessThan(6000);
  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  const slider = page.getByLabel("Window");
  await expect(page.getByRole("button", { name: "Loop", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Loop", exact: true }).click();
  await expect(page.locator(".track .staff i")).toHaveCount(manifest.windows.length);
  await expect(page.locator(".track .ticks span")).toHaveText(["Jun", "Jul", "Aug", "Sept", "Oct"]);
  await saveProof(page, "sc-491-timeline-desktop.png");

  const started = Date.now();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(slider).toHaveValue(String(last), { timeout: 8000 });
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(7000);

  await page.getByRole("button", { name: /^Speed 1×/ }).click();
  await expect(page.getByRole("button", { name: /^Speed 2×/ })).toBeVisible();
  await page.getByRole("button", { name: "Loop" }).click();
  await page.locator(".map canvas").click({ position: { x: 40, y: 500 } });
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  // With loop on, play goes past the last window and continues from the first: the value goes down one time.
  let before = -1;
  let wrapped = false;
  await expect.poll(async () => {
    const value = Number(await slider.inputValue());
    if (value < before) wrapped = true;
    before = value;
    return wrapped;
  }, { timeout: 8000, intervals: [40] }).toBe(true);
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("the dam radar images play as a timelapse", async ({ page, request }) => {
  const targets: Target[] = await (await request.get("/data/targets.json")).json();
  const dam = targets.find((target) => target.id === "malinao-dam")!;
  const frames = (dam.history ?? []).reduce((count, event) => count + event.dates.length, 0) + dam.nisar.dates.length;
  await page.goto("/dam");
  await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
  const slider = page.getByRole("slider", { name: "Date", exact: true });
  await expect(slider).toHaveAttribute("max", String(frames - 1));
  const image = page.getByTestId("dam-radar").locator("img");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(slider).toHaveValue("0");
  await expect(image).toHaveAttribute("src", /s1|sentinel/i);
  await expect.poll(async () => Number(await slider.inputValue()), { timeout: 4000 }).toBeGreaterThanOrEqual(3);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await slider.inputValue();
  await page.waitForTimeout(700);
  await expect(slider).toHaveValue(paused);
  await saveProof(page, "sc-507-dam-timelapse-desktop.png");
});
