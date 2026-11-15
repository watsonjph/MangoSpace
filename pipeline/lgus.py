"""Write the town borders (lgus.geojson) and the town list with the 2024 population (lgus.json)."""

import csv
import json
from pathlib import Path
from urllib.request import urlretrieve

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent / "app/public/data"
RAW = ROOT / "data/lgus"

# Borders: NAMRIA and PSA through OCHA COD-AB (CC BY-IGO), with PSGC 3Q 2026 codes, 1% of the vertices.
# Both sources are pinned to a tag, so a new PSA quarter does not change our files.
BORDERS = "https://raw.githubusercontent.com/faeldon/philippines-json-maps/v1.1.1/latest/geojson/provdists/medres/municities-provdist-{}.0.01.json"
PROVINCES = {"Cebu": 702200000, "Bohol": 701200000}
# The PSA PSGC publication of the same quarter as the borders. It has the 2024 census (POPCEN 2024).
PSGC = "https://raw.githubusercontent.com/faeldon/philippines-psgc-shapefiles/v1.0.1/data/psgc/2026-3q/psgc.csv"


def fetch(url):
    path = RAW / url.rsplit("/", 1)[1]
    if not path.exists():
        RAW.mkdir(parents=True, exist_ok=True)
        urlretrieve(url, path)
    return path


def round_coordinates(value):
    # 5 decimals is about 1 m. The source has 15, which makes the file three times as large.
    if not isinstance(value, list):
        return round(value, 5)
    return [round_coordinates(item) for item in value]


def build(borders_by_province, population_by_psgc, windows, existing):
    """Return (geojson, lgus). A town that is already in `existing` keeps its soil water and its rank."""
    features, lgus = [], []
    for province, borders in borders_by_province.items():
        for feature in borders["features"]:
            psgc = f"{feature['properties']['adm3_psgc']:010d}"
            name = feature["properties"]["adm3_en"]
            features.append({
                "type": "Feature",
                "properties": {"psgc": psgc, "name": name},
                "geometry": {"type": feature["geometry"]["type"], "coordinates": round_coordinates(feature["geometry"]["coordinates"])},
            })
            old = existing.get(psgc, {})
            lgus.append({
                "psgc": psgc,
                "name": name,
                "province": province,
                "population": population_by_psgc[psgc],
                "soilMoisture": old.get("soilMoisture", [None] * windows),
                "validShare": old.get("validShare", [0] * windows),
                "rank": old.get("rank"),
            })
    lgus.sort(key=lambda lgu: (lgu["province"], lgu["name"]))
    return {"type": "FeatureCollection", "features": features}, lgus


def main():
    borders = {province: json.loads(fetch(BORDERS.format(code)).read_text(encoding="utf-8")) for province, code in PROVINCES.items()}
    with fetch(PSGC).open(encoding="utf-8-sig", newline="") as file:
        population = {row["10-digit PSGC"]: int(row["2024 Population"]) for row in csv.DictReader(file) if row["2024 Population"].isdigit()}
    windows = len(json.loads((PUBLIC / "manifest.json").read_text())["windows"])
    existing = {lgu["psgc"]: lgu for lgu in json.loads((PUBLIC / "lgus.json").read_text(encoding="utf-8"))}
    geojson, lgus = build(borders, population, windows, existing)
    (PUBLIC / "lgus.geojson").write_text(json.dumps(geojson, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    (PUBLIC / "lgus.json").write_text(json.dumps(lgus, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(lgus)} towns, {sum(lgu['population'] for lgu in lgus):,} people in 2024")


if __name__ == "__main__":
    main()
