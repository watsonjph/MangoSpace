import argparse
import json
from datetime import date
from dataclasses import dataclass
from tempfile import TemporaryDirectory
from typing import Literal
from pathlib import Path

import earthaccess
import h5py
import numpy as np
import rasterio
from numpy.lib.stride_tricks import sliding_window_view
from pyproj import Geod, Transformer
from rasterio.features import sieve
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import Resampling, reproject


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent / "app/public/data"
# The catalogue moved from the provisional to the validated collection after 2026-10-12.
COLLECTIONS = ("NISAR_L2_GCOV_PROVISIONAL_V1", "NISAR_L2_GCOV_V1")
GRID = "science/LSAR/GCOV/grids/frequencyA"
TARGET = "malinao-dam"
BOUNDS = (124.297, 9.8075, 124.337, 9.8475)
# One track only: the radar angle changes the image, so tracks do not compare.
TRACK = "003"
SIZE = 440
BLACK_DB = -30.0
# One pixel has strong speckle. The mean of 5 x 5 pixels gives two clear HH peaks in the box:
# water near -18 dB and land near -7 dB.
LOOKS = 5
# Halfway between the two peaks. It cuts the outline of the reservoir from the median of all dates.
OUTLINE_DB = -12.5
# A pixel that is half water and half land has the mean power of the two peaks, about -10 dB.
WATER_DB = -10.0
MIN_WATER_PIXELS = 100
# shortcut: water more than 20 m outside the usual outline is not counted. Wet rice fields
# next to the reservoir are as dark as water, so the count stays inside the outline.
# Make this larger if the reservoir grows past its 2026 shore.
SHORE_PIXELS = 5
WEST, SOUTH, EAST, NORTH = BOUNDS
BOX_M2 = abs(Geod(ellps="WGS84").polygon_area_perimeter([WEST, EAST, EAST, WEST], [SOUTH, SOUTH, NORTH, NORTH])[0])
PIXEL_KM2 = BOX_M2 / 1e6 / SIZE**2


@dataclass(frozen=True)
class TargetSpec:
    id: str
    kind: Literal["reservoir", "rice"]
    bounds: tuple[float, float, float, float]
    track: str
    size: int
    direction: str = "D"
    frame: str = "084"


TARGETS = {
    TARGET: TargetSpec(TARGET, "reservoir", BOUNDS, TRACK, SIZE),
    "ubay-rice": TargetSpec("ubay-rice", "rice", (124.4345, 10.0152, 124.4355, 10.0166), "003", 16),
    "pilar-rice": TargetSpec("pilar-rice", "rice", (124.3242, 9.8175, 124.3264, 9.8185), "003", 24),
}


def read_window(file, bounds):
    grid = file[GRID]
    epsg = int(np.array(grid["projection"]))
    x, y = grid["xCoordinates"][:], grid["yCoordinates"][:]
    west, south, east, north = bounds
    xs, ys = Transformer.from_crs(4326, epsg, always_xy=True).transform([west, west, east, east], [south, north, south, north])
    pad = 300
    columns = np.flatnonzero((x >= min(xs) - pad) & (x <= max(xs) + pad))
    rows = np.flatnonzero((y >= min(ys) - pad) & (y <= max(ys) + pad))
    if not columns.size or not rows.size:
        raise SystemExit("The granule does not cover the target bounds.")
    window = (slice(rows[0], rows[-1] + 1), slice(columns[0], columns[-1] + 1))
    dx, dy = x[1] - x[0], y[0] - y[1]
    transform = from_origin(x[columns[0]] - dx / 2, y[rows[0]] + dy / 2, dx, dy)
    return {"hh": grid["HHHH"][window], "hv": grid["HVHV"][window]}, transform, epsg


def reproject_to_db(power, transform, epsg, bounds, size):
    out = np.full((size, size), np.nan, "float32")
    power = power.astype("float32")
    reproject(
        np.where((power > 0) & np.isfinite(power), power, np.nan),
        out,
        src_transform=transform,
        src_crs=f"EPSG:{epsg}",
        dst_transform=from_bounds(*bounds, size, size),
        dst_crs="EPSG:4326",
        resampling=Resampling.average,
        src_nodata=np.nan,
        dst_nodata=np.nan,
    )
    with np.errstate(divide="ignore"):
        return 10 * np.log10(out)


def to_grey(db):
    return np.nan_to_num(np.clip((db - BLACK_DB) / -BLACK_DB * 255, 0, 255)).round().astype("uint8")


def box(values, size, reduce):
    return reduce(sliding_window_view(np.pad(values, size // 2, mode="edge"), (size, size)), axis=(-1, -2))


def despeckle(db):
    return 10 * np.log10(box(10 ** (db / 10), LOOKS, np.mean))


def reservoir_outline(hh_db_by_date):
    usual = np.median(np.stack(hh_db_by_date), axis=0)
    water = sieve((usual < OUTLINE_DB).astype("uint8"), MIN_WATER_PIXELS, connectivity=8)
    return box(water, SHORE_PIXELS, np.max).astype(bool)


def water_area_km2(hh_db, outline):
    return round(float(((hh_db < WATER_DB) & outline).sum() * PIXEL_KM2), 3)


def write_png(path, grey):
    with rasterio.open(path, "w", driver="PNG", width=grey.shape[1], height=grey.shape[0], count=1, dtype="uint8") as png:
        png.write(grey, 1)


def select_scenes(results, spec):
    scenes = {}
    for granule in results:
        name = granule["umm"]["GranuleUR"].split("_")
        if (name[5], name[6], name[7], name[9]) != (spec.track, spec.direction, spec.frame, "DHDH"):
            continue
        date = f"{name[11][:4]}-{name[11][4:6]}-{name[11][6:8]}"
        if date in scenes:
            raise SystemExit(f"{spec.id}: duplicate granules for {date}; select a single processing version first.")
        scenes[date] = next(link for link in granule.data_links() if link.endswith(".h5"))
    minimum = 2 if spec.kind == "rice" else 1
    if len(scenes) < minimum:
        raise SystemExit(f"{spec.id}: need at least {minimum} dates on track {spec.track}. targets.json is not changed.")
    return dict(sorted(scenes.items()))


def check_coverage(db, label):
    for band, values in db.items():
        valid = float(np.isfinite(values).mean())
        if valid < 0.99:
            raise SystemExit(f"{label}: only {valid:.0%} of {band.upper()} has data. targets.json is not changed.")


def mean_hv_db(values):
    return round(float(values[np.isfinite(values)].mean()), 3)


def produce_target(spec, start, end, session, image_dir):
    results = [granule for name in COLLECTIONS for granule in earthaccess.search_data(short_name=name, bounding_box=spec.bounds, temporal=(start, end), count=-1)]
    scenes = select_scenes(results, spec)
    print(f"{spec.id}: {len(results)} granules, {len(scenes)} dates on track {spec.track}.", flush=True)
    images, hh, means = [], [], []
    for date, url in scenes.items():
        with session.open(url, block_size=4 * 1024 * 1024, cache_type="blockcache") as remote, h5py.File(remote, "r") as file:
            power, transform, epsg = read_window(file, spec.bounds)
        db = {band: reproject_to_db(values, transform, epsg, spec.bounds, spec.size) for band, values in power.items()}
        check_coverage(db, f"{spec.id} {date}")
        image = {band: f"targets/{spec.id}-{date}-{band}.png" for band in db}
        for band, path in image.items():
            write_png(image_dir / Path(path).name, to_grey(db[band]))
        images.append(image)
        if spec.kind == "reservoir":
            hh.append(despeckle(db["hh"]))
        else:
            means.append(mean_hv_db(db["hv"]))
        print(f"{spec.id} {date}: read", flush=True)
    nisar = {"track": int(spec.track), "dates": list(scenes), "images": images}
    if spec.kind == "reservoir":
        outline = reservoir_outline(hh)
        nisar["waterAreaKm2"] = [water_area_km2(image, outline) for image in hh]
    else:
        nisar["meanHvDb"] = means
    print(f"{spec.id}: {nisar.get('meanHvDb', nisar.get('waterAreaKm2'))}", flush=True)
    return {"bounds": list(spec.bounds), "nisar": nisar}


def update_targets(path, updates):
    targets = json.loads(path.read_text())
    missing = updates.keys() - {target["id"] for target in targets}
    if missing:
        raise SystemExit(f"Unknown target entries: {sorted(missing)}. targets.json is not changed.")
    for target in targets:
        if target["id"] in updates:
            target.update(updates[target["id"]])
    return json.dumps(targets, indent=1, ensure_ascii=False) + "\n"


def main():
    parser = argparse.ArgumentParser(description="Write same-track NISAR target images and measurements.")
    parser.add_argument("--target", action="append", choices=TARGETS, help="Target to produce; repeat for multiple targets. Default: malinao-dam.")
    args = parser.parse_args()
    manifest = json.loads((PUBLIC / "manifest.json").read_text())
    start = min(window["start"] for window in manifest["windows"])
    # The manifest windows are the soil-water periods. The radar series continues to the newest image.
    end = date.today().isoformat()
    if not earthaccess.login(persist=False).authenticated:
        raise SystemExit("Earthdata authentication failed. targets.json is not changed.")
    session = earthaccess.get_fsspec_https_session()
    path = PUBLIC / "targets.json"
    with TemporaryDirectory(prefix="target-images-", dir=PUBLIC) as staging:
        image_dir = Path(staging)
        updates = {name: produce_target(TARGETS[name], start, end, session, image_dir) for name in dict.fromkeys(args.target or [TARGET])}
        contents = update_targets(path, updates)
        (PUBLIC / "targets").mkdir(exist_ok=True)
        for image in image_dir.iterdir():
            image.replace(PUBLIC / "targets" / image.name)
        temporary = path.with_suffix(".json.tmp")
        temporary.write_text(contents)
        temporary.replace(path)
    print(f"Wrote {', '.join(updates)} to {path}")


if __name__ == "__main__":
    main()
