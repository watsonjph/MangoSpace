"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Document links work on static hosts without Next's segment prefetch requests. */
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <a href="/" className="brand" aria-label="Hubas home">Hubas</a>
      <nav aria-label="Main">
        <a href="/" aria-current={pathname === "/" ? "page" : undefined}>Soil water</a>
        <a href="/method" aria-current={pathname === "/method" ? "page" : undefined}>Method</a>
      </nav>
    </header>
  );
}
