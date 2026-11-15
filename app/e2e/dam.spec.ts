import { expect, test } from "@playwright/test";
import type { Target } from "../lib/data";
import { saveProof } from "./proof";
import { expectColorComposite } from "./radar-color";

const day = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

for (const viewport of [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 375, height: 812 }]) {
  test(`Dam view shows the chart and every date of 2026 and of the past events at ${viewport.width}px`, async ({ page, request }) => {
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
    await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("water area");
    await expect(page.getByRole("link", { name: "Dam" })).toHaveAttribute("aria-current", "page");

    const chart = page.getByTestId("dam-chart");
    const lines = chart.locator("polyline");
    await expect(lines).toHaveCount(1 + dam.scenarios!.length);
    expect((await lines.first().getAttribute("points"))!.split(" ")).toHaveLength(dates.length);
    await expect(chart.locator("polyline[stroke-dasharray]")).toHaveCount(dam.scenarios!.length);
    await expect(chart.getByTestId("rain-bar")).toHaveCount(dates.length);
    await expect(page.getByTestId("scenario-note")).toContainText("Dashed lines: this is what happened before. It is not a forecast.");
    await expect(page.getByRole("main")).toContainText("The radar images alone do not establish the cause");
    await expect(page.getByTestId("dam-event")).toHaveCount(dam.history!.length);
    await expect(page.getByTestId("dam-event").first()).toContainText("−52%");

    const radarFigure = page.getByTestId("dam-radar");
    const radar = radarFigure.locator("img");
    const loaded = () => radar.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth);
    const past = dam.history!.flatMap((event) => event.dates.map((date, i) => ({
      date, image: event.images[i], change: (event.waterAreaKm2![i] / event.waterAreaKm2![0] - 1) * 100,
    })));

    // The slider starts on the latest date and runs through the past events first, then 2026.
    await expect(page.getByTestId("dam-area")).toHaveText(`${areas.at(-1)!.toFixed(2)} km²`);
    for (const [i, frame] of past.entries()) {
      await page.getByRole("slider", { name: "Date", exact: true }).fill(String(i));
      await expect(page.locator(".dam-picker output")).toHaveText(day(frame.date));
      await expect(radar).toHaveAttribute("src", `/data/${frame.image}`);
      await expect.poll(loaded).toBe(440);
      await expect(page.getByRole("button", { name: "Color" })).toHaveCount(0);
      const rounded = Math.round(frame.change);
      const percent = `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${Math.abs(rounded)}%`;
      await expect(page.getByTestId("dam-change")).toHaveText(percent);
    }
    await expect(page.getByTestId("dam-area")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "HV" })).toHaveCount(0);
    for (const [i, date] of dates.entries()) {
      await page.getByRole("slider", { name: "Date", exact: true }).fill(String(past.length + i));
      await expect(page.locator(".dam-picker output")).toHaveText(day(date));
      await expect(page.getByTestId("dam-area")).toHaveText(`${areas[i].toFixed(2)} km²`);
      await expect(page.getByTestId("dam-rain")).toHaveText(`${dam.rainMm[i].toFixed(0)} mm`);
      await expect(radar).toHaveAttribute("src", `/data/${images[i].hh}`);
      await expect.poll(loaded).toBe(440);
    }
    await page.getByRole("button", { name: "HV" }).click();
    await expect(radar).toHaveAttribute("src", `/data/${images.at(-1)!.hv}`);
    await expect.poll(loaded).toBe(440);
    await page.getByRole("button", { name: "Color" }).click();
    await expectColorComposite(radarFigure, images.at(-1)!);
    await expect(radarFigure.locator(".radar-color-legend")).toContainText("HH return from −30 to 0 dB");
    await expect(radarFigure.locator(".radar-color-legend")).toContainText("HV return from −30 to 0 dB");
    await expect(radarFigure.locator(".radar-color-legend")).toContainText("fixed 0–15 dB stretch");
    await expect(radarFigure.locator(".radar-color-legend")).toContainText("do not identify land cover");
    await expect(page.getByRole("button", { name: "Color" })).toHaveAttribute("aria-pressed", "true");
    await saveProof(page, `sc-463-dam-color-${viewport.name}.png`);
    await page.getByRole("slider", { name: "Date", exact: true }).fill("0");
    await expect(radar).toHaveAttribute("src", `/data/${past[0].image}`);
    await expect(radarFigure.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Color" })).toHaveCount(0);
    await page.getByRole("slider", { name: "Date", exact: true }).fill(String(past.length));
    await expectColorComposite(radarFigure, images[0]);
    await expect(page.getByRole("button", { name: "Color" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "HH" }).click();

    await page.getByRole("button", { name: "Lowest in 2015–16" }).click();
    await expect(page.locator(".dam-picker output")).toHaveText("20 Mar 2016");
    await expect(page.getByTestId("dam-change")).toHaveText("−52%");
    await expect(chart.locator("circle[r='6']")).toHaveCount(0);
    await page.getByRole("button", { name: "Now" }).click();
    await expect(page.getByTestId("dam-area")).toHaveText(`${areas.at(-1)!.toFixed(2)} km²`);

    const box = (await chart.locator("svg").boundingBox())!;
    await chart.locator("svg").click({ position: { x: 46, y: box.height / 2 } });
    await expect(page.getByTestId("dam-area")).toHaveText(`${areas[0].toFixed(2)} km²`);
    await page.getByRole("button", { name: "Lowest in 2015–16" }).click();
    await expect.poll(loaded).toBe(440);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await saveProof(page, `sc-104-dam-${viewport.name}.png`);
    expect(errors).toEqual([]);
  });
}

test("Color stays on screen while play steps through the 2026 dates", async ({ page, request }) => {
  const dam = ((await (await request.get("/data/targets.json")).json()) as Target[]).find((target) => target.id === "malinao-dam")!;
  const dates = dam.nisar.dates;
  await page.goto("/dam");
  await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
  const slider = page.getByRole("slider", { name: "Date", exact: true });
  const last = Number(await slider.getAttribute("max"));
  await slider.fill(String(last - dates.length + 1));
  await page.getByRole("button", { name: "Color" }).click();
  const figure = page.getByTestId("dam-radar");
  await expect(figure.locator("canvas")).toBeVisible();
  await figure.evaluate((node) => {
    const seen = { hidden: 0 };
    (window as unknown as { colorBlink: typeof seen }).colorBlink = seen;
    const check = () => {
      const canvas = node.querySelector("canvas");
      if (!canvas || canvas.hidden) seen.hidden++;
    };
    new MutationObserver(check).observe(node, { subtree: true, childList: true, attributes: true });
  });
  await page.getByRole("button", { name: "Loop", exact: true }).click();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.locator(".dam-picker output")).toHaveText(day(dates.at(-1)!), { timeout: 15_000 });
  expect(await page.evaluate(() => (window as unknown as { colorBlink: { hidden: number } }).colorBlink.hidden)).toBe(0);
  await expectColorComposite(figure, dam.nisar.images.at(-1)!);
});
