# Hubas project-page copy

Story: [sc-175](https://app.shortcut.com/spacemangoes/story/175). Updated 15 November 2026 against main at 59d3fb3 and the findings in sc-450. Draft for team review. Confirm the final deployed build and pending links before submission.

## Project name

Hubas

## High-level project summary

Hubas follows the wet season before El Niño in Cebu and Bohol through three parts: the soil, the dam and the rice. NISAR observations show a fall in mean soil water at the end of July, a steady Malinao Dam water area in 2026, and a rise then fall in the radar signal of two rice parcels. Maps, radar images and charts let visitors inspect these changes alongside rain and past dry events. These observations provide a baseline for the dry months ahead. Hubas makes no forecast of its own.

## Detailed project description

### The problem and our answer

Local governments, water districts, farmers, teachers and the public need a way to read satellite water observations with their limits. Hubas responds to Dancing with the SARs by preparing NISAR radar measurements for a web experience focused on Cebu and Bohol.

A visitor follows soil water on the map, inspects Malinao Dam's radar images and water-area history, and compares the HV radar signals of the Ubay and Pilar parcels. Rain totals give context on the dam and rice charts. The town panel shows soil water in m³/m³, coverage, a rank preview and the official PAGASA outlook. Gray means less than half the town has readings, not dry ground. The rank preview covers 99 of 101 towns; SMAP does not validate its order, and it is not the project's main finding.

### How it works

An offline Python pipeline prepares static JSON and PNG files. A TypeScript and Next.js app reads those packaged files, with MapLibre GL JS for the map. NASA services are not called from the visitor's browser.

The dam view shows NISAR HH/HV images, water area, GPM rain and Sentinel-1 history from 2015–16 and 2023–24. Dashed historical scenarios illustrate what a repeat of a past relative change would look like; they are not forecasts. The rice view shows NISAR images, the HV signal of the Ubay and Pilar parcels, and GPM rain. Sentinel-1 rice comparison images are packaged, but the side-by-side L-band/C-band view is still pending sc-193.

### Three findings

- **Soil.** The mean of the towns fell from about 0.35 to 0.25 m³/m³ at the end of July and did not return to its earlier level. SMAP agrees on the timing of the seasonal change (correlation 0.70).
- **Dam.** Malinao Dam's measured water area stayed between about 0.76 and 0.82 km² in 2026. In the Sentinel-1 histories, the area fell by about 52% in March 2016 and 19% in March 2024, relative to each event's starting area. These are changes within each sensor's series, not absolute area comparisons between sensors.
- **Rice.** The HV signal of the two parcels rose by about 5–6 dB from June to its September or October peak, then fell by about 3–4 dB on 5 November. This is a measured radar change; no field observation confirms planting dates or growth stages.

The planned musical experience treats each radar pass as a note. The sound redo (sc-499), shared timeline (sc-491) and combined three-part score (sc-572) are not claimed as shipped in this draft. Update this paragraph only after they are merged and verified.

### What the observations can tell us

The NISAR soil water data is provisional. We checked it against NASA SMAP: NISAR reads 0.07 m³/m³ lower on average, and the two agree on when the islands were wetter or drier (correlation 0.70 over 11 windows) but not on which towns are drier in a single window. SMAP therefore does not confirm the order of the rank preview, so we present it as a list of towns to check, not as a result. A smaller water area can have several causes, including less rain, more water use or dam work. Radar images alone do not establish the cause. Rice-parcel measurements do not establish crop identity or growth stage. Historical examples describe what happened before; they do not predict what happens next.

The official PAGASA outlook is separate from our measurements. The app quotes El Niño Advisory No. 6, issued November 3, 2026: PAGASA expects below-normal to way-below-normal rainfall in November 2026 for Cebu and Bohol, and heavy rain may still occur with tropical cyclones and other weather systems.

### What we hope to achieve

We want people to inspect the measurements and their coverage before deciding where to investigate further. The app's role is to explain observations and their limits. It does not make its own rainfall forecast or predict that a town will experience drought.

## NASA data

- [NISAR SME2 and GCOV](https://nisar-docs.asf.alaska.edu/), NASA/ISRO, distributed by ASF. SME2 supplies the town soil water shown on the map and used by the rank preview. GCOV supplies the packaged Malinao Dam and rice-parcel HH/HV images and measurements. Cite the collection versions and granules actually included in the final artifact.
- [ASF HyP3](https://hyp3-docs.asf.alaska.edu/) and [OPERA RTC-S1](https://www.jpl.nasa.gov/go/opera/products/rtc-product/) support the packaged Sentinel-1 dam history. The radar observations are Copernicus Sentinel-1 data; processing products do not make the original observations NISAR data.
- [SMAP `SPL3SMP_E`](https://nsidc.org/data/spl3smp_e), NASA NSIDC DAAC, enhanced daily soil water on a 9 km grid. Used only to check NISAR soil water; the result is on Method. Free to access; follow the [NSIDC citation policy](https://nsidc.org/data/data-programs/nsidc-daac/citing-nsidc-daac) and record the granule version actually used before publication.
- [GPM IMERG `GPM_3IMERGDL` v07](https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDL_07/summary), NASA GES DISC, daily Late Run rain. Supplies the 12-day rain totals shown on the dam and rice charts. Freely available under the [GPM data policy](https://gpm.nasa.gov/data/policy); acknowledge NASA and the dataset producers.

## Space agency partner data and other references

| Resource | Use |
| --- | --- |
| [Copernicus Sentinel-1](https://dataspace.copernicus.eu/explore-data/data-collections/sentinel-data/sentinel-1) | Dam history shown in the app and packaged rice comparison images. Contains modified Copernicus Sentinel data 2015–2016, 2023–2024 and 2026. Free, full and open use under the [Copernicus Sentinel legal notice](https://cds.climate.copernicus.eu/licences/ec-sentinel). |
| [PAGASA advisory](https://pubfiles.pagasa.dost.gov.ph/pagasaweb/files/climate/monthlyclimateassessment/11052026_MCAO_EN_Advisory_6.pdf) | November 2026 rainfall outlook quoted in the town panel. |
| [NAMRIA/PSA/OCHA boundaries](https://data.humdata.org/dataset/cod-ab-phl), via [philippines-json-maps v1.1.1](https://github.com/faeldon/philippines-json-maps/tree/v1.1.1) | Town borders; underlying CC BY 3.0 IGO, conversion MIT. The shipped app does not use geoBoundaries. |
| [PSA PSGC and POPCEN 2024](https://psa.gov.ph/classification/psgc) | Town codes and population; credit PSA. |
| [OpenFreeMap](https://openfreemap.org/), [OpenMapTiles](https://github.com/openmaptiles/positron-gl-style), [OpenStreetMap](https://www.openstreetmap.org/copyright) | Basemap and attribution; preserve map credits and the linked style/data licences. |
| [Next.js](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), [TypeScript](https://github.com/microsoft/TypeScript), [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js), [Playwright](https://github.com/microsoft/playwright) | Application, map and browser verification. Dependency licences remain with their packages. |
| [Python pipeline dependencies](../pipeline/pyproject.toml) | Processing tools; use the locked versions and licences supplied by the packages. |

RADARSAT-1 is not used in the current artifact.

## AI/SI use

We used Claude and OpenAI Codex to assist with code, tests, documentation and submission text. This includes AI-assisted Python processing code and TypeScript application code. Satellite observations come from the cited data providers. The team must review the final scientific claims, code and text. Confirm any additional AI tools or generated media before publishing this disclosure.

## Links and final checks

- Repository: [watsonjph/MangoSpace](https://github.com/watsonjph/MangoSpace).
- Live app: **pending confirmed deployment URL** (sc-31/sc-260/sc-205).
- Public demo: **pending sc-201**. Use the required short video or slide deck; the repo link does not replace the demo.
- Team/project page: **pending URL**. No project-page publication has been performed.
- Before submission: replace current-build caveats only when the corresponding feature/data is merged, deployed and verified; check every linked source/licence; have a second member read the complete page under sc-237.

## Claims check against the saved plan

The three findings above follow sc-450's revised message. Dam, rice, history and conditional scenario views are on main. The town rank remains a provisional preview: SMAP does not validate its order. This draft does not claim drought prediction, a risk score, a proven physical cause, confirmed crop stages, or an implemented combined musical score. A second team member must reconcile these sentences with the plan's final “we say” column and the deployed build before publication.
