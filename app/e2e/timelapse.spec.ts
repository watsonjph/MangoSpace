import { expect, test } from "@playwright/test";
import path from "node:path";
import type { Target } from "../lib/data";
import { saveProof } from "./proof";

for (const route of ["dam", "rice"]) {
  test(`${route} plays every radar frame in order`, async ({ page, request }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => message.type() === "error" && errors.push(message.text()));
    page.on("response", response => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    const targets: Target[] = await (await request.get("/data/targets.json")).json();
    const target = targets.find(item => item.id === (route === "dam" ? "malinao-dam" : "ubay-rice"))!;
    const images = [...(route === "dam" ? target.history!.flatMap(event => event.images) : []), ...target.nisar.images.map(image => image.hh)].map(src => `/data/${src}`);
    // Each image takes longer than one 300 ms step, so play must wait for a frame to load instead of skipping it.
    await page.route("**/data/targets/*.png", async (image) => { await new Promise((done) => setTimeout(done, 400)); await image.continue(); });
    await page.goto(`/${route}`);
    await expect(page.locator("main[data-ready=true]")).toBeVisible();
    const radar = page.getByTestId(`${route}-radar`).locator("img");
    await expect.poll(() => radar.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    if (route === "dam") {
      await expect(page.locator(".dam-picker .ticks span")).toHaveText(["2015–16", "2023–24", "2026"]);
      await expect(page.locator(".period-break")).toHaveCount(2);
    }
    await radar.evaluate((img: HTMLImageElement) => {
      const frames: string[] = [];
      Object.assign(window, { loadedFrames: frames });
      img.addEventListener("load", () => { if (img.naturalWidth) frames.push(img.getAttribute("src")!); });
    });
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("slider", { name: "Date" })).toHaveValue("0");
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("slider", { name: "Date" })).toHaveValue(String(images.length - 1));
    const loaded = await page.evaluate(() => (window as unknown as { loadedFrames: string[] }).loadedFrames);
    expect(loaded).toEqual(images);
    expect(errors).toEqual([]);
    await saveProof(page, `sc-507-${route}-periods.png`);
    if (process.env.PROOF === "1" && route === "dam") {
      const video = page.video()!;
      await page.close();
      await video.saveAs(path.resolve("../docs/proof/sc-507-dam-playback.webm"));
    }
  });
}
