import { expect, test } from "@playwright/test";
import { saveProof } from "./proof";

test("public demo has seven slides and a real PowerPoint download", async ({ page, request }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hubas in 7 slides");
  await expect(page.getByRole("img")).toHaveCount(7);
  for (const image of await page.getByRole("img").all()) expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 1280)).toBe(true);
  const response = await request.get("/demo/Hubas-demo.pptx");
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
  expect(bytes.length).toBeGreaterThan(500000);
  await expect(page.getByRole("link", { name: "Download the PowerPoint demo" })).toHaveAttribute("download", "");
  await page.setViewportSize({ width: 390, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await saveProof(page, "sc-201-demo-slides.png");
});
