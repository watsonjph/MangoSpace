import { expect, test } from "@playwright/test";
import { useOfflineBasemap } from "./offline-basemap";
import { waitForLgusSource } from "./wait-for-lgus-source";

declare global {
  interface Window { replaceCalls: number }
}

for (const width of [1280, 375]) {
  test(`town and window survive navigation and reload at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => message.type() === "error" && errors.push(message.text()));
    page.on("response", response => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    page.on("requestfailed", request => {
      if (request.failure()?.errorText !== "net::ERR_ABORTED") errors.push(request.url());
    });
    await useOfflineBasemap(page);
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/");
    const mapReady = async () => {
      await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible({ timeout: 15_000 });
      await waitForLgusSource(page, { loaded: true });
    };
    const selection = async () => {
      await mapReady();
      await expect(page.getByLabel("Town")).toHaveValue("0702211000");
      await expect(page.getByLabel("Window", { exact: false })).toHaveValue("3");
      await expect(page.locator(".slider output")).toHaveText("27 Jul to 8 Aug 2026");
    };
    await mapReady();
    await page.getByLabel("Town").selectOption("0702211000");
    await page.getByLabel("Window", { exact: false }).fill("3");
    const navigation = page.getByRole("navigation", { name: "Main", exact: true });
    await expect(page).toHaveURL(/window=3$/);
    await selection();
    await page.reload();
    await selection();
    // Links from other pages are named for the Soil water view, so they open it.
    for (const returnLink of ["Back to soil water", "Soil water", "Hubas home"]) {
      await navigation.getByRole("link", { name: "Method" }).click();
      await expect(page.getByRole("heading", { name: "Measured, not forecast" })).toBeVisible();
      await page.reload();
      await page.getByRole("link", { name: returnLink, exact: true }).click();
      await selection();
    }
    const sharedUrl = page.url();
    await page.goto("/method");
    await page.goto(sharedUrl);
    await selection();
    await page.screenshot({ path: test.info().outputPath(`selection-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("invalid map selections fall back to an empty town and first window", async ({ page }) => {
  await useOfflineBasemap(page);
  for (const windowValue of ["-1", "999", "1.5", "nope"]) {
    await page.goto(`/?town=unknown&window=${windowValue}`);
    await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("Town")).toHaveValue("");
    await expect(page.getByLabel("Window", { exact: false })).toHaveValue("0");
  }
});

test("rapid slider changes stay under Safari's replaceState limit", async ({ page }) => {
  await page.addInitScript(() => {
    const replaceState = History.prototype.replaceState;
    window.replaceCalls = 0;
    History.prototype.replaceState = function (...args) {
      window.replaceCalls++;
      return replaceState.apply(this, args);
    };
  });
  await useOfflineBasemap(page);
  await page.goto("/?town=0702211000&window=0");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible({ timeout: 15_000 });
  const slider = page.getByLabel("Window", { exact: false });
  await slider.focus();
  const before = await page.evaluate(() => window.replaceCalls);
  for (let i = 0; i < 150; i++) await page.keyboard.press(i % 20 < 10 ? "ArrowRight" : "ArrowLeft");
  await expect(slider).toHaveValue("10");
  await expect(page).toHaveURL(/\?town=0702211000&window=10$/);
  const writes = await page.evaluate(() => window.replaceCalls) - before;
  expect(writes).toBeLessThan(20);
});
