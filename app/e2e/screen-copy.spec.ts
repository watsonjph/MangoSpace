import { expect, test } from "@playwright/test";
import type { Lgu, Manifest, Target } from "../lib/data";
import { soilMeans } from "../src/app/soil-mean";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";

test("each view leads with a numbered finding and readable dates", async ({ page }) => {
  await useOfflineBasemap(page);
  for (const route of ["/", "/dam", "/rice", "/score", "/method"]) {
    await page.goto(route);
    await expect(page.getByTestId("view-finding")).toContainText(/\d/);
    if (route !== "/method") await expect(page.getByRole("main").getByRole("link", { name: /method/i }).first()).toBeVisible();
    expect(await page.getByRole("main").innerText()).not.toMatch(/2026-11-03/);
    await saveProof(page, `sc-553-${route.slice(1) || "soil"}.png`);
    if (route === "/") {
      await page.getByRole("link", { name: "Read the method and limits", exact: true }).click();
      await expect(page).toHaveURL(/\/method$/);
    }
  }
});

// The map's soil finding is a fixed sentence, so this fails when new data stops supporting it.
test("the data still supports the soil finding", async ({ request }) => {
  const manifest: Manifest = await (await request.get("/data/manifest.json")).json();
  const lgus: Lgu[] = await (await request.get("/data/lgus.json")).json();
  const means = soilMeans(manifest.windows.length, lgus).map((m) => m.mean!);
  const fall = manifest.windows.findIndex((w) => w.start === "2026-07-27");
  expect(Math.max(...means.slice(0, fall)), "about 0.35 before the fall").toBeCloseTo(0.35, 1);
  expect(means[fall], "about 0.25 at the end of July").toBeCloseTo(0.25, 1);
  expect(means[fall + 1], "still low in the next full window").toBeCloseTo(0.25, 1);
});

// /start states fixed dam and rice numbers, so this fails when new data stops supporting them.
test("the data still supports the opening's dam and rice findings", async ({ request }) => {
  const targets: Target[] = await (await request.get("/data/targets.json")).json();
  const dam = targets.find((t) => t.id === "malinao-dam")!;
  const area = dam.nisar.waterAreaKm2!;
  expect(Math.min(...area), "0.76 km² low in 2026").toBeCloseTo(0.76, 2);
  expect(Math.max(...area), "0.82 km² high in 2026").toBeCloseTo(0.82, 2);
  const s1 = dam.history!.find((h) => h.event === "2015–16")!;
  const low = s1.waterAreaKm2!.indexOf(Math.min(...s1.waterAreaKm2!));
  expect(s1.dates[low], "the 2016 low is in March").toMatch(/^2016-03/);
  expect(Math.round(100 * (1 - s1.waterAreaKm2![low] / s1.waterAreaKm2![0])), "a 52% fall").toBe(52);
  for (const id of ["ubay-rice", "pilar-rice"]) {
    const hv = targets.find((t) => t.id === id)!.nisar.meanHvDb!;
    const last = hv.length - 1;
    const peak = Math.max(...hv.slice(0, last));
    expect(peak - Math.min(...hv.slice(0, hv.indexOf(peak))), `${id} rose about 5–6 dB`).toBeGreaterThan(4.5);
    expect(peak - Math.min(...hv.slice(0, hv.indexOf(peak))), `${id} rose about 5–6 dB`).toBeLessThan(6.5);
    expect(hv[last - 1] - hv[last], `${id} fell about 3–4 dB on the last date`).toBeGreaterThan(2.5);
    expect(hv[last - 1] - hv[last], `${id} fell about 3–4 dB on the last date`).toBeLessThan(4.5);
  }
  expect(dam.nisar.dates.at(-1), "the fall is on 5 Nov 2026").toBe("2026-11-05");
});
