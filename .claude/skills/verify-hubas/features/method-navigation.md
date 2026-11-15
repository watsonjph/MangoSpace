# Method and navigation

The top bar switches the map between Soil water and Rank and links the Dam, Rice and Method pages. The Method page explains the Gate 1 soil water rules, rank preview, radar limits and the sources and licences. Only available views appear in the navigation.

## Sub-features

- `navigation` opens the Method page and marks the current page.
- `map-view` switches between Soil water and Rank while keeping the selected town and window.
- `method` explains the data, coverage, rank preview and limits.
- `sources` credits NISAR (ASF), the SMAP check, the NAMRIA/PSA town borders, the PSA 2024 census, the PAGASA outlook and the base map licences.
- `attribution` keeps the map credits visible on desktop and phone: MapLibre, OpenFreeMap, OpenMapTiles and OpenStreetMap. The last three come from the base map, so with `--offline-basemap yes` only MapLibre shows.

## How to get to it (user POV)

- Open the app and click Method in the top bar.
- Read the page, then click Soil water or Back to soil water. The map opens with its saved mode, town and window.
- Buttons and links work with the keyboard. The selected map view and current page have a coloured background.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up` and run `doctor`.
- **Open Method.** Run `node scripts/control-hubas.mjs drive --nav Method --name method` and again with `--viewport 375x812`. `path` is `/method`, `heading` is `Measured, not forecast`, and `consoleErrors` is empty. Read the page text in `aria.yml`, including the line explaining "Pixels with data" as coverage.
- **Selection kept.** Run `node scripts/control-hubas.mjs drive --town 0701246000 --window 3 --nav Method --name method-sel`. The drive JSON does not show the URL after navigation; `aria.yml` shows the Soil water, Dam and Back to soil water links pointing to `/?town=0701246000&window=3`.
- **Wrong link.** `drive --nav Bogus` fails and lists the top bar links: Soil water, Dam, Method.
- For the "Back to soil water" link and the map credits, use the spec below or the Playwright MCP.
- Run the committed flows with `npx playwright test e2e/method-navigation.spec.ts e2e/map-selection.spec.ts`. The selection spec checks each return link, reloads, shared URLs and invalid selections on desktop and phone. The Method spec checks sources, map credits and console/network errors. Screenshots, video and traces go to test-results, not docs/proof.
- Copy selected proof into docs/proof when opening a PR.

## Gotchas

- `drive` starts on the map, so it needs the base map. Add `--offline-basemap yes` without internet. Playwright MCP has no stub.
- Town and window travel in the URL. Reloading, top bar links and Back to soil water preserve them; invalid selections fall back to no town and window 0. Map mode (`mode=rank`) survives reload and shared URLs on `/`, but links from other pages open Soil water.
- Rank is a map mode, not a separate route. The Dam link is covered in [dam.md](./dam.md).
- The sources list names each province's PAGASA advisory and issue date. The page also says when soil water has not been loaded. Do not describe placeholders as measured results.
- NISAR passes are combined per 12-day window using all valid readings, per Gate 1; coverage does not mean scientific quality.
