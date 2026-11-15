# Town panel

The panel at the top right shows one town: its rank preview or "Not ranked", rank part bars and a Stable mark when it applies, its name and province, a line of soil water over all windows, soil water or "No data" for the selected window, pixel coverage, and PAGASA's outlook for its province.

## Sub-features

- `panel-open-map` opens a town by clicking its shape on the map.
- `panel-open-list` opens a town from the `Town` dropdown.
- `panel-rank` shows `#n of m ranked`, with `· look here first` for the top 10, or `Not ranked` when the town has no rank. The rank preview shows the window it uses and stays fixed as the slider moves.
- `panel-rank-parts` shows a bar and percentage for Dryness, Drying speed and People; a stable town has a visible Stable mark.
- `panel-values` shows soil water in m³/m³ (or "No data" when the selected window has no reading) and pixels with data in %.
- `panel-line` shows an SVG line of the soil water in all windows on the scale of the map legend (0.10 to 0.45 m³/m³). A dashed line and a larger circle mark the selected window. A window with `null` makes a gap. An open grey circle is a window with data on less than half of the town.
- `panel-outlook` shows the PAGASA outlook for the town's province.

## How to get to it (user POV)

- Click a town shape on the map.
- Choose a town in the `Town` dropdown at the top right. On a phone, the panel sits below the map.

## Driving it with control-hubas

Preconditions:

- `doctor` reports `ok: true`.
- `rank.py` (sc-120) ranks 99 towns; City of Mandaue and City of Lapu-Lapu have `rank: null`. The row is labelled `Rank preview, <start> → <end>` using `manifest.rankWindow`; it includes the position, total, first-check cue and part bars. The rank does not change with the slider. Two towns are named Carmen: `0701212000` in Bohol and `0702215000` in Cebu.

- **Open from the map.** Click the City of Bogo on the map. Run `node scripts/control-hubas.mjs drive --click-town 0702211000 --name panel-map`. `town` is `0702211000` and the `Rank preview, …` row matches the town's `rank` in `lgus.json`: `#<position> of <of> ranked`, plus ` · look here first` when the position is 10 or less and ` Stable` for a stable town, or `Not ranked` for `null`. City of Bogo reads `#6 of 99 ranked · look here first Stable`. Only ranked towns have a `Rank parts` key.
- **Open from the list.** Choose Carmen in the dropdown. Run `node scripts/control-hubas.mjs drive --town "Carmen, Bohol" --name panel-list`. `town` is `0701212000`, not the Carmen in Cebu.
- **Values.** In either run, `panel["Soil water"]` equals the town's `soilMoisture` at `window.index`, to 3 decimals, or `No data` for a null value. `panel["Pixels with data"]` equals `validShare` × 100, rounded.
- **Line.** Run `node scripts/control-hubas.mjs drive --town 0701245000 --window 3 --name panel-line` (Tubigon). `aria.yml` has an `img` whose name starts with `Soil water of Tubigon: 11 values` and ends with `Selected: no data.` The screenshot shows a line in two pieces (windows 0–2 and 4–9): windows 3 and 10 have no circle.
- **Outlook.** `panel` has a key `PAGASA, <province>` whose value contains the `summary`, `advisory` and `issued` of the matching entry in `outlook.json`.
- **Phone.** Run `node scripts/control-hubas.mjs drive --click-town 0701246000 --viewport 375x812 --name panel-phone`. `town` is `0701246000` (Ubay), and the full-page screenshot shows the panel below the map.
- **Short screen.** Run `node scripts/control-hubas.mjs drive --town 0702211000 --window 3 --viewport 1280x650 --name panel-short` (City of Bogo, a ranked town with rank parts, so a tall panel; unranked towns have no parts and a shorter panel). The panel ends above the MapLibre / OpenStreetMap credit at the bottom right and scrolls inside itself; "Hear the season" is at the bottom of that scroll. `e2e/town-panel.spec.ts` checks the same.
- **Proof.** Keep `screenshot.png` and `aria.yml` from both runs. The screenshot shows the selected town in the dropdown and the panel values.

## Gotchas

- Before a town is chosen, the panel shows only the dropdown. `panel` is `null` in the output; that is correct.
- `--click-town` fails with a clear error if no visible point of the shape is free of the slider and the panel. Use `--town` for that town, and report the map entry point as not reached.
- The outlook covers November 2026 only. Before you cite it as current, check `issued` and the month in `summary` in `outlook.json`. Nothing updates `outlook.json` automatically: when PAGASA issues a newer advisory, someone must edit it by hand.
