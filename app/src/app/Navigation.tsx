"use client";

import { usePathname } from "next/navigation";
import MapLink from "./MapLink";
import { getMapMode, setMapSelection, useMapSearch } from "./map-selection";

export default function Navigation() {
  const pathname = usePathname();
  const mode = getMapMode(useMapSearch());

  return (
    <header className="topbar">
      <MapLink href="/" className="brand" aria-label="Hubas home">Hubas</MapLink>
      <nav aria-label="Main">
        {pathname === "/" ? (
          <div className="map-mode" role="group" aria-label="Map view">
            <button type="button" aria-pressed={mode === "soil"} onClick={() => setMapSelection("mode", "soil")}>Soil water</button>
            <button type="button" aria-pressed={mode === "rank"} onClick={() => setMapSelection("mode", "rank")}>Rank</button>
          </div>
        ) : <MapLink href="/">Soil water</MapLink>}
        <MapLink href="/dam" aria-current={pathname === "/dam" ? "page" : undefined}>Dam</MapLink>
        <MapLink href="/rice" aria-current={pathname === "/rice" ? "page" : undefined}>Rice</MapLink>
        <MapLink href="/method" aria-current={pathname === "/method" ? "page" : undefined}>Method</MapLink>
      </nav>
    </header>
  );
}
