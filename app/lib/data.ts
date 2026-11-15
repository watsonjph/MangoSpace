// The only link between pipeline/ and the app. Only the tech lead changes this file.
//
// Files in public/data:
//   manifest.json  Manifest
//   lgus.json      Lgu[]
//   lgus.geojson   FeatureCollection of town borders, properties: { psgc, name }
//   targets.json   Target[]
//   outlook.json   Outlook[]
// Image paths inside the JSON are relative to public/data.
// Radar images: PNG, 8-bit grey, 0 = −30 dB, 255 = 0 dB, north up, cut to the target bounds.

export type IsoDate = string
export type Bounds = [west: number, south: number, east: number, north: number]
export type Province = "Cebu" | "Bohol"

export interface Manifest {
  region: "PH-07"
  windows: { start: IsoDate; end: IsoDate }[]
  bounds: Bounds
  sme2Status: "provisional"
  rankWindow: number | null // index in windows of the "now" of the rank
  generatedAt: string
}

export interface Lgu {
  psgc: string
  name: string
  province: Province
  population: number
  soilMoisture: (number | null)[] // m³/m³ per window, good pixels only
  validShare: number[] // 0–1 per window
  rank: {
    position: number
    of: number
    stable: boolean
    parts: { dryness: number; dryingSpeed: number; people: number }
  } | null
}

export interface Target {
  id: "malinao-dam" | "ubay-rice" | "pilar-rice"
  kind: "reservoir" | "rice"
  bounds: Bounds
  nisar: {
    track: number
    dates: IsoDate[]
    images: { hh: string; hv: string }[]
    waterAreaKm2?: number[]
    meanHvDb?: number[]
  }
  rainMm: number[]
  history?: {
    sensor: "Sentinel-1" | "RADARSAT-1"
    event: "1997–98" | "2015–16" | "2023–24"
    dates: IsoDate[]
    waterAreaKm2?: number[]
    images: string[]
  }[]
  scenarios?: { label: string; basedOn: "2015–16" | "2023–24"; months: string[]; waterAreaKm2: number[] }[]
  // Rice only. The Sentinel-1 (C-band) pair nearest to one NISAR (L-band) date, same bounds and grey scale.
  cBand?: { date: IsoDate; nisarDate: IsoDate; images: { vv: string; vh: string }; meanDb: { vv: number; vh: number } }
}

export interface Outlook { province: Province; advisory: string; issued: IsoDate; summary: string }
export interface WaterBalance { psgc: string; months: string[]; soilMoisture: number[]; testedOn: "2015–16" } // wave 4
