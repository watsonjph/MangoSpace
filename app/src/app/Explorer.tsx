"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, setWorkerUrl, type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Lgu, Manifest, Outlook } from "../../lib/data";
import { getMapMode, setMapSelection, useMapSearch } from "./map-selection";
import SeasonSound from "./SeasonSound";
import SoilWaterLine from "./SoilWaterLine";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

const SOURCE = "lgus";
const SOIL_FILL_COLOR: ExpressionSpecification = [
  "case",
  ["any", ["==", ["feature-state", "sm"], null], ["<", ["coalesce", ["feature-state", "share"], 0], 0.5]],
  "#9aa5a2",
  ["interpolate", ["linear"], ["feature-state", "sm"], 0.1, "#b07a1f", 0.25, "#c8c48a", 0.45, "#0d6f7d"],
];
const RANK_FILL_COLOR: ExpressionSpecification = [
  "case",
  ["==", ["feature-state", "rankScore"], null], "#9aa5a2",
  ["interpolate", ["linear"], ["feature-state", "rankScore"], 0, "#d4c5e8", 1, "#45236c"],
];
const RANK_OUTLINE_COLOR: ExpressionSpecification = [
  "case", ["==", ["feature-state", "stable"], true], "#d98d00", "#12201d",
];

// MapLibre 6 looks for its worker next to its own module. The bundler moves the module, so point at the worker file.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

export default function Explorer({ manifest, lgus, outlooks }: { manifest: Manifest; lgus: Lgu[]; outlooks: Outlook[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const query = useMapSearch();
  const mode = getMapMode(query);
  const search = new URLSearchParams(query);
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
          "fill-color": SOIL_FILL_COLOR,
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
    map.setPaintProperty("soil", "fill-color", mode === "rank" ? RANK_FILL_COLOR : SOIL_FILL_COLOR);
    map.setPaintProperty("soil", "fill-outline-color", mode === "rank" ? RANK_OUTLINE_COLOR : "#12201d");
  }, [map, mode]);

  useEffect(() => {
    if (!map) return;
    for (const lgu of lgus) map.setFeatureState({ source: SOURCE, id: lgu.psgc }, {
      sm: lgu.soilMoisture[windowIndex],
      share: lgu.validShare[windowIndex],
      rankScore: lgu.rank == null ? null : 1 - (lgu.rank.position - 1) / Math.max(lgu.rank.of - 1, 1),
      stable: lgu.rank?.stable ?? false,
    });
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

      <section className="legend" aria-labelledby="legend-title" data-testid="map-legend">
        <h2 id="legend-title">{mode === "rank" ? "Rank preview" : "Soil water"}</h2>
        {mode === "rank" ? <>
          <div className="rank-ramp" aria-hidden="true" />
          <div className="legend-values"><span>Later on the list</span><span>Look here first</span></div>
          <p><span className="no-data-swatch" aria-hidden="true" /> Not ranked</p>
          <p><span className="stable-swatch" aria-hidden="true" /> Gold outline: stable in checks</p>
        </> : <>
          <div className="legend-ramp" aria-hidden="true" />
          <div className="legend-values">
            <span>0.10 m³/m³ · drier</span>
            <span>0.45 m³/m³ · wetter</span>
          </div>
          <p><span className="no-data-swatch" aria-hidden="true" /> Gray: less than half the pixels have data</p>
        </>}
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
            <dt>Rank preview{rankWin && `, ${rankWin.start} → ${rankWin.end}`}</dt>
            <dd className="rank-value" data-testid="rank">
              {lgu.rank ? <>
                <span>#{lgu.rank.position} of {lgu.rank.of} ranked{lgu.rank.position <= 10 && " · look here first"}</span>
                {lgu.rank.stable && <><span> </span><span className="stable-mark" title="Stayed in the top 10 in every check">Stable</span></>}
              </> : "Not ranked"}
            </dd>
            {lgu.rank && <>
              <dt>Rank parts</dt>
              <dd className="rank-parts">
                {([
                  ["dryness", "Dryness"],
                  ["dryingSpeed", "Drying speed"],
                  ["people", "People"],
                ] as const).map(([key, label]) => {
                  const percent = Math.round(lgu.rank!.parts[key] * 100);
                  return <label className="rank-part" key={key}>
                    <span>{label}</span><span>{percent}%</span>
                    <progress max={100} value={percent} aria-label={`${label}: ${percent}%`} />
                  </label>;
                })}
              </dd>
            </>}
            <dt>Soil water</dt>
            <dd data-testid="moisture">{moisture == null ? "No data" : `${moisture.toFixed(3)} m³/m³`}</dd>
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
