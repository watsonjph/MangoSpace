# Soil water map

The map shows Cebu and Bohol on a light base map. Each town is a shape filled by its soil water for the selected window: dry is ochre, wet is teal, and a town with no reading or with less than half its pixels with data is grey; for a grey town that has a reading, the panel still shows its value. A label at the top left says the data is provisional. A legend at the bottom left (below the label on a phone) explains the colors. The map frames both islands so the label, legend, panel and slider do not cover them.

## Sub-features

- `soil-interpretation` is the panel section "What changed in late July". Its three lines give the late-July mean change, the local GPM rain comparison, and the coverage and cause limits. It stays visible when a town is selected.

- `map-load` shows the base map and every town shape without console errors.
- `map-view` selects the Soil water button in the top bar.
- `map-colors` fills each town by its soil water in the selected window.
- `map-label` shows "Cebu + Bohol · 12-day window · provisional".
- `map-legend` shows "Soil water", "0.10 m³/m³ · drier", "0.45 m³/m³ · wetter" and "Gray: less than half the pixels have data".
- `map-framing` keeps Cebu and Bohol in view and clear of the overlays, at desktop and phone widths.

## How to get to it (user POV)

- Open the app URL. On a desktop, the map fills the page below the top bar, with the panel and slider on top of it.
- Choose Soil water in the top bar to color the map by the selected window.
- On a phone (640 px wide or less), the map fills the top of the page; the panel and the slider follow below it.

## Driving it with control-hubas

- Scroll the panel to "What changed in late July". Check "What we see", "What can cause it", and "What we cannot tell". Select Ubay and check that the season note remains. `npx playwright test e2e/causes-and-next.spec.ts` verifies the block at desktop and phone widths. With `PROOF=1`, it writes `sc-476-soil-desktop.png` and `sc-476-soil-mobile.png`.

Preconditions:

- `doctor` reports `ok: true`, including `basemap`.

- **Load.** Open the app. Run `node scripts/control-hubas.mjs drive --name map-load`. `steps` contains `map ready`, `consoleErrors` is empty, `label` is `Cebu + Bohol · 12-day window · provisional`, and `legend` is `["Soil water", "0.10 m³/m³ · drier", "0.45 m³/m³ · wetter", "Gray: less than half the pixels have data"]`.
- **See the towns.** Open `screenshot.png` in the evidence folder. Every town from `towns` is visible as a filled shape inside Cebu or Bohol, and no overlay covers either island.
- **Phone layout.** Run `node scripts/control-hubas.mjs drive --viewport 375x812 --name map-phone`. The full-page `screenshot.png` shows the map on top, then the panel, then the slider.
- **Grey towns.** Run `node scripts/control-hubas.mjs drive --window 3 --town "Antequera, Bohol" --name map-w3`. A town is grey when `soilMoisture` at index 3 in `lgus.json` is `null` or `validShare` at index 3 is below 0.5. In windows 3 and 10, 38 of the 48 Bohol towns are grey (29 with no reading, 9 with low coverage), plus City of Lapu-Lapu and City of Mandaue. In every other window only those two Cebu cities are grey. Antequera is grey in window 3 but its panel shows `0.285 m³/m³` with `Pixels with data` `1%`.
- **Colors follow data.** Run `node scripts/control-hubas.mjs drive --window 0 --name map-w0` and `node scripts/control-hubas.mjs drive --window 10 --name map-w10`. Compare the two screenshots: towns whose `soilMoisture` changes between index 0 and 10 in `public/data/lgus.json` change color.

## Gotchas

- The interpretation describes the whole season, not the selected town or window. The 27 July to 8 August mean uses 61 towns, against 99 in the windows beside it. The Pilar rain cell is not an island-wide measure.

- The base map comes from tiles.openfreemap.org. If `doctor` fails `basemap`, the map can stay blank; report it as an outside failure, not an app bug. To verify the app without internet, add `--offline-basemap yes` to `drive`: town shapes, colors and overlays still work on a plain background, the same stub the e2e specs use.
- A town with `null` soil water or low coverage for a window is grey, not missing. Check `lgus.json` before reporting a missing town.
- The colors are a smooth scale. Compare screenshots side by side; do not assert exact pixel colors.
