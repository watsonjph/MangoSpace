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

## Scenario label

This is what happened before. It is not a forecast.

## Integration

The map engineer can reuse the possible causes and measurement limits text in
the dam view. The method page can use both sections. Place the scenario label
under any "if it repeats" chart. This story supplies copy; the view stories
own its display in the app.
