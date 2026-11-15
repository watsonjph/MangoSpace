# Hubas project-page copy

Story: [sc-175](https://app.shortcut.com/spacemangoes/story/175). Draft for team review, based on main at 351abf7 and the saved MangoSpace build plan. Do not submit until the pending links and final-build checks below are resolved.

## Project name

Hubas

## High-level project summary

Hubas is a radar-data explorer for Cebu and Bohol. It maps NISAR soil water for 101 towns and cities in 12-day windows, shows how much of each town has a valid reading, and gives a rank preview of the towns to look at first. A Method page explains the measurements, sources and limits. Our goal is to help people decide where to look first as they consider water conditions. The NISAR soil water data is provisional. Hubas makes no forecast of its own.

## Detailed project description

### The problem and our answer

Local governments, water districts, farmers, teachers and the public need a way to read satellite water observations with their limits. Hubas responds to Dancing with the SARs by preparing NISAR radar measurements for a web experience focused on Cebu and Bohol.

A visitor picks a town and a 12-day window and sees the town's soil water in m³/m³, the share of the town with good pixels, its rank preview and the official PAGASA outlook for its province. Gray means no good pixels in that window, not dry ground. A town is “Not ranked” when less than half of it has data. The rank preview ranks 99 of 101 towns and is not a drought risk score.

### How it works

An offline Python pipeline prepares static JSON and PNG files. A TypeScript and Next.js app reads those packaged files, with MapLibre GL JS for the map. NASA services are not called from the visitor's browser.

The repository contains NISAR HH/HV radar images and water-area measurements for Malinao Dam, and HV measurements for selected rice-field parcels. It also contains Sentinel-1 images and dam-water history for 2015–16 and 2023–24. These packaged datasets are not yet available as dam, rice or history views. The rank preview gives equal weight to how dry a town is now, how much its soil water fell over the three windows before, and its 2024 population. It means “Look at these towns first.” It is not a drought risk score or a prediction.

### What the observations can tell us

The NISAR soil water data is provisional. We checked it against NASA SMAP: NISAR reads 0.07 m³/m³ lower on average, and the two agree on when the islands were wetter or drier (correlation 0.70 over 11 windows) but not on which towns are drier in a single window. SMAP therefore does not confirm the order of the rank preview, so we present it as a list of towns to check, not as a result. A smaller water area can have several causes, including less rain, more water use or dam work. Radar images alone do not establish the cause. Rice-parcel measurements do not establish crop identity or growth stage. Historical examples describe what happened before; they do not predict what happens next.

The official PAGASA outlook is separate from our measurements. The app quotes El Niño Advisory No. 6, issued November 3, 2026: PAGASA expects below-normal to way-below-normal rainfall in November 2026 for Cebu and Bohol, and heavy rain may still occur with tropical cyclones and other weather systems.

### What we hope to achieve

We want people to inspect the measurements and their coverage before deciding where to investigate further. The app's role is to explain observations and their limits. It does not make its own rainfall forecast or predict that a town will experience drought.

## NASA data

- [NISAR SME2 and GCOV](https://nisar-docs.asf.alaska.edu/), NASA/ISRO, distributed by ASF. SME2 supplies the town soil water shown on the map and used by the rank preview. GCOV supplies the packaged Malinao Dam and rice-parcel HH/HV images and measurements. Cite the collection versions and granules actually included in the final artifact.
- [ASF HyP3](https://hyp3-docs.asf.alaska.edu/) and [OPERA RTC-S1](https://www.jpl.nasa.gov/go/opera/products/rtc-product/) support the packaged Sentinel-1 dam history. The radar observations are Copernicus Sentinel-1 data; processing products do not make the original observations NISAR data.
- [SMAP `SPL3SMP_E`](https://nsidc.org/data/spl3smp_e), NASA, enhanced daily soil water on a 9 km grid. Used only to check the NISAR soil water; the result is on the Method page.
- [GPM IMERG `GPM_3IMERGDL` v07](https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDL_07/summary), NASA, daily Late Run rain. Supplies the 12-day rain total before each Malinao Dam and rice date. Packaged in the data, but no page shows or credits it yet. Per the [submission checklist](submission-checklist.md), drop this entry from the final page unless the dam view ships or the Method page credits GPM.

## Space agency partner data and other references

| Resource | Use |
| --- | --- |
| [Copernicus Sentinel-1](https://dataspace.copernicus.eu/explore-data/data-collections/sentinel-data/sentinel-1) | Packaged dam history and rice L-band/C-band comparison; cite the final processed products. |
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

The plan's “we say” column permits observed soil-water change, “look at these towns first,” an attributed PAGASA outlook, conditional historical scenarios, possible causes of smaller water area, and provisional-data limits. This draft follows those claim boundaries. It claims measured town soil water and a rank preview, both marked provisional, with the SMAP check that limits the rank. It does not claim dam, rice or history views, a drought prediction or risk score, a rainfall forecast of our own, or a proven cause of water-area change. No scenario is claimed because the scenario feature is not on main.
