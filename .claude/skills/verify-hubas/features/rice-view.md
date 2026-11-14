# Rice samples

The Rice view shows selected parcel samples in Ubay and Pilar. Each has a NISAR image for the selected date and band, an all-date mean HV line and exact-value table. The samples do not represent whole towns or confirmed crop stages.

## Sub-features

- `rice-navigation` opens `/rice` from the top bar and returns to Dam or Soil water.
- `rice-sample` selects Ubay or Pilar and opens its latest available date.
- `rice-observations` selects a date and HH or HV image while the line always shows HV.
- `rice-values` shows finite HV measurements in dB, preserves zero, and leaves gaps for missing values.
- `rice-limits` identifies small sample coverage, enlarged low-resolution images and unverified planting and growth dates.

## How to get to it (user POV)

- Click Rice in the top bar.
- Choose a Field sample, then a Date and an HH or HV radio button.
- Read the selected HV and its full time series. Expand All dates and HV values for exact measurements.
- Read What the signal can tell us. Planting and growth dates are not verified.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up`, then run `doctor`.
- Run `node scripts/control-hubas.mjs drive --nav Rice --name rice` and again with `--viewport 375x812`. Expect `/rice`, the heading `Rice, through radar`, and no console errors. Add `--offline-basemap yes` if needed.
- Use Playwright MCP for Field sample, Date and HH/HV controls. Compare selected HV and image paths directly with targets.json.
- Run `PORT=3016 npx playwright test e2e/rice-view.spec.ts`. It loads every published image for both samples and checks measured values, navigation, phone overflow, zero, gaps, missing data and failed images.

## Gotchas

- Planting and growth dates are not field-verified. No chart annotation claims an actual crop stage.
- Ubay has 16 × 16 output pixels and Pilar 24 × 24. Enlargement adds no spatial detail. The native radar grid is 10 m.
- Mean HV comes from unclipped measurements, not from the displayed PNG. Switching to HH changes the image, not the HV statistic.
- Late-October and November values fall after the earlier rise. The series is not a continuous growth curve.
- Rain is unavailable; Sentinel-1 side-by-side comparison remains sc-193.
