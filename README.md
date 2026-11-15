# MangoSpace · Hubas

NASA Space Apps 2026, [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/).
Hubas is the score of the wet season before El Niño in Cebu and Bohol. NISAR passes each 12 days, and each pass is one note. You can see the season and hear it in three parts: the soil, the dam and the rice. It is the baseline for the dry months that come next.

| Folder | What | Start |
| --- | --- | --- |
| `app/` | Next.js static site. MapLibre map, SVG charts, Web Audio. | `cd app && npm install && npm run dev` |
| `pipeline/` | Python 3.12. Reads the NASA files, writes `app/public/data`. | `cd pipeline && uv sync` |

`app/lib/data.ts` is the data contract. It is the only link between the two folders.
`app/public/data` holds mock data until the pipeline writes the real files.

Checks: `cd app && npm run lint && npm run build && npm test`. `npm test` runs the Playwright specs in `app/e2e`.

Team rules are in [AGENTS.md](AGENTS.md).
