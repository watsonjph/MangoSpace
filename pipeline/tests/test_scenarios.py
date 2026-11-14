import json
import unittest

import scenarios
import targets

EVENT = {
    "event": "2015–16",
    "dates": ["2015-10-10", "2015-11-03", "2015-11-27", "2015-12-09", "2016-02-07", "2016-05-13", "2016-06-01"],
    "waterAreaKm2": [1.2, 0.9, 1.1, 0.8, 0.6, 0.5, 0.7],
}


class ScenarioTest(unittest.TestCase):
    def test_a_month_with_no_image_stops_instead_of_cutting_the_line_short(self):
        with self.assertRaisesRegex(SystemExit, "no image in month 01"):
            scenarios.scenario(EVENT, "2026-11-05", 0.8)

    def test_continues_into_the_next_year_and_stops_in_may(self):
        full = {**EVENT, "dates": EVENT["dates"][1:4] + ["2016-01-02", "2016-02-07", "2016-03-02", "2016-04-07", "2016-05-13", "2016-06-01"], "waterAreaKm2": [0.9, 1.1, 0.8, 0.7, 0.6, 0.6, 0.5, 0.5, 0.9]}
        line = scenarios.scenario(full, "2026-11-05", 0.8)
        self.assertEqual(line["label"], "If 2015–16 repeats")
        self.assertEqual(line["basedOn"], "2015–16")
        self.assertEqual(line["months"], ["2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"])
        self.assertEqual(line["waterAreaKm2"], [0.8, 0.64, 0.56, 0.48, 0.48, 0.4, 0.4])

    def test_an_event_with_no_image_in_the_starting_month_stops(self):
        with self.assertRaisesRegex(SystemExit, "no image in month 11"):
            scenarios.scenario({**EVENT, "dates": EVENT["dates"][:1], "waterAreaKm2": [1.2]}, "2026-11-05", 0.8)

    def test_the_committed_scenarios_match_the_committed_history(self):
        dam = next(entry for entry in json.loads((targets.PUBLIC / "targets.json").read_text()) if entry["id"] == targets.TARGET)
        last_date, last_area = dam["nisar"]["dates"][-1], dam["nisar"]["waterAreaKm2"][-1]
        self.assertEqual(dam["scenarios"], [scenarios.scenario(event, last_date, last_area) for event in dam["history"]])


if __name__ == "__main__":
    unittest.main()
