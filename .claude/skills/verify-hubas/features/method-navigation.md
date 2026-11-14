# Method and navigation

The top bar links the soil water map and the Method page. The Method page explains the Gate 1 soil water rules, rank preview, radar limits and the sources and licences. Only available views appear in the navigation.

## Sub-features

- `navigation` opens each available view and marks the current page.
- `method` explains the data, coverage, planned rank and limits.
- `sources` credits the current sources, the 2024 census and map licences.
- `attribution` keeps map credits visible on desktop and phone.

## How to get to it (user POV)

- Open the app and click Method in the top bar.
- Read the page, then click Soil water or Back to soil water.
- Links work with the keyboard. The current link has a coloured background.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up` and run `doctor`.
- Use Playwright MCP to open Method from the map and return. Check both 1280 × 800 and 375 × 812.
- Run the committed flow with `npx playwright test e2e/method-navigation.spec.ts`. It checks navigation, page reload, sources, map credits and console/network errors. Screenshots, video and traces go to test-results, not docs/proof.
- Copy selected proof into docs/proof when opening a PR.

## Gotchas

- Dam, rice, rank and history navigation items must wait for their view stories to merge. sc-225's dam round trip cannot be completed before sc-104.
- The page states when soil water has not been loaded or the outlook is mock. Do not describe placeholders as measured results.
- NISAR passes are combined per 12-day window using all valid readings, per Gate 1; coverage does not mean scientific quality.
