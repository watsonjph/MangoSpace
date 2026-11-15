import unittest

import context

ANSWER = """Dataset: day.nc4
precipitation.lat, 9.85, 9.95, 10.05
precipitation.precipitation[precipitation.time=16972][precipitation.lon=124.35], 1.5, 0, 0.02
precipitation.precipitation[precipitation.time=16972][precipitation.lon=124.45], 0, 0.08, 4.25
"""


class ContextTest(unittest.TestCase):
    def test_cell_of_the_dam_and_the_rice_targets(self):
        self.assertEqual(context.cell_index((124.297, 9.8075, 124.337, 9.8475)), (3043, 998))
        self.assertEqual(context.cell_index((124.4345, 10.0152, 124.4355, 10.0166)), (3044, 1000))

    def test_the_answer_of_the_server_gives_the_rain_of_each_cell(self):
        cells = [(3043, 998), (3044, 1000)]
        self.assertEqual(context.parse(ANSWER, cells), {(3043, 998): 1.5, (3044, 1000): 4.25})
        with self.assertRaisesRegex(SystemExit, "fill value"):
            context.parse(ANSWER.replace("1.5", "-9999.9"), cells)

    def test_rain_is_the_sum_of_the_twelve_days_before_the_date_and_not_the_date(self):
        self.assertEqual(context.days_before("2026-07-08")[0], "2026-06-26")
        self.assertEqual(context.days_before("2026-07-08")[-1], "2026-07-07")
        daily = {day: {"1,2": 2.0} for day in context.days_before("2026-07-08")}
        daily["2026-07-08"] = {"1,2": 100.0}
        self.assertEqual(context.rain_before(["2026-07-08"], daily, (1, 2)), [24.0])


if __name__ == "__main__":
    unittest.main()
