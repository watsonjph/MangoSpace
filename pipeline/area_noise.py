"""Measure how much the dam water area and its change between dates move when the dB limits move by 1 dB."""

import json
from statistics import mean, pstdev

import rasterio

import targets

STEP_DB = 1.0
# (water limit shift, outline limit shift) in dB. The first entry is the default.
SETTINGS = ((0, 0), (-STEP_DB, 0), (STEP_DB, 0), (0, -STEP_DB), (0, STEP_DB))


def area_noise(hh_db_by_date, dates):
    smooth = [targets.despeckle(hh) for hh in hh_db_by_date]
    outlines = {shift: targets.reservoir_outline(smooth, targets.OUTLINE_DB + shift) for shift in (-STEP_DB, 0, STEP_DB)}
    series = [[targets.water_area_km2(hh, outlines[outline], targets.WATER_DB + water) for hh in smooth] for water, outline in SETTINGS]
    areas = series[0]
    low, high = areas.index(min(areas)), areas.index(max(areas))
    # A limit moves the area of every date in the same direction, so the noise of the change is how much
    # the difference between the same two dates moves, not how much one date's area moves.
    changes = [round(values[high] - values[low], 3) for values in series]
    change = changes[0]
    noise = round(max(abs(value - change) for value in changes), 3)
    sensitivity = round(max(abs(values[i] - areas[i]) for values in series for i in range(len(areas))), 3)
    return {
        "dates": [{"date": date, "areaKm2": area, "limitAreasKm2": [values[i] for values in series[1:]]} for i, (date, area) in enumerate(zip(dates, areas, strict=True))],
        "meanKm2": round(mean(areas), 3),
        "spreadKm2": round(pstdev(areas), 3),
        "lowestDate": dates[low],
        "highestDate": dates[high],
        "changeKm2": change,
        "changePercent": round(100 * change / mean(areas), 1),
        "changeByLimitKm2": changes[1:],
        "noiseKm2": noise,
        "noisePercent": round(100 * noise / mean(areas), 1),
        "areaSensitivityKm2": sensitivity,
        "changeIsLargerThanNoise": change > noise,
    }


def main():
    target = next(entry for entry in json.loads((targets.PUBLIC / "targets.json").read_text()) if entry["id"] == targets.TARGET)
    images = []
    for paths in target["nisar"]["images"]:
        with rasterio.open(targets.PUBLIC / paths["hh"]) as png:
            images.append(targets.BLACK_DB - targets.BLACK_DB * png.read(1) / 255)
    print(json.dumps(area_noise(images, target["nisar"]["dates"]), indent=1))


if __name__ == "__main__":
    main()
