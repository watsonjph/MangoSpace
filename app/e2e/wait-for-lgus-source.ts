import type { Map as MapLibreMap } from "maplibre-gl";

declare global {
  interface Window { hubasMap?: MapLibreMap }
}

export { waitForLgusSource } from "../scripts/wait-for-lgus-source.mjs";
