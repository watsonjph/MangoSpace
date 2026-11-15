import { expect, test } from "@playwright/test";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";

test("Cebuano review toggle persists, sets lang and keeps Method English", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_CEBUANO_REVIEW !== "1", "Unapproved translations are disabled in production");
  await useOfflineBasemap(page);
  await page.setViewportSize({ width: 390, height: 812 });
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await saveProof(page, "sc-482-english.png");
  await page.getByLabel("Language", { exact: true }).selectOption("ceb");
  await expect(page.getByLabel("Lungsod", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ceb");
  await page.getByLabel("Lungsod", { exact: true }).selectOption("0702211000");
  await expect(page.getByTestId("town-name")).toContainText("City of Bogo");
  await saveProof(page, "sc-482-cebuano-draft.png");
  await page.getByRole("link", { name: "Dam", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lig-on");
  await page.reload();
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("ceb");
  await page.getByRole("link", { name: "Method", exact: true }).click();
  await expect(page.getByRole("main")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Measured, not forecast");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
