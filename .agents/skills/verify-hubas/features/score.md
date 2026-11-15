# The score

The `/score` page plays the 2026 wet season of the soil, the dam and the rice together. Three staffs sit one above the other on one date axis from 21 Jun to 5 Nov 2026: the mean soil water of the towns (one note per 12-day window, at the middle date of the window), the water area of Malinao Dam and the HV signal of the Ubay and Pilar rice parcels (one note per NISAR pass). A fourth line shows the GPM rain as short marks at the pass dates. Each note sits at its real date. One playhead goes through all of them. Each staff is a sound voice the user can turn on and off. Below: the value of each part at the playhead and one sentence per part.

## Sub-features

- Staffs (`.stave[data-voice=soil|dam|rice|rain]`): 11 soil notes, 11 dam notes, 22 rice notes (`i.ubay` and `i.pilar`), 11 rain marks. Each note and mark has `data-date`. The note at the playhead has the class `now`. A hollow soil note is a mean from fewer towns.
- Date slider (label `Date`, the `output` in `.score-page`) moves through the 22 note dates in order. One arrow key press goes to the next date with a note. It starts on `26 Jun 2026`.
- Play, speed and loop buttons, the same as the other timelines. Loop starts on. Play goes through the season in about 9.5 seconds at 1×. The space key plays and pauses.
- Voices (group `Voices`): `Soil voice` starts on. The first natural loop turns on `Dam voice`; the second natural loop turns on `Rice voice`. A voice sounds only during play. The rice voice plays the mean of the two parcels.
- Readout: `score-date`, `score-soil`, `score-dam`, `score-rice` and `score-rain` show the latest value on or before the playhead. Before the first soil window the soil reads `No reading yet`.
- Sentences (`.score-sentences li`): "The soil goes down at the end of July." "The dam does not move." "The rice goes up, then down in November."

## How to get to it (user POV)

- Click Score in the top bar, or open `/score`.
- Press play, or move the Date slider. Soil starts on, and the dam and rice join on the first two loops. Toggle any voice if you want a different mix.
- On a phone the staffs stay one above the other at full width. The readout rows stack.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up` and run `doctor`.
- **Open the score.** Run `node scripts/control-hubas.mjs drive --nav Score --name score` and again with `--viewport 375x812`. `path` is `/score`, `heading` is `The soil, the dam and the rice, played together`, and `consoleErrors` is empty. In `aria.yml`: the `status` under the `Date` slider reads `26 Jun 2026` (the slider value is the day count from 21 Jun, `5`; screen readers hear the date), `Loop` and `Soil voice` are pressed, `Dam voice` and `Rice voice` are not pressed, and the three sentences are there.
- `drive` cannot press play, move the Date slider or turn on a voice. Use the Playwright MCP against the URL from `up`: open `/score` and wait for `.score-page[data-ready=true]`. Focus the `Date` slider and press End: the output reads `5 Nov 2026`.
- Run `npx playwright test e2e/score.spec.ts` for the note counts, the position of the first and last note of each staff, play, the voice buttons and no page scroll at 1280, 375 and 320 px. With `PROOF=1` it rewrites `docs/proof/sc-572-score-desktop.png`, `-mobile.png` and the video `sc-572-score.webm`.

## Gotchas

- The soil and the passes are not on the same days. Most pairs are one day apart. Do not report that as a misalignment, and do not move a note to make the lines meet.
- The dam staff starts at 0 km², so the small changes in area look small. That is on purpose: the dam does not move.
- The sentences are fixed text. Nothing checks that new data still supports them.
- Wait for `data-ready=true` before moving the slider. A fill before hydration is lost.
- The page has no map, but `drive` starts on `/`, which loads the base map. Add `--offline-basemap yes` without internet.
