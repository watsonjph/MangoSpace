# Town panel

The panel at the top right shows one town: its rank or "Not ranked", its soil water for the selected window, the share of pixels with data, and PAGASA's rain outlook for its province with the advisory and date.

## Sub-features

- `panel-open-map` opens a town by clicking its shape on the map.
- `panel-open-list` opens a town from the `Town` dropdown.
- `panel-rank` shows `#n of m`, or `Not ranked` when the town has too few pixels with data.
- `panel-values` shows soil water in m³/m³ (or "No data") and pixels with data in %.
- `panel-outlook` shows the PAGASA outlook for the town's province.

## How to get to it (user POV)

- Click a town shape on the map.
- Choose a town in the `Town` dropdown at the top right.

## Driving it with control-hubas

Preconditions:

- `doctor` reports `ok: true`.
- The mock data has a ranked town (`mock-bogo-city`) and an unranked town (`mock-carmen`).

- **Open from the map.** Click Bogo City on the map. Run `node scripts/control-hubas.mjs drive --click-town mock-bogo-city --name panel-map`. `town` is `mock-bogo-city` and `panel.Rank` matches `#<position> of <of>` from `lgus.json`.
- **Open from the list.** Choose Carmen in the dropdown. Run `node scripts/control-hubas.mjs drive --town "Carmen, Bohol" --name panel-list`. `town` is `mock-carmen` and `panel.Rank` is `Not ranked`.
- **Values.** In either run, `panel["Soil water"]` equals the town's `soilMoisture` at `window.index`, to 3 decimals, and `panel["Pixels with data"]` equals `validShare` × 100, rounded.
- **Outlook.** `panel` has a key `PAGASA, <province>` whose value contains the `summary`, `advisory` and `issued` of the matching entry in `outlook.json`.
- **Proof.** Keep `screenshot.png` and `aria.yml` from both runs. The screenshot shows the selected town in the dropdown and the panel values.

## Gotchas

- Before a town is chosen, the panel shows only the dropdown. `panel` is `null` in the output; that is correct.
- `--click-town` fails with a clear error if no visible point of the shape is free of the slider and the panel. Use `--town` for that town, and report the map entry point as not reached.
- Mock outlook text starts with "Mock text". Do not cite it as PAGASA's real advisory.
