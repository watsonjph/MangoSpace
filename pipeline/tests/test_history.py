import unittest

import numpy as np

import history
import targets
from test_targets import RESERVOIR

LAND, WATER = -9.0, -20.0


def scene():
    vv = np.full((targets.SIZE, targets.SIZE), LAND)
    vv[RESERVOIR] = WATER
    return vv


def area(water):
    return round(float(water.sum() * targets.PIXEL_KM2), 3)


class HistoryWaterTest(unittest.TestCase):
    def test_area_follows_a_shore_that_moves_out_and_in(self):
        full = scene()
        full[RESERVOIR[0], 300:400] = WATER
        low = scene()
        low[RESERVOIR[0], 200:300] = LAND
        areas = [area(water) for water in history.water_by_date([full, scene(), low])]
        np.testing.assert_allclose(areas, [pixels * targets.PIXEL_KM2 for pixels in (30_000, 20_000, 10_000)], atol=0.005)

    def test_a_dark_dry_field_that_does_not_touch_the_reservoir_is_not_water(self):
        field = scene()
        field[300:400, 100:300] = WATER
        water = history.water_by_date([field, scene(), scene()])[0]
        self.assertFalse(water[300:400].any())
        self.assertAlmostEqual(area(water), 20_000 * targets.PIXEL_KM2, delta=0.005)

    def test_a_bright_wind_patch_inside_the_water_is_water(self):
        windy = scene()
        windy[140:160, 180:220] = LAND
        self.assertAlmostEqual(area(history.water_by_date([windy, scene(), scene()])[0]), 20_000 * targets.PIXEL_KM2, delta=0.005)


if __name__ == "__main__":
    unittest.main()
