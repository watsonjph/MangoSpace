"""Submit the sc-43 track-61 RTC plan, reusing jobs already submitted."""

import argparse
import json
from pathlib import Path

from hyp3_sdk import HyP3


DIRECTORY = Path(__file__).resolve().parent / "data/hyp3"
NAME = "mangospace-sc-43-rtc-track61-v1"


def select_scenes(candidates):
    selected = {}
    for period, scenes in candidates.items():
        matches = [scene for scene in scenes if scene["pathNumber"] == 61
                   and scene["flightDirection"] == "DESCENDING" and scene["polarization"] == "VV+VH"]
        if not matches:
            raise ValueError(f"No compatible scenes for {period}")
        for scene in matches:
            selected[scene["sceneName"]] = scene
    return sorted(selected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--submit", action="store_true", help="Authenticate and submit jobs to HyP3 Basic")
    args = parser.parse_args()
    scenes = select_scenes(json.loads((DIRECTORY / "candidates.json").read_text()))
    print(f"Plan: {len(scenes)} RTC jobs; track 61 descending; VV+VH; 30 m gamma0 power.", flush=True)
    if not args.submit:
        print("Run with --submit to enter Earthdata credentials locally and submit.")
        return
    client = HyP3(prompt="password")
    print(f"Available HyP3 Basic credits: {client.check_credits()}", flush=True)
    existing = list(client.find_jobs(name=NAME, job_type="RTC_GAMMA"))
    known = {granule for job in existing for granule in job.job_parameters["granules"]}
    destination = DIRECTORY / "jobs.json"
    destination.write_text(json.dumps([job.to_dict() for job in existing], indent=2))
    for scene in scenes:
        if scene in known:
            print(f"Already submitted: {scene}", flush=True)
            continue
        batch = client.submit_rtc_job(scene, name=NAME, resolution=30, radiometry="gamma0", scale="power")
        for job in batch:
            existing.append(job)
            print(f"Submitted {job.job_id}: {scene}", flush=True)
        destination.write_text(json.dumps([job.to_dict() for job in existing], indent=2))
        known.add(scene)
    print(f"Job records saved to {destination}. Failed jobs are not automatically resubmitted.")


if __name__ == "__main__":
    main()
