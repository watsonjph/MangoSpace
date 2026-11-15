import { expect, test } from "@playwright/test";
import { playTone } from "../src/app/soil-tone";
import { STEP_MS } from "../src/app/Timeline";
import type { Lgu, Manifest } from "../lib/data";
import { useOfflineBasemap } from "./offline-basemap";
import { waitForLgusSource } from "./wait-for-lgus-source";

declare global {
  interface Window {
    audioProbe: { contexts: number; tones: number; closed: number };
    playTone: typeof playTone;
  }
}

const STEP = Math.round(STEP_MS * 1.1);

for (const width of [1280, 375]) {
  test(`sound is opt-in and follows playback at ${width}px`, async ({ page, request }) => {
    const towns: Lgu[] = await (await request.get("/data/lgus.json")).json();
    const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
    const readings = towns.find(town => town.psgc === "0702211000")!.soilMoisture;
    const last = manifest.windows.length - 1;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => message.type() === "error" && errors.push(message.text()));
    page.on("response", response => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    page.on("requestfailed", request => {
      if (request.failure()?.errorText !== "net::ERR_ABORTED") errors.push(request.url());
    });
    await page.addInitScript(() => {
      window.audioProbe = { contexts: 0, tones: 0, closed: 0 };
      const NativeAudio = window.AudioContext;
      window.AudioContext = class extends NativeAudio {
        constructor() { super(); window.audioProbe.contexts++; }
        createOscillator() { window.audioProbe.tones++; return super.createOscillator(); }
        close() { window.audioProbe.closed++; return super.close(); }
      };
    });
    await useOfflineBasemap(page);
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/");
    await page.getByLabel("Town").selectOption("0702211000");
    const sound = page.getByRole("button", { name: "Hear the season" });
    const slider = page.getByLabel("Window");
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => window.audioProbe.contexts)).toBe(0);
    await waitForLgusSource(page, { loaded: true });
    await page.clock.install({ time: new Date("2026-11-15T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-15T00:00:01Z"));
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await page.clock.runFor(STEP);
    await expect(slider).toHaveValue("1");
    expect(await page.evaluate(() => window.audioProbe.tones)).toBe(readings.slice(0, 2).filter(value => value != null).length);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.clock.runFor(2000);
    await expect(slider).toHaveValue("1");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveValue("2");
    await slider.fill(String(last));
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(slider).toHaveValue("0");
    for (let index = 1; index <= last; index++) {
      await page.clock.runFor(STEP);
      await expect(slider).toHaveValue(String(index));
    }
    await page.clock.runFor(STEP);
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => window.audioProbe.closed)).toBe(1);
    await sound.click();
    await page.getByLabel("Town").selectOption("0701246000");
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => window.audioProbe.closed)).toBe(2);
    await sound.click();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.clock.resume();
    await waitForLgusSource(page, { loaded: true });
    await page.screenshot({ path: test.info().outputPath(`sound-on-${width}.png`), fullPage: true });
    await sound.click();
    await page.screenshot({ path: test.info().outputPath(`sound-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("rendered tones follow the note height and missing notes are silent", async ({ page }) => {
  await page.goto("/method");
  await page.addScriptTag({ content: `window.playTone = ${playTone.toString()}` });
  const rendered = await page.evaluate(async () => {
    const results = [];
    for (const value of [null, 0, 1, NaN, -1]) {
      const context = new OfflineAudioContext(1, 24000, 48000);
      window.playTone(context, value);
      const data = (await context.startRendering()).getChannelData(0);
      let crossings = 0;
      for (let i = 1; i < 12000; i++) if (data[i - 1] < 0 && data[i] >= 0) crossings++;
      results.push({ peak: Math.max(...data.map(Math.abs)), frequency: crossings / 0.25,
        tail: Math.max(...data.slice(18000).map(Math.abs)) });
    }
    return results;
  });
  expect(rendered[0].peak).toBe(0);
  expect(rendered[1].frequency).toBeCloseTo(220, -1);
  expect(rendered[2].frequency).toBeCloseTo(440, -1);
  expect(rendered[1].peak).toBeGreaterThan(0.01);
  expect(rendered[1].tail).toBe(0);
  expect(rendered[2].tail).toBe(0);
  expect(rendered[3].peak).toBe(0);
  expect(rendered[4].peak).toBe(0);
});

test("audio startup failure leaves the slider usable", async ({ page }) => {
  await page.addInitScript(() => {
    window.AudioContext = class extends AudioContext {
      resume() { return Promise.reject(new Error("Audio unavailable")); }
    };
  });
  await useOfflineBasemap(page);
  await page.goto("/");
  await page.getByLabel("Town").selectOption("0702211000");
  await page.getByRole("button", { name: "Hear the season" }).click();
  await expect(page.locator(".season-sound").getByRole("alert")).toContainText("Sound could not start");
  await expect(page.getByRole("button", { name: "Hear the season" })).toHaveAttribute("aria-pressed", "false");
  await page.getByLabel("Window").fill("3");
  await expect(page.getByLabel("Window")).toHaveValue("3");
});
