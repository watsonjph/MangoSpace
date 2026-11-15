"""Write rainMm of each target: the NASA GPM rain in the days before each NISAR date."""

import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

import earthaccess

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent / "app/public/data"
CACHE = ROOT / "data/gpm"
# The Late Run daily product. The Final Run is about 3.5 months behind, so it does not have the 2026 dates.
COLLECTION, VERSION = "GPM_3IMERGDL", "07"
# NISAR comes again after 12 days, so 12 days before each date leave no day out and count no day two times.
DAYS = 12
CELL = 0.1
ARCHIVE, OPENDAP = "https://data.gesdisc.earthdata.nasa.gov/data/", "https://gpm1.gesdisc.eosdis.nasa.gov/opendap/"


def cell_index(bounds):
    """The (longitude, latitude) index of the 0.1 degree GPM cell that has the centre of the bounds."""
    west, south, east, north = bounds
    return int(((west + east) / 2 + 180) // CELL), int(((south + north) / 2 + 90) // CELL)


def days_before(day):
    last = date.fromisoformat(day)
    return [str(last - timedelta(offset)) for offset in range(DAYS, 0, -1)]


def parse(text, cells):
    """The rain of each wanted cell from the text answer of the server. Its rows are longitudes, its columns latitudes."""
    lon0, lat0 = min(cell[0] for cell in cells), min(cell[1] for cell in cells)
    rows = [[float(value) for value in line.split(",")[1:]] for line in text.splitlines() if line.startswith("precipitation.precipitation[")]
    rain = {cell: rows[cell[0] - lon0][cell[1] - lat0] for cell in cells}
    if any(value < 0 for value in rain.values()):
        raise SystemExit("The GPM answer has a fill value. targets.json is not changed.")
    return rain


def read_day(day, url, session, cells):
    cached = CACHE / f"{day}.json"
    if not cached.exists():
        lons, lats = [cell[0] for cell in cells], [cell[1] for cell in cells]
        query = f"{url.replace(ARCHIVE, OPENDAP)}.ascii?precipitation[0:0][{min(lons)}:{max(lons)}][{min(lats)}:{max(lats)}]"
        # The server answers 503 when it is busy. A day that is read stays in the cache, so a new run continues.
        for wait in (0, 5, 20, 60):
            time.sleep(wait)
            answer = session.get(query, timeout=120)
            if answer.status_code != 503:
                break
        answer.raise_for_status()
        cached.write_text(json.dumps({f"{lon},{lat}": value for (lon, lat), value in parse(answer.text, cells).items()}))
    return json.loads(cached.read_text())


def rain_before(dates, daily, cell):
    """For each date, the sum of the daily rain of the cell in the DAYS days before it, in mm."""
    key = f"{cell[0]},{cell[1]}"
    return [round(sum(daily[day][key] for day in days_before(day_of_image)), 1) for day_of_image in dates]


def main():
    path = PUBLIC / "targets.json"
    targets = json.loads(path.read_text())
    cells = {target["id"]: cell_index(target["bounds"]) for target in targets}
    wanted = sorted({day for target in targets for image_day in target["nisar"]["dates"] for day in days_before(image_day)})
    results = earthaccess.search_data(short_name=COLLECTION, version=VERSION, temporal=(wanted[0], wanted[-1]), count=-1)
    urls = {}
    for granule in results:
        link = granule.data_links()[0]
        stamp = Path(link).name.split(".")[4][:8]
        urls[f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}"] = link
    missing = [day for day in wanted if day not in urls]
    if missing:
        raise SystemExit(f"No GPM file for {missing}. targets.json is not changed.")
    if not earthaccess.login(persist=False).authenticated:
        raise SystemExit("Earthdata authentication failed. targets.json is not changed.")
    session = earthaccess.get_requests_https_session()
    CACHE.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(2) as pool:
        daily = dict(zip(wanted, pool.map(lambda day: read_day(day, urls[day], session, sorted(set(cells.values()))), wanted)))
    for target in targets:
        target["rainMm"] = rain_before(target["nisar"]["dates"], daily, cells[target["id"]])
        print(target["id"], cells[target["id"]], target["rainMm"])
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(targets, indent=1, ensure_ascii=False) + "\n")
    temporary.replace(path)


if __name__ == "__main__":
    main()
