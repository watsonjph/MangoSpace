"""Compare the NISAR soil water with SMAP over Cebu and Bohol, window by window."""

import json
import math
from concurrent.futures import ThreadPoolExecutor

import earthaccess
import numpy as np

import soil

SMAP = "SPL3SMP_E"
CACHE = soil.ROOT / "data/smap"
FILL = -9999.0
# A SMAP cell is compared only if NISAR has data on this share of it or more.
MIN_SHARE = 0.5
PASSES = (("Soil_Moisture_Retrieval_Data_AM", ""), ("Soil_Moisture_Retrieval_Data_PM", "_pm"))
# EASE-Grid 2.0, global, 9 km: the number of columns, the size of a cell, the top edge, and the radius of the Earth.
COLUMNS, CELL_M, TOP_M, EARTH_M = 3856, 9008.055, 7314540.83, 6378137


def grid_slice(bounds):
    """The rows and columns of the 9 km EASE-Grid 2.0 that cover the bounds, with 2 cells more on each side.
    The columns are equal steps of longitude. The rows are equal steps of the sine of the latitude."""
    west, south, east, north = bounds
    column = lambda lon: int((lon + 180) / (360 / COLUMNS))
    row = lambda lat: int((TOP_M - EARTH_M * math.sin(math.radians(lat)) / math.cos(math.radians(30))) / CELL_M)
    return f"[{row(north) - 2}:{row(south) + 2}][{column(west) - 2}:{column(east) + 2}]"


def parse(text):
    """The arrays of a text answer of the server, by the name of the variable."""
    arrays = {}
    for line in text.splitlines():
        if line.startswith("/"):
            name, *values = line.split(",")
            arrays.setdefault(name.split("[")[0].rsplit("/", 1)[1], []).append([float(value) for value in values])
    return {name: np.array(rows) for name, rows in arrays.items()}


def read_smap(name, url, session, bounds):
    """The SMAP soil water readings inside the bounds, as rows of (latitude, longitude, soil water).
    Only the cells of the region are asked from the server; a full file is 660 MB."""
    cached = CACHE / f"{name}.npy"
    if not cached.exists():
        west, south, east, north = bounds
        cells = grid_slice(bounds)
        wanted = ";".join(f"/{group}/{variable}{suffix}{cells}" for group, suffix in PASSES for variable in ("soil_moisture", "latitude", "longitude"))
        answer = session.get(f"{url}.dap.csv", params={"dap4.ce": wanted}, timeout=300)
        answer.raise_for_status()
        arrays = parse(answer.text)
        readings = []
        for _, suffix in PASSES:
            lat, lon, water = (arrays[f"{variable}{suffix}"] for variable in ("latitude", "longitude", "soil_moisture"))
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
    session = earthaccess.get_requests_https_session()
    CACHE.mkdir(parents=True, exist_ok=True)
    granules = sorted(
        (granule["umm"]["GranuleUR"].split(".h5")[0], next(link["URL"] for link in granule["umm"]["RelatedUrls"] if "opendap" in link["URL"]))
        for granule in results
    )
    with ThreadPoolExecutor(4) as pool:
        days = list(pool.map(lambda granule: read_smap(*granule, session, bounds), granules))
    smap_days = [[] for _ in windows]
    for (name, _), readings in zip(granules, days):
        stamp = name.split("_")[5]
        index = soil.window_index(f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}", windows)
        if index is not None and len(readings):
            smap_days[index].append(readings)

    lats = sorted({cell[0] for readings in days for cell in cell_means(readings)})
    half_lat = float(np.median(np.diff(lats))) / 2 if len(lats) > 1 else 0.04
    half_lon = 360 / 3856 / 2
    # Only the cells of the towns of Cebu and Bohol: the bounds also have parts of Negros and Leyte.
    masks = soil.town_masks(json.loads((soil.PUBLIC / "lgus.geojson").read_text(encoding="utf-8")), longitude, latitude)
    towns = np.any(list(masks.values()), axis=0)
    pairs, by_window, means = [], [], []
    for window, files, readings in zip(windows, nisar_files, smap_days):
        nisar = np.where(towns, soil.combine(files, longitude, latitude), np.nan)
        smap = cell_means(np.concatenate(readings)) if readings else {}
        found = [(value, water) for cell, water in smap.items() if (value := nisar_in_cell(nisar, longitude, latitude, cell, half_lat, half_lon)) is not None]
        pairs += found
        by_window.append({"window": window["start"], "smapCells": len(smap), **(compare(found) if len(found) > 1 else {"pairs": len(found)})})
    if not pairs:
        raise SystemExit(f"No SMAP cell has a reading and NISAR coverage. SMAP cells by window: {by_window}")
    means = [(row["nisarMean"], row["smapMean"]) for row in by_window if "nisarMean" in row]
    result = {"product": SMAP, "all": compare(pairs), "correlationOfWindowMeans": round(float(np.corrcoef(*np.array(means).T)[0, 1]), 2), "windows": by_window}
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
