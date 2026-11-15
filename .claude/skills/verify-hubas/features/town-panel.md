# Town panel

The panel at the top right shows one town: its rank or "Not ranked", its soil water for the selected window, the share of good pixels, and PAGASA's rain outlook for its province with the advisory and date.

## Sub-features

- `panel-open-map` opens a town by clicking its shape on the map.
- `panel-open-list` opens a town from the `Town` dropdown.
- `panel-rank` shows `#n of m`, or `Not ranked` when the town has too few good pixels.
- `panel-values` shows soil water in m³/m³ (or "No good pixels") and good pixels in %.
- `panel-outlook` shows the PAGASA outlook for the town's province.

## How to get to it (user POV)

- Click a town shape on the map.
- Choose a town in the `Town` dropdown at the top right. On a phone, the panel sits below the map.

## Driving it with control-hubas

Preconditions:

- `doctor` reports `ok: true`.
- `rank.py` (sc-120) ranks 99 towns; City of Mandaue and City of Lapu-Lapu have `rank: null`. The rank row is labelled `Rank, <start> → <end>` (the window of `manifest.rankWindow`), so the `panel` key is that label, not `Rank`. The rank does not change with the slider. Two towns are named Carmen: `0701212000` in Bohol and `0702215000` in Cebu.

- **Open from the map.** Click the City of Bogo on the map. Run `node scripts/control-hubas.mjs drive --click-town 0702211000 --name panel-map`. `town` is `0702211000` and the `Rank, …` row matches the town's `rank` in `lgus.json`: `#<position> of <of>`, or `Not ranked` for `null`.
- **Open from the list.** Choose Carmen in the dropdown. Run `node scripts/control-hubas.mjs drive --town "Carmen, Bohol" --name panel-list`. `town` is `0701212000`, not the Carmen in Cebu.
- **Values.** In either run, `panel["Soil water"]` equals the town's `soilMoisture` at `window.index`, to 3 decimals, and `panel["Good pixels"]` equals `validShare` × 100, rounded.
- **Outlook.** `panel` has a key `PAGASA, <province>` whose value contains the `summary`, `advisory` and `issued` of the matching entry in `outlook.json`.
- **Phone.** Run `node scripts/control-hubas.mjs drive --click-town 0701246000 --viewport 375x812 --name panel-phone`. `town` is `0701246000` (Ubay), and the full-page screenshot shows the panel below the map.
- **Proof.** Keep `screenshot.png` and `aria.yml` from both runs. The screenshot shows the selected town in the dropdown and the panel values.

## Gotchas

- Before a town is chosen, the panel shows only the dropdown. `panel` is `null` in the output; that is correct.
- `--click-town` fails with a clear error if no visible point of the shape is free of the slider and the panel. Use `--town` for that town, and report the map entry point as not reached.
- Mock outlook text starts with "Mock text". Do not cite it as PAGASA's real advisory.
