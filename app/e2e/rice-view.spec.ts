import { expect, test } from "@playwright/test";
import targets from "../public/data/targets.json";
import { useOfflineBasemap } from "./offline-basemap";

const rice = targets.filter(target => target.kind === "rice");
for (const width of [1280, 375]) {
  test(`rice samples, dates and bands at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => message.type() === "error" && errors.push(message.text()));
    page.on("response", response => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    await useOfflineBasemap(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main", exact: true }).getByRole("link", { name: "Rice", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Rice, through radar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Rice", exact: true })).toHaveAttribute("aria-current", "page");
    for (const sample of rice) {
      const name = sample.id === "ubay-rice" ? "Ubay" : "Pilar";
      await page.getByLabel("Field sample", { exact: true }).selectOption(sample.id);
      await expect(page.getByLabel("Date", { exact: true })).toHaveValue(sample.nisar.dates.at(-1)!);
      for (const [index, date] of sample.nisar.dates.entries()) {
        await page.getByLabel("Date", { exact: true }).selectOption(date);
        await expect(page.getByTestId("selected-hv")).toContainText(`${sample.nisar.meanHvDb![index].toFixed(3)} dB`);
        for (const band of ["hh", "hv"] as const) {
          await page.getByRole("radio", { name: band.toUpperCase(), exact: true }).check();
          const image = page.getByRole("img", { name: `${name} sample NISAR ${band.toUpperCase()} radar, ${date}` });
          expect(new URL(await image.getAttribute("src") ?? "", page.url()).pathname).toBe(`/data/${sample.nisar.images[index][band]}`);
          await expect.poll(() => image.evaluate(element => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
        }
      }
      await expect(page.getByRole("img", { name: `${name} mean HV over time, in decibels. Exact values are in the table below.` })).toBeVisible();
      await page.getByText("All dates and HV values", { exact: true }).click();
      await expect(page.getByRole("table").getByRole("row")).toHaveCount(sample.nisar.dates.length + 1);
    }
    await expect(page.getByText("Planting and growth dates not verified.", { exact: false })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("not town-wide rice measurements");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`rice-${width}.png`), fullPage: true });
    await page.reload();
    await expect(page.getByLabel("Field sample", { exact: true })).toHaveValue("ubay-rice");
    await page.getByRole("link", { name: "Dam", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Malinao Dam", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("rice zero and absent values remain honest gaps", async ({ page }) => {
  const sample = rice[0];
  await page.route("**/data/targets.json", route => route.fulfill({ json: [{ ...sample,
    nisar: { ...sample.nisar, dates: sample.nisar.dates.slice(0, 3), images: sample.nisar.images.slice(0, 3), meanHvDb: [-20, null, 0] },
  }] }));
  await page.goto("/rice");
  await expect(page.getByTestId("selected-hv")).toContainText("0.000 dB");
  expect(await page.locator(".water-chart path").getAttribute("d")).toMatch(/^M[^L]+ M/);
  await page.getByLabel("Date", { exact: true }).selectOption(sample.nisar.dates[1]);
  await expect(page.getByTestId("selected-hv")).toContainText("Not available");
  await page.getByText("All dates and HV values", { exact: true }).click();
  await expect(page.getByRole("table")).toContainText("Not available");
});

test("rice missing data and failed images have visible fallbacks", async ({ page }) => {
  await page.route("**/data/targets.json", route => route.fulfill({ json: [] }));
  await page.goto("/rice");
  await expect(page.getByText("Rice sample observations are not available.")).toBeVisible();
  await page.route("**/data/targets.json", route => route.fulfill({ json: [rice[0]] }));
  await page.route("**/data/targets/*.png", route => route.abort());
  await page.reload();
  await expect(page.getByText("Radar image unavailable for this date and band.")).toBeVisible();
  await expect(page.getByTestId("selected-hv")).toContainText(`${rice[0].nisar.meanHvDb!.at(-1)!.toFixed(3)} dB`);
  await page.route("**/data/targets.json", route => route.fulfill({ status: 503, body: "unavailable" }));
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Rice observations could not be loaded");
});
