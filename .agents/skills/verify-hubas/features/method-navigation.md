# Method and navigation

The same top bar appears on every page: Hubas, Soil water, Dam, Rice, Score and Method. The current page is underlined. All five links fit at 320 px. The map timeline labels each month near the middle of its windows, so June and July stay apart on phones.

## Sub-features

- `navigation` uses the same five links everywhere and preserves the selected town and window.
- `method` explains measurements, coverage, the rank preview and limits. "What NISAR can do next" describes the nominal 12-day repeat, future dry-month measurements, the provisional product, and the measured L-band and C-band contrast with its limits. Rank is shown in the town panel; there is no Rank map button.
- `sources` credits NISAR, GPM, Sentinel-1, SMAP, NAMRIA/PSA, PAGASA and OpenFreeMap with their licences.
- `attribution` keeps MapLibre, OpenFreeMap, OpenMapTiles and OpenStreetMap credits visible.

## How to get to it (user POV)

- Choose a town and window, then follow any top bar link. Return with Soil water or Hubas home; the town and window remain selected.
- Open Method for limits, source credits and Back to soil water.
- Use Tab and Enter to follow the links. Every link remains visible on a phone.

## Driving it with control-hubas

- On Method, scroll to "What NISAR can do next". Check the 12 October NISAR and 13 October Sentinel-1 means for both parcels. The text says that the pairs do not prove what lies below the plants. `npx playwright test e2e/causes-and-next.spec.ts` checks the section. With `PROOF=1`, it writes `sc-476-method-desktop.png` and `sc-476-method-mobile.png`.

- Run `up` and `doctor`, then `drive --town 0701246000 --window 3 --nav Method --name method-selection`. The links in aria.yml retain town and window.
- Repeat `drive --nav Method` at `--viewport 320x640`, `390x812` and `1280x800`. Require empty consoleErrors.
- `drive --nav` accepts Soil water, Dam, Rice, Score and Method. It changes pages rather than map modes.
- Run `npx playwright test e2e/method-navigation.spec.ts e2e/map-selection.spec.ts`. These check link fit, month-label gaps, credits, selected state, reloads and return links. With PROOF=1 the navigation spec saves sc-539 screenshots at 320, 390 and 1280 px.

## Gotchas

- Method reports the measured L-band and C-band pair. It does not add the side-by-side image view from sc-193. Longer wavelength can reach deeper vegetation layers, but penetration depends on the plants and radar conditions.

- The base map is external. Use `--offline-basemap yes` when unavailable and disclose that substitution.
- Town and window are URL parameters. Invalid selections fall back to no town and window 0.
- The old mode=rank parameter no longer changes the map.
