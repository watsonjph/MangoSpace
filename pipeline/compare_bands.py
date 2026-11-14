"""Write one Sentinel-1 (C-band) image pair of each rice target for the date nearest a NISAR (L-band) date."""

import argparse
import json
from datetime import date, timedelta
from pathlib import Path

import earthaccess
import rasterio

import history
import targets

TRACK = "T061"


def nearest(urls, nisar_date):
    """The VV and VH links of the track 61 file that is nearest in time to the NISAR date."""
    def day(url):
        stamp = Path(url).name.split("_")[4]
        return date(int(stamp[:4]), int(stamp[4:6]), int(stamp[6:8]))

    track = [url for url in urls if f"_{TRACK}-" in url]
    if not track:
        raise SystemExit(f"No Sentinel-1 file on track {TRACK} near {nisar_date}.")
    best = min((abs(day(url) - date.fromisoformat(nisar_date)), day(url)) for url in track)[1]
    newest = sorted(url for url in track if day(url) == best)
    # The newest-version pick below sorts by name, which is only right inside one burst.
    bursts = sorted({Path(url).name.split("_")[3] for url in newest})
    if len(bursts) > 1:
        raise SystemExit(f"{best} has more than one burst on track {TRACK}: {bursts}. targets.json is not changed.")
    return best.isoformat(), {band: [url for url in newest if url.endswith(f"_{band.upper()}.tif")][-1] for band in ("vv", "vh")}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("nisar_date", help="A NISAR date of the rice targets, for example 2026-10-12.")
    nisar_date = parser.parse_args().nisar_date
    path = targets.PUBLIC / "targets.json"
    entries = {entry["id"]: entry for entry in json.loads(path.read_text())}
    rice = [spec for spec in targets.TARGETS.values() if spec.kind == "rice"]
    for spec in rice:
        if nisar_date not in entries[spec.id]["nisar"]["dates"]:
            raise SystemExit(f"{nisar_date} is not a NISAR date of {spec.id}. targets.json is not changed.")
    if not earthaccess.login(persist=False).authenticated:
        raise SystemExit("Earthdata authentication failed. targets.json is not changed.")
    day = date.fromisoformat(nisar_date)
    pngs, updates = {}, {}
    for spec in rice:
        results = earthaccess.search_data(short_name=history.OPERA, bounding_box=spec.bounds, temporal=(str(day - timedelta(6)), str(day + timedelta(6))), count=-1)
        s1_date, links = nearest([link for granule in results for link in granule.data_links()], nisar_date)
        db = {}
        earthaccess.download(list(links.values()), history.CACHE / "opera")
        for band, link in links.items():
            with rasterio.open(history.CACHE / "opera" / Path(link).name) as image:
                db[band] = targets.reproject_to_db(image.read(1), image.transform, image.crs.to_epsg(), spec.bounds, spec.size)
        targets.check_coverage(db, f"{spec.id} {s1_date}")
        images = {band: f"targets/{spec.id}-s1-{s1_date}-{band}.png" for band in db}
        pngs |= {images[band]: values for band, values in db.items()}
        updates[spec.id] = {"cBand": {"date": s1_date, "nisarDate": nisar_date, "images": images, "meanDb": {band: targets.mean_hv_db(values) for band, values in db.items()}}}
        index = entries[spec.id]["nisar"]["dates"].index(nisar_date)
        print(f"{spec.id}: NISAR {nisar_date} mean HV {entries[spec.id]['nisar']['meanHvDb'][index]} dB; Sentinel-1 {s1_date} mean dB {updates[spec.id]['cBand']['meanDb']}")
    # Write only after every target is read, so a failure leaves no half-written run.
    for image, values in pngs.items():
        targets.write_png(targets.PUBLIC / image, targets.to_grey(values))
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(targets.update_targets(path, updates))
    temporary.replace(path)
    print(f"Wrote cBand of {', '.join(updates)} to {path}")


if __name__ == "__main__":
    main()
