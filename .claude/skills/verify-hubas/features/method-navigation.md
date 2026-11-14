# Method and navigation

The top bar links the soil water map and the Method page. The Method page explains the Gate 1 soil water rules, rank preview, radar limits and the sources and licences. Only available views appear in the navigation.

## Sub-features

- `navigation` opens each available view and marks the current page.
- `method` explains the data, coverage, planned rank and limits.
- `sources` credits the current sources, the 2024 census and map licences.
- `attribution` keeps the map credits visible on desktop and phone: MapLibre, OpenFreeMap, OpenMapTiles and OpenStreetMap.

## How to get to it (user POV)

- Open the app and click Method in the top bar.
- Read the page, then click Soil water or Back to soil water.
- Links work with the keyboard. The current link has a coloured background.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up` and run `doctor`.
- **Open Method.** Run `node scripts/control-hubas.mjs drive --nav Method --name method` and again with `--viewport 375x812`. `path` is `/method`, `heading` is `Measured, not forecast`, and `consoleErrors` is empty. Read the page text in `aria.yml`, including the line explaining "Good pixels" as coverage.
- **Wrong link.** `drive --nav Bogus` fails and lists the top bar links.
- For the "Back to soil water" link and the map credits, use the spec below or the Playwright MCP.
- Run the committed flow with `npx playwright test e2e/method-navigation.spec.ts`. It checks navigation, page reload, sources, map credits and console/network errors. Screenshots, video and traces go to test-results, not docs/proof.
- Copy selected proof into docs/proof when opening a PR.

## Gotchas

- `drive` starts on the map, so it needs the base map. Add `--offline-basemap yes` without internet. Playwright MCP has no stub.
- Clicking `Soil water` while on the map reloads it. The selected town is cleared.
- Dam, rice, rank and history navigation items must wait for their view stories to merge. sc-225's dam round trip cannot be completed before sc-104.
- The page states when soil water has not been loaded or the outlook is mock. Do not describe placeholders as measured results.
- NISAR passes are combined per 12-day window using all valid readings, per Gate 1; coverage does not mean scientific quality.
