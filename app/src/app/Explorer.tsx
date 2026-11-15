"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Lgu, Manifest, Outlook } from "../../lib/data";
import { setMapSelection, useMapSearch } from "./map-selection";
import SeasonSound from "./SeasonSound";
import SoilWaterLine from "./SoilWaterLine";
import { HIGH, LOW, soilMeans } from "./soil-mean";
import Timeline, { usePlayback } from "./Timeline";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

const SOURCE = "lgus";
const BLEND_MS = 300;

const setWindow = (index: number) => setMapSelection("window", String(index));
const day = (iso: string, year = false) => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: year ? "numeric" : undefined, timeZone: "UTC" });
const range = (win: Manifest["windows"][number]) => `${day(win.start)} to ${day(win.end, true)}`;

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
  const play = usePlayback(manifest.windows.length, windowIndex, setWindow);
  const { playing } = play;
  const shown = useRef(new Map<string, number | null>());

  const means = useMemo(() => soilMeans(manifest.windows.length, lgus), [manifest.windows.length, lgus]);
  const notes = means.map((m) => m.note);
  const ticks = manifest.windows.flatMap((win, index) =>
    index === 0 || win.start.slice(5, 7) !== manifest.windows[index - 1].start.slice(5, 7)
      ? [{ index: (index + manifest.windows.findLastIndex((other) => other.start.slice(0, 7) === win.start.slice(0, 7))) / 2,
        label: new Date(`${win.start}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) }] : []);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const m = new MapLibreMap({
      container: container.current!,
      style: "https://tiles.openfreemap.org/styles/dark",
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
          ? { top: 196, right: 16, bottom: 12, left: 16 }
          : { top: 24, right: 364, bottom: 40, left: 300 },
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
          "fill-opacity": 0.92,
          "fill-outline-color": color("--ground"),
          "fill-color": [
            "case",
            ["any", ["==", ["feature-state", "sm"], null], ["<", ["coalesce", ["feature-state", "share"], 0], 0.5]],
            color("--no-data"),
            ["interpolate", ["linear"], ["feature-state", "sm"], LOW, color("--dry"), 0.25, color("--mid"), HIGH, color("--water")],
          ],
        },
      });
      m.addLayer({
        id: "selected",
        type: "line",
        source: SOURCE,
        filter: ["==", ["get", "psgc"], ""],
        paint: { "line-color": color("--ink"), "line-width": 2.5 },
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
    // Blend only during play. A user who moves the slider gets each window at once, and the map repaints one time.
    const still = !playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = new Map(shown.current);
    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const t = still ? 1 : Math.min(1, (now - start) / BLEND_MS);
      for (const lgu of lgus) {
        const to = lgu.soilMoisture[windowIndex];
        const before = from.get(lgu.psgc);
        // A town with no data in one of the two windows changes in one step: there is no value to blend from.
        const sm = t >= 1 || to == null || before == null ? to : before + (to - before) * t;
        shown.current.set(lgu.psgc, sm);
        map.setFeatureState({ source: SOURCE, id: lgu.psgc }, { sm, share: lgu.validShare[windowIndex] });
      }
      if (t < 1) frame = window.requestAnimationFrame(draw);
    };
    draw(start);
    return () => window.cancelAnimationFrame(frame);
  }, [map, lgus, windowIndex, playing]);

  useEffect(() => {
    map?.setFilter("selected", ["==", ["get", "psgc"], psgc]);
  }, [map, psgc]);

  const win = manifest.windows[windowIndex];
  const rankWin = manifest.rankWindow == null ? null : manifest.windows[manifest.rankWindow];
  const lgu = lgus.find((l) => l.psgc === psgc);
  const outlook = outlooks.find((o) => o.province === lgu?.province);
  const moisture = lgu?.soilMoisture[windowIndex];
  const here = means[windowIndex];
  const reading = (value: number | null | undefined) => value == null ? "No data" : <>{value.toFixed(3)} <span>m³/m³</span></>;

  return (
    <main className="explorer">
      <div className="stage">
        <div ref={container} className="map" data-ready={map ? "true" : "false"} />
        <div className="hud">
          <div className="tag">
            <strong>Soil water before El Niño</strong>
            <span>Cebu and Bohol · NISAR, each 12 days · {manifest.sme2Status}</span>
          </div>
          <section className="legend" aria-labelledby="legend-title" data-testid="map-legend">
            <h2 id="legend-title">Soil water</h2>
            <div className="legend-ramp" aria-hidden="true" />
            <div className="legend-values">
              <span>{LOW.toFixed(2)} m³/m³ · drier</span>
              <span>{HIGH.toFixed(2)} m³/m³ · wetter</span>
            </div>
            <p><span className="no-data-swatch" aria-hidden="true" /> Gray: less than half the pixels have data</p>
          </section>
        </div>

        <aside className="panel">
          <label htmlFor="town">Town</label>
          <select id="town" value={psgc} onChange={(e) => setMapSelection("town", e.target.value)}>
            <option value="">Select a town</option>
            {lgus.map((l) => (
              <option key={l.psgc} value={l.psgc}>{l.name}, {l.province}</option>
            ))}
          </select>
          {lgu ? <>
            <h2 data-testid="town-name">{lgu.name}<span>{lgu.province}</span></h2>
            <dl className="reading">
              <dt>Soil water, {range(win)}</dt>
              <dd className="big" data-testid="moisture">{reading(moisture)}</dd>
              <dt>Pixels with data</dt>
              <dd>{Math.round(lgu.validShare[windowIndex] * 100)}%</dd>
            </dl>
            <SoilWaterLine name={lgu.name} values={lgu.soilMoisture} shares={lgu.validShare} windows={manifest.windows} index={windowIndex} />
            <dl>
              <dt>Rank preview{rankWin && `, ${range(rankWin)}`}</dt>
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
            </dl>
            <dl className="outlook">
              <dt>PAGASA, {lgu.province}</dt>
              <dd>{outlook ? `${outlook.summary} (${outlook.advisory}, ${outlook.issued})` : "No outlook"}</dd>
            </dl>
            <SeasonSound key={lgu.psgc} value={moisture} index={windowIndex} playing={play.playing} onStart={play.start} />
          </> : <>
            <p className="hint">Select a town on the map or in the list. Push play to see the season.</p>
            <dl className="reading">
              <dt>All towns, mean soil water, {range(win)}</dt>
              <dd className="big" data-testid="mean">{reading(here.mean)}</dd>
              <dt>Towns with data</dt>
              <dd>{here.towns} of {lgus.length}</dd>
            </dl>
          </>}
        </aside>
      </div>

      <Timeline className="slider" id="window" name="Window" count={manifest.windows.length} index={windowIndex}
        onIndex={setWindow} label={range(win)} play={play} notes={notes} ticks={ticks} />
    </main>
  );
}
