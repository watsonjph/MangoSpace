import path from "node:path";
import { expect, test } from "@playwright/test";
import type { Lgu, Manifest, Target } from "../lib/data";
import { STEP_MS } from "../src/app/Timeline";
import { saveProof } from "./proof";

const day = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

for (const viewport of [{ name: "desktop", width: 1280, height: 900 }, { name: "mobile", width: 375, height: 812 }, { name: "narrow", width: 320, height: 700 }]) {
  test(`the score plays the soil, the dam and the rice on one date axis at ${viewport.width}px`, async ({ page, request }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
    const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
    const targets: Target[] = await (await request.get("/data/targets.json")).json();
    const dam = targets.find((target) => target.id === "malinao-dam")!;
    const soilWindows = manifest.windows.filter((_, i) => lgus.some((lgu) => lgu.soilMoisture[i] != null && lgu.validShare[i] >= 0.5));
    const soilDates = soilWindows.map((w) => new Date((Date.parse(w.start) + Date.parse(w.end)) / 2).toISOString().slice(0, 10));
    const passDates = dam.nisar.dates.filter((date) => date.startsWith("2026"));
    const steps = [...new Set([...soilDates, ...passDates])].sort();
    expect(STEP_MS * (steps.length - 1), "the season plays in 10 seconds or less at 1×").toBeLessThanOrEqual(10_000);

    await page.setViewportSize(viewport);
    await page.goto("/rice");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Score" }).click();
    await expect(page).toHaveURL(/\/score\/?$/);
    await expect(page.getByRole("link", { name: "Score" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".score-page[data-ready=true]")).toBeVisible();

    const stave = (voice: string) => page.locator(`.stave[data-voice=${voice}] .staff`);
    await expect(stave("soil").locator("i")).toHaveCount(soilDates.length);
    await expect(stave("dam").locator("i")).toHaveCount(passDates.length);
    await expect(stave("rice").locator("i")).toHaveCount(passDates.length * 2);
    await expect(stave("rice").locator("i.ubay")).toHaveCount(passDates.length);
    await expect(stave("rain").locator("b")).toHaveCount(passDates.length);
    await expect(page.locator(".score-sentences li")).toHaveText([
      "The soil goes down at the end of July.", "The dam does not move.", "The rice goes up, then down in November."]);

    // The first and the last note of each staff sit at their real date on the shared 21 Jun to 5 Nov axis.
    const start = Date.parse(manifest.windows[0].start), span = Date.parse(passDates.at(-1)!) - start;
    for (const [voice, dates] of [["soil", soilDates], ["dam", passDates], ["rice", passDates], ["rain", passDates]] as const) {
      const box = (await stave(voice).boundingBox())!;
      const marks = stave(voice).locator("i, b");
      for (const [mark, date] of [[marks.first(), dates[0]], [marks.last(), dates.at(-1)!]] as const) {
        const at = (await mark.boundingBox())!;
        const expected = box.x + 5 + (box.width - 10) * ((Date.parse(date) - start) / span);
        expect(Math.abs(at.x + at.width / 2 - expected), `${voice} note of ${date}`).toBeLessThan(2);
        await expect(mark).toHaveAttribute("data-date", date);
      }
    }

    const output = page.locator(".score-page output");
    await expect(output).toHaveText(day(steps[0]));
    await expect(page.getByTestId("score-soil")).toHaveText("No reading yet");
    await expect(page.getByTestId("score-dam")).toHaveText(`${dam.nisar.waterAreaKm2![0].toFixed(2)} km²`);
    await expect(page.getByRole("button", { name: "Loop", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Soil voice" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Dam voice" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Rice voice" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(output).not.toHaveText(day(steps[0]));
    await expect(stave("soil").locator("i.now").or(stave("dam").locator("i.now"))).not.toHaveCount(0);
    await page.getByRole("button", { name: "Pause", exact: true }).click();

    const slider = page.getByLabel("Date");
    await slider.focus();
    await page.keyboard.press("End");
    await expect(output).toHaveText(day(steps.at(-1)!));
    await page.keyboard.press("ArrowLeft");
    await expect(output).toHaveText(day(steps.at(-2)!));

    await page.getByRole("button", { name: "Soil voice" }).click();
    await expect(page.getByRole("button", { name: "Soil voice" })).toHaveAttribute("aria-pressed", "false");
    for (const name of ["Dam voice", "Rice voice"]) {
      const voice = page.getByRole("button", { name });
      await expect(voice).toHaveAttribute("aria-pressed", "false");
      await voice.click();
      await expect(voice).toHaveAttribute("aria-pressed", "true");
    }
    await page.getByRole("button", { name: "Dam voice" }).click();
    await expect(page.getByRole("button", { name: "Dam voice" })).toHaveAttribute("aria-pressed", "false");

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (viewport.name !== "narrow") await saveProof(page, `sc-572-score-${viewport.name}.png`);
    expect(errors).toEqual([]);
  });
}

test("the score adds dam after one loop and rice after the next", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/score");
  await expect(page.locator(".score-page[data-ready=true]")).toBeVisible();
  const dam = page.getByRole("button", { name: "Dam voice" });
  const rice = page.getByRole("button", { name: "Rice voice" });
  await expect(page.getByRole("button", { name: "Soil voice" })).toHaveAttribute("aria-pressed", "true");
  await expect(dam).toHaveAttribute("aria-pressed", "false");
  await expect(rice).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /^Speed 1/ }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(async () => dam.getAttribute("aria-pressed"), { timeout: 15_000 }).toBe("true");
  await expect(rice).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => rice.getAttribute("aria-pressed"), { timeout: 15_000 }).toBe("true");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

test("the score plays through the season with its voices on", async ({ browser }) => {
  const proof = process.env.PROOF === "1";
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: proof ? { dir: test.info().outputPath("video"), size: { width: 1280, height: 900 } } : undefined });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto("/score");
  await expect(page.locator(".score-page[data-ready=true]")).toBeVisible();
  for (const name of ["Dam voice", "Rice voice"]) await page.getByRole("button", { name }).click();
  await page.getByRole("button", { name: "Loop", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".score-page output")).toHaveText("5 Nov 2026", { timeout: 12_000 });
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible({ timeout: 2000 });
  await page.waitForTimeout(500);
  const video = page.video();
  await context.close();
  if (video) await video.saveAs(path.resolve(process.cwd(), "..", "docs", "proof", "sc-572-score.webm"));
  expect(errors).toEqual([]);
});
