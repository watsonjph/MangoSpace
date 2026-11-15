import { expect, test, type Locator, type Page } from "@playwright/test";
import type { Target } from "../lib/data";
import { saveProof } from "./proof";

async function pickPixel(page: Page, image: Locator, x: number, y: number, touch = false) {
  await image.scrollIntoViewIfNeeded();
  const box = await image.boundingBox();
  if (!box) throw new Error("Radar image is not visible.");
  const dimensions = await image.evaluate((img: HTMLImageElement) => ({ width: img.naturalWidth, height: img.naturalHeight }));
  const at = { x: 1 + (x + 0.5) / dimensions.width * (box.width - 2), y: 1 + (y + 0.5) / dimensions.height * (box.height - 2) };
  if (touch) await page.touchscreen.tap(box.x + at.x, box.y + at.y);
  else await page.mouse.click(box.x + at.x, box.y + at.y);
}

for (const viewport of [{ name: "desktop", width: 1280, height: 900, touch: false }, { name: "mobile", width: 375, height: 812, touch: true }]) {
  test.describe(`radar explainer at ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: viewport.touch });

    test("real reference pixels, keyboard, bands and dates", async ({ page, request }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
      page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
      const targets: Target[] = await (await request.get("/data/targets.json")).json();
      const dam = targets.find((target) => target.id === "malinao-dam")!;
      const past = dam.history!.reduce((count, event) => count + event.dates.length, 0);
      const date = past + dam.nisar.dates.indexOf("2026-10-12");
      await page.goto("/dam");
      await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
      await page.getByRole("slider", { name: "Date" }).fill(String(date));
      const button = page.getByRole("button", { name: "Inspect radar pixel" });
      const image = page.getByTestId("dam-radar").locator("img");
      const result = page.getByTestId("radar-pixel-result");
      await expect(button).toBeEnabled();
      await button.focus();
      await button.press("Enter");
      await expect(result).toContainText("Pixel (220, 220)");
      await button.press("ArrowRight");
      await expect(result).toContainText("Pixel (221, 220)");
      await pickPixel(page, image, 0, 0, viewport.touch);
      await expect(button).toBeEnabled();
      await button.focus();
      await button.press("ArrowLeft");
      await button.press("ArrowUp");
      await expect(result).toContainText("Pixel (0, 0)");
      await pickPixel(page, image, 439, 439, viewport.touch);
      await button.press("ArrowRight");
      await button.press("ArrowDown");
      await expect(result).toContainText("Pixel (439, 439)");

      const samples = [
        { name: "water", x: 168, y: 201, hh: "−16.1", hv: "−22.5", cue: "can be consistent with water" },
        { name: "plants", x: 143, y: 135, hh: "−11.9", hv: "−15.6", cue: "can be consistent with vegetation" },
        { name: "buildings", x: 321, y: 197, hh: "−0.6", hv: "−6.4", cue: "it does not identify a building" },
        { name: "not-sure", x: 330, y: 245, hh: "−5.6", hv: "−14.0", cue: "Not sure. These values do not give a unique explanation." },
      ];
      for (const sample of samples) {
        await pickPixel(page, image, sample.x, sample.y, viewport.touch);
        await expect(result).toContainText(`Pixel (${sample.x}, ${sample.y})`);
        await expect(result).toContainText(`HH ${sample.hh} dB · HV ${sample.hv} dB`);
        await expect(result).toContainText(sample.cue);
        if (!viewport.touch || sample.name === "water") await saveProof(page, `sc-179-${sample.name}-${viewport.name}.png`);
      }

      const reading = await result.innerText();
      await page.getByRole("button", { name: "HV", exact: true }).click();
      await expect(image).toHaveAttribute("src", `/data/${dam.nisar.images[dam.nisar.dates.indexOf("2026-10-12")].hv}`);
      await expect(result).toHaveText(reading, { useInnerText: true });
      await page.getByRole("button", { name: "Color", exact: true }).click();
      await expect(button).toHaveCount(0);
      await expect(page.getByTestId("dam-radar")).toContainText("Switch to HH or HV to inspect a pixel.");
      await page.getByRole("button", { name: "HV", exact: true }).click();
      await page.getByRole("slider", { name: "Date" }).fill(String(date - 1));
      await expect(result).toHaveText("");
      await expect(result).not.toContainText("Pixel (");
      await page.getByRole("button", { name: "Lowest in 2015–16" }).click();
      await expect(button).toHaveCount(0);
      await expect(page.getByTestId("dam-radar")).toContainText("This historic image has one band.");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}

test("rice pixels follow the selected parcel and date", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
  await page.goto("/rice");
  await expect(page.locator(".rice-page[data-ready=true]")).toBeVisible();
  const button = page.getByRole("button", { name: "Inspect radar pixel" });
  const result = page.getByTestId("radar-pixel-result");
  await expect(button).toBeEnabled();
  await button.focus();
  await button.press("Space");
  await expect(result).toContainText("Pixel (8, 8)");
  await expect(result).toContainText("HH −8.0 dB · HV −18.4 dB");
  await saveProof(page, "sc-179-rice-desktop.png");
  const first = await result.innerText();
  await page.getByRole("button", { name: "HV", exact: true }).click();
  await expect(result).toHaveText(first, { useInnerText: true });
  await page.getByRole("button", { name: "Pilar", exact: true }).click();
  await expect(result).toHaveText("");
  await expect(button).toBeEnabled();
  await button.focus();
  await button.press("Enter");
  await expect(result).toContainText("Pixel (12, 12)");
  await expect(result).toContainText("HH −8.5 dB · HV −19.3 dB");
  await page.getByRole("slider", { name: "Date" }).fill("0");
  await expect(result).toHaveText("");
  expect(errors).toEqual([]);
});

test("a late previous-date image cannot replace the current pair", async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  let requested: () => void = () => {};
  const started = new Promise<void>((resolve) => { requested = resolve; });
  await page.route("**/data/targets/malinao-dam-2026-11-05-hv.png", async (route) => {
    requested();
    await held;
    await route.continue();
  });
  await page.goto("/dam");
  await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
  const button = page.getByRole("button", { name: "Inspect radar pixel" });
  const result = page.getByTestId("radar-pixel-result");
  await expect(button).toBeEnabled();
  await button.focus();
  await button.press("Enter");
  await started;
  await expect(result).toContainText("Loading HH and HV pixels");
  await page.getByRole("slider", { name: "Date" }).press("ArrowLeft");
  await expect(result).toHaveText("");
  await expect(button).toBeEnabled();
  await button.focus();
  await button.press("Enter");
  await expect(result).toContainText(" dB");
  const current = await result.innerText();
  const finished = page.waitForResponse("**/data/targets/malinao-dam-2026-11-05-hv.png");
  release();
  await finished;
  await expect(result).toHaveText(current, { useInnerText: true });
  await expect(page.getByTestId("dam-radar").locator("img")).not.toHaveAttribute("src", /2026-11-05/);
});

for (const problem of ["missing", "mismatched"] as const) {
  test(`an ${problem} band has no stale or invented reading`, async ({ page }) => {
    await page.goto("/dam");
    await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
    const button = page.getByRole("button", { name: "Inspect radar pixel" });
    const result = page.getByTestId("radar-pixel-result");
    await expect(button).toBeEnabled();
    await button.focus();
    await button.press("Enter");
    await expect(result).toContainText("Pixel (");
    await page.route("**/data/targets/malinao-dam-2026-10-24-hv.png", async (route) => {
      if (problem === "missing") await route.abort();
      else {
        const smaller = await page.request.get("/data/targets/ubay-rice-2026-11-05-hv.png");
        await route.fulfill({ response: smaller });
      }
    });
    await page.getByRole("slider", { name: "Date" }).press("ArrowLeft");
    await expect(result).toHaveText("");
    await expect(button).toBeEnabled();
    await button.focus();
    await button.press("Enter");
    await expect(result).toHaveText("Not sure. HH and HV are unavailable for this image.");
    await expect(button).toBeDisabled();
    await expect(result).not.toContainText("Pixel (");
    await expect(result).not.toContainText(" dB");
  });
}

test("playback keeps focus on the inspector and a drag from elsewhere picks nothing", async ({ page }) => {
  await page.goto("/dam");
  await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
  const button = page.getByRole("button", { name: "Inspect radar pixel" });
  const result = page.getByTestId("radar-pixel-result");
  const image = page.getByTestId("dam-radar").locator("img");
  await expect(button).toBeEnabled();
  await image.scrollIntoViewIfNeeded();
  const heading = (await page.getByRole("heading", { name: "The radar image of each date" }).boundingBox())!;
  const box = (await image.boundingBox())!;
  await page.mouse.move(heading.x + 20, heading.y + heading.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(result).toHaveText("");

  const slider = page.getByRole("slider", { name: "Date" });
  await slider.fill(String(Number(await slider.getAttribute("max")) - 3));
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await button.focus();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(button).toBeFocused();
  await expect(result).toHaveText("");
  await button.press("Enter");
  await expect(result).toContainText(" dB");
});
