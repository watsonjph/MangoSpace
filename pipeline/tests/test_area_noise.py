import unittest

import area_noise
from test_targets import LAND, scene


def series_with_one_low_date(dry_rows):
    low = scene()
    low[100 : 100 + dry_rows, 100:200] = LAND
    return [scene()] * 4 + [low] + [scene()] * 4


class AreaNoiseTest(unittest.TestCase):
    def test_same_shore_on_all_dates_is_not_a_change(self):
        result = area_noise.area_noise([scene()] * 3, ["a", "b", "c"])
        self.assertEqual(result["changeKm2"], 0)
        self.assertGreater(result["areaSensitivityKm2"], 0)
        self.assertFalse(result["changeIsLargerThanNoise"])

    def test_a_small_dip_on_one_date_is_larger_than_the_noise(self):
        result = area_noise.area_noise(series_with_one_low_date(5), list("abcdefghi"))
        self.assertEqual(result["lowestDate"], "e")
        self.assertLess(result["changePercent"], 3)
        self.assertLess(result["changeKm2"], result["areaSensitivityKm2"])
        self.assertTrue(result["changeIsLargerThanNoise"])

    def test_losing_half_the_reservoir_is_larger_than_the_noise(self):
        dry = scene()
        dry[100:200, 100:200] = LAND
        result = area_noise.area_noise([scene(), scene(), dry], ["a", "b", "c"])
        self.assertTrue(result["changeIsLargerThanNoise"])


if __name__ == "__main__":
    unittest.main()
