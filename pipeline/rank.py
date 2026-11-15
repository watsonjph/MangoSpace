"""Fill the rank of each town in lgus.json. The rank says "look at these towns first"; it is not a risk score."""

import json
import math

from soil import PUBLIC

MIN_SHARE = 0.5
TOP = 10
# The drying speed is the fall of the soil water over this number of 12-day windows.
SPAN = 3
PARTS = ("dryness", "dryingSpeed", "people")


def scaled(values):
    """0 for the lowest value and 1 for the highest."""
    low, high = min(values), max(values)
    return [0.0 if high == low else (value - low) / (high - low) for value in values]


def now_window(lgus):
    """The latest window in which the most towns have data on half of their area or more.
    A window with no pass over one island would leave that island out of the rank."""
    counts = [sum(share >= MIN_SHARE for share in shares) for shares in zip(*(lgu["validShare"] for lgu in lgus))]
    return max(range(len(counts)), key=lambda index: (counts[index], index))


def order(parts, weights):
    scores = [sum(part[name] * weights[name] for name in PARTS) / sum(weights.values()) for part in parts]
    return sorted(range(len(parts)), key=lambda index: -scores[index])


def ranks(lgus):
    """The rank of each town, or None for a town with data on less than half of its area in the window of the rank or SPAN windows before it."""
    now = now_window(lgus)
    then = now - SPAN
    if then < 0:
        raise SystemExit(f"The rank needs {SPAN} windows before window {now}. lgus.json is not changed.")
    ranked = [
        lgu for lgu in lgus
        if min(lgu["validShare"][now], lgu["validShare"][then]) >= MIN_SHARE and None not in (lgu["soilMoisture"][now], lgu["soilMoisture"][then])
    ]
    if not ranked:
        return {lgu["psgc"]: None for lgu in lgus}
    dryness = scaled([-lgu["soilMoisture"][now] for lgu in ranked])
    speed = scaled([lgu["soilMoisture"][then] - lgu["soilMoisture"][now] for lgu in ranked])
    # The largest city has 400 times the people of the smallest town, so the scale is the logarithm.
    people = scaled([math.log10(lgu["population"]) for lgu in ranked])
    parts = [dict(zip(PARTS, (round(value, 3) for value in values))) for values in zip(dryness, speed, people)]
    base = order(parts, dict.fromkeys(PARTS, 1))
    top = set(base[:TOP])
    for name in PARTS:
        top &= set(order(parts, {**dict.fromkeys(PARTS, 1), name: 2})[:TOP])
    result = {lgu["psgc"]: None for lgu in lgus}
    for position, index in enumerate(base, start=1):
        result[ranked[index]["psgc"]] = {"position": position, "of": len(ranked), "stable": index in top, "parts": parts[index]}
    return result


def main():
    path = PUBLIC / "lgus.json"
    lgus = json.loads(path.read_text(encoding="utf-8"))
    result = ranks(lgus)
    for lgu in lgus:
        lgu["rank"] = result[lgu["psgc"]]
    path.write_text(json.dumps(lgus, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    manifest = json.loads((PUBLIC / "manifest.json").read_text())
    window = manifest["windows"][now_window(lgus)]
    listed = sorted((lgu for lgu in lgus if lgu["rank"]), key=lambda lgu: lgu["rank"]["position"])
    print(f"Window of the rank: {window['start']} to {window['end']}. {len(listed)} of {len(lgus)} towns ranked.")
    for lgu in listed[:TOP]:
        print(lgu["rank"]["position"], lgu["name"], lgu["province"], lgu["rank"]["parts"], "stable" if lgu["rank"]["stable"] else "not stable")
    print("Not ranked:", [lgu["name"] for lgu in lgus if not lgu["rank"]])


if __name__ == "__main__":
    main()
