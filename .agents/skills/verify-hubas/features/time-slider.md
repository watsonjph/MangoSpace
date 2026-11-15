# Time slider

The slider at the bottom moves through the 12-day NISAR windows, from late June to late October. Moving it changes the map colors and the selected town's soil water, pixels with data and the marked window on its soil water line.

## Sub-features

- `slider-play` advances one window per second and stops after the final window; Pause holds the current window.
- `slider-range` shows the start and end date of the selected window.
- `slider-map` recolors the map for the new window.
- `slider-panel` updates the open town panel for the new window.

## How to get to it (user POV)

- Click Play or Pause beside the date range.
- Drag the slider labeled `Window` at the bottom of the page.
- Focus the slider and press the arrow keys.

## Driving it with control-hubas

Preconditions:

- `doctor` reports `ok: true`.
- `public/data/manifest.json` has 11 provisional NISAR windows (index 0 to 10).

- **Move the slider.** Set window 10. Run `node scripts/control-hubas.mjs drive --window 10 --name slider-10`. `window.index` is `10` and `window.range` matches the last entry of `manifest.json` `windows` (`2026-10-19 → 2026-10-31`).
- **Panel follows.** Open a town and move the slider. Run `node scripts/control-hubas.mjs drive --town 0702211000 --name slider-bogo-0` and `node scripts/control-hubas.mjs drive --town 0702211000 --window 10 --name slider-bogo-10`. `panel["Soil water"]` matches `soilMoisture[0]` and `soilMoisture[10]` for that town in `lgus.json`. The two values differ when the data differs.
- **No soil water in a window.** Run `node scripts/control-hubas.mjs drive --town 0701245000 --window 3 --name slider-tubigon-3`. `panel["Soil water"]` is `No good pixels`, because `soilMoisture[3]` is `null` for Tubigon: no Bohol track has a file in that window.
- **Out of range.** Run `node scripts/control-hubas.mjs drive --window 99`. The command fails with `--window must be 0 to 10.`

## Gotchas

- `drive` sets the slider value directly and fires its change event. It does not test dragging with the mouse or the arrow keys.
- The keyboard entry point is not covered by `drive`. Use the Playwright MCP: focus `Window`, press `ArrowRight`, read `.slider output`.
- The window count comes from the manifest. Real data can have a different count.
