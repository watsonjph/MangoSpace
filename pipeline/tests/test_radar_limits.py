import unittest

from radar_limits import radar_cue, to_db


class RadarCueTest(unittest.TestCase):
    def test_contract_scale(self):
        self.assertEqual(to_db(0), -30)
        self.assertEqual(to_db(255), 0)
        self.assertEqual(to_db(170), -10)

    def test_rejects_values_outside_byte_domain(self):
        for value in (-1, 256, 100.0, True, None, "100"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                radar_cue(value, 100)
            with self.subTest(value=value), self.assertRaises(ValueError):
                radar_cue(100, value)

    def test_clipped_or_missing_pixels_are_not_sure(self):
        for edge in (0, 255):
            self.assertEqual(radar_cue(edge, 100), "not_sure")
            self.assertEqual(radar_cue(100, edge), "not_sure")

    def test_provisional_amplitude_cues(self):
        self.assertEqual(radar_cue(85, 68), "dark")
        self.assertEqual(radar_cue(170, 119), "vegetation")
        self.assertEqual(radar_cue(238, 204), "bright")

    def test_bright_hh_with_plant_like_hv_is_ambiguous(self):
        self.assertEqual(radar_cue(238, 119), "not_sure")

    def test_boundaries_do_not_leak_into_neighboring_cues(self):
        self.assertEqual(radar_cue(128, 68), "not_sure")
        self.assertEqual(radar_cue(204, 153), "vegetation")
        self.assertEqual(radar_cue(205, 153), "not_sure")


if __name__ == "__main__":
    unittest.main()
