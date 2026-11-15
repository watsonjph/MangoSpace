import type { Metadata } from "next";
import MapLink from "../MapLink";
import towns from "../../../public/data/lgus.json";

export const metadata: Metadata = { title: "Start here · Hubas", description: "Follow the soil, the dam and the rice in Cebu and Bohol before El Niño." };

export default function StartPage() {
  const people = towns.reduce((sum, town) => sum + town.population, 0);
  return <main className="story-page">
    <p className="eyebrow">Hubas · Cebu and Bohol</p>
    <h1>What happened to water before El Niño?</h1>
    <p className="story-intro">See the wet season in 3 parts: the soil, the dam and the rice. These are satellite measurements, not a forecast.</p>
    <ol className="story-steps">
      <li><span className="eyebrow">01 · The soil</span><h2>Mean soil water fell from about 0.35 to 0.25 m³/m³ at the end of July.</h2>
        <p>Source: NISAR SME2. The readings are provisional and coverage changes between windows.</p><MapLink href="/">Play the soil season</MapLink></li>
      <li><span className="eyebrow">02 · The dam</span><h2>Malinao Dam stayed at 0.76–0.82 km² in 2026; its area fell 52% in March 2016.</h2>
        <p>Sources: NISAR GCOV and Sentinel-1. The historical fall is relative to that event’s first reading, not a comparison of areas between sensors.</p><MapLink href="/dam">Compare the dam dates</MapLink></li>
      <li><span className="eyebrow">03 · The rice</span><h2>The HV radar signal rose about 5–6 dB to its peak, then fell 3–4 dB on 5 Nov 2026.</h2>
        <p>Source: NISAR GCOV, Ubay and Pilar parcels. No field observations confirm crop stages.</p><MapLink href="/rice">Explore the rice dates</MapLink></li>
    </ol>
    <section><h2>Why Cebu and Bohol?</h2><p>These {towns.length} towns and cities are home to {(people / 1_000_000).toFixed(1)} million people (PSA, 2024 census). PAGASA’s El Niño Advisory No. 6 expects below-normal rain in November 2026. The wet season gives the coming months a baseline.</p></section>
    <section><h2>Who can use Hubas?</h2><p>A town office can inspect readings and coverage before a field check.</p><p>A water district can compare reservoir dates with rain.</p><p>A teacher can explain how radar records a changing season and where its limits are.</p></section>
    <p><MapLink href="/method">Read the method and limits</MapLink> · <MapLink href="/">Return to the map</MapLink></p>
  </main>;
}
