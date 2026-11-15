# Hubas verification map

This directory is the maintained source for verifying what a Hubas user can see and do. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Run all commands from `app/`.
- Start the app with `node scripts/control-hubas.mjs up`. It serves the static export at `http://127.0.0.1:4310`.
- Run `node scripts/control-hubas.mjs doctor` and require `ok: true`.
- `lgus.json` and `lgus.geojson` have the 101 real towns (10-digit `psgc`, 2024 population). `pipeline/soil.py` (sc-71) writes their soil water and coverage from the NISAR SME2 files. `rank.py` (sc-120) writes the rank: 99 towns have one; City of Mandaue and City of Lapu-Lapu are `Not ranked`. In windows 3 and 10 most Bohol towns are grey. `outlook.json` is still mock data. The Malinao Dam data in `targets.json` is real NISAR data. Get current town IDs with `node scripts/control-hubas.mjs towns`.
- Never drive a server that this run did not start.

## Driving conventions

- Each `drive` starts from a fresh page load: no town selected, window 0.
- Use the labels `Town` and `Window` and the map layer `soil`. Do not use screen coordinates.
- Treat quoted names and IDs as literal.
- The app has no saved state, so no cleanup of data is needed. Run `down` at the end.

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
- [Town panel](./town-panel.md): opening a town from the map or the dropdown and reading its rank, soil water, good pixels and PAGASA outlook.
- [Method and navigation](./method-navigation.md): the top bar, the `/method` page, source credits and the map credits.

## Not built yet

From the plan (https://claude.ai/artifact/RnQvBADeQY7pRJLrBH8YR8). Add a feature file when each one lands.

- Rank colors on the map (wave 2)
- Malinao Dam view: radar image per date, water area chart, possible causes (wave 1). The data is in `public/data/targets.json` and `public/data/targets/`. It has real NISAR for 11 dates (2026-06-26 to 2026-11-05), the Sentinel-1 histories of 2015–16 and 2023–24, and two "if it repeats" scenarios. No screen shows it yet.
- Rice-field views at Ubay and Pilar (wave 2). Real same-track images and HV series for two selected paddy parcels are in `public/data/targets.json` and `public/data/targets/`, with a Sentinel-1 (C-band) VV and VH pair from 2026-10-13 next to the NISAR date 2026-10-12. No screen shows them yet. The dates of planting and growth are not ground-verified.
- Radar explainer: click a pixel for HH and HV (wave 2)
- Sound (wave 2)
- Then and now, "if it repeats" lines, L-band vs C-band, RADARSAT-1 (wave 3)
