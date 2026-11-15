# Malinao Dam

The `/dam` page shows the water area of Malinao Dam (Pilar, Bohol) from NISAR radar. The heading says the area is steady now and fell in March in past dry events. Below it: the latest area and the lowest fall in 2015–16 and 2023–24, a chart of the 2026 area with rain bars and two dashed "if it repeats" lines, and a radar image with one date slider that runs through the past Sentinel-1 dates and then the 2026 NISAR dates. A section says what can cause a change.

## Sub-features

- `dam-stats` shows the latest area in km² with the 2026 range, and the lowest change of each past event in percent.
- `dam-chart` draws the 11 NISAR dates of 2026 as a solid line with points, rain in the 12 days before each date as bars (GPM), and one dashed line per scenario. A note says the dashed lines are what happened before, not a forecast. Clicking the chart picks the nearest 2026 date.
- `dam-slider` (label `Date`) starts on the latest date. Lower values are the past Sentinel-1 frames: 2015–16, then 2023–24. A past frame shows a VV image and the change against the event's first date; a 2026 frame shows an HH or HV image, the area and the rain.
- `dam-jumps` (group `Go to`): `Lowest in 2015–16`, `Lowest in 2023–24` and `Now`.
- `dam-band` (group `Radar band`): `HH` and `HV`, only on 2026 frames.
- `dam-causes` lists possible causes and links to the Method page.

## How to get to it (user POV)

- Click Dam in the top bar, or open `/dam`.
- Move the Date slider, click a point of the chart, or use the Go to buttons. Switch HH and HV on a 2026 date.
- On a phone the chart and image stack in one column. The stats sit two to a row.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up` and run `doctor`.
- **Open the dam.** Run `node scripts/control-hubas.mjs drive --nav Dam --name dam` and again with `--viewport 375x812`. `path` is `/dam`, `heading` is `The water area is steady now. In past dry events it fell in March.`, and `consoleErrors` is empty. In `aria.yml`: `Now, 5 Nov 2026` with `0.82 km²`, `Lowest in 2015–16` `−52%` (20 Mar 2016), `Lowest in 2023–24` `−19%` (26 Mar 2024).
- **Selection kept.** Run `drive --town 0701246000 --window 3 --nav Dam --name dam-sel`. In `aria.yml` the Soil water, Dam and Method links carry `?town=0701246000&window=3`.
- `drive` cannot move the Date slider or press the dam buttons. Use the Playwright MCP against the URL from `up`: open `/dam`, wait for `.dam-page[data-ready=true]`, then click `Lowest in 2015–16`. The `.dam-picker output` reads `20 Mar 2016` and the change reads `−52%`. Click `Now`, then `HV`: the image `src` ends in the HV file of 5 Nov 2026.
- Run `npx playwright test e2e/dam.spec.ts` for every date of the past events and of 2026, both bands, the jumps and a chart click on desktop and phone. With `PROOF=1` it also rewrites `docs/proof/sc-104-dam-desktop.png` and `-mobile.png`.

## Gotchas

- Wait for `.dam-page[data-ready=true]` before moving the slider. A fill before hydration is lost, and React then ignores a second fill to the same value.
- The page has no map, so it does not need the base map, but `drive` starts on `/` and does. Add `--offline-basemap yes` without internet.
- Past events are Sentinel-1 (C-band VV), 2026 is NISAR (L-band). Their km² differ, so past frames show percent change only. Compare changes, not areas.
- Dashed scenario lines start at the latest NISAR area and apply past monthly-average changes. They can differ from the lowest single reading of that event. They are not a forecast.
- The rain bars need `rainMm` to have one value per NISAR date. If not, the chart and the stats hide rain.

- The dam staff labels 2015–16, 2023–24 and 2026, with breaks between periods. Play loads every frame up front and waits on a frame until its image has loaded, so no frame is skipped on a slow line. Run npx playwright test e2e/timelapse.spec.ts to play every frame in order with each image slowed to 400 ms; PROOF=1 saves the dam video and dam/rice screenshots.
