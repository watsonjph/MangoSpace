# Radar pixel explainer

The NISAR images on `/dam` and `/rice` let you select a pixel and read its HH and HV signal in dB. A marker shows the selected pixel. A plain sentence describes a possible explanation, with a warning that one pixel does not prove what is on the ground.

## Sub-features

- Click or tap the image to select a pixel. The readout gives its column and row from the top left, starting at 0.
- Focus the `Inspect radar pixel` button. Enter or Space selects the center; the arrow keys move one pixel and stop at the image edges.
- Switching HH and HV keeps the selected coordinate and both readings. Changing the date or rice parcel clears the selection.
- The result can describe a dark, vegetation-like, or bright return. Unmatched or clipped values say `Not sure`.
- Loading, missing, or mismatched images never show an old reading. Historic single-band dam images have no inspection button.

## How to get to it (user POV)

- Open Dam or Rice from the top bar. Wait for the image inspection button to become available.
- Select a pixel on the image. Read both values and the sentence below it.
- On Dam, move the Date slider to 12 Oct 2026 for the reference samples below. On Rice, switch Ubay and Pilar to inspect each parcel.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up` and run `doctor`.
- Use `drive --nav Dam --name radar-dam` or `drive --nav Rice --name radar-rice` to open each page.
- For live Playwright MCP verification, open `/dam` or `/rice`, focus the `Inspect radar pixel` button, and press Enter, then an arrow key. `radar-pixel-result` gives the coordinate, both dB readings, and the cue.
- Run `npx playwright test e2e/radar-pixels.spec.ts e2e/radar-explainer.spec.ts`. The first file checks calibration boundaries. The second checks actual PNG pixels, mouse and touch selection, keyboard edges, band/date/parcel changes, delayed loads, and unavailable bands.
- Run the explainer spec with `PROOF=1` to refresh `docs/proof/sc-179-*.png`. On the dam image of 12 Oct 2026, pixel `(168, 201)` gives HH −16.1 dB and HV −22.5 dB, with a possible water cue. Pixel `(143, 135)` gives −11.9 and −15.6 dB, with a vegetation-like cue. Pixel `(321, 197)` gives −0.6 and −6.4 dB, with a bright-return cue. Pixel `(330, 245)` gives −5.6 and −14.0 dB, with `Not sure`.

## Gotchas

- These are provisional radar-return cues, not validated water, crop, or building classes. The roof-context sample does not establish that a building caused the return.
- Either channel at −30 or 0 dB can be clipped or unavailable. The readout preserves the numeric value and gives no class cue.
- The readout uses the original PNG pixels, not the enlarged display. Pointer selection preserves fractional coordinates; keyboard movement can reach every pixel.
- Wait for `.dam-page[data-ready=true]` before changing the date, and for the inspection button to become enabled before selecting a pixel.
- The two bands must have the same dimensions and belong to the same target and date. A single-band historic frame cannot supply HH and HV.
