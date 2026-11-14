"""Write the "if it repeats" scenario lines of Malinao Dam. A scenario is not a forecast."""

import json
from statistics import mean

import targets


def month_after(month):
    year, number = int(month[:4]), int(month[5:7])
    return f"{year + number // 12}-{number % 12 + 1:02d}"


def scenario(event, last_date, last_area):
    """Apply the % change of a past event, month by month to May, to the last measured area.
    Sentinel-1 and NISAR give different areas in km2, so only the ratio goes from one sensor to the other."""
    by_month = {}
    for date, area in zip(event["dates"], event["waterAreaKm2"], strict=True):
        by_month.setdefault(date[5:7], []).append(area)
    past = {month: mean(areas) for month, areas in by_month.items()}
    start = last_date[5:7]
    if start not in past:
        raise SystemExit(f"{event['event']} has no image in month {start}. targets.json is not changed.")
    months, areas, month = [], [], last_date[:7]
    while True:
        if month[5:7] not in past:
            raise SystemExit(f"{event['event']} has no image in month {month[5:7]}. targets.json is not changed.")
        months.append(month)
        areas.append(round(last_area * past[month[5:7]] / past[start], 3))
        if month[5:7] == "05":
            break
        month = month_after(month)
    return {"label": f"If {event['event']} repeats", "basedOn": event["event"], "months": months, "waterAreaKm2": areas}


def main():
    path = targets.PUBLIC / "targets.json"
    dam = next(entry for entry in json.loads(path.read_text()) if entry["id"] == targets.TARGET)
    last_date, last_area = dam["nisar"]["dates"][-1], dam["nisar"]["waterAreaKm2"][-1]
    scenarios = [scenario(event, last_date, last_area) for event in dam["history"]]
    path.write_text(targets.update_targets(path, {targets.TARGET: {"scenarios": scenarios}}))
    for line in scenarios:
        print(line)


if __name__ == "__main__":
    main()
