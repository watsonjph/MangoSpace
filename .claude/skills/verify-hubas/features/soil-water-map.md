# Soil water map

The map shows Cebu and Bohol on a light base map. Each town is a shape filled by its soil water for the selected window: dry is ochre, wet is teal, and a town with no soil water data is grey. A label at the top left says the data is provisional.

## Sub-features

- `map-load` shows the base map and every town shape without console errors.
- `map-colors` fills each town by its soil water in the selected window.
- `map-label` shows "Cebu + Bohol · 12-day window · provisional".

## How to get to it (user POV)

- Open the app URL. The map fills the page.

## Driving it with control-hubas

Preconditions:

- `doctor` reports `ok: true`, including `basemap`.

- **Load.** Open the app. Run `node scripts/control-hubas.mjs drive --name map-load`. `steps` contains `map ready`, `consoleErrors` is empty, and `label` is `Cebu + Bohol · 12-day window · provisional`.
- **See the towns.** Open `screenshot.png` in the evidence folder. Every town from `towns` is visible as a filled shape inside Cebu or Bohol.
- **Colors follow data.** Run `node scripts/control-hubas.mjs drive --window 0 --name map-w0` and `node scripts/control-hubas.mjs drive --window 10 --name map-w10`. Compare the two screenshots: towns whose `soilMoisture` changes between index 0 and 10 in `public/data/lgus.json` change color.

## Gotchas

- The base map comes from tiles.openfreemap.org. If `doctor` fails `basemap`, the map can stay blank; report it as an outside failure, not an app bug.
- A town with `null` soil water for a window is grey, not missing. Check `lgus.json` before reporting a missing town.
- The colors are a smooth scale. Compare screenshots side by side; do not assert exact pixel colors.
