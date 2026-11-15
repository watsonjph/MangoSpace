import unittest

import lgus


def borders(code, name):
    return {"features": [{
        "properties": {"adm3_psgc": code, "adm3_en": name},
        "geometry": {"type": "Polygon", "coordinates": [[[123.123456789, 10.0], [123.2, 10.0], [123.2, 10.1], [123.123456789, 10.0]]]},
    }]}


class BuildTest(unittest.TestCase):
    def setUp(self):
        self.geojson, self.lgus = lgus.build(
            {"Cebu": borders(702211000, "City of Bogo"), "Bohol": borders(701246000, "Ubay")},
            {"0702211000": 88867, "0701246000": 81799},
            windows=2,
            existing={"0701246000": {"psgc": "0701246000", "name": "old", "population": 1, "soilMoisture": [0.3, None], "validShare": [0.9, 0], "rank": None}},
        )

    def test_the_psgc_has_ten_digits_and_joins_the_two_files(self):
        self.assertEqual([f["properties"] for f in self.geojson["features"]], [
            {"psgc": "0702211000", "name": "City of Bogo"},
            {"psgc": "0701246000", "name": "Ubay"},
        ])
        self.assertEqual([(l["psgc"], l["province"], l["population"]) for l in self.lgus], [
            ("0701246000", "Bohol", 81799),
            ("0702211000", "Cebu", 88867),
        ])

    def test_a_new_town_has_no_soil_water_and_no_rank(self):
        bogo = self.lgus[1]
        self.assertEqual((bogo["soilMoisture"], bogo["validShare"], bogo["rank"]), ([None, None], [0, 0], None))

    def test_a_second_run_keeps_the_soil_water_but_not_the_old_name(self):
        ubay = self.lgus[0]
        self.assertEqual((ubay["soilMoisture"], ubay["validShare"], ubay["name"]), ([0.3, None], [0.9, 0], "Ubay"))

    def test_coordinates_have_five_decimals(self):
        self.assertEqual(self.geojson["features"][0]["geometry"]["coordinates"][0][0], [123.12346, 10.0])


if __name__ == "__main__":
    unittest.main()
