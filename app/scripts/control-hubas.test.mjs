import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(APP, "scripts", "control-hubas.mjs");
const PRELOAD = path.join(APP, "e2e", "fixtures", "steal-port.mjs");

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

test("up rejects a port stolen after its availability probe", async () => {
  assert.ok(existsSync(path.join(APP, "out", "index.html")), "run npm run build before npm test");
  const port = await freePort();
  const child = spawn(process.execPath, [
    "--import", pathToFileURL(PRELOAD).href,
    CLI, "up", "--no-build", "--port", String(port),
  ], {
    cwd: APP,
    env: { ...process.env, HUBAS_TEST_STOLEN_PORT: String(port) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
  const timeout = setTimeout(() => child.kill(), 15000);
  const [code] = await once(child, "close");
  clearTimeout(timeout);

  assert.equal(code, 1, `expected exit 1; stdout:\n${stdout}\nstderr:\n${stderr}`);
  assert.match(stdout, /"ok": false/);
  assert.match(stdout, /server process exited before it became ready/);
  assert.match(stdout, /EADDRINUSE/);
});
