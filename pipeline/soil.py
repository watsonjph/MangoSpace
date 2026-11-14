"""Write the town soil water of each 12-day window from the NISAR SME2 files."""

import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import earthaccess
import h5py
import numpy as np
from shapely import intersects_xy
from shapely.geometry import shape

from check_soil_quality import recommended
from download_sme2 import COLLECTION

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent / "app/public/data"
DOWNLOADS = ROOT / "data/sme2"
CACHE = ROOT / "data/sme2-grids"
GRID = "science/LSAR/SME2/grids"


def read_grid(name, url, session):
    """The soil water, the flag and the cell centres of one file. A file of download_sme2.py is used if it is there;
    if not, only these four arrays are read from the remote file (about 2 MB of 80 MB)."""
    cached = CACHE / f"{name}.npz"
    if not cached.exists():
        local = DOWNLOADS / f"{name}.h5"
        with (open(local, "rb") if local.exists() else session.open(url, block_size=1024 * 1024, cache_type="blockcache")) as file, h5py.File(file, "r") as product:
            grid = product[GRID]
            soil, flags = grid["soilMoisture"], grid["retrievalQualityFlag"]
            valid, _ = recommended(soil[:], flags[:], soil.attrs["_FillValue"], flags.attrs["_FillValue"])
            np.savez_compressed(cached, soil=np.where(valid, soil[:], np.nan).astype("float32"), longitude=grid["longitude"][:], latitude=grid["latitude"][:])
        print(f"{name}: read", flush=True)
    saved = np.load(cached)
    return saved["soil"], saved["longitude"], saved["latitude"]


def window_index(date, windows):
    """A window is its start day to the day before its end; the last window also has its end day."""
    for index, window in enumerate(windows):
        if window["start"] <= date < window["end"] or (index == len(windows) - 1 and date == window["end"]):
            return index
    return None


def combine(grids, longitude, latitude):
    """The mean of the valid readings of each cell on the shared grid. NaN where no file has a valid reading."""
    total = np.zeros((latitude.size, longitude.size))
    count = np.zeros_like(total)
    for soil, lon, lat in grids:
        rows, columns = np.searchsorted(-latitude, -lat), np.searchsorted(longitude, lon)
        valid = np.isfinite(soil)
        total[np.ix_(rows, columns)] += np.where(valid, soil, 0)
        count[np.ix_(rows, columns)] += valid
    with np.errstate(invalid="ignore"):
        return np.where(count > 0, total / count, np.nan)


def town_values(soil, inside):
    """soilMoisture is the mean of the valid cells in the town; validShare is valid cells / all cells in the town."""
    cells = soil[inside]
    valid = np.isfinite(cells)
    if not valid.any():
        return None, 0
    return round(float(cells[valid].mean()), 3), round(float(valid.mean()), 3)


def town_masks(borders, longitude, latitude):
    masks = {}
    for feature in borders["features"]:
        geometry = shape(feature["geometry"])
        west, south, east, north = geometry.bounds
        rows = np.flatnonzero((latitude >= south) & (latitude <= north))
        columns = np.flatnonzero((longitude >= west) & (longitude <= east))
        inside = np.zeros((latitude.size, longitude.size), bool)
        if rows.size and columns.size:
            lon, lat = np.meshgrid(longitude[columns], latitude[rows])
            inside[np.ix_(rows, columns)] = intersects_xy(geometry, lon, lat)
        masks[feature["properties"]["psgc"]] = inside
    return masks


def main():
    manifest = json.loads((PUBLIC / "manifest.json").read_text())
    windows = manifest["windows"]
    results = earthaccess.search_data(short_name=COLLECTION, bounding_box=tuple(manifest["bounds"]), temporal=(windows[0]["start"], windows[-1]["end"]), count=-1)
    if not results:
        raise SystemExit("No matching SME2 granules. lgus.json is not changed.")
    if not earthaccess.login(persist=False).authenticated:
        raise SystemExit("Earthdata authentication failed. lgus.json is not changed.")
    session = earthaccess.get_fsspec_https_session()
    CACHE.mkdir(parents=True, exist_ok=True)
    granules = sorted((granule["umm"]["GranuleUR"], next(link for link in granule.data_links() if link.endswith(".h5"))) for granule in results)
    with ThreadPoolExecutor(8) as pool:
        grids = list(pool.map(lambda granule: read_grid(*granule, session), granules))

    longitude = np.unique(np.concatenate([lon for _, lon, _ in grids]))
    latitude = np.unique(np.concatenate([lat for _, _, lat in grids]))[::-1]
    by_window = [[] for _ in windows]
    tracks = [{} for _ in windows]
    for (name, _), grid in zip(granules, grids):
        parts = name.split("_")
        index = window_index(f"{parts[11][:4]}-{parts[11][4:6]}-{parts[11][6:8]}", windows)
        if index is not None:
            by_window[index].append(grid)
            tracks[index][parts[5]] = tracks[index].get(parts[5], 0) + 1
    for window, files in zip(windows, tracks):
        print(f"{window['start']} to {window['end']}: {dict(sorted(files.items())) or 'no file'}")

    masks = town_masks(json.loads((PUBLIC / "lgus.geojson").read_text(encoding="utf-8")), longitude, latitude)
    lgus = json.loads((PUBLIC / "lgus.json").read_text(encoding="utf-8"))
    empty = [lgu["name"] for lgu in lgus if not masks[lgu["psgc"]].any()]
    if empty:
        raise SystemExit(f"Towns with no grid cell: {empty}. lgus.json is not changed.")
    values = [[town_values(soil, masks[lgu["psgc"]]) for lgu in lgus] for soil in (combine(files, longitude, latitude) for files in by_window)]
    for town, lgu in enumerate(lgus):
        lgu["soilMoisture"] = [window[town][0] for window in values]
        lgu["validShare"] = [window[town][1] for window in values]
    manifest["generatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    (PUBLIC / "lgus.json").write_text(json.dumps(lgus, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (PUBLIC / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"Wrote {len(lgus)} towns and {len(windows)} windows from {len(granules)} files.")


if __name__ == "__main__":
    main()
