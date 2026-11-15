"use client";

import { type RefObject, useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import type { Target } from "../../lib/data";
import { loadRadarPair, RADAR_CUES, type RadarPair, sampleRadarPixel } from "./radar-pixels";

type Pixels = { kind: "idle" } | { kind: "ready"; pair: RadarPair } | { kind: "unavailable" };
type Point = { x: number; y: number; width: number; height: number };
const db = (value: number) => `${value.toFixed(1).replace("-", "−")} dB`;
// The pixel grid of the shown image once it has decoded, as "WxH", or "" while it loads.
const gridOf = (image: RefObject<HTMLImageElement | null>) => {
  const img = image.current;
  return img?.complete && img.naturalWidth ? `${img.naturalWidth}x${img.naturalHeight}` : "";
};
const onLoad = (image: RefObject<HTMLImageElement | null>, changed: () => void) => {
  const img = image.current;
  img?.addEventListener("load", changed);
  return () => img?.removeEventListener("load", changed);
};
const clamp = (value: number, size: number) => Math.max(0, Math.min(size - 1, value));

export default function RadarInspector({ image, images }: {
  image: RefObject<HTMLImageElement | null>; images: Target["nisar"]["images"][number];
}) {
  const [pixels, setPixels] = useState<Pixels>({ kind: "idle" });
  const [point, setPoint] = useState<Point | null>(null);
  const instructions = useId();
  const { hh, hv } = images;
  // A new date or parcel clears the reading without remounting, so the img in Radar keeps its identity.
  const [shown, setShown] = useState(`${hh}:${hv}`);
  if (shown !== `${hh}:${hv}`) {
    setShown(`${hh}:${hv}`);
    setPoint(null);
    setPixels({ kind: "idle" });
  }

  // The pair loads only once a pixel is picked: loading it on every date would compete with playback for the frames.
  const wanted = point !== null;
  useEffect(() => {
    if (!wanted) return;
    let active = true;
    loadRadarPair({ hh, hv }).then(
      (pair) => { if (active) setPixels({ kind: "ready", pair }); },
      () => { if (active) setPixels({ kind: "unavailable" }); },
    );
    return () => { active = false; };
  }, [hh, hv, wanted]);

  // The shown band has the same pixel grid as the pair; loadRadarPair rejects a pair whose sizes differ.
  const loaded = useSyncExternalStore(useCallback((changed: () => void) => onLoad(image, changed), [image]), () => gridOf(image), () => "");
  const [width, height] = loaded.split("x").map(Number);
  const size = () => loaded ? { width, height } : null;
  const pair = pixels.kind === "ready" ? pixels.pair : null;
  const sample = pair && point && pair.hh.width === point.width && pair.hh.height === point.height ? sampleRadarPixel(pair, point) : null;

  return (
    <>
      <button type="button" className="radar-pixel-target" aria-label="Inspect radar pixel" aria-describedby={instructions}
        disabled={!loaded || pixels.kind === "unavailable"}
        onClick={(event) => {
          const grid = size();
          if (event.detail === 0 && grid && !point) setPoint({ x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2), ...grid });
        }}
        onPointerUp={(event) => {
          const img = image.current, grid = size();
          if (!img || !grid || !event.isPrimary || event.button !== 0) return;
          const box = img.getBoundingClientRect();
          setPoint({
            x: clamp(Math.floor((event.clientX - box.left - img.clientLeft) / (box.width - 2 * img.clientLeft) * grid.width), grid.width),
            y: clamp(Math.floor((event.clientY - box.top - img.clientTop) / (box.height - 2 * img.clientTop) * grid.height), grid.height),
            ...grid,
          });
        }}
        onKeyDown={(event) => {
          const grid = size();
          if (!grid) return;
          let dx = 0, dy = 0;
          switch (event.key) {
            case "ArrowLeft": dx = -1; break;
            case "ArrowRight": dx = 1; break;
            case "ArrowUp": dy = -1; break;
            case "ArrowDown": dy = 1; break;
            default: return;
          }
          event.preventDefault();
          setPoint((previous) => {
            const from = previous ?? { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) };
            return { x: clamp(from.x + dx, grid.width), y: clamp(from.y + dy, grid.height), ...grid };
          });
        }}>
        {point && <span className="radar-pixel-marker" aria-hidden="true" style={{
          left: `calc(${(point.x + 0.5) / point.width * 100}% + ${1 - 2 * (point.x + 0.5) / point.width}px)`,
          top: `calc(${(point.y + 0.5) / point.height * 100}% + ${1 - 2 * (point.y + 0.5) / point.height}px)`,
        }} />}
      </button>
      <p id={instructions} className="dam-note">Click or tap a pixel. With the keyboard, press Enter or Space to select the center, then use the arrow keys.</p>
      {/* Empty until a pixel is picked, so playback does not announce every frame. */}
      <div className="radar-pixel-result" role="status" data-testid="radar-pixel-result">
        {pixels.kind === "unavailable" ? <p>Not sure. HH and HV are unavailable for this image.</p>
          : !point ? null
            : <>
              <p className="radar-pixel-values">Pixel ({point.x}, {point.y}), from the top left, starting at 0.</p>
              {pixels.kind !== "ready" ? <p>Loading HH and HV pixels…</p>
                : sample?.kind === "available" ? <>
                  <p className="radar-pixel-values">HH {db(sample.hhDb)} · HV {db(sample.hvDb)}</p>
                  <p>{sample.cue === "not_sure" && "Not sure. "}{RADAR_CUES[sample.cue]}</p>
                </> : <p>Not sure. HH and HV are unavailable at this pixel.</p>}
            </>}
      </div>
      <p className="dam-note">These cues are provisional. One pixel does not prove what is on the ground. Values at −30 or 0 dB can be clipped or unavailable.</p>
    </>
  );
}
