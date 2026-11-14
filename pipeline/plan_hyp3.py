"""Find Sentinel-1 RTC inputs covering the targets on one relative orbit."""

import json
from collections import Counter
from pathlib import Path

import asf_search as asf
from shapely.geometry import box, shape


ROOT = Path(__file__).resolve().parent
PERIODS = {"dam-2015": ("2015-10-01", "2016-05-31T23:59:59Z"),
           "dam-2023": ("2023-10-01", "2024-05-31T23:59:59Z"),
           "rice-2026": ("2026-06-01", "2026-11-14T00:00:00Z")}


def main():
    targets = json.loads((ROOT.parent / "app/public/data/targets.json").read_text())
    polygons = {target["id"]: box(*target["bounds"]) for target in targets}
    candidates = {}
    for period, (start, end) in PERIODS.items():
        required = [polygons["malinao-dam"]] if period.startswith("dam") else [polygons["ubay-rice"], polygons["pilar-rice"]]
        area = required[0].union(required[-1]).envelope
        results = asf.search(platform=asf.PLATFORM.SENTINEL1, processingLevel=asf.PRODUCT_TYPE.GRD_HD,
                             beamMode="IW", intersectsWith=area.wkt, start=start, end=end)
        scenes = []
        for result in results:
            feature = result.geojson()
            if all(shape(feature["geometry"]).covers(polygon) for polygon in required):
                properties = feature["properties"]
                scenes.append({key: properties[key] for key in ("sceneName", "pathNumber", "flightDirection", "startTime", "polarization")})
        candidates[period] = scenes
        print(period, len(scenes), dict(Counter((s["pathNumber"], s["flightDirection"], s["polarization"]) for s in scenes)), flush=True)
    destination = ROOT / "data/hyp3"
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "candidates.json").write_text(json.dumps(candidates, indent=2))


if __name__ == "__main__":
    main()
