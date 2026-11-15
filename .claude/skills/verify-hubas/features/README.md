# Hubas verification map

This directory is the maintained source for verifying what a Hubas user can see and do. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Run all commands from `app/`.
- Start the app with `node scripts/control-hubas.mjs up`. It serves the static export at `http://127.0.0.1:4310`.
- Run `node scripts/control-hubas.mjs doctor` and require `ok: true`.
- `lgus.json` and `lgus.geojson` have the 101 real towns (10-digit `psgc`, 2024 population). `pipeline/soil.py` (sc-71) writes their soil water and coverage from the NISAR SME2 files. `rank.py` (sc-120) writes the rank: 99 towns have one; City of Mandaue and City of Lapu-Lapu are `Not ranked`. In windows 3 and 10 most Bohol towns are grey. `outlook.json` has PAGASA's El Niño Advisory No. 6 (issued 2026-11-03), the November 2026 rainfall outlook for Cebu and Bohol (sc-61). The Malinao Dam data in `targets.json` is real NISAR data, shown on `/dam`. Get current town IDs with `node scripts/control-hubas.mjs towns`.
- Never drive a server that this run did not start.

## Driving conventions

- Each `drive` starts from a fresh page load: no town selected, window 0.
- Use the labels `Town` and `Window`, the `Play` and `Pause` button, and the map layers `soil` and `selected`. Do not use screen coordinates.
- Treat quoted names and IDs as literal.
- The town and the window are stored in the URL. A fresh `/` starts with no town and window 0. No local data cleanup is needed. Run `down` at the end.

## Proof and skip reporting

- Proof is the `drive` JSON (steps and resulting values) plus `screenshot.png` and `aria.yml` from `app/.verify/evidence/<name>/`.
- `consoleErrors` must be empty.
- Record the feature file and the entry point you used with each proof.
- Report an entry point you could not reach with the command you ran and the reason. Do not report it as verified through a different entry point.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph on the user-visible behavior. It then has exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with control-hubas`, `Gotchas`. Keep implementation details out; name only user paths, stable handles, commands and observable proof.

## Features

- [Soil water map](./soil-water-map.md): the map of Cebu and Bohol, town shapes colored by soil water, the "provisional" label, the legend, and the desktop and phone layouts.
- [Time slider](./time-slider.md): moving through the 12-day windows and the map and panel following.
- [Town panel](./town-panel.md): opening a town from the map or the dropdown and reading its rank, soil water line, soil water, pixels with data and PAGASA outlook.
- [Method and navigation](./method-navigation.md): the top bar, the `/method` page, source credits and the map credits.
- [Malinao Dam](./dam.md): the `/dam` page, its water area chart with rain and "if it repeats" lines, and the radar image of each date.
- [Rank preview](./rank-preview.md): the rank in the town panel, rank parts, stable towns and unranked towns.
- [Rice parcels](./rice.md): the `/rice` page, the HV lines of the Ubay and Pilar parcels, and the radar image of each date.
- [The score](./score.md): the `/score` page, the soil, dam and rice staffs and the rain on one date axis, one playhead, and a sound voice for each staff.
- [Hear the season](./sound.md): opt-in soil-water tones synchronized with slider playback.
- Screen copy: `e2e/screen-copy.spec.ts` checks a numbered finding on every view, the data behind the fixed soil finding, and readable PAGASA dates. Canonical terms are in `docs/screen-terms.md`.
- Opening: the map asks "What happened to water before El Niño?" and links to `/start`, which leads through the soil, the dam and the rice in order, each with a finding, a source and a link that keeps the town and window. `e2e/opening.spec.ts` follows it at 1280 and 390 px; `e2e/screen-copy.spec.ts` checks the data behind its numbers.

## Not built yet

From the plan (https://claude.ai/artifact/RnQvBADeQY7pRJLrBH8YR8). Add a feature file when each one lands.

- Radar explainer: click a pixel for HH and HV (wave 2)
- L-band vs C-band rice view (sc-193). The Sentinel-1 (C-band) pair of each rice parcel from 2026-10-13 is in `targets.json` (`cBand`), but no screen shows it yet.
- RADARSAT-1 history for 1997–98 (sc-160).

## Cut

These were in the plan and were removed on purpose. Do not report them as missing.

- Rank map colors and the `Rank` button (sc-126). Removed in sc-450: the rank is in the town panel only. See [Rank preview](./rank-preview.md).
