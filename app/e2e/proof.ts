import path from "node:path";
import type { Page } from "@playwright/test";

// Proof images are committed, so a normal test run must not rewrite them. Run with PROOF=1 to update them.
export async function saveProof(page: Page, name: string) {
  if (process.env.PROOF !== "1") return;
  await page.screenshot({ path: path.resolve(process.cwd(), "..", "docs", "proof", name), fullPage: true });
}
