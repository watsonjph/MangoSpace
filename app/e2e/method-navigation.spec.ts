import { expect, test } from "@playwright/test";
import { useOfflineBasemap } from "./offline-basemap";

for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
  test(`Method, sources and navigation at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    page.on("requestfailed", (request) => {
      if (request.failure()?.errorText !== "net::ERR_ABORTED") errors.push(request.url());
    });
    await useOfflineBasemap(page);
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible({ timeout: 15_000 });

    const navigation = page.getByRole("navigation", { name: "Main", exact: true });
    await expect(navigation.getByRole("link")).toHaveText(["Dam", "Rice", "Method"]);
    await expect(navigation.getByRole("button")).toHaveText(["Soil water", "Rank"]);
    await expect(navigation.getByRole("button", { name: "Soil water" })).toHaveAttribute("aria-pressed", "true");
    await navigation.getByRole("button", { name: "Rank" }).click();
    await expect(navigation.getByRole("button", { name: "Rank" })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/mode=rank$/);
    await navigation.getByRole("button", { name: "Soil water" }).click();
    await expect(navigation.getByRole("button", { name: "Soil water" })).toHaveAttribute("aria-pressed", "true");
    await expect(page).not.toHaveURL(/mode=rank/);
    const header = await page.locator(".topbar").boundingBox();
    const map = await page.locator(".map").boundingBox();
    expect(map!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    const attribution = page.locator(".maplibregl-ctrl-attrib");
    for (const name of ["MapLibre", "OpenFreeMap", "OpenMapTiles", "© OpenStreetMap contributors"]) {
      await expect(attribution.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await page.screenshot({ path: test.info().outputPath(`map-${viewport.width}.png`), fullPage: true });

    await navigation.getByRole("link", { name: "Method" }).click();
    await expect(page).toHaveURL(/\/method\/?$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Measured, not forecast" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Method" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("main")).toContainText("We use all valid NISAR soil water readings");
    await expect(page.getByRole("main")).toContainText("NISAR marks most of them as not recommended");
    await expect(page.getByRole("main")).toContainText("not a drought risk score");
    await expect(page.getByRole("main")).toContainText("less than half of it has data");
    await expect(page.getByRole("main")).toContainText("“Pixels with data” in the town panel");
    const sources = page.getByRole("region", { name: "Data sources and licences" });
    for (const text of ["NASA and ISRO", "NAMRIA", "CC BY 3.0 IGO", "2024 Census", "PSGC 3Q 2026", "DOST-PAGASA", "Open Database Licence"]) {
      await expect(sources).toContainText(text);
    }
    expect(await sources.getByRole("link").count()).toBeGreaterThan(8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`method-${viewport.width}.png`), fullPage: true });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Measured, not forecast" })).toBeVisible();
    await page.getByRole("link", { name: "Back to soil water" }).click();
    await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Town").selectOption({ label: "Ubay, Bohol" });
    await expect(page.getByLabel("Town")).toHaveValue("0701246000");
    expect(errors).toEqual([]);
  });
}
