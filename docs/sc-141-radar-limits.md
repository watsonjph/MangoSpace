# Radar explainer calibration

Story: [sc-141](https://app.shortcut.com/spacemangoes/story/141).

The explainer must describe radar returns, not identify land cover from one
pixel. The original single-band rules fail on reference-context samples from
our images. This handoff supplies conservative provisional cues and an explicit
"not sure" result. It does not supply a validated water/plant/building classifier.

## Input and proposed limits

Use the matching HH and HV PNG at the same zero-based `(x, y)` position on the
same target/date. Decode each byte as `-30 + 30 × byte / 255` dB. Values are
quantized in approximately 0.118 dB steps; the original unclipped powers are
not recoverable from the PNG. Never use the dam area threshold of −10 dB here:
that method smooths power and restricts the count to a reservoir outline.

The helper rejects invalid byte arguments with `ValueError`; a consuming UI
must map unavailable or invalid input to "not sure" instead of a class label.
Treat either channel at byte 0 or 255 as "not sure". These endpoints can
represent clipping or unavailable data. Do not sample outside the image or mix
dates, targets, or channels.

| Cue | Provisional limits on decoded raw PNG values | Plain result |
| --- | --- | --- |
| Dark return | HH < −15 dB and HV < −19 dB | This dark return can be consistent with water; flooded fields and radar shadow can also look dark. |
| Vegetation-like return | −19 ≤ HV ≤ −12 dB and −15 ≤ HH ≤ −6 dB | This cross-polarized return can be consistent with vegetation; it does not identify a crop or growth stage. |
| Bright return | HH > −6 dB and HV > −12 dB | This strong return can come from buildings or other rough surfaces; it does not identify a building. |
| Not sure | Endpoint bytes or no matching cue | These values do not give a unique explanation. |

The dual-band dark-return rule admits brighter HH than the initial −18 dB
suggestion, while requiring low HV. The vegetation interval is wider at its
low end because our wooded reference pixels reach below −18 dB. The bright
rule requires both a strong HH and strong HV return. These are development
choices inspected on the samples below, not independent validation. A rough
wet field can still give a bright return. These cues deliberately leave many
roof-context and vegetation-context pixels as "not sure".

## Reference positions chosen before radar inspection

All samples use `malinao-dam`, bounds `[124.297, 9.8075, 124.337, 9.8475]`,
440 × 440 pixels, track 003 descending, frame 084. Positions were selected
from a 1200 × 1200 optical reference before reading the radar values. The
committed fixture preserves both coordinate systems. The optical mosaic's
acquisition date is unknown; it is context, not contemporary ground truth.
Roof pixels can mix a building, trees, soil, and their shadows at radar scale.

| Reference context | ID | Radar x, y | HH on 2026-10-12, dB | HV on 2026-10-12, dB |
| --- | --- | --- | ---: | ---: |
| Water | water-1 | 168, 201 | -16.118 | -22.471 |
| Water | water-2 | 220, 190 | -17.294 | -24.235 |
| Water | water-3 | 157, 238 | -18.824 | -23.059 |
| Wooded vegetation | plants-1 | 143, 135 | -11.882 | -15.647 |
| Wooded vegetation | plants-2 | 330, 245 | -5.647 | -14.000 |
| Wooded vegetation | plants-3 | 374, 370 | -5.294 | -14.353 |
| Roof context | buildings-1 | 184, 163 | -6.471 | -13.059 |
| Roof context | buildings-2 | 321, 197 | -0.588 | -6.353 |
| Roof context | buildings-3 | 371, 121 | -6.824 | -13.647 |

The original HH < −18 dB rule misses two of these three water-context pixels
on October 12. Over all nine dates, water-reference HH ranges from −20.82 to
−13.76 dB. The original HH > −6 dB rule misses two of the three roof-context
pixels on October 12 and is also triggered by wooded vegetation. Brightness
alone is not a building label. Inspect all 81 records in the generated results,
including misses; do not present these development samples as classification
accuracy or select only passing dates.

## Reproduce

From `pipeline/`, run:

```sh
uv run python -I radar_limits.py > data/sc-141/results.json
uv run python -m unittest discover -s tests
```

The command reads the committed fixture, `targets.json`, and the actual PNGs.
It records target, date, pixel, measured HH/HV, original plan-rule matches, and
proposed cue. This helper is offline and makes no data-contract or app changes.
The generated report in `docs/proof/sc-141-calibration.html` records the source
image paths, all dates, and every sampled value.

## Sources and delivery limit

- [NASA SAR explanation](https://science.nasa.gov/mission/nisar/get-to-know-sar/) describes effects of roughness, moisture, vegetation, and geometry on returns.
- [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) supplies the reference retrieved November 14, 2026. Attribution: Esri, Vantor, Earthstar Geographics, and the GIS User Community.
- `app/public/data/targets/malinao-dam-<date>-{hh,hv}.png` supplies the actual radar measurements, from the provisional NISAR collection.

Checklist 144 remains open. Three water, vegetation, and roof-context locations
have been checked, but three independently known building pixels with reliable
class results have not been established. The PR documents the deviation rather
than asserting a successful nine-class validation. sc-179 can use the cautious
cue wording; it must not display these cues as confirmed land-cover classes.
