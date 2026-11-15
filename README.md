# Hubas

Hubas follows the 2026 wet season in Cebu and Bohol, the months before El Niño, with NASA-ISRO NISAR radar data.
Open it at **[hubas.vercel.app](https://hubas.vercel.app/)**. It needs no login.

Team MangoSpace built Hubas for NASA Space Apps 2026, challenge [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/).

## What the app shows

NISAR passes over the islands every 12 days. Hubas treats each pass as one note, so you can see the season and hear it in three parts:

- **The soil.** The mean soil water of the towns fell from 0.35 to 0.25 m³/m³ at the end of July and did not come back. NASA SMAP agrees on when the change happened (correlation 0.70).
- **The dam.** The water area of Malinao Dam in Bohol stayed between 0.76 and 0.82 km² in 2026. In the Sentinel-1 record, it was 52% smaller in March 2016 and 19% smaller in March 2024.
- **The rice.** The HV radar signal of two rice parcels in Ubay and Pilar went up 5 to 6 dB from June to October, then fell 3 to 4 dB on 5 November.

The app has five pages:

| Page | What you do there |
| --- | --- |
| [Soil water](https://hubas.vercel.app/) | Play the 11 windows on the map of 101 towns. Click a town to see its soil water, its data coverage, a rank preview and the PAGASA rain outlook. |
| [Dam](https://hubas.vercel.app/dam) | Play 48 radar images of Malinao Dam from 2015–16, 2023–24 and 2026, with the water area and rain. |
| [Rice](https://hubas.vercel.app/rice) | Play the radar images of the Ubay and Pilar parcels, with their HV signal and rain. |
| [Score](https://hubas.vercel.app/score) | Play the soil, the dam and the rice together on one date axis. Turn on a voice to hear each part. |
| [Method](https://hubas.vercel.app/method) | Read how each number is made, what it cannot tell you, and the data sources. |

## Our goals

- **Show what NISAR measured, with its limits.** Local governments, water districts, farmers, teachers and the public can inspect the observations and their coverage before they decide where to look further.
- **Give a baseline for the dry months.** PAGASA expects below-normal rain in Cebu and Bohol in November 2026 (El Niño Advisory No. 6). Hubas records the wet season before it, so the coming months have something to compare against.
- **Make a radar time series that people can follow.** The challenge asks about the rhythms of Earth's surface. A season that you can play and hear is our answer.

Hubas makes no forecast of its own. It does not predict a drought in any town. The NISAR soil water data is provisional, and less than 10% of each province has recommended readings. SMAP does not confirm which towns are drier, so the rank is a list of towns to check, not a result. The [Method page](https://hubas.vercel.app/method) gives the details.

## How it is built

An offline Python pipeline reads the NASA files once and writes small JSON and PNG files. A static Next.js site reads only those files. The browser never calls a NASA service.

| Folder | What | Start |
| --- | --- | --- |
| `app/` | Next.js static export, TypeScript, MapLibre GL JS, SVG charts and Web Audio. Vercel deploys it from `main`. | `cd app && npm install && npm run dev` |
| `pipeline/` | Python 3.12 with uv. Reads NISAR, Sentinel-1, SMAP and GPM data and writes `app/public/data`. | `cd pipeline && uv sync` |

`app/lib/data.ts` is the data contract between the two folders. It is the only link between them.

Before you open a PR, run `cd app && npm run lint && npm run build && npm test`. `npm test` runs the Playwright specs in `app/e2e`.

Team rules are in [AGENTS.md](AGENTS.md). The data sources and their credits are in [docs/submission-text.md](docs/submission-text.md).
