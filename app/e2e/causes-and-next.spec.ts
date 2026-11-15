import { expect, test } from "@playwright/test";
import type { Lgu, Manifest, Target } from "../lib/data";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";

test("the interpretation figures still match the packaged measurements", async ({ request }) => {
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
  const targets: Target[] = await (await request.get("/data/targets.json")).json();
  for (const [start, towns, mean] of [
    ["2026-07-15", 99, 0.324], ["2026-07-27", 61, 0.250], ["2026-08-08", 99, 0.246],
  ] as const) {
    const index = manifest.windows.findIndex((window) => window.start === start);
    expect(index).toBeGreaterThanOrEqual(0);
    const values = lgus.flatMap((town) => town.validShare[index] >= 0.5 && town.soilMoisture[index] != null ? [town.soilMoisture[index]!] : []);
    expect(values).toHaveLength(towns);
    expect(Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3))).toBe(mean);
  }
  const dam = targets.find((target) => target.id === "malinao-dam")!;
  for (const [date, mm] of [["2026-07-20", 99.2], ["2026-08-13", 6.1], ["2026-09-18", 60.9]] as const) {
    expect(dam.rainMm[dam.nisar.dates.indexOf(date)]).toBe(mm);
  }
  for (const [id, mm] of [["ubay-rice", 39.6], ["pilar-rice", 46.4]] as const) {
    const parcel = targets.find((target) => target.id === id)!;
    expect(parcel.rainMm[parcel.nisar.dates.indexOf("2026-11-05")]).toBe(mm);
  }
});

for (const viewport of [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 375, height: 812 }]) {
  test(`the three views explain their evidence and limits at ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    await useOfflineBasemap(page);
    await page.setViewportSize(viewport);
    for (const [path, heading, facts] of [
      ["/", "What changed in late July", ["0.324 m³/m³", "0.250", "0.246", "61 towns instead of 99", "GPM cell near Pilar", "One rain cell cannot explain both islands"]],
      ["/dam", "Why the water area can change", ["0.76 and 0.82 km²", "18 Sept 2026", "20 Mar 2016", "26 Mar 2024", "60.9 mm", "does not cover the whole catchment"]],
      ["/rice", "Why the HV signal can change", ["−16.5 dB on 24 Oct 2026", "−15.2 dB on 30 Sept 2026", "5 Nov 2026", "cross-polarized HV signal", "39.6 mm near Ubay and 46.4 mm near Pilar", "A harvest or standing water could also lower HV", "No field observations confirm"]],
    ] as const) {
      await page.goto(path);
      if (path === "/") await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
      else await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
      const block = page.getByRole("region", { name: heading, exact: true });
      await block.scrollIntoViewIfNeeded();
      for (const label of ["What we see.", "What can cause it.", "What we cannot tell."]) {
        await expect(block.getByText(label, { exact: true })).toBeVisible();
      }
      for (const fact of facts) await expect(block).toContainText(fact);
      if (path === "/") {
        await page.getByLabel("Town", { exact: true }).selectOption("0701246000");
        await expect(block).toBeVisible();
        await block.scrollIntoViewIfNeeded();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await saveProof(page, `sc-476-${path === "/" ? "soil" : path.slice(1)}-${viewport.name}.png`);
    }
    expect(errors).toEqual([]);
  });

  test(`Method explains future measurements and the paired radar bands at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/method");
    const section = page.getByRole("region", { name: "What NISAR can do next", exact: true });
    await section.scrollIntoViewIfNeeded();
    for (const fact of ["nominal 12-day repeat", "December to May", "same track", "provisional", "24 cm", "5.6 cm", "C-band can also reach the ground", "do not prove", "field observations"]) {
      await expect(section).toContainText(fact);
    }
    const pairs = section.getByTestId("band-comparison");
    await expect(pairs).toContainText("Ubay parcel. NISAR HV was −17.2 dB on 12 Oct 2026. Sentinel-1 VH was −14.9 dB on 13 Oct 2026.");
    await expect(pairs).toContainText("Pilar parcel. NISAR HV was −15.2 dB on 12 Oct 2026. Sentinel-1 VH was −12.5 dB on 13 Oct 2026.");
    await expect(section.getByRole("link", { name: "NASA SAR Handbook on wavelength and vegetation" })).toHaveAttribute("href", "https://earthdata.nasa.gov/s3fs-public/2025-04/SARHB_CH2_Content.pdf");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await saveProof(page, `sc-476-method-${viewport.name}.png`);
  });
}
