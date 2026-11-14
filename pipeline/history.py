"""Write the Sentinel-1 history of Malinao Dam: 2015–16 from the HyP3 jobs of sc-43, 2023–24 from OPERA."""

import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory

import earthaccess
import hyp3_sdk
import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.windows import from_bounds, transform as window_transform

import targets

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "data/history"
JOBS = json.loads((ROOT / "history_jobs.json").read_text())
# The same relative track (61, descending) as the HyP3 jobs. One burst covers the dam box.
OPERA = "OPERA_L2_RTC-S1_V1"
BURST = "T061-129894-IW2"
# shortcut: OPERA has only the last 5 weeks of 2015–16, so that event comes from HyP3 (450 MB for each date).
# Use OPERA for the two events when its archive reaches October 2015.
OPERA_EVENTS = {"2023–24": ("2023-10-01", "2024-05-31")}
# Sentinel-1 VV in the dam box, after the 5 x 5 mean: water near -20 dB, land near -9 dB.
# CORE_DB is halfway between the two peaks. A pixel that is half water and half land has
# the mean power of the two peaks, about -11.7 dB (EDGE_DB), the same rule as WATER_DB in targets.py.
CORE_DB = -14.5
EDGE_DB = -11.7


def connected(dark, seed):
    water = seed & dark
    while True:
        grown = targets.box(water, 3, np.max) & dark
        if (grown == water).all():
            return water
        water = grown


def water_by_date(vv_db_by_date):
    """The shore moves in a dry year, so there is no fixed outline. Water is the dark area that
    touches the usual reservoir. Dry fields are also dark on VV; they are left out when they do not touch it."""
    smooth = [targets.despeckle(vv) for vv in vv_db_by_date]
    seed = targets.reservoir_outline(smooth, CORE_DB)
    cores = [connected(vv < CORE_DB, seed) for vv in smooth]
    return [fill_holes((vv < EDGE_DB) & targets.box(core, targets.SHORE_PIXELS, np.max).astype(bool)) for vv, core in zip(smooth, cores)]


def fill_holes(water):
    """Wind makes patches of water bright on VV. A patch with water on all sides is water.
    shortcut: an island smaller than the image scale is also filled, a constant few pixels."""
    border = np.ones_like(water)
    border[1:-1, 1:-1] = False
    return ~connected(~water, border)


def read_window(job):
    """Read only the dam window of the VV image inside the remote zip file."""
    granule = job.job_parameters["granules"][0]
    stamp = granule.split("_")[4]
    date = f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}"
    cached = CACHE / f"{date}.npz"
    if not cached.exists():
        file = job.files[0]
        stem = file["filename"].removesuffix(".zip")
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"), rasterio.open(f"/vsizip/vsicurl/{file['url']}/{stem}/{stem}_VV.tif") as image:
            west, south, east, north = targets.BOUNDS
            xs, ys = Transformer.from_crs(4326, image.crs, always_xy=True).transform([west, west, east, east], [south, north, south, north])
            window = from_bounds(min(xs) - 300, min(ys) - 300, max(xs) + 300, max(ys) + 300, image.transform).round_offsets().round_lengths()
            power = image.read(1, window=window)
            np.savez(cached, power=power, transform=np.array(window_transform(window, image.transform))[:6], epsg=image.crs.to_epsg())
        print(f"{date}: read", flush=True)
    saved = np.load(cached)
    return date, targets.reproject_to_db(saved["power"], rasterio.Affine(*saved["transform"]), int(saved["epsg"]), targets.BOUNDS, targets.SIZE)


def read_event(hyp3, job_ids):
    jobs = [hyp3.get_job_by_id(job_id) for job_id in job_ids]
    unfinished = [job.job_id for job in jobs if job.status_code != "SUCCEEDED"]
    if unfinished:
        raise SystemExit(f"HyP3 jobs not finished: {unfinished}. targets.json is not changed.")
    with ThreadPoolExecutor(8) as pool:
        return dict(sorted(pool.map(read_window, jobs)))


def read_opera(start, end):
    results = earthaccess.search_data(short_name=OPERA, bounding_box=targets.BOUNDS, temporal=(start, end), count=-1)
    urls = sorted(link for granule in results if f"_{BURST}_" in granule["umm"]["GranuleUR"] for link in granule.data_links() if link.endswith("_VV.tif"))
    scenes = {}
    # A date can have two processing versions. The names sort by processing time, so the newest one stays.
    for file in sorted(earthaccess.download(urls, CACHE / "opera")):
        stamp = Path(file).name.split("_")[4]
        date = f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}"
        if date in scenes:
            print(f"{date}: two processing versions, keeping the newer {Path(file).name}", flush=True)
        with rasterio.open(file) as image:
            scenes[date] = targets.reproject_to_db(image.read(1), image.transform, image.crs.to_epsg(), targets.BOUNDS, targets.SIZE)
    return dict(sorted(scenes.items()))


def history_entry(event, scenes, image_dir):
    for date, vv in scenes.items():
        targets.check_coverage({"vv": vv}, f"{event} {date}")
    images = [f"targets/{targets.TARGET}-s1-{date}-vv.png" for date in scenes]
    for path, vv in zip(images, scenes.values()):
        targets.write_png(image_dir / Path(path).name, targets.to_grey(vv))
    areas = [round(float(water.sum() * targets.PIXEL_KM2), 3) for water in water_by_date(list(scenes.values()))]
    print(f"{event}: {dict(zip(scenes, areas))}", flush=True)
    return {"sensor": "Sentinel-1", "event": event, "dates": list(scenes), "waterAreaKm2": areas, "images": images}


def main():
    parser = argparse.ArgumentParser(description="Write the Sentinel-1 history of Malinao Dam. The selected events replace only their own entries.")
    parser.add_argument("--event", action="append", choices=JOBS, help="Event to write; repeat for more. Default: all.")
    events = parser.parse_args().event or list(JOBS)
    CACHE.mkdir(parents=True, exist_ok=True)
    if not earthaccess.login(persist=False).authenticated:
        raise SystemExit("Earthdata authentication failed. targets.json is not changed.")
    scenes = {event: read_opera(*OPERA_EVENTS[event]) for event in events if event in OPERA_EVENTS}
    if set(events) - set(OPERA_EVENTS):
        hyp3 = hyp3_sdk.HyP3()
        scenes |= {event: read_event(hyp3, JOBS[event]) for event in events if event not in OPERA_EVENTS}
    path = targets.PUBLIC / "targets.json"
    with TemporaryDirectory(prefix="history-images-", dir=targets.PUBLIC) as staging:
        dam = next(entry for entry in json.loads(path.read_text()) if entry["id"] == targets.TARGET)
        kept = [entry for entry in dam.get("history", []) if entry["event"] not in scenes]
        new = [history_entry(event, scenes[event], Path(staging)) for event in scenes]
        entries = sorted(kept + new, key=lambda entry: entry["event"])
        contents = targets.update_targets(path, {targets.TARGET: {"history": entries}})
        for image in Path(staging).iterdir():
            image.replace(targets.PUBLIC / "targets" / image.name)
        temporary = path.with_suffix(".json.tmp")
        temporary.write_text(contents)
        temporary.replace(path)
    print(f"Wrote the history of {targets.TARGET} to {path}")


if __name__ == "__main__":
    main()
