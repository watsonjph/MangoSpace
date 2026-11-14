"""Inspect provisional amplitude cues, not validated land-cover classes."""

import argparse
import json
from pathlib import Path

import rasterio


ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "app/public/data"


def to_db(value):
    if type(value) is not int or not 0 <= value <= 255:
        raise ValueError("A radar pixel must be an integer from 0 to 255.")
    return -30 + 30 * value / 255


def radar_cue(hh_byte, hv_byte):
    hh, hv = to_db(hh_byte), to_db(hv_byte)
    if hh_byte in (0, 255) or hv_byte in (0, 255):
        return "not_sure"
    if hh < -15 and hv < -19:
        return "dark"
    if -19 <= hv <= -12 and -15 <= hh <= -6:
        return "vegetation"
    if hh > -6 and hv > -12:
        return "bright"
    return "not_sure"


def inspect_points(samples, target, public=PUBLIC):
    records = []
    for date, paths in zip(target["nisar"]["dates"], target["nisar"]["images"], strict=True):
        bands = {}
        for band in ("hh", "hv"):
            with rasterio.open(public / paths[band]) as image:
                bands[band] = image.read(1)
        if bands["hh"].shape != bands["hv"].shape:
            raise ValueError(f"{date}: HH and HV image dimensions differ.")
        for sample in samples:
            x, y = sample["pixel"]
            height, width = bands["hh"].shape
            if type(x) is not int or type(y) is not int or not (0 <= x < width and 0 <= y < height):
                raise ValueError(f"{sample['id']}: pixel is outside the image.")
            hh_byte, hv_byte = int(bands["hh"][y, x]), int(bands["hv"][y, x])
            hh, hv = to_db(hh_byte), to_db(hv_byte)
            records.append({
                "id": sample["id"], "target": target["id"], "referenceContext": sample["referenceContext"],
                "date": date, "x": x, "y": y,
                "hhDb": round(hh, 3), "hvDb": round(hv, 3),
                "images": paths,
                "planMatches": {"water": hh < -18, "plants": -18 <= hv <= -12, "buildings": hh > -6},
                "cue": radar_cue(hh_byte, hv_byte),
            })
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=Path, default=ROOT / "docs/fixtures/sc-141-reference-points.json")
    args = parser.parse_args()
    try:
        samples = json.loads(args.samples.read_text())
        targets = json.loads((PUBLIC / "targets.json").read_text())
        target = next(target for target in targets if target["id"] == "malinao-dam")
        print(json.dumps(inspect_points(samples, target), indent=2, allow_nan=False))
    except (OSError, ValueError, KeyError, StopIteration) as error:
        parser.exit(1, f"Cannot inspect reference pixels: {error}\n")


if __name__ == "__main__":
    main()
