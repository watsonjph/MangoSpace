# Space Apps submission checklist

Story: [sc-237](https://app.shortcut.com/spacemangoes/story/237). Checked 15 November 2026, Philippine time.

## Rule sources

- [2026 Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/), fetched directly on 15 November. Search results returned an older 2025 copy; the live page is dated November 13, 2026 and uses November 14–15 submission dates.
- [2026 Participant Terms and Conditions](https://www.spaceappschallenge.org/legal/), updated June 22, 2026.
- [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/).

## Required checks

- [ ] Confirm all team members at the same Local Event and listed on the team page.
- [ ] Complete every required form field in English: project name, summary, detailed description, demo, final project, NASA data, other references, and AI/SI use.
- [ ] Use NASA data/resources and explain their contribution to the chosen challenge.
- [ ] Provide a public demo: video no longer than 30 seconds or at most seven slides, including title/intro. English slides; English subtitles for non-English video speech.
- [ ] Test demo and final-project links without login or access requests.
- [ ] Disclose AI assistance. Identify generated code/data in descriptive text and metadata; watermark generated visuals and acknowledge generated audio. Generated material must not modify NASA branding.
- [ ] Cite every used resource and its licence, including open resources. Confirm rights to publish original and third-party material under the terms.
- [ ] Check privacy and media restrictions in the terms, including under-18 likenesses.
- [ ] Accept the form declarations, submit for judging, and retain confirmation before November 15, 23:59 in the Local Event timezone (Universal Event: team owner's timezone). Confirm any earlier local judging deadline with the organizer.

## Project audit

Unchecked means pending, not inapplicable. This repository cannot establish team registration or what is saved on the Space Apps project page.

| Item | Evidence or remaining work |
| --- | --- |
| Team page and registration | Team/project URL not found in repository or saved build-plan HTML. Team must confirm membership and event acceptance. |
| Name, summary and description | Hubas; submission copy belongs to sc-175 (draft in PR #39). Recheck claims against the final merged build. |
| Repository | [watsonjph/MangoSpace](https://github.com/watsonjph/MangoSpace). |
| Live app | No confirmed URL found. Deployment is sc-31/sc-260; final submission is sc-205. |
| Demo | No public link found. sc-201 supplies it. |
| NASA data | NISAR GCOV images and SME2 soil water are in the app: town soil water (sc-71) and the dryness rank (sc-120) are merged. SMAP is merged as a check and credited on the Method page (sc-163). GPM rain is in `targets.json` (sc-100) but no page shows or credits it yet; cite GPM only if the dam view ships or the Method page credits it. |
| Partner and other data | Sentinel-1 history and rice comparison are packaged in `targets.json`; the dam and rice views are not built, so cite them only if they ship. The official PAGASA November outlook is merged (sc-61) and shown in the town panel. Town boundaries use NAMRIA/PSA through OCHA COD-AB via philippines-json-maps v1.1.1, not geoBoundaries. Cite the actual boundary source. Include PSA population, OpenFreeMap, OpenMapTiles, OpenStreetMap and implementation tools. |
| AI disclosure | Draft below; team must confirm its accuracy and add any other tools/media used. |
| Second reader | Pending: another team member must read the actual project page before sc-205. Record name and date in the story. |

## AI disclosure draft

We used Claude and OpenAI Codex to assist with code, tests, documentation and submission text. AI-assisted implementation includes the Python processing pipeline and TypeScript web application. Satellite measurements come from the cited datasets; AI assistance in writing processing code is not a source of satellite observations. The team must review the final code, scientific claims and submitted text. Add any generated media and other AI tools before submission.

Include this disclosure with the project description and repository documentation as well as the form's AI/SI field. Add identifiers to the metadata of any generated data. Changes to the app data contract need the tech lead. Check whether the final demo includes generated media before deciding watermark/audio disclosures are inapplicable.
