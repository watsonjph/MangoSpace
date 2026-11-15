# Data credits and submission copy

Stories: sc-381, sc-175 and sc-237. Based on main 59d3fb3, checked 15 November 2026.

## Change

Method now credits GPM IMERG daily Late Run v07, Copernicus Sentinel-1 and SMAP. Each entry identifies its use and links its dataset and terms or citation policy. Submission copy and the checklist describe the shipped dam/rice/history views and the findings in sc-450. The new musical score is still described as pending.

## Browser proof

Validation: `npm run lint` passed; `npm run build` passed; `npm test -- --workers=1` passed all 32 tests in 3.5 minutes. The build and tests required execution outside the filesystem sandbox after an export write was blocked with EPERM.

`npm test -- --workers=1` starts `npm run dev` on port 3091. Installed Chromium is selected with `PLAYWRIGHT_BROWSERS_PATH=C:\Users\akiin\AppData\Local\ms-playwright`.

The Method/navigation spec opens the map, follows Method, checks the source text and policy link destinations, checks phone overflow, reloads, and returns to select Ubay. It collects page, console and failed-network errors. Both 1280 px and 375 px flows passed with no collected errors.

- [Desktop](sc-381-method-desktop.png): GPM, Sentinel-1 and SMAP appear under Data sources and licences.
- [Phone](sc-381-method-phone.png): the same source text and links wrap within the page width.
- Videos and traces are in `app/test-results/` (generated, not committed).

Playwright MCP could not start because its configured Chrome executable is absent. Screenshots come from the committed Playwright Test flow using installed Chromium. Both screenshots were visually inspected.

## Remaining checks

- The current web tool returned the 2025 submission guide. A direct request failed certificate-chain validation. The 2026 legal terms were accessible and require source/licence documentation; the current submission form, deadline and detailed AI instructions still need a team check.
- Public deployment, demo and actual project-page links are missing. Local verification does not establish their availability.
- The second team member's project-page reading and reconciliation with the final plan remain pending. The saved plan still has the old headline.
- Confirm the final NISAR/SMAP granule versions before publication; do not substitute the latest advertised product version for the version actually processed.
- Recording and voiceover are left to the user under sc-201. No project-page publication or submission was performed.
