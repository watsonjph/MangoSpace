import type { Metadata } from "next";
import MapLink from "../MapLink";
export const metadata: Metadata = { title: "Demo slides · Hubas", description: "A seven-slide English demo of Hubas, built by Team MangoSpace for Dancing with the SARs." };
export default function DemoPage() {
  return <main className="method-page"><p className="eyebrow">Team MangoSpace · Space Apps 2026</p><h1>Hubas in 7 slides</h1>
    <p><a href="/demo/Hubas-demo.pptx" download>Download the PowerPoint demo</a></p>
    <p>English slide demo for Dancing with the SARs. AI-assisted layout and text; screenshots and radar imagery show actual packaged observations. Source links are in the slide notes.</p>
    {Array.from({ length: 7 }, (_, i) => <figure key={i} style={{ margin: "24px 0" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/demo/slide-${i + 1}.png`} alt={`Hubas demo slide ${i + 1} of 7`} width={1280} height={720} style={{ width: "100%", height: "auto" }} />
    </figure>)}<p><MapLink href="/">Explore the live app</MapLink> · <MapLink href="/method">Read the method and limits</MapLink></p></main>;
}
