import unittest

import numpy as np

import check_smap

LONGITUDE = np.array([124.00, 124.02, 124.04, 124.06])
LATITUDE = np.array([10.06, 10.04, 10.02, 10.00])


class SmapCheckTest(unittest.TestCase):
    def test_smap_readings_of_one_cell_are_averaged(self):
        readings = np.array([[10.0, 124.0, 0.30], [10.0, 124.0, 0.20], [10.1, 124.0, 0.40]])
        self.assertEqual(check_smap.cell_means(readings), {(10.0, 124.0): 0.25, (10.1, 124.0): 0.40})

    def test_nisar_mean_inside_a_smap_cell_needs_half_coverage(self):
        nisar = np.full((4, 4), np.nan)
        nisar[:2, :2] = [[0.2, 0.4], [0.3, np.nan]]
        self.assertAlmostEqual(check_smap.nisar_in_cell(nisar, LONGITUDE, LATITUDE, (10.05, 124.01), 0.011, 0.011), 0.3)
        self.assertIsNone(check_smap.nisar_in_cell(nisar, LONGITUDE, LATITUDE, (10.03, 124.03), 0.031, 0.031))
        self.assertIsNone(check_smap.nisar_in_cell(nisar, LONGITUDE, LATITUDE, (20.0, 124.0), 0.011, 0.011))

    def test_grid_slice_covers_the_region_and_the_answer_is_parsed_by_variable(self):
        self.assertEqual(check_smap.grid_slice((123.2, 9.4, 124.7, 11.4)), "[648:680][3245:3265]")
        text = "Dataset: day.h5\n/Soil_Moisture_Retrieval_Data_AM/soil_moisture[0], 0.25, -9999\n/Soil_Moisture_Retrieval_Data_AM/soil_moisture[1], 0.5, 0.75\n/Soil_Moisture_Retrieval_Data_PM/latitude_pm[0], 10.5, 10.5\n"
        arrays = check_smap.parse(text)
        self.assertEqual(arrays["soil_moisture"].tolist(), [[0.25, -9999.0], [0.5, 0.75]])
        self.assertEqual(arrays["latitude_pm"].tolist(), [[10.5, 10.5]])

    def test_difference_numbers_on_known_pairs(self):
        result = check_smap.compare([(0.30, 0.20), (0.40, 0.30), (0.20, 0.25)])
        self.assertEqual(result["pairs"], 3)
        self.assertEqual(result["meanDifference"], 0.05)
        self.assertEqual(result["rmsDifference"], round(float(np.sqrt((0.01 + 0.01 + 0.0025) / 3)), 3))
        self.assertEqual((result["nisarMean"], result["smapMean"]), (0.3, 0.25))


if __name__ == "__main__":
    unittest.main()
