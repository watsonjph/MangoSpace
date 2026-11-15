import { expect, test } from "@playwright/test";
import type { Target } from "../lib/data";
import { saveProof } from "./proof";

const day = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

for (const viewport of [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 375, height: 812 }]) {
  test(`Dam view shows each date, the scenario lines and the past events at ${viewport.width}px`, async ({ page, request }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    const targets: Target[] = await (await request.get("/data/targets.json")).json();
    const dam = targets.find((target) => target.id === "malinao-dam")!;
    const { dates, images } = dam.nisar;
    const areas = dam.nisar.waterAreaKm2!;

    await page.setViewportSize(viewport);
    await page.goto("/method");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dam" }).click();
    await expect(page).toHaveURL(/\/dam\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("water area");
    await expect(page.getByRole("link", { name: "Dam" })).toHaveAttribute("aria-current", "page");

    const chart = page.getByTestId("dam-chart");
    const lines = chart.locator("polyline");
    await expect(lines).toHaveCount(1 + dam.scenarios!.length);
    expect((await lines.first().getAttribute("points"))!.split(" ")).toHaveLength(dates.length);
    await expect(chart.locator("polyline[stroke-dasharray]")).toHaveCount(dam.scenarios!.length);
    await expect(chart.locator("rect[fill='#8fb4d9']")).toHaveCount(dates.length);
    await expect(page.getByTestId("scenario-note")).toHaveText("Dashed lines: this is what happened before. It is not a forecast.");
    await expect(page.getByRole("main")).toContainText("The radar images alone do not establish the cause.");
    await expect(page.getByTestId("dam-event")).toHaveCount(dam.history!.length);
    await expect(page.getByTestId("dam-event").first()).toContainText("−52%");

    const loaded = (testId: string) =>
      page.getByTestId(testId).locator("img").evaluateAll((all) => all.map((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth));
    await expect.poll(() => loaded("dam-then")).toEqual([440, 440, 440]);

    const radar = page.getByTestId("dam-radar").locator("img");
    await expect(page.getByTestId("dam-area")).toHaveText(`${areas.at(-1)!.toFixed(2)} km²`);
    for (const [i, date] of dates.entries()) {
      await page.getByRole("slider").fill(String(i));
      await expect(page.locator(".dam-picker output")).toHaveText(day(date));
      await expect(page.getByTestId("dam-area")).toHaveText(`${areas[i].toFixed(2)} km²`);
      await expect(page.getByTestId("dam-rain")).toHaveText(`${dam.rainMm[i].toFixed(0)} mm`);
      await expect(radar).toHaveAttribute("src", `/data/${images[i].hh}`);
      await expect.poll(() => loaded("dam-radar")).toEqual([440]);
    }
    await page.getByRole("button", { name: "HV" }).click();
    await expect(radar).toHaveAttribute("src", `/data/${images.at(-1)!.hv}`);
    await expect.poll(() => loaded("dam-radar")).toEqual([440]);
    await page.getByRole("button", { name: "HH" }).click();

    // A click on a point of the chart selects that date.
    const box = (await chart.locator("svg").boundingBox())!;
    await chart.locator("svg").click({ position: { x: 46, y: box.height / 2 } });
    await expect(page.getByTestId("dam-area")).toHaveText(`${areas[0].toFixed(2)} km²`);
    await page.getByRole("slider").fill(String(dates.length - 1));

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await saveProof(page, `sc-104-dam-${viewport.name}.png`);
    expect(errors).toEqual([]);
  });
}
