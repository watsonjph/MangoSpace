# Sc-43 HyP3 submission

The public ASF search found these full-target-coverage GRD_HD IW scenes on
Sentinel-1 relative track 61, descending, VV+VH:

| Period | Target | Scenes |
| --- | --- | ---: |
| October 2015 through May 2016 | Malinao Dam | 19 |
| October 2023 through May 2024 | Malinao Dam | 18 |
| June 2026 through 14 November 2026 00:00 UTC | Ubay and Pilar rice | 15 |

The 52 jobs use HyP3 Basic RTC, 30 m, gamma0, linear power. All scenes use
one relative track and direction. The rice search requires each scene to
cover both target boxes. At submission, those boxes were provisional pending
sc-132. Rerunning the search uses the current bounds in `targets.json`, so its
results may differ from the recorded submission. The dam search used the
corrected reservoir bounds available at submission.
Future November acquisitions are not included.

From `pipeline/`:

```sh
uv run python plan_hyp3.py
uv run python submit_hyp3.py
uv run python submit_hyp3.py --submit
```

The last command prompts for Earthdata credentials in your terminal, prints
available Basic credits, and submits the jobs. It stores job IDs and statuses
in ignored `pipeline/data/hyp3/jobs.json`. Do not run two submitters at once.
On a restart with the same Earthdata account, it queries existing jobs by the
stable job name and skips scenes
already submitted, including failed jobs. Review failures before resubmitting.
Credentials are not written to the repository.

The original Saturday noon submission deadline has passed. Leave that
acceptance item incomplete and record the actual submission time in Shortcut.

References: [HyP3 authentication](https://hyp3-docs.asf.alaska.edu/using/authentication/)
and [RTC product guide](https://hyp3-docs.asf.alaska.edu/products/rtc/).

## Submission result

All 52 planned jobs were submitted on 14 November 2026 at 16:26 PHT.
See [the submission receipt](sc-43-submission.md) for scene names and job IDs.
The receipt records submission, not current processing status. Main now
includes downstream dam-history outputs and the dam job IDs in
`pipeline/history_jobs.json`. This receipt does not verify completion of all
52 jobs.
