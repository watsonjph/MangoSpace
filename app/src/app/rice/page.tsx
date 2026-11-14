import type { Metadata } from "next";
import RiceView from "./RiceView";

export const metadata: Metadata = { title: "Rice samples · Hubas" };
export default function RicePage() { return <RiceView />; }
