import type { Target } from "../../lib/data";

export type RadarPair = { hh: ImageData; hv: ImageData };

export const RADAR_CUES = {
  dark: "This dark return can be consistent with water; flooded fields and radar shadow can also look dark.",
  vegetation: "This cross-polarized return can be consistent with vegetation; it does not identify a crop or growth stage.",
  bright: "This strong return can come from buildings or other rough surfaces; it does not identify a building.",
  not_sure: "These values do not give a unique explanation.",
};

export type RadarSample =
  | { kind: "unavailable" }
  | { kind: "available"; hhDb: number; hvDb: number; cue: keyof typeof RADAR_CUES };

export async function loadRadarPair(images: Target["nisar"]["images"][number]): Promise<RadarPair> {
  const read = async (src: string) => {
    const image = new Image();
    image.src = `/data/${src}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Cannot read the radar image.");
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };
  const [hh, hv] = await Promise.all([read(images.hh), read(images.hv)]);
  if (hh.width !== hv.width || hh.height !== hv.height) {
    throw new Error("HH and HV image dimensions differ.");
  }
  return { hh, hv };
}

export function sampleRadarPixel({ hh, hv }: RadarPair, { x, y }: { x: number; y: number }): RadarSample {
  if (hh.width !== hv.width || hh.height !== hv.height || !Number.isInteger(x) || !Number.isInteger(y)
    || x < 0 || y < 0 || x >= hh.width || y >= hh.height) return { kind: "unavailable" };
  const offset = (y * hh.width + x) * 4;
  const bytes = [hh, hv].map(({ data }) => {
    const value = data[offset];
    return Number.isInteger(value) && value >= 0 && value <= 255
      && data[offset + 1] === value && data[offset + 2] === value && data[offset + 3] === 255 ? value : null;
  });
  const [hhByte, hvByte] = bytes;
  if (hhByte === null || hvByte === null) return { kind: "unavailable" };
  const hhDb = -30 + 30 * hhByte / 255, hvDb = -30 + 30 * hvByte / 255;
  let cue: keyof typeof RADAR_CUES = "not_sure";
  if (hhByte !== 0 && hhByte !== 255 && hvByte !== 0 && hvByte !== 255) {
    if (hhDb < -15 && hvDb < -19) cue = "dark";
    else if (hvDb >= -19 && hvDb <= -12 && hhDb >= -15 && hhDb <= -6) cue = "vegetation";
    else if (hhDb > -6 && hvDb > -12) cue = "bright";
  }
  return { kind: "available", hhDb, hvDb, cue };
}
