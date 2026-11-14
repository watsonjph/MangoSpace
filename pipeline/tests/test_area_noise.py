import unittest

import area_noise
from test_targets import LAND, scene


class AreaNoiseTest(unittest.TestCase):
    def test_same_shore_on_all_dates_is_not_a_change(self):
        result = area_noise.area_noise([scene()] * 3, ["a", "b", "c"])
        self.assertEqual(result["changeKm2"], 0)
        self.assertGreater(result["noiseKm2"], 0)
        self.assertFalse(result["changeIsLargerThanNoise"])

    def test_losing_half_the_reservoir_is_larger_than_the_noise(self):
        dry = scene()
        dry[100:200, 100:200] = LAND
        result = area_noise.area_noise([scene(), scene(), dry], ["a", "b", "c"])
        self.assertTrue(result["changeIsLargerThanNoise"])


if __name__ == "__main__":
    unittest.main()
