import { expect, type Locator } from "@playwright/test";

type RadarImages = { hh: string; hv: string };

export async function expectColorComposite(figure: Locator, sources: RadarImages) {
  const canvas = figure.locator("canvas");
  await expect(figure.locator(".radar-composite")).toHaveAttribute("aria-busy", "false");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("role", "img");
  await expect(canvas).toHaveAttribute("aria-label", /NISAR.*color composite/i);
  const pixels = await canvas.evaluate(async (output: HTMLCanvasElement, pair: RadarImages) => {
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${src}`));
      image.src = `/data/${src}`;
    });
    const [hh, hv] = await Promise.all([load(pair.hh), load(pair.hv)]);
    if (hh.naturalWidth !== hv.naturalWidth || hh.naturalHeight !== hv.naturalHeight) throw new Error("Radar image sizes differ");
    const sample = document.createElement("canvas");
    sample.width = hh.naturalWidth;
    sample.height = hh.naturalHeight;
    const context = sample.getContext("2d");
    const outputContext = output.getContext("2d");
    if (!context || !outputContext) throw new Error("Canvas is unavailable");
    context.drawImage(hh, 0, 0);
    const hhPixels = context.getImageData(0, 0, sample.width, sample.height);
    context.drawImage(hv, 0, 0);
    const hvPixels = context.getImageData(0, 0, sample.width, sample.height);
    if (output.width !== sample.width || output.height !== sample.height) return false;
    const actual = outputContext.getImageData(0, 0, output.width, output.height).data;
    for (let i = 0; i < hhPixels.data.length; i += 4) {
      const blue = Math.max(0, Math.min(255, Math.round(2 * (hhPixels.data[i] - hvPixels.data[i]))));
      if (actual[i] !== hhPixels.data[i] || actual[i + 1] !== hvPixels.data[i] || actual[i + 2] !== blue) return false;
    }
    return true;
  }, sources);
  expect(pixels).toBe(true);
}
