import unittest

import compare_bands


def link(track, stamp, processed, band):
    return f"https://example.test/OPERA_L2_RTC-S1_{track}-129894-IW2_{stamp}T213115Z_{processed}T000000Z_S1D_30_v1.0_{band}.tif"


class NearestTest(unittest.TestCase):
    def test_takes_the_nearest_track_61_date_and_its_newest_version(self):
        urls = [link("T061", "20261007", "20261009", band) for band in ("VV", "VH")]
        urls += [link("T061", "20261013", processed, band) for processed in ("20261015", "20261020") for band in ("VV", "VH", "mask")]
        urls += [link("T069", "20261012", "20261013", band) for band in ("VV", "VH")]
        date, links = compare_bands.nearest(urls, "2026-10-12")
        self.assertEqual(date, "2026-10-13")
        self.assertEqual(links, {"vv": link("T061", "20261013", "20261020", "VV"), "vh": link("T061", "20261013", "20261020", "VH")})

    def test_stops_when_track_61_has_no_file(self):
        with self.assertRaisesRegex(SystemExit, "No Sentinel-1 file"):
            compare_bands.nearest([link("T069", "20261012", "20261013", "VV")], "2026-10-12")


if __name__ == "__main__":
    unittest.main()
