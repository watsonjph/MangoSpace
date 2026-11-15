import { expect, test } from "@playwright/test";
import type { Target } from "../lib/data";
import { saveProof } from "./proof";

test.use({ hasTouch: true });

for (const viewport of [{ name: "desktop", width: 1280, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`Dam comparison supports dates and a mouse, keyboard and touch divider at ${viewport.width}px`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
    const targets: Target[] = await (await request.get("/data/targets.json")).json();
    const dam = targets.find((target) => target.id === "malinao-dam")!;
    await page.goto("/dam");
    await expect(page.locator(".dam-page[data-ready=true]")).toBeVisible();
    const comparison = page.getByRole("region", { name: "Then and now" });
    const divider = comparison.getByRole("slider", { name: "Image comparison divider" });
    const before = comparison.getByRole("img", { name: "Then: 20 Mar 2016, Sentinel-1 VV", exact: true });
    await expect(before).toBeVisible();
    await expect(comparison.getByRole("img", { name: "Now: 5 Nov 2026, NISAR HH", exact: true })).toBeVisible();
    await expect(comparison.getByTestId("dam-comparison-change")).toContainText("Then: −52%");
    await expect(comparison).toContainText("different sensors and polarizations");
    await expect(comparison).not.toContainText("km²");
    for (const image of await comparison.getByRole("img").all()) {
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth)).toBe(440);
    }
    await divider.scrollIntoViewIfNeeded();
    await saveProof(page, `sc-470-dam-swipe-${viewport.name}.png`);
    const box = (await comparison.getByTestId("dam-swipe").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    const dragged = Number(await divider.inputValue());
    expect(dragged).toBeGreaterThan(70);
    expect(dragged).toBeLessThan(80);
    await expect(before).toHaveCSS("clip-path", `inset(0px ${100 - dragged}% 0px 0px)`);
    await divider.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(divider).toHaveValue(String(dragged - 1));
    await page.keyboard.press("Home");
    await expect(divider).toHaveValue("0");
    await page.keyboard.press("End");
    await expect(divider).toHaveValue("100");
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width - 2, y: box.y + box.height / 2 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + box.width * 0.25, y: box.y + box.height / 2 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touch.detach();
    expect(Number(await divider.inputValue())).toBeGreaterThan(20);
    expect(Number(await divider.inputValue())).toBeLessThan(30);

    const pastCount = dam.history!.reduce((count, event) => count + event.dates.length, 0);
    await comparison.getByRole("combobox", { name: "Then date" }).selectOption(String(pastCount));
    await comparison.getByRole("combobox", { name: "Now date" }).selectOption("0");
    await expect(comparison.getByRole("img").first()).toHaveAttribute("src", `/data/${dam.history![0].images[0]}`);
    await expect(comparison.getByRole("img").nth(1)).toHaveAttribute("src", `/data/${dam.nisar.images[0].hh}`);
    await expect(comparison.getByTestId("dam-comparison-change")).toHaveText(/Then: 0% against .+\. Now: 0% against .+\./);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await saveProof(page, `sc-470-dam-swipe-changed-${viewport.name}.png`);
    expect(errors).toEqual([]);
  });
}
