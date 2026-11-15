# Selected rice-field samples in Ubay and Pilar

Story: [sc-132](https://app.shortcut.com/spacemangoes/story/132).

The two rice entries in `app/public/data/targets.json` now contain measured
NISAR HV series and HH/HV images for nine dates. These are small paddy-parcel
samples, not town-wide rice measurements. The rice view is not built yet.

## Locations and sources

The broad mock boxes were replaced with sample windows over visible field
parcels. The optical reference shows field boundaries and helps avoid reservoirs
and the main wooded strips. It does not establish the crop or planting stage
on a 2026 radar date. Field bunds and other vegetation can remain in a sample.

| Sample | Bounds, west/south/east/north | Output pixels |
| --- | --- | --- |
| Ubay | 124.4345, 10.0152, 124.4355, 10.0166 | 16 × 16 |
| Pilar | 124.3242, 9.8175, 124.3264, 9.8185 | 24 × 24 |

Both sample rectangles lie entirely inside the matching town polygons in the
repository's real `lgus.geojson`: Ubay `0701246000` and Pilar `0701234000`.

Sources:

- [NIA's irrigated rice project in Ubay and Pilar](https://region7.nia.gov.ph/content/cluster-based-nutrient-management-project-pilot-bohol) establishes the regional rice context, not the crop in each sample.
- [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) supplies the optical reference retrieved on November 14, 2026. The mosaic's acquisition date was not established. Attribution: Esri, Vantor, Earthstar Geographics, and the GIS User Community.
- [ASF NISAR access documentation](https://nisar-docs.asf.alaska.edu/earthaccess/) identifies the `NISAR_L2_GCOV_PROVISIONAL_V1` collection. Both samples use track 003, descending direction, frame 084, and frequency A HH/HV diagonal power channels.

## Measurements and interpretation

`meanHvDb` is the arithmetic mean of finite, unclipped HV dB values after
reprojection. Linear power becomes dB through `10 × log10(power)`. This statistic
is not the dB of mean power and is not calculated from the PNGs.

Both bands must have at least 99% finite output pixels. Images are north up,
cut to the sample bounds, and use the existing 8-bit grey scale: 0 = −30 dB;
255 = 0 dB. Resampling does not add detail beyond the native radar grid.

| Date | Ubay mean HV, dB | Pilar mean HV, dB |
| --- | ---: | ---: |
| 2026-06-26 | −21.699 | −20.956 |
| 2026-07-08 | −21.946 | −19.503 |
| 2026-07-20 | −21.931 | −18.936 |
| 2026-08-13 | −20.980 | −17.642 |
| 2026-08-25 | −21.612 | −17.979 |
| 2026-09-06 | −20.045 | −16.925 |
| 2026-09-18 | −18.686 | −15.606 |
| 2026-09-30 | −18.043 | −15.205 |
| 2026-10-12 | −17.204 | −15.214 |

Ubay has low HV from June 26 through July 20. HV rises on every sampled date
from August 25 through October 12. Pilar has its lowest observed HV on June 26;
it rises through August 13 and again from August 25 through September 30.
Pilar's last two observations are nearly equal.

These low-to-rising intervals are consistent with a wet-field to vegetation
transition. They are candidates for planting and growth interpretation, not
confirmed planting dates or crop stages. Soil water, field water, other
vegetation, and speckle can affect the signal. There is no observation near
August 1 on this track, and no field observations establish crop dates.

This is the deviation from the story's requested planting-date comment. The
comment reports the observed dates and the uncertainty instead of inventing a
planting date. It does not attribute changes to drought or make a forecast.

## Reproduce and check

From `pipeline/`, run:

```sh
uv sync --locked
uv run python -I targets.py --target ubay-rice --target pilar-rice
uv run python -m unittest discover -s tests
```

From `app/`, run `npm run lint`, `npm run build`, and `npm test`. The committed
Playwright checks load each real rice image in the browser and check that dates,
measurements, and image pairs align. The pipeline tests check mean-dB semantics,
HV coverage, crop geometry, scene selection, and preservation of the dam entry.

The real run produced 36 one-band uint8 PNGs. Decoding the HV images back to dB
gave means within 0.07 dB of the unclipped measurements, consistent with PNG
quantization. The entire Malinao entry and all unrelated rice fields were
unchanged by the rice-only run.

[The data inspection figure](proof/sc-132-rice-proof.html) contains the optical
reference boxes, HV curves, and all 36 images. It is a verification artifact,
not the app's rice view.

## Remaining limits

- No contemporary field labels verify crop identity, planting dates, or growth stages.
- The samples are small; they do not represent either municipality's rice production.
- `rainMm` remains mock context with 11 values for nine real radar dates. No rain-to-radar alignment is established. The pipeline leaves context fields unchanged.
- The source collection is provisional. Finite-pixel coverage is not a complete scientific quality assessment.
- PNGs clip values outside −30 to 0 dB; measurements use unclipped values.
