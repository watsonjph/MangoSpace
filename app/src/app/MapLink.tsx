"use client";

import type { ComponentProps } from "react";
import { useMapSearch } from "./map-selection";

export default function MapLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  const search = new URLSearchParams(useMapSearch());
  const selection = new URLSearchParams();
  for (const key of ["town", "window"]) {
    const value = search.get(key);
    if (value) selection.set(key, value);
  }
  const query = selection.toString();
  // Document navigation avoids segment prefetch requests on static hosts.
  return <a {...props} href={href + (query ? `?${query}` : "")} />;
}
