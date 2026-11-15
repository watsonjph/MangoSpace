# Rank preview

The rank preview is in the town panel only. The map always shows soil water. A ranked town shows its position, the rank window, three part bars, and a Stable mark when it stayed in the top 10 in every check.

## Sub-features

- `rank-panel` shows the rank window, the position, the `look here first` cue for the top 10, and the Dryness, Drying speed and People bars.
- `rank-stable` shows the Stable mark.
- `rank-none` shows `Not ranked` for a town with data on less than half of its area.

## How to get to it (user POV)

- Open the map. Select a town in the `Town` list or click its shape. The selected town gets a light outline on the map.

## Driving it with control-hubas

- **A top-10 town.** Run `node scripts/control-hubas.mjs drive --town 0702209000 --name rank`. The `Rank preview, 7 Oct to 19 Oct 2026` row reads `#2 of 99 ranked · look here first Stable`.
- **No cue below the top 10.** Run `drive --town 0701245000 --name rank-later`. The row reads `#84 of 99 ranked`, without `look here first`.
- Run `npx playwright test e2e/rank-panel.spec.ts` from `app/` for the full flow: no Rank control on the page, the part bars, an unranked town, a town with no soil water in window 3, the phone layout, and the mean of all the towns when no town is selected.
- Run `PROOF=1 npm test -- e2e/rank-panel.spec.ts` to write `sc-450-rank-in-panel-desktop.png`, `sc-450-rank-in-panel-mobile.png` and `sc-233-no-data-desktop.png` to `docs/proof/`.

## Gotchas

- The rank preview uses its own fixed window. The slider changes the soil water values and does not change the rank.
- `look here first` shows only for the top 10, the same cut the pipeline uses for Stable.
- There is no rank map. An old link with `mode=rank` opens the soil water map and the app ignores the parameter.
- A town can have a rank while its soil water is missing for the selected window. The map shows it grey and the panel says `No data`.
- The rank is an order of towns to check first. SMAP does not confirm the order (see `/method`).
