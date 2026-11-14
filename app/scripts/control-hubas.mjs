#!/usr/bin/env node
// control-hubas: launch, check and drive the Hubas app the way a user does. Every command prints JSON.
// Used by the verify-hubas skill (.claude/skills/verify-hubas). Run `node scripts/control-hubas.mjs help`.
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(APP, "out");
const VERIFY = path.join(APP, ".verify");
const STATE = path.join(VERIFY, "state.json");
const EVIDENCE = path.join(VERIFY, "evidence");
const BASEMAP = "https://tiles.openfreemap.org/styles/positron";

const HELP = `control-hubas <command> [options]   (run from app/)

  up [--port 4310] [--no-build]   Build the static export and serve it. Prints the URL.
  doctor                          Read-only checks: server, build freshness, data, basemap.
  towns                           List town IDs (psgc) and names from public/data/lgus.json.
  drive [options]                 Open the app in Chromium, do the actions, save evidence.
      --click-town <psgc>         Click the town's shape on the map canvas.
      --town <psgc|"Name, Prov">  Pick the town in the "Town" dropdown.
      --window <n>                Set the "Window" slider to index n (0 = first 12-day window).
      --name <label>              Evidence folder name (default: timestamp).
      --viewport <WxH>            Browser size (default 1280x800). 375x812 gives the phone layout.
      --offline-basemap yes       Replace the OpenFreeMap base map with a plain background,
                                  the same stub the e2e specs use. For runs without internet.
    Actions run in this order: click-town, town, window.
    Prints the panel, the slider and console errors. Saves screenshot.png, aria.yml, result.json.
  down                            Stop the server that "up" started. Evidence stays.

Evidence: app/.verify/evidence/<name>/ (git-ignored; copy proof for a PR into docs/proof/).`;

const out = (o) => console.log(JSON.stringify(o, null, 2));
function fail(error, hint) {
  out({ ok: false, error, hint });
  process.exit(1);
}

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) fail(`Unexpected argument "${argv[i]}".`, "Options start with --. Run: node scripts/control-hubas.mjs help");
    const key = argv[i].slice(2);
    if (key.startsWith("no-")) o[key.slice(3)] = false;
    else if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) fail(`Option --${key} needs a value.`, HELP);
    else o[key] = argv[++i];
  }
  return o;
}

const readState = () => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : null);
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
async function get(url, method = "GET") {
  try {
    const r = await fetch(url, { method, signal: AbortSignal.timeout(5000) });
    return { status: r.status, text: method === "GET" ? await r.text() : "" };
  } catch (e) {
    return { status: 0, text: String(e.cause?.code ?? e.message) };
  }
}
function newest(dir) {
  let t = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }
  return t;
}

// ponytail: minimal static server for out/. No caching or range requests; the app needs neither.
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".geojson": "application/geo+json", ".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".txt": "text/plain", ".woff2": "font/woff2" };
function serve({ port }) {
  createServer((req, res) => {
    let p = path.join(OUT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(OUT)) return res.writeHead(403).end();
    if (existsSync(p) && statSync(p).isDirectory()) {
      p = existsSync(path.join(p, "index.html")) ? path.join(p, "index.html") : `${p}.html`;
    }
    if (!existsSync(p) && existsSync(`${p}.html`)) p = `${p}.html`;
    if (!existsSync(p)) return res.writeHead(404).end("not found");
    res.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? "application/octet-stream" });
    createReadStream(p).pipe(res);
  }).listen(Number(port), "127.0.0.1", () => console.log(`serving ${OUT} on ${port}`));
}

async function up(o) {
  const port = Number(o.port ?? 4310);
  const s = readState();
  if (s && alive(s.pid)) fail(`A server from "up" is already running at ${s.url} (pid ${s.pid}).`, "Use it, or run: node scripts/control-hubas.mjs down");
  if ((await get(`http://127.0.0.1:${port}/`)).status) fail(`Port ${port} is already in use by another process.`, "Pick a free port: node scripts/control-hubas.mjs up --port 4320");
  if (o.build !== false) {
    const b = spawnSync("npm", ["run", "build"], { cwd: APP, shell: true, encoding: "utf8" });
    if (b.status !== 0) fail("npm run build failed.", (b.stdout + b.stderr).split("\n").slice(-25).join("\n"));
  }
  if (!existsSync(path.join(OUT, "index.html"))) fail("out/index.html is missing.", "Run without --no-build, or run: npm run build");
  mkdirSync(VERIFY, { recursive: true });
  const log = openSync(path.join(VERIFY, "server.log"), "w");
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "serve", "--port", String(port)], { detached: true, stdio: ["ignore", log, log], windowsHide: true });
  child.unref();
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    if ((await get(`${url}/data/manifest.json`)).status === 200) {
      writeFileSync(STATE, JSON.stringify({ pid: child.pid, port, url, startedAt: new Date().toISOString() }, null, 2));
      return out({ ok: true, url, pid: child.pid, next: "node scripts/control-hubas.mjs doctor" });
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  process.kill(child.pid);
  fail("The server did not answer within 10 s.", `Read ${path.join(VERIFY, "server.log")}`);
}

async function doctor() {
  const s = readState();
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  add("state", !!s, s ? STATE : 'No server started by "up". Run: node scripts/control-hubas.mjs up');
  if (s) {
    add("process", alive(s.pid), `pid ${s.pid}`);
    const page = await get(`${s.url}/`);
    add("page", page.status === 200 && page.text.includes("Hubas"), `${s.url}/ → ${page.status}`);
    const m = await get(`${s.url}/data/manifest.json`);
    let manifest = null;
    try { manifest = JSON.parse(m.text); } catch { /* reported below */ }
    add("data", manifest?.region === "PH-07", manifest ? `region ${manifest.region}, ${manifest.windows.length} windows, generated ${manifest.generatedAt}` : `manifest → ${m.status}`);
  }
  const built = existsSync(path.join(OUT, "index.html")) ? statSync(path.join(OUT, "index.html")).mtimeMs : 0;
  const source = Math.max(...["src", "lib", "public"].map((d) => newest(path.join(APP, d))));
  add("build-fresh", built >= source, built >= source ? "out/ is newer than src, lib and public" : "Source changed after the last build. Run: down, then up");
  const b = await get(BASEMAP, "HEAD");
  add("basemap", b.status === 200, `${BASEMAP} → ${b.status || b.text}. Without it the map has no base layer and may not load.`);
  out({ ok: checks.every((c) => c.ok), url: s?.url, checks });
  if (!checks.every((c) => c.ok)) process.exit(1);
}

function towns() {
  const lgus = JSON.parse(readFileSync(path.join(APP, "public/data/lgus.json"), "utf8"));
  out(lgus.map((l) => ({ psgc: l.psgc, label: `${l.name}, ${l.province}`, ranked: !!l.rank })));
}

async function drive(o) {
  const s = readState();
  if (!s || !alive(s.pid)) fail("No running server.", "Run: node scripts/control-hubas.mjs up");
  const { chromium } = await import("playwright");
  const [w, h] = (o.viewport ?? "1280x800").split("x").map(Number);
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: "chrome" }));
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  const dir = path.join(EVIDENCE, o.name ?? new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(dir, { recursive: true });
  const steps = [];
  try {
    if (o["offline-basemap"] === "yes") {
      await page.route("https://tiles.openfreemap.org/**", (route) => route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e7ece9" } }] }),
      }));
      steps.push("offline basemap");
    }
    await page.goto(s.url);
    await page.locator(".map[data-ready=true] canvas").waitFor({ timeout: 20000 });
    await page.waitForFunction(() => window.hubasMap?.isSourceLoaded("lgus"), null, { timeout: 20000 });
    steps.push("map ready");

    if (o["click-town"]) {
      const id = o["click-town"];
      const geo = JSON.parse(readFileSync(path.join(APP, "public/data/lgus.geojson"), "utf8"));
      const f = geo.features.find((x) => x.properties.psgc === id);
      if (!f) throw new Error(`No town with psgc "${id}". Run: node scripts/control-hubas.mjs towns`);
      const ring = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
      const xs = ring.map((c) => c[0]), ys = ring.map((c) => c[1]);
      const tries = [[(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2], [xs.reduce((a, b) => a + b) / xs.length, ys.reduce((a, b) => a + b) / ys.length]];
      let hit = null;
      for (const lngLat of tries) {
        const p = await page.evaluate(([ll, want]) => {
          const m = window.hubasMap;
          const pt = m.project(ll);
          const ids = m.queryRenderedFeatures(pt, { layers: ["soil"] }).map((x) => String(x.id));
          const r = m.getCanvas().getBoundingClientRect();
          const onTop = document.elementFromPoint(r.left + pt.x, r.top + pt.y) === m.getCanvas(); // not under the slider or panel
          return ids.includes(want) && onTop ? { x: pt.x, y: pt.y } : null;
        }, [lngLat, id]);
        if (p) { hit = p; break; }
      }
      if (!hit) throw new Error(`Could not find a visible point inside "${id}" on the map. Use --town ${id} to pick it from the dropdown instead.`);
      await page.locator(".map canvas").click({ position: hit });
      steps.push(`clicked town ${id} at ${Math.round(hit.x)},${Math.round(hit.y)}`);
    }
    if (o.town) {
      const t = page.getByLabel("Town");
      const byValue = await t.locator(`option[value="${o.town}"]`).count();
      await t.selectOption(byValue ? o.town : { label: o.town });
      steps.push(`selected town ${o.town}`);
    }
    if (o.window !== undefined) {
      const max = Number(await page.getByLabel("Window").getAttribute("max"));
      if (!(Number(o.window) >= 0 && Number(o.window) <= max)) throw new Error(`--window must be 0 to ${max}.`);
      await page.getByLabel("Window").fill(String(o.window));
      steps.push(`set window ${o.window}`);
    }

    const text = async (loc) => ((await loc.count()) ? (await loc.first().textContent())?.trim() : null);
    const panel = await page.locator(".panel dl").count()
      ? Object.fromEntries(await page.locator(".panel dl dt").evaluateAll((dts) => dts.map((dt) => [dt.textContent.trim(), dt.nextElementSibling?.textContent.trim()])))
      : null;
    const result = {
      ok: consoleErrors.length === 0,
      url: s.url,
      steps,
      label: await text(page.locator(".tag")),
      legend: await page.getByTestId("soil-water-legend").count()
        ? (await page.getByTestId("soil-water-legend").innerText()).split("\n").map((t) => t.trim()).filter(Boolean)
        : null,
      window: { index: Number(await page.getByLabel("Window").inputValue()), range: await text(page.locator(".slider output")) },
      town: (await page.getByLabel("Town").inputValue()) || null,
      panel,
      consoleErrors,
      evidence: dir,
    };
    await page.screenshot({ path: path.join(dir, "screenshot.png"), fullPage: true }); // full page: on phones the panel and slider sit below the map
    writeFileSync(path.join(dir, "aria.yml"), await page.locator("body").ariaSnapshot());
    writeFileSync(path.join(dir, "result.json"), JSON.stringify(result, null, 2));
    out(result);
    if (!result.ok) process.exitCode = 1;
  } catch (e) {
    await page.screenshot({ path: path.join(dir, "failure.png") }).catch(() => {});
    out({ ok: false, error: e.message.split("\n")[0], steps, consoleErrors, evidence: dir, hint: "See failure.png. Run doctor if the page did not load." });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

function down() {
  const s = readState();
  if (!s) return out({ ok: true, detail: "Nothing to stop." });
  if (alive(s.pid)) process.kill(s.pid);
  rmSync(STATE);
  out({ ok: true, stopped: s.pid, evidenceKept: EVIDENCE });
}

const [cmd, ...rest] = process.argv.slice(2);
const o = args(rest);
const commands = { up, doctor, towns, drive, down, serve };
if (!cmd || cmd === "help" || cmd === "--help") console.log(HELP);
else if (!commands[cmd]) fail(`Unknown command "${cmd}".`, HELP);
else await commands[cmd](o);
