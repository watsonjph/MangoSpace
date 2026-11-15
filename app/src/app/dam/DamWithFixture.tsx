"use client";

import { useSearchParams } from "next/navigation";
import type { Target } from "../../../lib/data";
import DamView from "./DamView";
import { withDamFixture } from "./test-fixtures";

export default function DamWithFixture({ dam }: { dam: Target }) {
  const searchParams = useSearchParams();
  const fixture = process.env.NODE_ENV === "development" ? searchParams.get("fixture") : null;
  return <DamView dam={fixture ? withDamFixture(dam, fixture) : dam} />;
}
