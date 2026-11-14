# Malinao Dam

The Dam view shows a selected NISAR radar image and estimated reservoir surface water area across the available dates. It describes possible causes and measurement limits. It measures surface area, not water volume.

## Sub-features

- `dam-navigation` opens `/dam` from the top bar and returns to the soil water map.
- `dam-observations` selects a date and HH or HV image. Each image identifies its date, band and track.
- `water-area` shows the selected area, an SVG time series and an expandable table of every date. Missing values remain gaps; zero is a valid measurement.
- `dam-limits` explains causes, sensitivity and the absence of ground validation.
- `rain-unavailable` explicitly withholds unverified placeholder rain until sc-100 supplies measured data.

## How to get to it (user POV)

- Click Dam in the top bar. The latest available date opens first.
- Choose a Date and an HH or HV radio button.
- Read the selected area and chart, then expand All dates and water areas for exact values.
- Read Possible causes and limits below the chart.
- Click Soil water to return to the map, or reload `/dam` directly.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up`, then run `doctor`.
- Run `node scripts/control-hubas.mjs drive --nav Dam --name dam` and again with `--viewport 375x812`. Expect `path: "/dam"`, `heading: "Malinao Dam"` and no console errors. Add `--offline-basemap yes` if the external map is unavailable.
- Use Playwright MCP for the Date select, HH/HV radios and expandable table. Compare the selected area and image path to `targets.json`, not to a fixed expected value.
- Run `PORT=3001 npx playwright test e2e/dam-view.spec.ts`. It checks every published date and band, desktop and phone navigation, reload, mock-shaped data, zero, missing values and unavailable data. Screenshots, video and traces go to test-results. Copy selected screenshots into docs/proof for the PR.

## Gotchas

- Rain values currently in targets.json are placeholders. They are withheld even when the array has the same length as the dates. sc-100 must establish provenance and alignment before integration.
- Switching HH/HV changes the displayed image, not the HH-derived water area.
- The 0.092 km² sensitivity note refers specifically to the published June–November 2026 analysis. It is not ground-measured accuracy or uncertainty of the change between dates.
- Historical scenarios, rice views and the pixel explainer remain separate stories.
- Returning to Soil water resets its town and window (sc-297).
