import { expect, test } from "@playwright/test";
import path from "node:path";
import type { Lgu } from "../lib/data";
import { useOfflineBasemap } from "./offline-basemap";
import { waitForLgusSource } from "./wait-for-lgus-source";
import { saveProof } from "./proof";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`map playback, reload and visibility with motion ${reducedMotion}`, async ({ page, request }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => message.type() === "error" && errors.push(message.text()));
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width: reducedMotion === "reduce" ? 390 : 1280, height: 800 });
    await useOfflineBasemap(page);
    await page.goto("/?town=0702211000&window=0");
    await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
    await waitForLgusSource(page);
    const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
    const measured = lgus.find(lgu => lgu.psgc === "0702211000")!.soilMoisture;
    await page.evaluate(() => {
      const map = window.hubasMap!;
      const original = map.setFeatureState.bind(map);
      const samples: number[] = [];
      Object.assign(window, { motionSamples: samples });
      map.setFeatureState = (feature, state) => {
        if (feature.id === "0702211000") samples.push(state.sm);
        return original(feature, state);
      };
    });
    const slider = page.getByLabel("Window");
    const started = Date.now();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(slider).toHaveValue("10", { timeout: 8000 });
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    expect(Date.now() - started).toBeGreaterThanOrEqual(4000);
    expect(Date.now() - started).toBeLessThan(6500);
    const samples = await page.evaluate(() => (window as unknown as { motionSamples: number[] }).motionSamples);
    expect(samples.length).toBeGreaterThan(0);
    const intermediate = samples.some(value => !measured.includes(value));
    expect(intermediate).toBe(reducedMotion !== "reduce");
    await expect(page).toHaveURL(/window=10$/);
    await page.reload();
    await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
    await expect(slider).toHaveValue("10");
    await saveProof(page, `sc-491-playback-${reducedMotion === "reduce" ? 390 : 1280}.png`);

    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(1);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    const stopped = await slider.inputValue();
    await page.waitForTimeout(700);
    await expect(slider).toHaveValue(stopped);
    await expect(page).toHaveURL(new RegExp(`window=${stopped}$`));
    await page.reload();
    await expect(slider).toHaveValue(stopped);
    expect(errors).toEqual([]);
    if (process.env.PROOF === "1" && reducedMotion === "no-preference") {
      const video = page.video()!;
      await page.close();
      await video.saveAs(path.resolve("../docs/proof/sc-491-playback.webm"));
    }
  });
}
