// [DX-DEMO1] The dashboard and the inspector page: serves demo/dashboard.html (at /) and demo/inspector.html on
// 127.0.0.1 and answers their calls with the same local functions the MCP tools use; it also runs the dashboard's
// bounded live load (load.ts) in this process. Usage: node src/page.ts [PORT=28580]
// Why: a browser view of one subject (facts, a field's timeline, both time axes, the feed) next to the assistant.
// Rejected: a framework or the playground's bundle (it renders its own fixture, not this database).
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { Demo, DemoError, stateFile } from "./store.ts";
import { Load } from "./load.ts";

const port = Number(process.argv[2] ?? 28580);
if ([15442, 17019, 5432, 6379, 4222, 4566, 16686].includes(port)) throw new Error("Reserved port");
const files: Record<string, [string, string]> = {
  "/": ["dashboard.html", "text/html"], "/dashboard.html": ["dashboard.html", "text/html"],
  "/inspector.html": ["inspector.html", "text/html"], "/measured.json": ["measured.json", "application/json"],
};
let demo: Demo | undefined;
let load: Load | undefined;
const get = () => (demo ??= new Demo());
const loader = () => (load ??= new Load(get()));

type Body = Record<string, unknown>;
const calls: Record<string, (d: Demo, b: Body) => Promise<object>> = {
  summary: (d) => d.summary(),
  accounts: (d) => d.listAccounts(),
  "load/start": async (_d, b) => loader().start(b),
  "load/stop": async () => loader().stop(),
  "load/status": async (_d, b) => loader().status(Number(b["since"] ?? 0)),
  "load/records": async () => loader().records(),
  subjects: (d, b) => d.findSubjects(b["account"] as string, Number(b["from"] ?? 0), Number(b["count"] ?? 10)),
  subject: (d, b) => d.readSubject(b["account"] as string, Number(b["subject"]), b["attribute"] as string | undefined),
  at: (d, b) => d.readSubjectAt(b["account"] as string, Number(b["subject"]), b["at"] as string, b["attribute"] as string | undefined, (b["recordedAt"] as string) || undefined, b["position"] === undefined || b["position"] === "" ? undefined : Number(b["position"])),
  history: (d, b) => d.fieldHistory(b["account"] as string, Number(b["subject"]), b["attribute"] as string, (b["kind"] as never) ?? "task", Number(b["limit"] ?? 40)),
  feed: (d, b) => d.changeFeed(b["after"] === undefined || b["after"] === "" ? undefined : Number(b["after"]), (b["account"] as string) || undefined, Number(b["limit"] ?? 20)),
  save: (d, b) => d.saveFacts(b["account"] as string, Number(b["subject"]), (b["kind"] as never) ?? "task", b["changes"] as Record<string, string>),
};

for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => { load?.stop("the dashboard server stopped"); process.exit(0); });

createServer(async (req, res) => {
  try {
    const file = req.method === "GET" ? files[(req.url ?? "").split("?")[0]!] : undefined;
    if (file) {
      res.writeHead(200, { "content-type": file[1] + "; charset=utf-8", "cache-control": "no-store" });
      res.end(readFileSync(join(import.meta.dirname, "../../../demo", file[0])));
      return;
    }
    const name = req.method === "POST" && req.url?.startsWith("/api/") ? req.url.slice(5) : "";
    const call = calls[name];
    if (!call) {
      res.writeHead(404).end();
      return;
    }
    let text = "";
    for await (const chunk of req) text += chunk;
    const value = await call(get(), text ? (JSON.parse(text) as Body) : {});
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(value));
  } catch (error) {
    const code = error instanceof DemoError ? error.code : ((error as { code?: string }).code ?? "Error");
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code, message: error instanceof Error ? error.message : String(error) } }));
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Dashboard on http://127.0.0.1:${port}/ and the subject inspector on http://127.0.0.1:${port}/inspector.html (state file ${stateFile()})`),
);
