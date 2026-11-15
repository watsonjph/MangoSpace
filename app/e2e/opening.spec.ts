import { expect, test } from "@playwright/test";
import { useOfflineBasemap } from "./offline-basemap";
import { saveProof } from "./proof";

for (const width of [1280, 390]) test(`opening leads through three parts and preserves selection at ${width}px`, async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => message.type() === "error" && errors.push(message.text()));
  await useOfflineBasemap(page);
  await page.setViewportSize({ width, height: 800 });
  await page.goto("/");
  await expect(page.locator(".map[data-ready=true] canvas")).toBeVisible();
  await expect(page.getByText("What happened to water before El Niño?", { exact: true })).toBeInViewport();
  await page.getByLabel("Town").selectOption("0702211000");
  await page.getByLabel("Window").fill("3");
  await page.getByRole("link", { name: "Follow the soil, the dam and the rice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  await expect(page.locator(".story-steps li")).toHaveCount(3);
  await saveProof(page, `sc-456-opening-${width}.png`);
  for (const name of ["Play the soil season", "Compare the dam dates", "Explore the rice dates"]) {
    const link = page.getByRole("link", { name, exact: true });
    // Static HTML has no browser selection until the client store hydrates.
    await expect(link).toHaveAttribute("href", /town=0702211000&window=3/);
    await link.click();
    await expect(page).toHaveURL(/town=0702211000&window=3/);
    await page.goto("/start?town=0702211000&window=3");
  }
  const back = page.getByRole("link", { name: "Return to the map" });
  await expect(back).toHaveAttribute("href", /town=0702211000&window=3/);
  await back.click();
  await expect(page.getByLabel("Town")).toHaveValue("0702211000");
  await expect(page.getByLabel("Window")).toHaveValue("3");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
