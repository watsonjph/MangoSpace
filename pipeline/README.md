# Pipeline setup and SME2 download

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run from `pipeline/`:

```sh
uv sync --locked
uv run python download_sme2.py --search-only
uv run python download_sme2.py
uv run python verify_sme2.py
```

The download reads the bounds and earliest/latest window dates from
`app/public/data/manifest.json`. It uses `NISAR_L3_SME2_PROVISIONAL_V1`, matching
the manifest's provisional status. It exits with an error if the catalogue has
no matching granules, rather than treating missing data as a successful download.

Downloads require an [Earthdata Login](https://urs.earthdata.nasa.gov/).
The command uses earthaccess's existing credential lookup and otherwise prompts
in your terminal. Credentials entered at the prompt are not saved. Do not put
credentials in source files or paste them into chat. For noninteractive runs,
set `EARTHDATA_USERNAME` and `EARTHDATA_PASSWORD` in your local environment.

Raw files and `download-summary.json` go into the ignored `pipeline/data/sme2/`
directory. Copy the final file count and byte total into sc-38 after the download
finishes. Rerunning uses earthaccess's existing-file handling; remove a corrupt
local file before retrying it.

Run the offline command check with `uv run python -m unittest discover -s tests`.
The verification command compares the local count and byte total with the saved
summary and opens each HDF5 science group. It does not validate soil-water values
or quality flags; sc-48 covers those.

## Malinao Dam images and water area

```sh
uv run python targets.py
```

The command finds the `NISAR_L2_GCOV_PROVISIONAL_V1` granules on track 003 that
cover the dam, for the manifest's dates. It reads only the dam window from each
remote file, so it does not download the 5 GB granules. It writes one HH and one
HV image for each date into `app/public/data/targets/` and replaces the `bounds`
and `nisar` fields of the `malinao-dam` entry in `targets.json`. It does not
change the other fields or the other targets.

The water area is the count of HH pixels below −10 dB inside the outline of the
reservoir, after a 5 × 5 pixel mean that removes speckle. The outline comes from
the median of all dates. The comments in `targets.py` say how the limits were
selected and what the count leaves out. The command needs the same Earthdata
Login as the download.

## Town borders and population

```sh
uv run python lgus.py
```

The command writes the 101 towns and cities of Cebu and Bohol into
`app/public/data/lgus.geojson` (borders) and `lgus.json` (name, province, 2024
population). It needs no login. It keeps the raw files in the ignored
`pipeline/data/lgus/` directory.

A town that is already in `lgus.json` keeps its `soilMoisture`, `validShare` and
`rank`. A new town gets `null` soil water, a `validShare` of 0 and no rank, until
`soil.py` and `rank.py` write them.

Sources, each pinned to a release tag:

- Borders: NAMRIA and PSA, through [OCHA COD-AB](https://data.humdata.org/dataset/cod-ab-phl)
  (CC BY-IGO), with PSGC 3Q 2026 codes, from
  [philippines-json-maps](https://github.com/faeldon/philippines-json-maps) v1.1.1, at 1% of the vertices.
- Population: the 2024 Census of Population, from the PSA PSGC 3Q 2026
  publication, as extracted in
  [philippines-psgc-shapefiles](https://github.com/faeldon/philippines-psgc-shapefiles) v1.0.1.

References: [ASF collection names](https://nisar-docs.asf.alaska.edu/earthaccess/)
and [earthaccess downloads](https://earthaccess.readthedocs.io/en/latest/user/howto/download-to-local-machine/).


## Rice-field images and HV series

```sh
uv run python targets.py --target ubay-rice --target pilar-rice
```

Each target uses one track, orbit direction, and frame. The target registry in
`targets.py` defines small sample paddy parcels, not town-wide rice areas. The command writes HH/HV PNG pairs and
`meanHvDb` for each date, replacing only the selected entries' `bounds` and
`nisar` fields. Running without `--target` still processes only Malinao Dam.

Rice images use the same north-up, 8-bit grey scale as the dam images:
0 = −30 dB and 255 = 0 dB. The Ubay sample uses 16 × 16 output pixels; Pilar uses 24 × 24.
Resampling these geographic grids does not improve the native 10 m radar
resolution. The HV statistic is the arithmetic mean of finite, unclipped reprojected
dB values, before PNG conversion. It is not the dB value of mean power. Both HH
and HV need at least 99% finite coverage. A rice series needs at least two dates;
duplicate dates stop the run rather than choosing a processing version silently.
Images are staged until every selected target passes these checks.

Low HV followed by rising HV is consistent with flooded fields and plant growth.
It does not establish a planting date or crop stage without field observations.
The sample windows include field bunds and can contain other vegetation.
Optical reference imagery locates field parcels; it is not 2026 crop ground truth. The `rainMm`, `history`,
and `scenarios` fields are left unchanged; remaining mock context is not measured
rice data. This command does not change the app's data contract.


## Radar explainer development checks

```sh
uv run python -I radar_limits.py > data/sc-141/results.json
```

This offline command samples the fixed optical-context points in
`docs/fixtures/sc-141-reference-points.json` across the committed dam images.
It prints the decoded HH/HV, original plan matches, and conservative provisional
amplitude cues. It is not a validated land-cover classifier. The limits, plain
result sentences, reference positions, and unresolved building validation are
in [the sc-141 handoff](../docs/sc-141-radar-limits.md).
