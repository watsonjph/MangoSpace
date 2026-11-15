# Rank map

Choose Rank in the top bar to color towns by their place in the rank preview. The legend shows how the colors run from later on the list to the towns to look at first. Unranked towns are grey. Stable towns have a gold outline and a Stable mark in the panel.

## Sub-features

- `rank-view` switches from Soil water colors to Rank colors and keeps the town and window selection.
- `rank-colors` shows ranked towns in list order; towns without a rank are grey.
- `rank-legend` identifies the preview scale, unranked towns and stable outlines.
- `rank-panel` shows the rank window, position, first-check cue, Dryness, Drying speed and People bars, and the Stable mark when it applies.

## How to get to it (user POV)

- Open the map and choose Rank in the top bar.
- Select a town in the `Town` list or click its map shape. Choose Soil water to return to the selected-window colors.

## Driving it with control-hubas

- **Rank view.** Run `node scripts/control-hubas.mjs drive --town 0702209000 --view rank --name rank`. `steps` ends with `chose Rank view`, `legend` is `["Rank preview", "Later on the list", "Look here first", "Not ranked", "Gold outline: stable in checks"]`, and the `Rank preview, …` row reads `#2 of 99 ranked · look here first Stable`.
- **No cue below the top 10.** Run `drive --town 0701245000 --view rank --name rank-later`. The row reads `#84 of 99 ranked`, without `look here first`.
- Run `npx playwright test e2e/rank-map.spec.ts` from `app/` for the full flow: map paint, part bars, an unranked town and the phone layout.
- The spec checks a stable town's rank and part bars, an unranked town, Tubigon with no soil water in window 3, and the phone layout. Run `PROOF=1 npm test -- e2e/rank-map.spec.ts` to write `sc-126-rank-map-desktop.png`, `sc-126-rank-map-mobile.png` and `sc-233-no-data-desktop.png` to `docs/proof/`.

## Gotchas

- The rank preview uses its own fixed window. Moving the slider changes Soil water values but does not change the rank position or Rank map colors.
- `look here first` shows only for the top 10, the same cut the pipeline uses for Stable.
- Links from Dam, Rice and Method open the Soil water view. `mode=rank` survives reload and shared URLs on `/`.
- A town can have a rank while its soil water is missing for the selected slider window. It stays ranked in Rank view; Soil water view shows it grey and the panel says `No data`.
- Rank describes an order of towns to check first. The rank is provisional.
