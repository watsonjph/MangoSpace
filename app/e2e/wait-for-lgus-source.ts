import type { Map as MapLibreMap } from "maplibre-gl";
import type { Page } from "@playwright/test";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

export async function waitForLgusSource(page: Page) {
  await page.waitForFunction(() =>
    window.hubasMap?.getSource("lgus") && window.hubasMap.isSourceLoaded("lgus"),
  );
}
