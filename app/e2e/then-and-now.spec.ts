import { expect, test } from "@playwright/test";
import targets from "../public/data/targets.json";
import { parseComparison } from "../src/app/dam/comparison";

const dam = targets.find(target => target.id === "malinao-dam")!;
for (const width of [1280, 375]) {
  test(`then and now at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => message.type() === "error" && errors.push(message.text()));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dam");
    await page.getByRole("link", { name: "Explore then and now" }).click();
    const section = page.getByRole("region", { name: "Then and now", exact: true });
    await expect(section).toBeVisible();
    await expect(section.locator('path[data-series="2026 observed"]')).not.toHaveAttribute("stroke-dasharray");
    await expect(section.locator('path[stroke-dasharray="8 6"]')).toHaveCount(2);
    await expect(section.getByText("This is what happened before. It is not a forecast.", { exact: true })).toBeVisible();
    await expect(section).toContainText("monthly average pattern");
    const cards = section.locator(".history-card");
    await expect(cards).toHaveCount(2);
    for (const [index, history] of dam.history!.entries()) {
      const card = cards.nth(index);
      const baseline = history.waterAreaKm2![0];
      const minimum = Math.min(...history.waterAreaKm2!);
      await expect(card.locator(".history-low strong")).toHaveText(`${((minimum / baseline - 1) * 100).toFixed(1)}%`);
      await expect(card).toContainText(`0% = first reading on ${history.dates[0]}`);
      await card.getByText("View percentage measurements", { exact: true }).click();
      await expect(card.getByRole("table").getByRole("row")).toHaveCount(history.dates.length + 1);
      await expect(card).not.toContainText("km²");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`then-and-now-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("comparison math preserves zeros and gaps, rejects bad baselines and labels sensors", () => {
  const parsed = parseComparison([
    { event: "2015–16", sensor: "Sentinel-1", dates: ["2015-11-01", "2015-12-01", "2016-01-01"], waterAreaKm2: [2, null, 0] },
    { event: "2023–24", sensor: "Sentinel-1", dates: ["2023-11-01"], waterAreaKm2: [0] },
    { event: "1997–98", sensor: "RADARSAT-1", dates: ["1997-11-01"], waterAreaKm2: [1] },
  ], [
    { basedOn: "2015–16", months: ["2026-11", "2027-01"], waterAreaKm2: [2, 1] },
  ], { date: "2026-11-05", area: 2 });
  expect(parsed.past).toHaveLength(2);
  expect(parsed.past[0].points.map(point => point.value)).toEqual([0, null, -100]);
  expect(parsed.past[1].sensor).toBe("RADARSAT-1");
  expect(parsed.future[0].points).toEqual([{ date: "2026-11-05", value: 0 }, { date: "2026-12-01", value: null }, { date: "2027-01-01", value: -50 }]);
  expect(parseComparison([], [], { date: "2026-11-05", area: 0 }).future).toEqual([]);
});

test("missing or malformed comparison context does not hide current observations", async ({ page }) => {
  await page.route("**/data/targets.json", route => route.fulfill({ json: [{ ...dam, history: "invalid", scenarios: [{ basedOn: "2015–16", months: ["2026-99"], waterAreaKm2: [1] }] }] }));
  await page.goto("/dam");
  await expect(page.getByTestId("selected-water-area")).toContainText("0.822 km²");
  await expect(page.getByText("Historical measurements are not available.")).toBeVisible();
  await expect(page.getByText("No scenario data available.")).toBeVisible();
});
