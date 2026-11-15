import { expect, test } from "@playwright/test";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";
import type { Lgu, Target } from "../lib/data";

for (const width of [1280, 390]) {
  test(`chart labels, units and mouse and touch readings at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 800 }, hasTouch: true });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    await useOfflineBasemap(page);
    const lgus: Lgu[] = await (await page.request.get("/data/lgus.json")).json();
    const targets: Target[] = await (await page.request.get("/data/targets.json")).json();
    await page.goto("/");
    await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
    await page.getByLabel("Town").selectOption("0702211000");
    const soil = page.getByTestId("soil-line");
    await soil.scrollIntoViewIfNeeded();
    await expect(soil).toHaveAccessibleName(/Range: 0.1 to 0.45 m³\/m³.*Selected:/);
    await expect(soil.locator(".line-label")).toHaveText("2026, NISAR");
    await expect(soil.locator(".finding")).toContainText("Late July");
    const first = soil.locator("circle").first();
    await first.hover();
    await expect(page.locator(".chart-readout")).toContainText(/Jun: 0\.\d{3} m³\/m³/);
    await expect(page.locator(".chart-readout")).toContainText(`${lgus.find((lgu) => lgu.psgc === "0702211000")!.soilMoisture[0]!.toFixed(3)} m³/m³`);
    const point = (await first.boundingBox())!;
    await page.touchscreen.tap(point.x + point.width / 2, point.y + point.height / 2);
    await expect(page.locator(".chart-readout")).toContainText("m³/m³");
    await saveProof(page, `sc-546-soil-${width}.png`);
    await page.getByLabel("Town").selectOption("0701245000");
    await page.getByLabel("Window").fill("3");
    await soil.scrollIntoViewIfNeeded();
    const soilBox = (await soil.boundingBox())!;
    const guide = Number(await soil.getByTestId("soil-line-window").getAttribute("x1"));
    await soil.hover({ position: { x: guide / 296 * soilBox.width, y: soilBox.height / 2 } });
    await expect(page.locator(".chart-readout")).toContainText("No data");

    for (const [path, unit, finding] of [["dam", "km²", "Steady in 2026"], ["rice", "dB", "Fall on 5 Nov 2026"]]) {
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: path === "dam" ? "Dam" : "Rice", exact: true }).click();
      await expect(page.locator("main[data-ready=true]")).toBeVisible();
      const chart = page.getByTestId("dam-chart");
      await expect(chart.locator("svg")).toHaveAccessibleName(new RegExp(`Range:.*${unit}.*Selected:`));
      await expect(chart.locator(".finding")).toContainText(finding);
      await expect(chart.locator(".rain-axis")).toContainText("Rain, mm");
      await expect(chart.locator(".line-label")).toHaveCount(path === "dam" ? 3 : 2);
      const labels = await chart.locator(".line-label").all();
      for (let i = 1; i < labels.length; i++) {
        const a = (await labels[i - 1].boundingBox())!, b = (await labels[i].boundingBox())!;
        expect(a.y + a.height <= b.y || b.y + b.height <= a.y || a.x + a.width <= b.x || b.x + b.width <= a.x).toBe(true);
      }
      const circle = chart.locator("circle").first();
      const box = (await circle.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await expect(chart.locator("output")).toContainText(` ${unit}`);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await expect(chart.locator("output")).toContainText("26 Jun 2026");
      const target = targets.find((item) => item.id === (path === "dam" ? "malinao-dam" : "ubay-rice"))!;
      await expect(chart.locator("output")).toContainText(path === "dam" ? target.nisar.waterAreaKm2![0].toFixed(2) : target.nisar.meanHvDb![0].toFixed(1).replace("-", "−"));
      await expect(chart.locator("svg")).toHaveAccessibleName(/Selected: 26 Jun 2026/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await saveProof(page, `sc-546-${path}-${width}.png`);
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}
