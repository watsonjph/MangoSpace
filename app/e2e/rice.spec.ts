import { expect, test } from "@playwright/test";
import type { Target } from "../lib/data";
import { saveProof } from "./proof";

const day = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const db = (value: number) => `${value.toFixed(1).replace("-", "−")} dB`;

// The rice heading is a fixed sentence, so this fails when new data stops supporting it.
test("the data still supports the rice heading", async ({ request }) => {
  const targets: Target[] = await (await request.get("/data/targets.json")).json();
  for (const { id, nisar } of targets.filter((target) => target.kind === "rice")) {
    const hv = nisar.meanHvDb!;
    const high = hv.indexOf(Math.max(...hv));
    expect(hv[high], `${id} rises above its first date`).toBeGreaterThan(hv[0]);
    expect([8, 9], `${id} peaks in September or October`).toContain(new Date(nisar.dates[high]).getUTCMonth());
    expect(nisar.dates.at(-1), `${id} ends on 5 November`).toBe("2026-11-05");
    expect(hv.at(-1)!, `${id} is lower on the last date`).toBeLessThan(hv.at(-2)!);
  }
});

for (const viewport of [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 375, height: 812 }]) {
  test(`Rice view shows the HV line and each date of both parcels at ${viewport.width}px`, async ({ page, request }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    const targets: Target[] = await (await request.get("/data/targets.json")).json();
    const parcels = targets.filter((target) => target.kind === "rice");
    expect(parcels.map((parcel) => parcel.id)).toEqual(["ubay-rice", "pilar-rice"]);

    await page.setViewportSize(viewport);
    await page.goto("/dam");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Rice" }).click();
    await expect(page).toHaveURL(/\/rice\/?$/);
    await expect(page.getByRole("link", { name: "Rice" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".rice-page[data-ready=true]")).toBeVisible();
    await expect(page.getByTestId("rice-parcel")).toHaveCount(2);
    await expect(page.getByRole("main")).toContainText("No field observations confirm the crop, planting date or growth stage");

    const chart = page.getByTestId("dam-chart");
    await expect(chart.locator("polyline")).toHaveCount(2);
    const radar = page.getByTestId("rice-radar").locator("img");
    const loaded = () => radar.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);

    for (const [name, parcel] of [["Ubay", parcels[0]], ["Pilar", parcels[1]]] as const) {
      const { dates, images } = parcel.nisar;
      const hv = parcel.nisar.meanHvDb!;
      await page.getByRole("button", { name }).click();
      expect((await chart.locator("polyline").first().getAttribute("points"))!.split(" ")).toHaveLength(dates.length);
      await expect(chart.locator("rect[fill='#8fb4d9']")).toHaveCount(dates.length);
      for (const [i, date] of dates.entries()) {
        await page.getByRole("slider").fill(String(i));
        await expect(page.locator(".dam-picker output")).toHaveText(day(date));
        await expect(page.getByTestId("rice-hv")).toHaveText(db(hv[i]));
        await expect(page.getByTestId("rice-rain")).toHaveText(`${parcel.rainMm[i].toFixed(0)} mm`);
        await expect(radar).toHaveAttribute("src", `/data/${images[i].hh}`);
        await expect.poll(loaded).toBe(true);
      }
      await page.getByRole("button", { name: "HV" }).click();
      await expect(radar).toHaveAttribute("src", `/data/${images.at(-1)!.hv}`);
      await expect.poll(loaded).toBe(true);
      await page.getByRole("button", { name: "HH" }).click();
    }

    // A click on the chart selects the nearest date of the selected parcel.
    const box = (await chart.locator("svg").boundingBox())!;
    await chart.locator("svg").click({ position: { x: 46, y: box.height / 2 } });
    await expect(page.getByTestId("rice-hv")).toHaveText(db(parcels[1].nisar.meanHvDb![0]));
    await page.getByRole("button", { name: "Ubay" }).click();
    await page.getByRole("slider").fill(String(parcels[0].nisar.dates.length - 2));

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await saveProof(page, `sc-136-rice-${viewport.name}.png`);
    expect(errors).toEqual([]);
  });
}
