// [DX-DEMO1, DX-CON1] The console's local server, on 127.0.0.1 only. It serves the built web app
// (examples/console/dist), the tool catalogue and the connection, and runs every catalogue entry with the same local
// functions the MCP server uses.
//   GET  /api/catalogue       every tool: name, title, group, sentences, description, changes, annotations, input schema
//   GET  /api/connection      what this server is connected to, from the private connection file (no endpoints)
//   POST /api/tools/:name     run one tool; body is its input; answer is the tool's JSON (or { error } with 400)
// Usage: node src/page.ts [PORT=28580]
// Why: the app is a client of the catalogue, like the assistant. A changing request needs the console's own Origin,
// as Triplex's dashboard server requires (packages/dashboard/src/server-security.ts), and the Host must be loopback.
// Rejected: a framework (one file of node:http is enough) and CORS headers (the app is served from this origin).
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { loadConnection, stateFile } from "./store.ts";
import { byName, catalogue, errorOf, runTool, toJson } from "./tools.ts";

const port = Number(process.argv[2] ?? 28580);
if (!Number.isSafeInteger(port) || port < 1024 || [15442, 17019, 5432, 6379, 4222, 4566, 16686].includes(port))
  throw new Error("Choose a free port above 1023 that is not one of the lab's reserved ports");
process.env["TRIPLEX_CONSOLE_URL"] ??= `http://127.0.0.1:${port}`;

const dist = normalize(join(import.meta.dirname, "../../console/dist"));
const legacyPage = join(import.meta.dirname, "../../../demo/inspector.html");
const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);
// The console's own origin, plus the Vite dev server (28581), which proxies /api here.
const devPorts = (process.env["TRIPLEX_CONSOLE_DEV_PORTS"] ?? "28581").split(",").map((p) => p.trim()).filter(Boolean);
const allowedPorts = new Set([String(port), ...devPorts]);

function originAllowed(origin: string | undefined) {
  if (origin === undefined) return undefined;
  try {
    const u = new URL(origin);
    return u.protocol === "http:" && loopback.has(u.hostname) && allowedPorts.has(u.port) && !u.username && !u.password &&
      u.pathname === "/" && !u.search && !u.hash;
  } catch {
    return false;
  }
}
function hostAllowed(host: string | undefined) {
  if (!host) return false;
  try {
    const u = new URL("http://" + host);
    return loopback.has(u.hostname) && allowedPorts.has(u.port || "80");
  } catch {
    return false;
  }
}

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".map": "application/json", ".txt": "text/plain; charset=utf-8",
};

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(toJson(body));
}

/** The connection in words. Endpoints (the local forward ports) are left out. */
function connectionView() {
  const c = loadConnection();
  const { writeUrl: _w, readUrl: _r, ...rest } = c;
  return {
    ...rest,
    file: stateFile(),
    label: c.kind === "1b" ? "The 1 billion record database (working copy)" : "Small database on this Mac (working copy)",
    subjects: c.roster.reduce((n, r) => n + r.people, 0),
    recordTimeRange: {
      first: iso(Number(c.clocks?.["seedRecordedAt"] ?? NaN)),
      lastAtBringUp: iso(c.lastRecordedAtBringUp ?? Number(c.clocks?.["lastRecordedAt"] ?? NaN)),
    },
    pinnedReads: (c as { pinnedReads?: unknown }).pinnedReads ?? null,
  };
}
const iso = (ms: number | null | undefined) =>
  ms === null || ms === undefined || !Number.isFinite(ms) ? null : new Date(ms).toISOString();

async function readBody(req: IncomingMessage) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 1 << 20) throw Object.assign(new Error("Request body over 1 MiB"), { code: "InvalidInput" });
  }
  return text ? JSON.parse(text) : {};
}

function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const path = decodeURIComponent((req.url ?? "/").split("?")[0]!);
  if (existsSync(join(dist, "index.html"))) {
    const file = normalize(join(dist, path));
    const inside = file.startsWith(dist + "/") && existsSync(file) && statSync(file).isFile();
    const chosen = inside ? file : join(dist, "index.html"); // every app route falls back to the app
    res.writeHead(200, {
      "content-type": types[extname(chosen)] ?? "application/octet-stream",
      "cache-control": chosen.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-store",
    });
    res.end(readFileSync(chosen));
    return;
  }
  if (path === "/inspector.html" && existsSync(legacyPage)) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(readFileSync(legacyPage));
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(`<!doctype html><meta charset="utf-8"><title>Triplex Console</title><body style="font-family:system-ui;margin:2rem">
<h1>Triplex Console</h1><p>The web app is not built yet (examples/console/dist). The API is up:
<a href="/api/catalogue">/api/catalogue</a>, <a href="/api/connection">/api/connection</a>, POST /api/tools/:name.</p>`);
}

createServer(async (req, res) => {
  try {
    if (!hostAllowed(req.headers.host)) return send(res, 403, { error: { code: "HostRefused", message: "Use http://127.0.0.1:" + port } });
    const origin = originAllowed(req.headers.origin);
    if (origin === false) return send(res, 403, { error: { code: "OriginRefused", message: "Requests come only from the console's own page" } });
    const path = (req.url ?? "/").split("?")[0]!;
    if (req.method === "GET" && path === "/api/catalogue") return send(res, 200, catalogue());
    if (req.method === "GET" && path === "/api/connection") {
      try {
        return send(res, 200, connectionView());
      } catch (error) {
        return send(res, 503, { error: { code: "NotConnected", message: `Run bash demo/connect.sh. ${(error as Error).message}`, file: stateFile() } });
      }
    }
    if (req.method === "GET" && path === "/api/health") return send(res, 200, { ok: true });
    if (path.startsWith("/api/tools/")) {
      if (req.method !== "POST") return send(res, 405, { error: { code: "MethodNotAllowed", message: "POST a JSON body" } });
      const name = decodeURIComponent(path.slice("/api/tools/".length));
      const tool = byName.get(name);
      if (!tool) return send(res, 404, { error: { code: "UnknownTool", message: `No tool named ${name}` } });
      if (tool.changes && origin !== true)
        return send(res, 403, { error: { code: "OriginRequired", message: "A tool that changes data runs only from the console's own page (Origin header)" } });
      try {
        const body = await readBody(req);
        return send(res, 200, await runTool(name, body, "console"));
      } catch (error) {
        return send(res, 400, errorOf(error));
      }
    }
    if (path.startsWith("/api/")) return send(res, 404, { error: { code: "NotFound", message: path } });
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: { code: "MethodNotAllowed", message: req.method ?? "" } });
    serveStatic(req, res);
  } catch (error) {
    send(res, 500, errorOf(error));
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Triplex Console server on http://127.0.0.1:${port}/ (connection file ${stateFile()}; app ${existsSync(join(dist, "index.html")) ? "built" : "not built"})`),
);
