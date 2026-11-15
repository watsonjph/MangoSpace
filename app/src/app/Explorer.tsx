"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Lgu, Manifest, Outlook } from "../../lib/data";
import { setMapSelection, useMapSearch } from "./map-selection";
import SeasonSound from "./SeasonSound";
import SoilWaterLine from "./SoilWaterLine";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

const SOURCE = "lgus";

// MapLibre 6 looks for its worker next to its own module. The bundler moves the module, so point at the worker file.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

export default function Explorer({ manifest, lgus, outlooks }: { manifest: Manifest; lgus: Lgu[]; outlooks: Outlook[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const search = new URLSearchParams(useMapSearch());
  const requestedWindow = Number(search.get("window"));
  const windowIndex = Number.isInteger(requestedWindow) && requestedWindow >= 0 && requestedWindow < manifest.windows.length
    ? requestedWindow : 0;
  const psgc = lgus.find(lgu => lgu.psgc === search.get("town"))?.psgc ?? "";
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (windowIndex >= manifest.windows.length - 1) setPlaying(false);
      else setMapSelection("window", String(windowIndex + 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [playing, windowIndex, manifest.windows.length]);

  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useEffect(() => {
    const m = new MapLibreMap({
      container: container.current!,
      style: "https://tiles.openfreemap.org/styles/positron",
      bounds: manifest.bounds,
      attributionControl: {
        compact: false,
        customAttribution: '<a href="https://maplibre.org/" target="_blank">MapLibre</a>',
      },
    });
    const fitRegion = () => {
      const compact = window.matchMedia("(max-width: 640px)").matches;
      m.fitBounds(manifest.bounds, {
        padding: compact
          ? { top: 164, right: 16, bottom: 16, left: 16 }
          : { top: 84, right: 356, bottom: 188, left: 16 },
        maxZoom: 8,
        duration: 0,
      });
    };
    const handleResize = () => {
      window.requestAnimationFrame(() => {
        if (!m.getContainer().isConnected) return;
        m.resize();
        fitRegion();
      });
    };
    m.on("load", () => {
      m.addSource(SOURCE, { type: "geojson", data: "/data/lgus.geojson", promoteId: "psgc" });
      m.addLayer({
        id: "soil",
        type: "fill",
        source: SOURCE,
        paint: {
          "fill-opacity": 0.8,
          "fill-outline-color": "#12201d",
          "fill-color": [
            "case",
            // Same 50% rule as the rank (sc-120): a town with less than half its pixels is not coloured.
            ["any", ["==", ["feature-state", "sm"], null], ["<", ["coalesce", ["feature-state", "share"], 0], 0.5]],
            "#9aa5a2",
            ["interpolate", ["linear"], ["feature-state", "sm"], 0.1, "#b07a1f", 0.25, "#c8c48a", 0.45, "#0d6f7d"],
          ],
        },
      });
      m.on("click", "soil", (e) => setMapSelection("town", String(e.features?.[0]?.id ?? "")));
      fitRegion();
      setMap(m);
    });
    window.addEventListener("resize", handleResize);
    window.hubasMap = m; // the Playwright specs use this to find towns on the canvas
    return () => {
      window.removeEventListener("resize", handleResize);
      m.remove();
    };
  }, [manifest.bounds]);

  useEffect(() => {
    if (!map) return;
    for (const lgu of lgus) map.setFeatureState({ source: SOURCE, id: lgu.psgc }, { sm: lgu.soilMoisture[windowIndex], share: lgu.validShare[windowIndex] });
  }, [map, lgus, windowIndex]);

  const win = manifest.windows[windowIndex];
  const rankWin = manifest.rankWindow == null ? null : manifest.windows[manifest.rankWindow];
  const lgu = lgus.find((l) => l.psgc === psgc);
  const outlook = outlooks.find((o) => o.province === lgu?.province);
  const moisture = lgu?.soilMoisture[windowIndex];

  return (
    <main>
      <div ref={container} className="map" data-ready={map ? "true" : "false"} />
      <p className="tag">Cebu + Bohol · 12-day window · {manifest.sme2Status}</p>

      <section className="legend" aria-labelledby="legend-title" data-testid="soil-water-legend">
        <h2 id="legend-title">Soil water</h2>
        <div className="legend-ramp" aria-hidden="true" />
        <div className="legend-values">
          <span>0.10 m³/m³ · drier</span>
          <span>0.45 m³/m³ · wetter</span>
        </div>
        <p><span className="no-data-swatch" aria-hidden="true" /> Gray: less than half the pixels have data</p>
      </section>

      <form className="slider" onSubmit={(e) => e.preventDefault()}>
        <button type="button" aria-pressed={playing} onClick={() => {
          if (!playing && windowIndex === manifest.windows.length - 1) setMapSelection("window", "0");
          setPlaying(!playing);
        }}>{playing ? "Pause" : "Play"}</button>
        <label htmlFor="window">
          Window <output htmlFor="window">{win.start} → {win.end}</output>
        </label>
        <input
          id="window"
          type="range"
          min={0}
          max={manifest.windows.length - 1}
          value={windowIndex}
          onChange={(e) => setMapSelection("window", e.target.value)}
        />
      </form>

      <aside className="panel">
        <label htmlFor="town">Town</label>
        <select id="town" value={psgc} onChange={(e) => setMapSelection("town", e.target.value)}>
          <option value="">Select a town</option>
          {lgus.map((l) => (
            <option key={l.psgc} value={l.psgc}>{l.name}, {l.province}</option>
          ))}
        </select>
        {lgu && <>
          <h2 data-testid="town-name">{lgu.name}<span>{lgu.province}</span></h2>
          <SoilWaterLine name={lgu.name} values={lgu.soilMoisture} shares={lgu.validShare} windows={manifest.windows} index={windowIndex} />
          <dl>
            <dt>Rank{rankWin && `, ${rankWin.start} → ${rankWin.end}`}</dt>
            <dd data-testid="rank">{lgu.rank ? `#${lgu.rank.position} of ${lgu.rank.of}` : "Not ranked"}</dd>
            <dt>Soil water</dt>
            <dd data-testid="moisture">{moisture == null ? "No good pixels" : `${moisture.toFixed(3)} m³/m³`}</dd>
            <dt>Pixels with data</dt>
            <dd>{Math.round(lgu.validShare[windowIndex] * 100)}%</dd>
            <dt>PAGASA, {lgu.province}</dt>
            <dd>{outlook ? `${outlook.summary} (${outlook.advisory}, ${outlook.issued})` : "No outlook"}</dd>
          </dl>
          <SeasonSound key={lgu.psgc} value={moisture} index={windowIndex} playing={playing} onStart={() => {
            setMapSelection("window", "0");
            setPlaying(true);
          }} />
        </>}
      </aside>
    </main>
  );
}
