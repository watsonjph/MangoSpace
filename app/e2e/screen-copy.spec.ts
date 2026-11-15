import { expect, test } from "@playwright/test";
import type { Lgu, Manifest } from "../lib/data";
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
