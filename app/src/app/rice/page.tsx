import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import type { Target } from "../../../lib/data";
import RiceView from "./RiceView";

export const metadata: Metadata = { title: "Rice · Hubas" };

export default async function Page() {
  const targets: Target[] = JSON.parse(await readFile(path.join(process.cwd(), "public/data/targets.json"), "utf8"));
  return <RiceView parcels={targets.filter((target) => target.kind === "rice" && target.nisar.meanHvDb?.length)} />;
}
