"use client";

import { usePathname } from "next/navigation";
import MapLink from "./MapLink";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <MapLink href="/" className="brand" aria-label="Hubas home">Hubas</MapLink>
      <nav aria-label="Main">
        <MapLink href="/" aria-current={pathname === "/" ? "page" : undefined}>Soil water</MapLink>
        <MapLink href="/dam" aria-current={pathname === "/dam" ? "page" : undefined}>Dam</MapLink>
        <MapLink href="/method" aria-current={pathname === "/method" ? "page" : undefined}>Method</MapLink>
      </nav>
    </header>
  );
}
