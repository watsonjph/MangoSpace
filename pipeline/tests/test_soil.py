import unittest

import numpy as np

import soil

LONGITUDE = np.array([124.0, 124.1, 124.2, 124.3], "float32")
LATITUDE = np.array([10.2, 10.1, 10.0], "float32")
WINDOWS = [{"start": "2026-06-21", "end": "2026-07-03"}, {"start": "2026-07-03", "end": "2026-07-15"}]
SQUARE = {"type": "FeatureCollection", "features": [{"properties": {"psgc": "town"}, "geometry": {"type": "Polygon", "coordinates": [[[123.95, 9.95], [124.15, 9.95], [124.15, 10.15], [123.95, 10.15], [123.95, 9.95]]]}}]}


class SoilTest(unittest.TestCase):
    def test_town_average_on_a_small_grid_with_known_values(self):
        west = (np.array([[0.2, 0.4], [np.nan, 0.3], [0.1, np.nan]], "float32"), LONGITUDE[:2], LATITUDE)
        east = (np.array([[0.6, 0.5], [0.5, 0.5]], "float32"), LONGITUDE[1:3], LATITUDE[1:])
        combined = soil.combine([west, east], LONGITUDE, LATITUDE)
        np.testing.assert_allclose(combined, [[0.2, 0.4, np.nan, np.nan], [np.nan, 0.45, 0.5, np.nan], [0.1, 0.5, 0.5, np.nan]], rtol=1e-6)
        inside = soil.town_masks(SQUARE, LONGITUDE, LATITUDE)["town"]
        self.assertEqual(inside.sum(), 4)
        self.assertEqual(soil.town_values(combined, inside), (0.35, 0.75))

    def test_a_town_with_no_valid_cell_is_null_with_zero_share(self):
        inside = soil.town_masks(SQUARE, LONGITUDE, LATITUDE)["town"]
        self.assertEqual(soil.town_values(soil.combine([], LONGITUDE, LATITUDE), inside), (None, 0))

    def test_a_file_goes_to_the_window_that_has_its_start_day(self):
        self.assertEqual([soil.window_index(date, WINDOWS) for date in ("2026-06-20", "2026-06-21", "2026-07-02", "2026-07-03", "2026-07-15", "2026-07-16")], [None, 0, 0, 1, 1, None])


if __name__ == "__main__":
    unittest.main()
