import unittest

from submit_hyp3 import select_scenes


class PlanTest(unittest.TestCase):
    def test_same_track_and_no_duplicate_jobs(self):
        scene = {"sceneName": "a", "pathNumber": 61, "flightDirection": "DESCENDING", "polarization": "VV+VH"}
        other = {**scene, "sceneName": "b", "pathNumber": 69}
        self.assertEqual(select_scenes({"dam": [scene, other], "rice": [scene]}), ["a"])
        with self.assertRaisesRegex(ValueError, "No compatible"):
            select_scenes({"rice": [other]})
