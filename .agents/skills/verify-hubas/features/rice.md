# Rice parcels

The `/rice` page shows the HV radar signal of two small rice parcels in Bohol, Ubay and Pilar, on the 11 NISAR dates of 2026 (26 Jun to 5 Nov). The heading says both samples reached their highest measured HV in September or October, then were lower on 5 November. Below it: the range of each parcel, a chart with both HV lines and rain bars, and a radar image of the chosen parcel with a date slider. A section says what the signal can and cannot tell.

## Sub-features

- `rice-parcel` (one per parcel) shows the HV range with its lowest and highest date. Ubay is `−21.9 dB to −16.5 dB`, Pilar `−21.0 dB to −15.2 dB`.
- `dam-chart` (the shared chart; img name `Mean HV radar signal of the Ubay and Pilar rice parcels on each radar date of 2026`) draws one solid line per parcel and rain bars for the selected parcel. Clicking the chart picks the nearest date.
- Parcel picker (group `Parcel`): `Ubay` (default) and `Pilar`.
- Date slider (label `Date`) starts on the latest date, `5 Nov 2026`.
- Band picker (group `Radar band`): `HH` (default) and `HV`.
- `rice-radar` shows the parcel image, enlarged. `rice-hv` shows the mean HV signal and `rice-rain` the rain in the 12 days before.
- `rice-empty` replaces the page when no parcel has HV data.

## How to get to it (user POV)

- Click Rice in the top bar, or open `/rice`.
- Pick Ubay or Pilar. Move the Date slider or click the chart. Switch HH and HV.
- On a phone the chart and image stack in one column. The two parcel ranges sit side by side.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up` and run `doctor`.
- **Open rice.** Run `node scripts/control-hubas.mjs drive --nav Rice --name rice` and again with `--viewport 375x812`. `path` is `/rice`, `heading` is `The radar signal of both rice parcels rose from June, then fell on 5 November.`, and `consoleErrors` is empty. In `aria.yml`: both ranges, `Date` `5 Nov 2026`, HV `−19.2 dB` and rain `40 mm` (Ubay).
- **Selection kept.** Run `drive --town 0701246000 --window 3 --nav Rice --name rice-sel`. In `aria.yml` the Soil water link points to `/?town=0701246000&window=3` and the Dam, Rice and Method links carry the same query.
- `drive` cannot press the parcel or band buttons or move the Date slider. Use the Playwright MCP against the URL from `up`: open `/rice` and wait for `.rice-page[data-ready=true]`. Click `Pilar`: `rice-hv` reads `−19.7 dB` and `rice-rain` `46 mm`. Click `HV`: the image `src` is `/data/targets/pilar-rice-2026-11-05-hv.png`.
- Run `npx playwright test e2e/rice.spec.ts` for every date and both bands of both parcels and a chart click, on desktop and phone. It also checks that the data still supports the heading. With `PROOF=1` it rewrites `docs/proof/sc-136-rice-desktop.png` and `-mobile.png`.

## Gotchas

- Nothing confirms the crop, planting date or growth stage on the ground, and the page says so. Do not report the HV rise as planting or growth.
- The heading is a fixed sentence. If the data changes, the first test in `rice.spec.ts` fails.
- Each parcel is a small sample, not a whole town.
- The Sentinel-1 VV and VH pair in `targets.json` (`cBand`) is not on this page.
- Wait for `data-ready=true` before moving the slider. A fill before hydration is lost.
- The page has no map, but `drive` starts on `/`, which loads the base map. Add `--offline-basemap yes` without internet.
