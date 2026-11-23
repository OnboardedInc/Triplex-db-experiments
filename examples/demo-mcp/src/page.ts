// [DX-DEMO1] The inspector page: serves demo/inspector.html on 127.0.0.1 and answers its calls with the same local
// functions the MCP tools use. Usage: node src/page.ts [PORT=28580]
// Why: a browser view of one person (facts, a field's timeline, both time axes, the feed) next to the assistant.
// Rejected: a framework or the playground's bundle (it renders its own fixture, not this database).
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { Demo, DemoError, stateFile } from "./store.ts";

const port = Number(process.argv[2] ?? 28580);
if ([15442, 17019, 5432, 6379, 4222, 4566, 16686].includes(port)) throw new Error("Reserved port");
const page = join(import.meta.dirname, "../../../demo/inspector.html");
let demo: Demo | undefined;
const get = () => (demo ??= new Demo());

type Body = Record<string, unknown>;
const calls: Record<string, (d: Demo, b: Body) => Promise<object>> = {
  summary: (d) => d.summary(),
  accounts: (d) => d.listAccounts(),
  people: (d, b) => d.findPeople(b["account"] as string, Number(b["from"] ?? 0), Number(b["count"] ?? 10)),
  person: (d, b) => d.readPerson(b["account"] as string, Number(b["member"]), b["attribute"] as string | undefined),
  at: (d, b) => d.readPersonAt(b["account"] as string, Number(b["member"]), b["at"] as string, b["attribute"] as string | undefined, (b["recordedAt"] as string) || undefined),
  history: (d, b) => d.fieldHistory(b["account"] as string, Number(b["member"]), b["attribute"] as string, (b["kind"] as never) ?? "task"),
  feed: (d, b) => d.changeFeed(b["after"] === undefined || b["after"] === "" ? undefined : Number(b["after"]), (b["account"] as string) || undefined, Number(b["limit"] ?? 20)),
  save: (d, b) => d.saveFacts(b["account"] as string, Number(b["member"]), (b["kind"] as never) ?? "task", b["changes"] as Record<string, string>),
};

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/inspector.html")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(readFileSync(page));
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
  console.log(`Inspector page on http://127.0.0.1:${port}/ (state file ${stateFile()})`),
);
