# Space Apps submission checklist

Story: [sc-237](https://app.shortcut.com/spacemangoes/story/237). Checked 15 November 2026, Philippine time.

## Rule sources

- [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/), published 13 Nov 2026. Read live with Playwright on 15 Nov 2026; current format, public-hosting, language, SI disclosure and deadline requirements are recorded in the latest audit.
- [2026 Participant Terms and Conditions](https://www.spaceappschallenge.org/legal/), updated June 22, 2026. Rechecked in this update: source citations and licence documentation are required. The returned terms do not establish the earlier audit's detailed AI-labelling requirements.
- [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/).

## Required checks

- [ ] Confirm all team members at the same Local Event and listed on the team page.
- [ ] Complete every required form field in English: project name, summary, detailed description, demo, final project, NASA data, other references, and AI/SI use.
- [ ] Use NASA data/resources and explain their contribution to the chosen challenge.
- [ ] Confirm the 2026 demo requirements; use the chosen seven-slide English deck, including title/intro, hosted publicly as permitted by the live guide. Use English slides and English subtitles for video.
- [ ] Test demo and final-project links without login or access requests.
- [ ] Disclose Claude and Codex assistance with code, tests and text. The live guide confirms visible generation indicators for images/video and descriptive text plus metadata for generated audio/code/data.
- [ ] Cite every used resource and its licence, including open resources. Confirm rights to publish original and third-party material under the terms.
- [ ] Check privacy and media restrictions in the terms, including under-18 likenesses.
- [ ] Accept the form declarations, submit for judging, and retain confirmation before November 15, 23:59 in the Local Event timezone (Universal Event: team owner's timezone). Confirm any earlier local judging deadline with the organizer.

## Project audit

Unchecked means pending, not inapplicable. This repository cannot establish team registration or what is saved on the Space Apps project page.

| Item | Evidence or remaining work |
| --- | --- |
| Team page and registration | Team/project URL not found in repository or saved build-plan HTML. Team must confirm membership and event acceptance. |
| Name, summary and description | Hubas; updated copy is in `docs/submission-text.md` (sc-175). It leads with the soil, dam and rice findings from sc-450. The combined Score page is shipped; the separate sound redo remains under review. Check the final deployed build before claiming changes. |
| Repository | [watsonjph/MangoSpace](https://github.com/watsonjph/MangoSpace). |
| Live app | Public app: https://hubas.vercel.app/ (sc-31 done). Recheck after final merges; final submission is sc-205. |
| Demo | Seven-slide English PowerPoint prepared in PR #71; sc-201 packages its public download link. |
| NASA data | NISAR SME2 town soil water and GCOV dam/rice observations are shown. SMAP checks seasonal timing, not the town rank. GPM IMERG daily Late Run v07 supplies the 12-day rain totals on both dam and rice charts. sc-381 adds all three missing source-list credits and policy/citation links on Method. Record final NISAR and SMAP granule versions before publication; the SMAP check script does not pin a version. |
| Partner and other data | Sentinel-1 dam history is shown; rice comparison images are packaged but the side-by-side view is pending sc-193. Include the modified Copernicus Sentinel attribution and legal notice. The official PAGASA November outlook is shown in the town panel. Borders use NAMRIA/PSA through OCHA COD-AB via philippines-json-maps v1.1.1, not geoBoundaries. Include PSA population, OpenFreeMap, OpenMapTiles, OpenStreetMap and implementation tools. |
| AI disclosure | Draft below; team must confirm its accuracy and add any other tools/media used. |
| Second reader | Pending: another team member must read the actual project page before sc-205. Record name and date in the story. |

## AI disclosure draft

We used Claude and OpenAI Codex to assist with code, tests, documentation and submission text. AI-assisted implementation includes the Python processing pipeline and TypeScript web application. Satellite measurements come from the cited datasets; AI assistance in writing processing code is not a source of satellite observations. The team must review the final code, scientific claims and submitted text. Add any generated media and other AI tools before submission.

Include this disclosure with the project description and repository documentation as well as the form's AI/SI field. Follow the live guide's metadata, visible-indicator and audio-disclosure instructions. Changes to the app data contract need the tech lead. Check whether the final demo includes generated media.

## Handoff before submission

- sc-482: keep English as the default and keep Method in English. Translate the opening, findings and main controls only after the English screen text is final. A Cebuano-speaking teammate must check every sentence and be named in the story before publication. This change does not claim a shipped language selection.
- sc-201: the user selected a PowerPoint demo instead of video. The seven-slide deck is in PR #71; sc-201 packages a public download and HTML preview.
- sc-31: done. The public URL is https://hubas.vercel.app/. Vercel deploys it from `main`. Check it again after the last merge, before sc-205.
- Team owner: supply the actual Space Apps project-page URL and verify registration, required fields and declarations there. The Claude artifact URL is the build plan, not the project page.
- Second team member: read the completed project page, reconcile the final plan's “we say” column, and record their name/date in sc-237.
- Keep sc-175 and sc-237 In Progress until these checks are resolved. The repository changes do not publish or submit the project.

## Latest live-guide audit

The live 2026 guide was read with Playwright on 15 Nov. See [the updated audit](submission-audit-2026-11-15.md) for verified requirements, evidence and the remaining team-only checks. It supersedes the earlier cached-guide/certificate limitations above.
