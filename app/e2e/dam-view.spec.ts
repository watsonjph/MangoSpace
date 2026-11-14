import { expect, test } from "@playwright/test";
import targets from "../public/data/targets.json";
import { useOfflineBasemap } from "./offline-basemap";

const dam = targets.find((target) => target.id === "malinao-dam")!;

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
  test(`dam navigation, dates and bands at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    await useOfflineBasemap(page);
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main", exact: true }).getByRole("link", { name: "Dam", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Malinao Dam", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dam", exact: true })).toHaveAttribute("aria-current", "page");
    for (const [index, date] of dam.nisar.dates.entries()) {
      await page.getByLabel("Date", { exact: true }).selectOption(date);
      await expect(page.getByTestId("selected-water-area")).toContainText(`${dam.nisar.waterAreaKm2![index].toFixed(3)} km²`);
      for (const band of ["hh", "hv"] as const) {
        await page.getByRole("radio", { name: band.toUpperCase(), exact: true }).check();
        const image = page.getByRole("img", { name: `Malinao Dam NISAR ${band.toUpperCase()} radar, ${date}` });
        expect(new URL(await image.getAttribute("src") ?? "", page.url()).pathname).toBe(`/data/${dam.nisar.images[index][band]}`);
        await expect.poll(() => image.evaluate((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
      }
    }
    await expect(page.getByRole("img", { name: /Water area over time/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Possible causes and limits" })).toContainText("radar images alone do not establish the cause");
    await expect(page.getByText("Rain observations are not available yet.", { exact: false })).toBeVisible();
    await page.getByText("All dates and water areas", { exact: true }).click();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(dam.nisar.dates.length + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`dam-${viewport.width}.png`), fullPage: true });
    await page.reload();
    await expect(page.getByLabel("Date", { exact: true })).toHaveValue(dam.nisar.dates.at(-1)!);
    await page.getByRole("link", { name: "Soil water", exact: true }).click();
    await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible({ timeout: 15000 });
    expect(errors).toEqual([]);
  });
}

test("mock-shaped observations retain zero and gaps without showing placeholder rain", async ({ page }) => {
  await page.route("**/data/targets.json", (route) => route.fulfill({ json: [{
    ...dam,
    nisar: { track: 3, dates: ["2026-06-26", "2026-07-08", "2026-07-20"], images: dam.nisar.images.slice(0, 3), waterAreaKm2: [0, null, 1.2] },
    rainMm: [999, 999, 999],
  }] }));
  await page.goto("/dam");
  await expect(page.getByTestId("selected-water-area")).toContainText("1.200 km²");
  await page.getByLabel("Date", { exact: true }).selectOption("2026-06-26");
  await expect(page.getByTestId("selected-water-area")).toContainText("0.000 km²");
  await page.getByLabel("Date", { exact: true }).selectOption("2026-07-08");
  await expect(page.getByTestId("selected-water-area")).toContainText("Not available");
  await page.getByText("All dates and water areas", { exact: true }).click();
  await expect(page.getByRole("table")).toContainText("Not available");
  await expect(page.getByRole("main")).not.toContainText("999");
  expect(await page.locator(".water-chart path").getAttribute("d")).toMatch(/^M[^L]+ M/);
});

test("absent areas and empty or invalid targets have honest empty states", async ({ page }) => {
  await page.route("**/data/targets.json", (route) => route.fulfill({ json: [{ ...dam, nisar: { ...dam.nisar, waterAreaKm2: [] } }] }));
  await page.goto("/dam");
  await expect(page.getByText("No water-area measurements available.")).toBeVisible();
  await expect(page.getByTestId("selected-water-area")).toContainText("Not available");
  await page.route("**/data/targets.json", (route) => route.fulfill({ json: [{ ...dam, nisar: { track: 3, dates: [], images: [] } }] }));
  await page.reload();
  await expect(page.getByText("No dam observations available.")).toBeVisible();
  await page.route("**/data/targets.json", (route) => route.fulfill({ json: [] }));
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Dam observations could not be loaded");
});

test("a failed radar image is reported without losing its area", async ({ page }) => {
  await page.route("**/data/targets/*.png", (route) => route.abort());
  await page.goto("/dam");
  await expect(page.getByText("Radar image unavailable for this date and band.")).toBeVisible();
  await expect(page.getByTestId("selected-water-area")).toContainText(`${dam.nisar.waterAreaKm2!.at(-1)!.toFixed(3)} km²`);
});
