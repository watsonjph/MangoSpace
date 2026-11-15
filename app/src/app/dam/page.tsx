import { readFile } from "node:fs/promises";
import path from "node:path";
import { Suspense } from "react";
import type { Metadata } from "next";
import type { Target } from "../../../lib/data";
import DamView from "./DamView";
import DamWithFixture from "./DamWithFixture";

export const metadata: Metadata = { title: "Dam · Hubas" };

export default async function Page() {
  const targets: Target[] = JSON.parse(await readFile(path.join(process.cwd(), "public/data/targets.json"), "utf8"));
  const dam = targets.find((target) => target.id === "malinao-dam")!;
  return (
    <Suspense fallback={<DamView dam={dam} />}>
      <DamWithFixture dam={dam} />
    </Suspense>
  );
}
