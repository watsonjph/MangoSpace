"use client";

import { usePathname } from "next/navigation";
import MapLink from "./MapLink";
import { LanguagePicker } from "./language";

const LINKS = [["/", "Soil water"], ["/dam", "Dam"], ["/rice", "Rice"], ["/score", "Score"], ["/method", "Method"]] as const;

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <MapLink href="/" className="brand" aria-label="Hubas home">Hubas<small>water before El Niño</small></MapLink>
      <LanguagePicker />
      <nav aria-label="Main">
        {LINKS.map(([href, label]) => (
          <MapLink key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</MapLink>
        ))}
      </nav>
    </header>
  );
}
