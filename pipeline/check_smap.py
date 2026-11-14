"""Compare the NISAR soil water with SMAP over Cebu and Bohol, window by window."""

import json
from concurrent.futures import ThreadPoolExecutor

import earthaccess
import h5py
import numpy as np

import soil

SMAP = "SPL3SMP_E"
CACHE = soil.ROOT / "data/smap"
FILL = -9999.0
# A SMAP cell is compared only if NISAR has data on this share of it or more.
MIN_SHARE = 0.5
PASSES = (("Soil_Moisture_Retrieval_Data_AM", ""), ("Soil_Moisture_Retrieval_Data_PM", "_pm"))


def region_rows(session, url, bounds):
    """The rows of the SMAP grid that cross the bounds. Each row is one latitude and the grid is the same in
    all files, so one file gives the rows for all of them."""
    with session.open(url, block_size=1024 * 1024, cache_type="blockcache") as file, h5py.File(file, "r") as product:
        latitude = product[PASSES[0][0]]["latitude"][:]
    rows = np.flatnonzero(np.any((latitude >= bounds[1]) & (latitude <= bounds[3]), axis=1))
    if not rows.size:
        raise SystemExit("The SMAP file has no reading in the latitudes of the bounds.")
    # One row more on each side, for a day with no reading in the first or the last row.
    return int(rows[0]) - 1, int(rows[-1]) + 2


def read_smap(name, url, session, bounds, rows):
    """The SMAP soil water readings inside the bounds, as rows of (latitude, longitude, soil water)."""
    cached = CACHE / f"{name}.npy"
    if not cached.exists():
        west, south, east, north = bounds
        band = slice(*rows)
        readings = []
        with session.open(url, block_size=256 * 1024, cache_type="blockcache") as file, h5py.File(file, "r") as product:
            for group, suffix in PASSES:
                data = product[group]
                lat, lon, water = data[f"latitude{suffix}"][band], data[f"longitude{suffix}"][band], data[f"soil_moisture{suffix}"][band]
                keep = (water != FILL) & (lat >= south) & (lat <= north) & (lon >= west) & (lon <= east)
                readings.append(np.column_stack([lat[keep], lon[keep], water[keep]]))
        np.save(cached, np.concatenate(readings))
        print(f"{name}: read", flush=True)
    return np.load(cached)


def cell_means(readings):
    """The mean SMAP soil water of each grid cell, keyed by the (latitude, longitude) of its centre."""
    cells = {}
    for lat, lon, water in readings:
        cells.setdefault((round(float(lat), 4), round(float(lon), 4)), []).append(water)
    return {cell: float(np.mean(values)) for cell, values in cells.items()}


def nisar_in_cell(nisar, longitude, latitude, cell, half_lat, half_lon):
    """The mean NISAR soil water inside one SMAP cell, or None if NISAR covers less than MIN_SHARE of it."""
    lat, lon = cell
    rows = np.flatnonzero(np.abs(latitude - lat) <= half_lat)
    columns = np.flatnonzero(np.abs(longitude - lon) <= half_lon)
    values = nisar[np.ix_(rows, columns)]
    valid = np.isfinite(values)
    if not values.size or valid.mean() < MIN_SHARE:
        return None
    return float(values[valid].mean())


def compare(pairs):
    nisar, smap = np.array(pairs).T
    difference = nisar - smap
    return {
        "pairs": len(pairs),
        "nisarMean": round(float(nisar.mean()), 3),
        "smapMean": round(float(smap.mean()), 3),
        "meanDifference": round(float(difference.mean()), 3),
        "rmsDifference": round(float(np.sqrt((difference**2).mean())), 3),
        "correlation": round(float(np.corrcoef(nisar, smap)[0, 1]), 2),
    }


def main():
    manifest = json.loads((soil.PUBLIC / "manifest.json").read_text())
    windows, bounds = manifest["windows"], tuple(manifest["bounds"])
    grids = {path.stem: tuple(np.load(path)[key] for key in ("soil", "longitude", "latitude")) for path in sorted(soil.CACHE.glob("*.npz"))}
    if not grids:
        raise SystemExit("Run soil.py first: no NISAR grids in pipeline/data/sme2-grids.")
    longitude = np.unique(np.concatenate([grid[1] for grid in grids.values()]))
    latitude = np.unique(np.concatenate([grid[2] for grid in grids.values()]))[::-1]
    nisar_files = [[] for _ in windows]
    for name, grid in grids.items():
        stamp = name.split("_")[11]
        index = soil.window_index(f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}", windows)
        if index is not None:
            nisar_files[index].append(grid)

    results = earthaccess.search_data(short_name=SMAP, temporal=(windows[0]["start"], windows[-1]["end"]), bounding_box=bounds, count=-1)
    if not earthaccess.login(persist=False).authenticated:
        raise SystemExit("Earthdata authentication failed.")
    session = earthaccess.get_fsspec_https_session()
    CACHE.mkdir(parents=True, exist_ok=True)
    granules = sorted((granule["umm"]["GranuleUR"].split(".h5")[0], granule.data_links()[0]) for granule in results)
    rows_file = CACHE / "rows.json"
    if not rows_file.exists():
        rows_file.write_text(json.dumps(region_rows(session, granules[0][1], bounds)))
    rows = json.loads(rows_file.read_text())
    with ThreadPoolExecutor(8) as pool:
        days = list(pool.map(lambda granule: read_smap(*granule, session, bounds, rows), granules))
    smap_days = [[] for _ in windows]
    for (name, _), readings in zip(granules, days):
        stamp = name.split("_")[5]
        index = soil.window_index(f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}", windows)
        if index is not None and len(readings):
            smap_days[index].append(readings)

    lats = sorted({cell[0] for readings in days for cell in cell_means(readings)})
    half_lat = float(np.median(np.diff(lats))) / 2 if len(lats) > 1 else 0.04
    half_lon = 360 / 3856 / 2
    pairs, by_window = [], []
    for window, files, readings in zip(windows, nisar_files, smap_days):
        nisar = soil.combine(files, longitude, latitude)
        smap = cell_means(np.concatenate(readings)) if readings else {}
        found = [(value, water) for cell, water in smap.items() if (value := nisar_in_cell(nisar, longitude, latitude, cell, half_lat, half_lon)) is not None]
        pairs += found
        by_window.append({"window": window["start"], "smapCells": len(smap), "pairs": len(found)})
    if not pairs:
        raise SystemExit(f"No SMAP cell has a reading and NISAR coverage. SMAP cells by window: {by_window}")
    print(json.dumps({"product": SMAP, "all": compare(pairs), "windows": by_window}, indent=1))


if __name__ == "__main__":
    main()
