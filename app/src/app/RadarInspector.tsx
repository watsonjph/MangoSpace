"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Target } from "../../lib/data";
import { loadRadarPair, RADAR_CUES, type RadarPair, sampleRadarPixel } from "./radar-pixels";

type Pixels = { kind: "loading" } | { kind: "ready"; pair: RadarPair } | { kind: "unavailable" };
type Point = { x: number; y: number };
const db = (value: number) => `${value.toFixed(1).replace("-", "−")} dB`;

export default function RadarInspector({ src, caption, images }: {
  src: string; caption: string; images: Target["nisar"]["images"][number];
}) {
  const [pixels, setPixels] = useState<Pixels>({ kind: "loading" });
  const [point, setPoint] = useState<Point | null>(null);
  const image = useRef<HTMLImageElement>(null);
  const instructions = useId();
  const { hh, hv } = images;

  useEffect(() => {
    let active = true;
    loadRadarPair({ hh, hv }).then(
      (pair) => { if (active) setPixels({ kind: "ready", pair }); },
      () => { if (active) setPixels({ kind: "unavailable" }); },
    );
    return () => { active = false; };
  }, [hh, hv]);

  const pair = pixels.kind === "ready" ? pixels.pair : null;
  const center = pair ? { x: Math.floor(pair.hh.width / 2), y: Math.floor(pair.hh.height / 2) } : null;
  const sample = pair && point ? sampleRadarPixel(pair, point) : null;

  return (
    <>
      <button type="button" className="radar-pixel-target" aria-label="Inspect radar pixel" aria-describedby={instructions}
        disabled={!pair}
        onClick={(event) => { if (event.detail === 0 && pair) setPoint(point ?? center); }}
        onPointerUp={(event) => {
          if (!pair || !image.current || !event.isPrimary || event.button !== 0) return;
          const img = image.current, box = img.getBoundingClientRect();
          setPoint({
            x: Math.max(0, Math.min(pair.hh.width - 1, Math.floor((event.clientX - box.left - img.clientLeft) / (box.width - 2 * img.clientLeft) * pair.hh.width))),
            y: Math.max(0, Math.min(pair.hh.height - 1, Math.floor((event.clientY - box.top - img.clientTop) / (box.height - 2 * img.clientTop) * pair.hh.height))),
          });
        }}
        onKeyDown={(event) => {
          if (!pair || !center) return;
          let dx = 0, dy = 0;
          switch (event.key) {
            case "ArrowLeft": dx = -1; break;
            case "ArrowRight": dx = 1; break;
            case "ArrowUp": dy = -1; break;
            case "ArrowDown": dy = 1; break;
            default: return;
          }
          event.preventDefault();
          setPoint((previous) => ({
            x: Math.max(0, Math.min(pair.hh.width - 1, (previous ?? center).x + dx)),
            y: Math.max(0, Math.min(pair.hh.height - 1, (previous ?? center).y + dy)),
          }));
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={image} src={`/data/${src}`} alt={caption} width={440} height={440} />
        {pair && point && <span className="radar-pixel-marker" aria-hidden="true" style={{
          left: `calc(${(point.x + 0.5) / pair.hh.width * 100}% + ${1 - 2 * (point.x + 0.5) / pair.hh.width}px)`,
          top: `calc(${(point.y + 0.5) / pair.hh.height * 100}% + ${1 - 2 * (point.y + 0.5) / pair.hh.height}px)`,
        }} />}
      </button>
      <p id={instructions} className="dam-note">Click or tap a pixel. With the keyboard, press Enter or Space to select the center, then use the arrow keys.</p>
      <div className="radar-pixel-result" role="status" data-testid="radar-pixel-result">
        {pixels.kind === "loading" ? <p>Loading HH and HV pixels…</p>
          : pixels.kind === "unavailable" ? <p>Not sure. HH and HV are unavailable for this image.</p>
            : !point ? <p>Select a pixel to read its HH and HV signal.</p>
              : <>
                <p className="radar-pixel-values">Pixel ({point.x}, {point.y}), from the top left, starting at 0.</p>
                {sample?.kind === "available" ? <>
                  <p className="radar-pixel-values">HH {db(sample.hhDb)} · HV {db(sample.hvDb)}</p>
                  <p>{sample.cue === "not_sure" && "Not sure. "}{RADAR_CUES[sample.cue]}</p>
                </> : <p>Not sure. HH and HV are unavailable at this pixel.</p>}
              </>}
      </div>
      <p className="dam-note">These cues are provisional. One pixel does not prove what is on the ground. Values at −30 or 0 dB can be clipped or unavailable.</p>
    </>
  );
}
