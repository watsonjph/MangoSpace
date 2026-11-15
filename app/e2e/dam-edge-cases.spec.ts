import { expect, test } from "@playwright/test";
import { saveProof } from "./proof";

test("dam without water area has no chart", async ({ page }) => {
  await page.goto("/dam?fixture=empty");
  await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
  await expect(page.getByTestId("dam-empty")).toHaveText("No water area has been measured for this dam yet.");
  await expect(page.getByTestId("dam-chart")).toHaveCount(0);
  await saveProof(page, "sc-428-empty.png");
});

test("dam chart centers one date with finite coordinates", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dam?fixture=single-date");
  await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
  const chart = page.getByTestId("dam-chart");
  await expect(chart.locator("polyline")).toHaveCount(1);
  await expect(chart.locator("circle[r='2.5']")).toHaveCount(1);
  await expect(chart.locator("circle[r='6']")).toHaveCount(1);
  const coordinates = await chart.locator("svg").evaluate(svg => ({
    width: Number(svg.getAttribute("width")),
    point: svg.querySelector("polyline")!.getAttribute("points")!.trim().split(/[\s,]+/).map(Number),
    all: [...svg.querySelectorAll("[cx], [x], [y], [height]")].flatMap(node =>
      ["cx", "cy", "x", "y", "height"].filter(key => node.hasAttribute(key)).map(key => Number(node.getAttribute(key)))),
  }));
  expect(coordinates.point).toHaveLength(2);
  expect([...coordinates.point, ...coordinates.all].every(Number.isFinite)).toBe(true);
  expect(coordinates.point[0]).toBeCloseTo((coordinates.width + 34) / 2, 1);
  await saveProof(page, "sc-428-single-date.png");
  expect(errors).toEqual([]);
});
