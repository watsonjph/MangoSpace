---
name: verify-hubas
description: Launch, check and drive the Hubas web app (app/, Next.js static export with a MapLibre map) the way a user does, and capture proof. Use it to verify any UI or data change, to reproduce a bug, or to get screenshots for a PR.
---

# Verify Hubas

Hubas has four routes. `/` is a MapLibre map of Cebu and Bohol with a soil water legend, a "Window" time slider, and a town panel. `/dam` shows Malinao Dam radar images, estimated water area and limits. `/rice` shows selected Ubay and Pilar parcel images and HV measurements. `/method` explains the method and credits the sources. A top bar links them. On a phone (640 px wide or less) the panel and slider sit below the map. All data comes from static files in `app/public/data`. There is no server code and no login.

The control tool is `app/scripts/control-hubas.mjs`. Run every command from `app/`. Each command prints JSON. Read `ok` first; on `false`, follow `hint`.

```
cd app
node scripts/control-hubas.mjs help
```

Before you drive a feature, read [features/README.md](features/README.md) and the matching feature file.

## Launch

```
node scripts/control-hubas.mjs up              # npm run build, then serve out/ on http://127.0.0.1:4310
node scripts/control-hubas.mjs up --port 4320  # a second instance next to someone else's
node scripts/control-hubas.mjs up --no-build   # reuse the current out/
```

- `up` builds the static export, starts a small static server in the background, and waits until `/data/manifest.json` answers. It prints the URL.
- It serves the built `out/`, the same files Vercel serves. It does not use `next dev`.
- Ready means the page and its data answer. The map itself loads in the browser: `drive` waits for it.
- State goes in `app/.verify/state.json`; the server log in `app/.verify/server.log`.
- `up` refuses to start if its own server is already running or the port is taken. It never touches a server it did not start.

## Doctor

```
node scripts/control-hubas.mjs doctor
```

Run it first, and again whenever something looks wrong. It is read-only. It checks:

- `state`, `process`: a server from `up` exists and is alive.
- `page`: `/` answers 200 and contains "Hubas".
- `data`: the manifest says region `PH-07`; it prints the window count and `generatedAt`.
- `build-fresh`: `out/` is newer than `src/`, `lib/` and `public/`. If not, you are driving old code: run `down`, then `up`.
- `basemap`: the OpenFreeMap style answers. It is an outside service; without it the map can fail to load. Report it. To keep verifying the app itself, use `drive --offline-basemap yes`.

## Drive

```
node scripts/control-hubas.mjs towns
node scripts/control-hubas.mjs drive --click-town 0702211000 --window 10 --name sc-123-bogo
node scripts/control-hubas.mjs drive --town "Carmen, Bohol" --name sc-123-carmen
node scripts/control-hubas.mjs drive --nav Method --name sc-123-method
```

`drive` opens a fresh headless Chromium (falls back to installed Chrome), loads the app, waits for the map and the town layer, then does the actions in this order:

| Option | User action | Stable handle |
| --- | --- | --- |
| `--click-town <psgc>` | Click the town shape on the map | MapLibre `window.hubasMap`, layer `soil`, feature id = psgc. The tool finds a point inside the shape that is not under the slider or the panel. |
| `--town <psgc or "Name, Province">` | Pick the town in the dropdown | label `Town` |
| `--window <n>` | Move the slider to window n | label `Window`; range text in `.slider output` |
| `--nav <link>` | Click a link in the top bar, such as `Method` | `navigation` named `Main`; waits until that link has `aria-current="page"` |

Two more options: `--viewport 375x812` gives the phone layout, and `--offline-basemap yes` replaces the outside base map with a plain background (the same stub as `app/e2e/offline-basemap.ts`) for runs without internet.

It prints `steps`, the map label, the legend lines, the slider value and range, the selected town, every row of the town panel (`Rank`, `Soil water`, `Good pixels`, `PAGASA, <province>`), and all console errors. `ok` is `false` if any console error happened.

`drive` always starts on `/`. Add `--nav Method` to open `/method`. It prints `path` and the page `heading`, and `window`, `town` and `panel` are `null` off the map. For anything else `drive` does not cover yet, use the Playwright MCP against the URL from `up`, with the same handles. If you drive the same steps by hand twice, add them to `control-hubas.mjs` instead.

## Evidence

Each `drive` writes to `app/.verify/evidence/<name>/`:

- `screenshot.png`: the full page after the actions, with the app label visible. On a phone viewport it is taller than the screen, so it includes the panel and slider.
- `aria.yml`: the ARIA snapshot of the page.
- `result.json`: the same JSON the command printed.
- `failure.png`: only when a step failed.

Proof rules:

- Use the real user path: click the map or pick from the dropdown. Do not set React state or call `hubasMap` to change what the user sees.
- Prove the action and the result: the `steps` list plus the panel values, not only the final screenshot.
- After a data change, compare the panel values with the matching entry in `public/data/lgus.json`.
- `consoleErrors` must be empty.
- For a PR, copy the screenshots you cite into `docs/proof/` and link them in the PR's Proof section.

The committed check for CI is `npm test` (Playwright specs in `app/e2e/`). Use `drive` for proof and exploration; turn any check you need again into a spec.

## Cleanup

```
node scripts/control-hubas.mjs down
```

`down` stops only the server whose pid is in `state.json`, then deletes `state.json`. It keeps `app/.verify/evidence/`. Run it after every run, including failed runs. Never kill `node` by name: other agents and `next dev` may be running.

## Known limits

- The 101 towns are real, but their soil water and rank are empty until sc-71 and sc-120: every town is grey and `Not ranked`. `outlook.json` and the windows in `manifest.json` are still mock data. Get town IDs with `towns`. The Malinao Dam data in `targets.json` is already real.
- Features from the plan that are not built yet (explainer, sound, rank colors) are listed in the feature map as "not built". Update the map when they land, or run `/pstack:maintain-verification-skill`.
