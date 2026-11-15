"use client";

import { useSyncExternalStore } from "react";

const event = "hubas-selection";
// The selection lives here first and reaches the URL after a pause. null means read the URL.
let search: string | null = null;
let pendingWrite: number | undefined;

function subscribe(notify: () => void) {
  const fromUrl = () => {
    window.clearTimeout(pendingWrite);
    search = null;
    notify();
  };
  window.addEventListener("popstate", fromUrl);
  window.addEventListener(event, notify);
  return () => {
    window.removeEventListener("popstate", fromUrl);
    window.removeEventListener(event, notify);
  };
}

export function useMapSearch() {
  return useSyncExternalStore(subscribe, () => search ?? window.location.search, () => "");
}

export function setMapSelection(key: "town" | "window", value: string) {
  const params = new URLSearchParams(search ?? window.location.search);
  if (value) params.set(key, value);
  else params.delete(key);
  const query = params.toString();
  search = query ? `?${query}` : "";
  window.dispatchEvent(new Event(event));
  // Safari throws after 100 replaceState calls in 10 seconds, which takes down the page, so write once the slider rests.
  window.clearTimeout(pendingWrite);
  pendingWrite = window.setTimeout(() => {
    const url = new URL(window.location.href);
    url.search = search ?? url.search;
    window.history.replaceState(null, "", url);
  }, 300);
}
