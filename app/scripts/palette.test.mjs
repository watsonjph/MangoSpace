import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
const token = (name) => {
  const hex = root.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  assert.ok(hex, `--${name} is a hex color in :root`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
};

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (rgb) => rgb.map(linear).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Machado, Oliveira and Fernandes 2009, severity 1.0, applied to linear RGB.
const VISION = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const oklab = (rgb, matrix) => {
  const lin = rgb.map(linear);
  const [r, g, b] = matrix.map((row) => Math.min(1, Math.max(0, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])));
  const [l, m, s] = [
    0.4122214708 * r + 0.5363288 * g + 0.0514459929 * b,
    0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b,
    0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b,
  ].map(Math.cbrt);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const distance = (a, b, matrix) => Math.hypot(...oklab(a, matrix).map((v, i) => v - oklab(b, matrix)[i]));

// The map fills towns at 0.92 opacity over the ground and blends the ramp in RGB.
const OPACITY = 0.92;
const over = (fill, ground) => fill.map((c, i) => c * OPACITY + ground[i] * (1 - OPACITY));
const ramp = (steps) => {
  const [dry, mid, water] = ["dry", "mid", "water"].map(token);
  const mix = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);
  return Array.from({ length: steps + 1 }, (_, i) => i / steps)
    .map((t) => (t < 0.5 ? mix(dry, mid, t * 2) : mix(mid, water, (t - 0.5) * 2)));
};

// The labels are 10 to 12 px, so text needs the 4.5:1 small-text ratio.
const TEXT = [["muted", "ground"], ["muted", "surface"], ["water", "ground"], ["water", "surface"], ["ground", "water"], ["stable", "surface"]];
for (const [fg, bg] of TEXT) {
  test(`--${fg} text on --${bg} passes WCAG AA`, (t) => {
    const ratio = contrast(token(fg), token(bg));
    t.diagnostic(`${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 4.5);
  });
}

for (const name of ["dry", "mid", "water", "no-data"]) {
  test(`--${name} town fill on --ground passes the 3:1 graphics ratio`, (t) => {
    const ratio = contrast(over(token(name), token("ground")), token("ground"));
    t.diagnostic(`${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 3);
  });
}

// 0.1 in OKLab is about the step between neighbouring swatches of a 10-class palette.
const APART = 0.1;
for (const [vision, matrix] of Object.entries(VISION)) {
  test(`--no-data stays apart from every soil water ramp color under ${vision} vision`, (t) => {
    const gray = over(token("no-data"), token("ground"));
    const nearest = Math.min(...ramp(40).map((c) => distance(gray, over(c, token("ground")), matrix)));
    t.diagnostic(`nearest ramp color is ${nearest.toFixed(3)} away`);
    assert.ok(nearest >= APART);
  });

  test(`the soil water ramp stops stay apart under ${vision} vision`, (t) => {
    const [dry, mid, water] = ["dry", "mid", "water"].map(token);
    const gaps = [[dry, mid], [mid, water], [dry, water]].map(([a, b]) => distance(a, b, matrix));
    t.diagnostic(`dry-mid ${gaps[0].toFixed(3)}, mid-water ${gaps[1].toFixed(3)}, dry-water ${gaps[2].toFixed(3)}`);
    assert.ok(Math.min(...gaps) >= APART);
  });
}
