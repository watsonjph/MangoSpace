import { expect, test } from "@playwright/test";
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
