import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import rasterio
from rasterio.transform import from_bounds

import targets

LAND, WATER = -7.0, -18.0
RESERVOIR = (slice(100, 200), slice(100, 300))
RESERVOIR_KM2 = round(20_000 * targets.PIXEL_KM2, 3)


def scene():
    hh = np.full((targets.SIZE, targets.SIZE), LAND)
    hh[RESERVOIR] = WATER
    return hh


class TargetImageTest(unittest.TestCase):
    def test_grey_scale_follows_the_data_contract(self):
        db = np.array([[-40.0, -30.0, -15.0, 0.0, 5.0, np.nan]])
        self.assertEqual(targets.to_grey(db).tolist(), [[0, 0, 128, 255, 255, 0]])

    def test_a_pixel_is_about_ten_metres(self):
        self.assertAlmostEqual(targets.PIXEL_KM2 * 1e6, 100, delta=1)

    def test_despeckle_takes_the_mean_power_and_not_the_mean_db(self):
        speckle = np.where(np.indices((20, 20)).sum(0) % 2, -20.0, 0.0)
        self.assertAlmostEqual(targets.despeckle(speckle)[10, 10], 10 * np.log10((13 * 1 + 12 * 0.01) / 25), places=3)


class WaterAreaTest(unittest.TestCase):
    def area(self, hh, others=2):
        return targets.water_area_km2(hh, targets.reservoir_outline([hh] + [scene()] * others))

    def test_counts_the_reservoir(self):
        self.assertEqual(self.area(scene()), RESERVOIR_KM2)

    def test_counts_water_that_wind_made_brighter(self):
        windy = scene()
        windy[RESERVOIR] = -14.0
        self.assertEqual(self.area(windy), RESERVOIR_KM2)

    def test_does_not_count_a_wet_field_outside_the_reservoir(self):
        planting = scene()
        planting[300:400, 100:300] = WATER
        self.assertEqual(self.area(planting), RESERVOIR_KM2)

    def test_area_falls_when_the_water_leaves_part_of_the_reservoir(self):
        dry = scene()
        dry[100:200, 100:200] = LAND
        self.assertEqual(self.area(dry), round(10_000 * targets.PIXEL_KM2, 3))


class Granule(dict):
    def __init__(self, date, track="003", frame="084"):
        super().__init__(umm={"GranuleUR": f"NISAR_L2_PR_GCOV_024_{track}_D_{frame}_4005_DHDH_A_{date}T100902_end_version"})

    def data_links(self):
        return ["https://example.test/scene.h5"]


class RiceTargetTest(unittest.TestCase):
    def test_mean_is_from_unclipped_db_not_png_or_mean_power(self):
        values = np.array([[-40.0, 0.0], [np.nan, -20.0]])
        self.assertEqual(targets.mean_hv_db(values), -20.0)
        self.assertNotAlmostEqual(targets.mean_hv_db(values), 10 * np.log10(np.nanmean(10 ** (values / 10))))

    def test_hv_coverage_is_checked_even_when_hh_is_complete(self):
        with self.assertRaisesRegex(SystemExit, "HV"):
            targets.check_coverage({"hh": np.zeros((10, 10)), "hv": np.full((10, 10), np.nan)}, "rice")
        nearly_complete = np.zeros((10, 10))
        nearly_complete[0, 0] = np.nan
        targets.check_coverage({"hh": nearly_complete, "hv": nearly_complete}, "rice")

    def test_reprojection_uses_the_requested_bounds_and_dimensions(self):
        bounds = (124.43, 10.01, 124.44, 10.02)
        source = np.full((10, 10), 0.01, "float32")
        db = targets.reproject_to_db(source, from_bounds(*bounds, 10, 10), 4326, bounds, 20)
        self.assertEqual(db.shape, (20, 20))
        np.testing.assert_allclose(db, -20, atol=0.0001)
        missing = targets.reproject_to_db(source, from_bounds(*bounds, 10, 10), 4326, (125, 11, 125.01, 11.01), 20)
        self.assertTrue(np.isnan(missing).all())

    def test_same_track_selection_rejects_other_frames_and_duplicate_dates(self):
        spec = targets.TARGETS["ubay-rice"]
        results = [Granule("20260708"), Granule("20260626"), Granule("20260720", frame="083")]
        self.assertEqual(list(targets.select_scenes(results, spec)), ["2026-06-26", "2026-07-08"])
        with self.assertRaisesRegex(SystemExit, "duplicate"):
            targets.select_scenes(results + [Granule("20260626")], spec)
        with self.assertRaisesRegex(SystemExit, "at least 2"):
            targets.select_scenes(results[:1], spec)

    def test_rice_production_writes_aligned_images_and_hv_series(self):
        spec = targets.TARGETS["ubay-rice"]
        transform = from_bounds(*spec.bounds, 2, 2)
        first = {"hh": np.full((2, 2), 0.1), "hv": np.full((2, 2), 0.01)}
        second = {"hh": np.full((2, 2), 0.1), "hv": np.full((2, 2), 0.1)}
        with tempfile.TemporaryDirectory() as directory, patch.object(targets.earthaccess, "search_data", side_effect=[[Granule("20260626")], [Granule("20260708")]]), patch.object(targets.h5py, "File"), patch.object(targets, "read_window", side_effect=[(first, transform, 4326), (second, transform, 4326)]):
            image_dir = Path(directory)
            result = targets.produce_target(spec, "2026-06-21", "2026-10-31", MagicMock(), image_dir)
            nisar = result["nisar"]
            self.assertEqual(nisar["dates"], ["2026-06-26", "2026-07-08"])
            self.assertEqual(nisar["meanHvDb"], [-20.0, -10.0])
            self.assertEqual(len(nisar["images"]), len(nisar["dates"]))
            self.assertNotIn("waterAreaKm2", nisar)
            for image in nisar["images"]:
                for band in ["hh", "hv"]:
                    with rasterio.open(image_dir / Path(image[band]).name) as png:
                        self.assertEqual(png.shape, (spec.size, spec.size))
                        self.assertEqual(png.dtypes, ("uint8",))

    def test_rice_update_preserves_the_dam_and_unrelated_fields(self):
        original = [{"id": "malinao-dam", "bounds": [1, 2, 3, 4], "nisar": {"waterAreaKm2": [0.8]}}, {"id": "ubay-rice", "nisar": {"mock": True}, "rainMm": [10], "history": []}]
        update = {"bounds": [124.43, 10.01, 124.44, 10.02], "nisar": {"meanHvDb": [-20, -10]}}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "targets.json"
            path.write_text(json.dumps(original))
            result = json.loads(targets.update_targets(path, {"ubay-rice": update}))
            self.assertEqual(result[0], original[0])
            self.assertEqual(result[1], {**original[1], **update})
            self.assertEqual(json.loads(path.read_text()), original)
            with self.assertRaisesRegex(SystemExit, "Unknown target"):
                targets.update_targets(path, {"missing-rice": update})


if __name__ == "__main__":
    unittest.main()
