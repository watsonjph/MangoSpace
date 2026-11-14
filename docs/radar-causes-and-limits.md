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

## Water area in 2026: no clear change

Story: [sc-235](https://app.shortcut.com/spacemangoes/story/235). Sentence for the
dam view and the method page:

> From 26 June to 5 November 2026, the measured water area of Malinao Dam stayed
> between 0.76 and 0.82 km². This difference is smaller than the noise of the
> measurement, so the radar shows no clear change in the water area.

The numbers behind it, from `pipeline/area_noise.py` on the 11 dates:

- Change: the largest area minus the smallest is 0.061 km² (7.6% of the mean, 0.801 km²).
- Noise: the area of one date moves by up to 0.092 km² (11.5%) when the −10 dB
  water limit or the −12.5 dB outline limit moves by 1 dB. The smallest move for
  a date is 0.049 km².
- The first and the last date differ by 0.007 km² (0.9%).

The noise is a sensitivity to the limits. It is not an error against a ground
measurement, because there is none. A wet season with little change is also a
result. Calculate the numbers again when new dates arrive.

## Scenario label

This is what happened before. It is not a forecast.

## Integration

The map engineer can reuse the possible causes and measurement limits text in
the dam view. The method page can use both sections. Place the scenario label
under any "if it repeats" chart. This story supplies copy; the view stories
own its display in the app.
