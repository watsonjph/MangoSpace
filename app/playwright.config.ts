import { defineConfig } from "@playwright/test";

// Each Orca worktree runs its own server, so set PORT per worktree. Never reuse a running server:
// on a shared port it can belong to another worktree and the tests would run against the wrong code.
const url = `http://localhost:${process.env.PORT ?? "3000"}`;

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: url, video: "on", trace: "on" },
  webServer: { command: "npm run dev", url, reuseExistingServer: false },
});
