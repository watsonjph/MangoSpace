import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { noteFrequency, playTone } from "../src/app/season-instrument";
import { useOfflineBasemap } from "./offline-basemap";

declare global { interface Window { audioStarts: number[]; audioLeads: number[]; audioNotes: { shown: number; frequency: number }[] } }

test("pentatonic mapping uses two octaves and missing data is a rest", () => {
  expect(noteFrequency(0)).toBe(220);
  expect(noteFrequency(1)).toBe(880);
  for (const value of [null, undefined, NaN, -0.1, 1.1]) expect(noteFrequency(value)).toBeNull();
  const allowed = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  for (let i = 0; i <= 100; i++) expect(allowed).toContain(Math.round(12 * Math.log2(noteFrequency(i / 100)! / 220)));
});

for (const route of ["/", "/dam", "/rice"]) test(`sound and loop start on for ${route}`, async ({ page }) => {
  await useOfflineBasemap(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 812 });
  await page.goto(route);
  if (route === "/") await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  else await expect(page.locator("main[data-ready=true]")).toBeVisible();
  const sound = page.locator(".timeline").getByRole("button", { name: "Hear the season" });
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Loop", exact: true })).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByLabel("Sound volume").fill("60");
  await expect(page.getByLabel("Sound volume")).toHaveValue("60");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`sound-${route.slice(1) || "soil"}.png`), fullPage: true });
  expect(errors).toEqual([]);
});

test("offline audio proof contains the two voices and leaves missing frames silent", async ({ page, request }) => {
  await page.goto("/method");
  await page.addScriptTag({ content: `const noteFrequency = ${noteFrequency.toString()}; window.renderTone = ${playTone.toString()};` });
  const towns = await (await request.get("/data/lgus.json")).json();
  const bogo = towns.find((town: { psgc: string }) => town.psgc === "0702211000");
  const heights = bogo.soilMoisture.map((value: number | null) => value == null ? null : Math.max(0, Math.min(1, (value - 0.1) / 0.35)));
  const frames = heights.map((high: number | null, i: number) => {
    const valid = towns.filter((town: { soilMoisture: (number | null)[]; validShare: number[] }) => town.soilMoisture[i] != null && town.validShare[i] >= 0.5);
    const mean = valid.reduce((sum: number, town: { soilMoisture: number[] }) => sum + town.soilMoisture[i], 0) / valid.length;
    return { low: Math.max(0, Math.min(1, (mean - 0.1) / 0.35)), high };
  });
  const result = await page.evaluate(async (values: { low: number; high: number | null }[]) => {
    const renderTone = (window as unknown as { renderTone: typeof playTone }).renderTone;
    const silent = new OfflineAudioContext(1, 24000, 48000);
    renderTone(silent, null);
    const silence = (await silent.startRendering()).getChannelData(0);
    const context = new OfflineAudioContext(1, 288000, 48000);
    values.forEach((value, i) => {
      renderTone(context, value.low, { base: 110, when: i * 0.45, duration: 0.55 });
      renderTone(context, value.high, { base: 220, when: i * 0.45, duration: 0.25 });
    });
    const data = (await context.startRendering()).getChannelData(0);
    return { silent: silence.every(value => value === 0), peak: data.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0), samples: Array.from(data) };
  }, frames);
  expect(result.silent).toBe(true);
  expect(result.peak).toBeGreaterThan(0.02);
  expect(result.peak).toBeLessThan(1);
  if (process.env.PROOF === "1") {
    const pcm = Buffer.alloc(result.samples.length * 2);
    result.samples.forEach((value, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), i * 2));
    const comment = Buffer.from("AI-assisted Web Audio code and synthesized audio; actual Bogo soil-water values. Reviewer listening sample.\0");
    const info = Buffer.alloc(12 + comment.length + comment.length % 2);
    info.write("INFO", 0); info.write("ICMT", 4); info.writeUInt32LE(comment.length, 8); comment.copy(info, 12);
    const header = Buffer.alloc(44); header.write("RIFF"); header.writeUInt32LE(36 + pcm.length + 8 + info.length, 4); header.write("WAVEfmt ", 8); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(48000, 24); header.writeUInt32LE(96000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
    const list = Buffer.alloc(8); list.write("LIST"); list.writeUInt32LE(info.length, 4);
    writeFileSync(path.resolve("../docs/proof/sc-499-listening-sample.wav"), Buffer.concat([header, pcm, list, info]));
  }
});

test("audio startup failure leaves the slider usable", async ({ page }) => {
  await page.addInitScript(() => { window.AudioContext = class extends AudioContext { resume() { return Promise.reject(new Error("Audio unavailable")); } }; });
  await useOfflineBasemap(page);
  await page.goto("/");
  await page.locator(".map[data-ready=true] canvas").waitFor();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".timeline-sound").getByRole("alert")).toContainText("Sound could not start");
  await page.getByLabel("Window").fill("3");
  await expect(page.getByLabel("Window")).toHaveValue("3");
});

test("audio-clock spacing follows speed with loop enabled", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    window.audioStarts = []; window.audioLeads = [];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      createOscillator() {
        const oscillator = super.createOscillator(), start = oscillator.start.bind(oscillator);
        oscillator.start = (when = 0) => { window.audioStarts.push(when); window.audioLeads.push(when - this.currentTime); start(when); };
        return oscillator;
      }
    };
  });
  await useOfflineBasemap(page);
  await page.goto("/");
  await page.locator(".map[data-ready=true] canvas").waitFor();
  await expect(page.getByRole("button", { name: "Hear the season" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Loop", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  for (const [i, interval] of [0.45, 0.225, 0.9].entries()) {
    if (i) await page.getByRole("button", { name: /^Speed/ }).click();
    await page.evaluate(() => { window.audioStarts = []; window.audioLeads = []; });
    await page.waitForFunction(() => new Set(window.audioStarts.map(time => time.toFixed(3))).size >= 7);
    const { starts, leads } = await page.evaluate(() => ({ starts: [...new Set(window.audioStarts.map(time => time.toFixed(3)))].map(Number), leads: window.audioLeads }));
    // Each note is scheduled when its step shows. It sounds at once or, to keep the beat, at most half a step later.
    // The audio clock moves in blocks of a few ms, so a note can be a block late.
    for (const lead of leads) { expect(lead).toBeGreaterThan(-0.03); expect(lead).toBeLessThan(interval / 2); }
    // The beat follows the speed. A busy test machine slows the steps on screen, and their notes with them, so allow for it.
    const gaps = starts.slice(2).map((start, j) => start - starts[j + 1]).sort((x, y) => x - y);
    const median = gaps[Math.floor(gaps.length / 2)];
    expect(median / interval).toBeGreaterThan(0.95);
    expect(median / interval).toBeLessThan(1.4);
  }
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const count = await page.evaluate(() => window.audioStarts.length);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.audioStarts.length)).toBe(count);
});

test("each low note matches the window on screen, also after a slider jump", async ({ page, request }) => {
  await page.addInitScript(() => {
    window.audioNotes = [];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      createOscillator() {
        const oscillator = super.createOscillator(), start = oscillator.start.bind(oscillator);
        oscillator.start = (when = 0) => {
          window.audioNotes.push({ shown: Number((document.getElementById("window") as HTMLInputElement).value), frequency: oscillator.frequency.value });
          start(when);
        };
        return oscillator;
      }
    };
  });
  const towns: { soilMoisture: (number | null)[]; validShare: number[] }[] = await (await request.get("/data/lgus.json")).json();
  const lowNote = (i: number) => {
    const valid = towns.filter(town => town.soilMoisture[i] != null && town.validShare[i] >= 0.5);
    const mean = valid.reduce((sum, town) => sum + town.soilMoisture[i]!, 0) / valid.length;
    return noteFrequency(Math.max(0, Math.min(1, (mean - 0.1) / 0.35)), 110)!;
  };
  // Windows 3 and 7 have different notes, so a sound left on the old step fails below.
  expect(Math.abs(lowNote(7) - lowNote(3))).toBeGreaterThan(1);
  await useOfflineBasemap(page);
  await page.goto("/");
  await page.locator(".map[data-ready=true] canvas").waitFor();
  await expect(page.getByRole("button", { name: "Hear the season" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(() => Number((document.getElementById("window") as HTMLInputElement).value) >= 2);
  await page.getByLabel("Window").fill("7");
  await page.waitForFunction(() => {
    const shown = window.audioNotes.filter((_, i) => i % 3 === 0).map(note => note.shown);
    return [7, 8, 9, 10].every(value => shown.includes(value));
  });
  // No town is selected, so each note is three partials and the first is the low voice.
  const notes = await page.evaluate(() => window.audioNotes.filter((_, i) => i % 3 === 0));
  expect(notes.map(note => note.shown)).toEqual(expect.arrayContaining([7, 8, 9, 10]));
  for (const note of notes) expect(note.frequency).toBeCloseTo(lowNote(note.shown), 1);
});
