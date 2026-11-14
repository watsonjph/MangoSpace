import type { Metadata } from "next";
import DamView from "./DamView";

export const metadata: Metadata = { title: "Malinao Dam · Hubas" };

export default function DamPage() {
  return <DamView />;
}
