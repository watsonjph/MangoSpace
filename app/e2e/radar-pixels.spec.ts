import { expect, test } from "@playwright/test";
import { RADAR_CUES, sampleRadarPixel, type RadarPair } from "../src/app/radar-pixels";

function image(value: number): ImageData {
  return { width: 1, height: 1, colorSpace: "srgb", data: new Uint8ClampedArray([value, value, value, 255]) };
}

const pair = (hh: number, hv: number): RadarPair => ({ hh: image(hh), hv: image(hv) });
const sample = (hh: number, hv: number) => sampleRadarPixel(pair(hh, hv), { x: 0, y: 0 });

test("radar PNG bytes decode to dB and the provisional paired-band cues", () => {
  expect(sample(118, 64)).toEqual({ kind: "available", hhDb: -30 + 30 * 118 / 255, hvDb: -30 + 30 * 64 / 255, cue: "dark" });
  expect(sample(154, 122)).toMatchObject({ kind: "available", cue: "vegetation" });
  expect(sample(250, 201)).toMatchObject({ kind: "available", cue: "bright" });
  expect(sample(207, 136)).toMatchObject({ kind: "available", cue: "not_sure" });
  expect(RADAR_CUES.bright).toContain("it does not identify a building");
});

test("cue boundaries use both channels and keep unmatched values uncertain", () => {
  const cases: [number, number, keyof typeof RADAR_CUES][] = [
    [127, 93, "dark"], [128, 93, "not_sure"], [127, 94, "not_sure"],
    [128, 94, "vegetation"], [204, 153, "vegetation"],
    [205, 153, "not_sure"], [204, 154, "not_sure"], [205, 154, "bright"],
    [128, 153, "vegetation"], [128, 154, "not_sure"], [128, 93, "not_sure"],
  ];
  for (const [hh, hv, cue] of cases) {
    expect(sample(hh, hv), `${hh}, ${hv}`).toMatchObject({ cue });
  }
});

test("clipped endpoints have numeric readings but no land-cover cue", () => {
  for (const value of [0, 255]) {
    expect(sample(value, 120)).toMatchObject({ kind: "available", hhDb: value === 0 ? -30 : 0, cue: "not_sure" });
    expect(sample(120, value)).toMatchObject({ kind: "available", hvDb: value === 0 ? -30 : 0, cue: "not_sure" });
  }
});

test("missing, transparent, colored or out-of-bounds pixels are unavailable", () => {
  for (const point of [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 0.5, y: 0 }, { x: NaN, y: 0 }, { x: 0, y: Infinity }]) {
    expect(sampleRadarPixel(pair(118, 64), point)).toEqual({ kind: "unavailable" });
  }
  for (const band of ["hh", "hv"] as const) {
    for (const [channel, value] of [[1, 119], [3, 0], [3, 254]]) {
      const images = pair(118, 64);
      images[band].data[channel] = value;
      expect(sampleRadarPixel(images, { x: 0, y: 0 })).toEqual({ kind: "unavailable" });
    }
  }
  const missing = { ...image(118), data: new Uint8ClampedArray() };
  expect(sampleRadarPixel({ hh: missing, hv: image(64) }, { x: 0, y: 0 })).toEqual({ kind: "unavailable" });
  expect(sampleRadarPixel({ hh: image(118), hv: { ...image(64), width: 2 } }, { x: 0, y: 0 })).toEqual({ kind: "unavailable" });
});

test("reference roof and wooded contexts do not become building labels", () => {
  expect(sample(200, 144)).toMatchObject({ cue: "vegetation" });
  expect(sample(197, 139)).toMatchObject({ cue: "vegetation" });
  expect(sample(207, 136)).toMatchObject({ cue: "not_sure" });
  expect(sample(210, 133)).toMatchObject({ cue: "not_sure" });
});
