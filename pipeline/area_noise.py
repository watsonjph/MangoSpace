"""Measure how much the dam water area moves when the dB limits move by 1 dB."""

import json
from statistics import mean, pstdev

import rasterio

import targets

STEP_DB = 1.0


def area_noise(hh_db_by_date, dates):
    smooth = [targets.despeckle(hh) for hh in hh_db_by_date]
    outlines = {shift: targets.reservoir_outline(smooth, targets.OUTLINE_DB + shift) for shift in (-STEP_DB, 0, STEP_DB)}
    rows = []
    for date, hh in zip(dates, smooth, strict=True):
        area = targets.water_area_km2(hh, outlines[0])
        water = [targets.water_area_km2(hh, outlines[0], targets.WATER_DB + shift) for shift in (-STEP_DB, STEP_DB)]
        outline = [targets.water_area_km2(hh, outlines[shift]) for shift in (-STEP_DB, STEP_DB)]
        rows.append({"date": date, "areaKm2": area, "waterLimitKm2": water, "outlineLimitKm2": outline})
    areas = [row["areaKm2"] for row in rows]
    half_ranges = [max(abs(value - row["areaKm2"]) for value in row["waterLimitKm2"] + row["outlineLimitKm2"]) for row in rows]
    noise = round(max(half_ranges), 3)
    change = round(max(areas) - min(areas), 3)
    return {
        "dates": rows,
        "meanKm2": round(mean(areas), 3),
        "spreadKm2": round(pstdev(areas), 3),
        "changeKm2": change,
        "changePercent": round(100 * change / mean(areas), 1),
        "noiseKm2": noise,
        "noisePercent": round(100 * noise / mean(areas), 1),
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
