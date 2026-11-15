import unittest

import rank


def town(psgc, soil, population, share=1.0):
    return {"psgc": psgc, "soilMoisture": soil, "validShare": [share] * len(soil), "population": population}


class RankTest(unittest.TestCase):
    def test_rank_order_and_parts_on_known_values(self):
        lgus = [
            town("wet-small", [0.40, 0.40, 0.40, 0.40], 1_000),
            town("dry-big", [0.40, 0.30, 0.20, 0.10], 100_000),
            town("middle", [0.30, 0.28, 0.26, 0.25], 10_000),
            town("no-data", [0.10, 0.10, 0.10, 0.10], 1_000_000, share=0.4),
        ]
        result = rank.ranks(lgus)
        self.assertEqual(result["dry-big"], {"position": 1, "of": 3, "stable": True, "parts": {"dryness": 1.0, "dryingSpeed": 1.0, "people": 1.0}})
        self.assertEqual(result["middle"], {"position": 2, "of": 3, "stable": True, "parts": {"dryness": 0.5, "dryingSpeed": 0.167, "people": 0.5}})
        self.assertEqual(result["wet-small"]["position"], 3)
        self.assertEqual(result["wet-small"]["parts"], {"dryness": 0.0, "dryingSpeed": 0.0, "people": 0.0})
        self.assertIsNone(result["no-data"])

    def test_stable_is_false_for_a_town_that_leaves_the_top_when_one_part_has_double_weight(self):
        lgus = [town(f"dry-{i}", [0.30, 0.30, 0.30, 0.10 + i / 1000], 1_000 + i) for i in range(9)]
        lgus.append(town("crowded", [0.30, 0.30, 0.30, 0.30], 5_000_000))
        lgus.append(town("always-dry", [0.18, 0.18, 0.18, 0.18], 12_000))
        result = rank.ranks(lgus)
        top = {psgc for psgc, value in result.items() if value["position"] <= rank.TOP}
        self.assertIn("crowded", top)
        self.assertFalse(result["crowded"]["stable"])
        self.assertTrue(result["dry-0"]["stable"])

    def test_a_town_with_no_soil_water_now_has_no_rank(self):
        lgus = [town("a", [0.3] * 4, 1_000), town("b", [0.2] * 4, 2_000), town("gap", [0.2, 0.2, 0.2, None], 3_000)]
        self.assertIsNone(rank.ranks(lgus)["gap"])

    def test_the_rank_uses_the_latest_window_with_the_most_towns(self):
        lgus = [town("a", [0.3] * 5, 1_000), town("b", [0.2] * 5, 2_000)]
        lgus[1]["validShare"][4] = 0.1
        self.assertEqual(rank.now_window(lgus), 3)


if __name__ == "__main__":
    unittest.main()
