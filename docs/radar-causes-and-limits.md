# Radar causes and limits

Story: [sc-110](https://app.shortcut.com/spacemangoes/story/110).
Copy for the dam view and method page, based on the build plan's
[results rules](https://claude.ai/artifact/RnQvBADeQY7pRJLrBH8YR8).

## Possible causes

A smaller water area can have several causes, including less rain, more water
use, or dam work. The radar images alone do not establish the cause.

## Measurement limits

Compare dates from the same satellite track for each target. Different radar
viewing angles can change the image. The NISAR soil water data is provisional.
NISAR and Sentinel-1 can give different water areas in km², so compare changes
between sensors as percentages rather than absolute areas.

## Water area in 2026: a small dip, cause not known

Story: [sc-235](https://app.shortcut.com/spacemangoes/story/235). Sentence for the
dam view and the method page:

> From 26 June to 5 November 2026, the measured water area of Malinao Dam stayed
> between 0.76 and 0.82 km², within 8% of the mean. The lowest value, on
> 18 September, stays the lowest when the radar limits change, but the radar alone
> cannot tell if there was less water or if wind or the radar caused it.

The numbers behind it, from `pipeline/area_noise.py` on the 11 dates:

- Change: the largest area (5 Nov) minus the smallest (18 Sep) is 0.061 km²
  (7.6% of the mean, 0.801 km²).
- Noise of the change: when the −10 dB water limit or the −12.5 dB outline limit
  moves by 1 dB, the difference between those two dates is 0.041 to 0.082 km². It
  moves by up to 0.021 km² (2.6%), so the change is larger than this noise.
- Noise of one area: the area of one date moves by up to 0.092 km² (11.5%). A limit
  moves all dates in the same direction, so this is the uncertainty of the area in
  km², not of the change between dates. Use it if the app shows the area itself.

The noise is a sensitivity to the limits. It is not an error against a ground
measurement, because there is none. Speckle, wind on the water and the change of
processing version after 12 October are not measured. In the file names, the
18 September file has `F_F` where the other dates have `N_F`; what that flag means
is not checked. A wet season with little change is also a result. Calculate the
numbers again when new dates arrive.

## Water area in the past events: clear falls in March

Story: [sc-151](https://app.shortcut.com/spacemangoes/story/151). Sentence for the
dam view and the method page:

> In the two past dry events, the Sentinel-1 water area of Malinao Dam was lowest
> in March: it fell by about half in March 2016 and by about a fifth in March 2024,
> then came back by May. These falls are much larger than the noise of the
> measurement. The radar does not tell the cause.

The numbers behind it, from `pipeline/area_noise.py --history`. The fall is from the
last normal date to the lowest date in March:

| Event | Before the fall | Lowest area | Fall | Noise of the fall | Noise of one area |
| --- | --- | --- | --- | --- | --- |
| 2015–16 | 0.785 km² (25 Feb 2016) | 0.375 km² (20 Mar 2016) | 0.410 km² (52%) | 0.019 km² | 0.076 km² |
| 2023–24 | 0.740 km² (2 Mar 2024) | 0.590 km² (26 Mar 2024) | 0.150 km² (20%) | 0.007 km² | 0.053 km² |

The script prints the change from the lowest to the highest date of the event:
0.431 km² (noise 0.027) for 2015–16 and 0.185 km² (noise 0.011) for 2023–24. In
2023–24 the highest date (25 May) comes after the fall, so that change is the
recovery, not the fall. The noise of the fall is calculated in the same way from the
`limitAreasKm2` of the two dates in the same output.

The method is the one of sc-235: the −11.7 dB edge limit or the −14.5 dB core limit
of `history.py` moves by 1 dB, and the difference between the two dates is
calculated again. The script reads the committed images, which have steps of
0.118 dB, so an area can differ from `targets.json` by up to 0.005 km². The noise is
a sensitivity to the limits, not an error against a ground measurement. The two
events come from different products (HyP3 and OPERA) that differ by about 5% in
area, so compare the events as percentages.

## Interpretation in the three views

Story: [sc-476](https://app.shortcut.com/spacemangoes/story/476).
The soil map, dam view, and rice view use the same three labels: "What we see",
"What can cause it", and "What we cannot tell". A possible cause is a hypothesis.
The date, rain, or polarization can support a hypothesis without proving it.

### Soil water and rain

The mean uses towns with a valid reading on at least half of their pixels, as
the map does. Each town has the same weight. The set of towns can change.

| Window in 2026 | Mean soil water, m³/m³ | Towns in the mean |
| --- | ---: | ---: |
| 15 to 27 July | 0.324 | 99 of 101 |
| 27 July to 8 August | 0.250 | 61 of 101 |
| 8 to 20 August | 0.246 | 99 of 101 |

The first low window has weaker coverage. The next window has a similar mean
with 99 towns again. This supports a change beyond the first coverage gap,
but does not validate each town or establish the cause. The later means stay
below the July value.

Less rain can let soil dry. The GPM cell near Pilar reports 99.2 mm in the
12 days before 20 July, then 6.1 mm before 13 August. This local fall in rain
matches dry local conditions after the soil mean fell. It does not explain when
or why the mean fell. These totals do not cover the same intervals as the soil
windows. The one 0.1° cell does not describe all of Cebu and Bohol. It cannot
establish the cause of the change in the town mean. The NISAR soil water product
remains provisional.

The soil values come from `lgus.json` with the coverage rule in `soil-mean.ts`.
The rain values come from the Malinao Dam entry in `targets.json`, produced by
`pipeline/context.py` from GPM IMERG Late daily rain. The dam and Pilar share
the same cell.

### Dam area and rain

The 2026 range and the past March falls above are still the measured findings.
The view compares each past low with the first date of its event, which gives
52% in 2016 and 19% in 2024. The fall from the last normal date, used in the
sensitivity table above, gives 52% and 20%. These are different baselines.

Less inflow or more water use can reduce the area. The March lows fit the dry
months, but the radar does not measure a water budget. The GPM cell near the
dam reports 60.9 mm in the 12 days before the 18 September low, so the record
gives no simple recent-rain explanation. This total does not rule out a longer
rain deficit, and one cell does not cover the whole catchment. We have no
water-use, reservoir-depth, or wind record that establishes the cause.

### Rice HV

The values come from each parcel's `meanHvDb` and matching `dates` in
`targets.json`. They are means of HV in dB, not crop-stage measurements.

| Parcel | First value | Highest value | Latest value |
| --- | --- | --- | --- |
| Ubay | −21.699 dB, 26 June | −16.481 dB, 24 October | −19.152 dB, 5 November |
| Pilar | −20.956 dB, 26 June | −15.205 dB, 30 September | −19.678 dB, 5 November |

Before 5 November, the GPM cells reported 39.6 mm near Ubay and 46.4 mm near
Pilar. These totals do not measure water in the parcels. The rising
cross-polarized HV signal fits more plant material. A harvest or standing
water could also lower HV. No field observation confirms the crop, planting
date, growth stage, or harvest. Soil water, other plants, surface roughness,
and radar noise also affect HV.

All dates in this table are in 2026. The samples do not represent a whole town.

## What NISAR can do next

The Method page proposes repeated measurements through the December to May
dry months and El Niño. NISAR has a nominal 12-day repeat. A new value still
needs an available pass with valid data on the same track. Continue the same
soil water, dam area, and rice HV measurements. These records can show when
the surface changes, but cannot forecast the effect of El Niño.

The longer L-band wave can penetrate deeper into vegetation than C-band.
The result depends on canopy density, radar angle, and polarization. L-band
may add information about lower plant layers or wet ground in some
conditions. C-band can also reach the ground under sparse plants. Do not
claim that L-band always passes through rice or that C-band always stops at
the top. The [NASA SAR Handbook, chapter 2](https://earthdata.nasa.gov/s3fs-public/2025-04/SARHB_CH2_Content.pdf)
explains wavelength, vegetation penetration, and polarization.

The paired images from sc-189 use NISAR on 12 October and Sentinel-1 on
13 October 2026. Their cross-polarized means are:

| Parcel | NISAR HV, dB | Sentinel-1 VH, dB |
| --- | ---: | ---: |
| Ubay | −17.204 | −14.933 |
| Pilar | −15.214 | −12.526 |

The pairs show a difference in radar return. The dates, pixel sizes, viewing
angles, and processing also differ. They do not prove that either sensor
measured water or soil below the plants. Repeated pairs with field
observations could test that explanation. The Method page states the
measurements. The side-by-side image view remains sc-193.

The soil water product is provisional. A revised product could change the
values. Reprocess the record when a new version arrives, then compare it
with field measurements before using town differences for decisions.

## Scenario label

This is what happened before. It is not a forecast.

## Integration

The soil map, dam view, rice view, and Method page display the sc-476
interpretation above. Place the scenario label under any "if it repeats"
chart. Keep the measured finding, possible cause, and limit together.
