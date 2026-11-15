import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import type { Target } from "../../../lib/data";
import DamView from "./DamView";

export const metadata: Metadata = { title: "Dam · Hubas" };

export default async function Page() {
  const targets: Target[] = JSON.parse(await readFile(path.join(process.cwd(), "public/data/targets.json"), "utf8"));
  return <DamView dam={targets.find((target) => target.id === "malinao-dam")!} />;
}
