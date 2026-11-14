"use client";

import { useSyncExternalStore } from "react";

const event = "hubas-selection";

function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener(event, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(event, notify);
  };
}

export function useMapSearch() {
  return useSyncExternalStore(subscribe, () => window.location.search, () => "");
}

export function setMapSelection(key: "town" | "window", value: string) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(event));
}
