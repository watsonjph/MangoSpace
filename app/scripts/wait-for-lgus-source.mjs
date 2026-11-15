export async function waitForLgusSource(page, { loaded = false, timeout = 30000 } = {}) {
  await page.waitForFunction((requireLoaded) => {
    const map = window.hubasMap;
    return map?.getSource("lgus") && map.isSourceLoaded("lgus") && (!requireLoaded || map.loaded());
  }, loaded, { timeout });
}
