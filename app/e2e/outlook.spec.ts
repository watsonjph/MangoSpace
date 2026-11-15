import { expect, test } from "@playwright/test";
import { useOfflineBasemap } from "./offline-basemap";

for (const width of [1280, 375]) {
  test(`official PAGASA outlook for Cebu and Bohol at ${width}px`, async ({ page }) => {
    await useOfflineBasemap(page);
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/");
    for (const town of ["City of Bogo, Cebu", "Ubay, Bohol"]) {
      await page.getByLabel("Town").selectOption({ label: town });
      const panel = page.locator(".panel");
      await expect(panel).toContainText(`PAGASA, ${town.split(", ")[1]}`);
      await expect(panel).toContainText("El Niño Advisory No. 6, 2026-11-03");
      await expect(panel).toContainText("below-normal to way-below-normal rainfall in November 2026");
      await expect(panel).toContainText("Heavy rain may still occur");
      await expect(panel).not.toContainText(/mock|Dec–May/i);
    }
    await page.getByRole("navigation", { name: "Main", exact: true }).getByRole("link", { name: "Method" }).click();
    const sources = page.getByRole("region", { name: "Data sources and licences" });
    for (const province of ["Cebu", "Bohol"]) {
      await expect(sources).toContainText(`${province}: El Niño Advisory No. 6, issued 2026-11-03`);
    }
    await expect(sources).not.toContainText(/mock/i);
  });
}
