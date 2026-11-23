// [DX-CON1] Gate of build step 0: the MCP server and the console's HTTP server are two doors to one catalogue.
// It starts its own page server on a spare port, connects the official MCP client over stdio, and for every tool:
//   - reading tools: the two JSON answers are equal once timing and head-dependent fields are set aside;
//   - changing tools: the same shape (every key path and value type) and equal on every field that does not depend on
//     the commit itself; the journal shows actor "assistant" for the MCP commit and "console" for the HTTP one.
// It also checks that the tool lists and input fields agree, and the HTTP server's Host and Origin rules.
// Usage: node src/gate-catalogue.ts [--port 28589] [--account account-003] [--json PATH]
// Never writes to account-010 (builder B's account). Times printed here are diagnostic only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { stateFile } from "./store.ts";
import { tools } from "./tools.ts";

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const port = Number(arg("--port", "28589"));
const account = arg("--account", "account-003")!;
assert(account !== "account-010" && account !== "10", "account-010 belongs to the console builder");
const base = `http://127.0.0.1:${port}`;

const page = spawn(process.execPath, [join(import.meta.dirname, "page.ts"), String(port)], {
  env: { ...process.env, TRIPLEX_DEMO_STATE: stateFile(), TRIPLEX_CONSOLE_URL: "http://127.0.0.1:28580" },
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise<void>((ok, fail) => {
  page.stdout!.on("data", (b: Buffer) => b.toString().includes("Triplex Console server") && ok());
  page.on("exit", (c) => fail(new Error("page server exited " + c)));
});
const client = new Client({ name: "triplex-console-gate", version: "0.1.0" });
await client.connect(new StdioClientTransport({
  command: process.execPath,
  args: [join(import.meta.dirname, "mcp.ts")],
  env: { ...process.env, TRIPLEX_DEMO_STATE: stateFile(), TRIPLEX_CONSOLE_URL: "http://127.0.0.1:28580" } as Record<string, string>,
  stderr: "inherit",
}));

const checks: { check: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: string) => {
  checks.push({ check: name, ok, ...(detail ? { detail } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -- " + detail : ""}`);
};

async function viaMcp(name: string, input: object) {
  const r = await client.callTool({ name, arguments: input as Record<string, unknown> });
  const text = (r.content as { type: string; text: string }[])[0]!.text;
  return { ok: !r.isError, value: JSON.parse(text) as Record<string, any> };
}
const origin = { origin: `http://127.0.0.1:${port}` };
async function viaHttp(name: string, input: object, headers: Record<string, string> = origin) {
  const res = await fetch(`${base}/api/tools/${name}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(input) });
  return { ok: res.ok, status: res.status, value: (await res.json()) as Record<string, any> };
}

// ---- catalogue agreement ----------------------------------------------------------------------------------------
const listed = (await client.listTools()).tools;
const cat = (await (await fetch(`${base}/api/catalogue`)).json()) as { tools: { name: string; changes: boolean; inputSchema: { properties?: object; required?: string[] } }[] };
check("MCP tool list equals the catalogue", JSON.stringify(listed.map((t) => t.name).sort()) === JSON.stringify(cat.tools.map((t) => t.name).sort()),
  `${listed.length} MCP, ${cat.tools.length} catalogue, ${tools.length} in tools.ts`);
for (const t of cat.tools) {
  const m = listed.find((x) => x.name === t.name)!;
  const props = (s: { properties?: object | undefined }) => Object.keys(s.properties ?? {}).sort().join(",");
  check(`input fields agree: ${t.name}`, props(m.inputSchema) === props(t.inputSchema), props(t.inputSchema) || "(none)");
  check(`change annotation agrees: ${t.name}`, (m.annotations?.readOnlyHint === true) === !t.changes);
}

// ---- comparing answers ------------------------------------------------------------------------------------------
const headFields = new Set(["timing", "position", "head", "nativeT", "transactionsSinceSeal", "cut"]);
const strip = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(strip)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !headFields.has(k)).map(([k, x]) => [k, strip(x)]))
  : v;
const shape = (v: unknown, path = ""): string[] =>
  Array.isArray(v) ? [path + "[]", ...(v.length ? shape(v[0], path + "[]") : [])]
  : v && typeof v === "object" ? Object.entries(v).flatMap(([raw, x]) => {
      const k = raw.replace(/position \d+/g, "position N").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, "T");
      return [`${path}.${k}:${x === null ? "null" : typeof x}`, ...shape(x, path + "." + k)];
    })
  : [];

async function sameRead(name: string, input: object) {
  const a = await viaMcp(name, input);
  const b = await viaHttp(name, input, {});
  let same = JSON.stringify(strip(a.value)) === JSON.stringify(strip(b.value));
  if (!same) {
    // A write elsewhere (builder B in account-010) can land between the two calls; one retry settles it.
    const a2 = await viaMcp(name, input);
    const b2 = await viaHttp(name, input, {});
    same = JSON.stringify(strip(a2.value)) === JSON.stringify(strip(b2.value));
  }
  check(`same JSON over MCP and HTTP: ${name}`, same && a.ok === b.ok,
    `${a.ok ? "answer" : "error " + a.value["error"]?.code}; MCP server ${a.value["timing"]?.serverMs ?? "-"} ms, HTTP server ${b.value["timing"]?.serverMs ?? "-"} ms (diagnostic)`);
  return a.value;
}
const stable = ["account", "subject", "entity", "attribute", "readbackMatches", "retiredFromCurrent", "consoleUrl", "database", "correctedUntil", "currentAfter", "readback"];
async function sameChange(name: string, input: object, before?: () => Promise<void>) {
  await before?.();
  const a = await viaMcp(name, input);
  await before?.();
  const b = await viaHttp(name, input);
  const pick = (v: Record<string, unknown>) => JSON.stringify(stable.map((k) => v[k]));
  const sameShape = JSON.stringify(shape(a.value)) === JSON.stringify(shape(b.value));
  check(`same shape and stable fields over MCP and HTTP: ${name}`, a.ok && b.ok && sameShape && pick(a.value) === pick(b.value),
    a.ok && b.ok ? `positions ${a.value["position"]} and ${b.value["position"]}` : `MCP ${JSON.stringify(a.value).slice(0, 200)} HTTP ${JSON.stringify(b.value).slice(0, 200)}`);
  return { mcp: a.value, http: b.value };
}

const summary = await sameRead("database_summary", {});
await sameRead("list_accounts", { checkDirectories: true });
await sameRead("find_subjects", { account, from: 0, count: 5 });
await sameRead("read_subject", { account, subject: 0 });
await sameRead("read_many_subjects", { account, subjects: [0, 1, 2] });
await sameRead("read_subject_at", { account, subject: 0, at: "2025-06-01T00:00:00Z" });
await sameRead("read_subject_at", { account, subject: 0, at: "2025-06-01T00:00:00Z", position: Number(summary["sealedHead"]) });
await sameRead("field_history", { account, subject: 0, attribute: ":task/field-0" });
await sameRead("change_feed", { after: Number(summary["sealedHead"]), limit: 5 });
await sameRead("change_feed", { after: Number(summary["sealedHead"]), limit: 5, account });
await sameRead("remove_on_request", { account, subject: 0 });
await sameRead("read_subject", { account, subject: 999_999 }); // the error path

const save = await sameChange("save_facts", { account, subject: 7, kind: "task", changes: { ":task/field-0": "catalogue gate" } });
const correct = await sameChange("correct_past_value", { account, subject: 7, kind: "task", attribute: ":task/field-1", value: "corrected by the catalogue gate", validFrom: "2026-01-01T00:00:00Z" });
const retire = await sameChange("retire_fact", { account, subject: 7, kind: "task", attribute: ":task/field-2" }, async () => {
  const r = await viaMcp("save_facts", { account, subject: 7, kind: "task", changes: { ":task/field-2": "to retire" } });
  assert(r.ok, JSON.stringify(r.value));
});

// The journal says who made each change.
const feed = await viaMcp("change_feed", { after: Number(save.mcp["position"]) - 1, limit: 50 });
const actorOf = (commandId: string) => (feed.value["transactions"] as { commandId: string; actor: string }[]).find((t) => t.commandId === commandId)?.actor;
for (const [name, pair] of [["save_facts", save], ["correct_past_value", correct], ["retire_fact", retire]] as const) {
  check(`journal actor of ${name}: assistant over MCP, console over HTTP`,
    actorOf(pair.mcp["receipt"].commandId) === "assistant" && actorOf(pair.http["receipt"].commandId) === "console",
    `${actorOf(pair.mcp["receipt"].commandId)}, ${actorOf(pair.http["receipt"].commandId)}`);
}

// ---- the HTTP server's rules ------------------------------------------------------------------------------------
const noOrigin = await viaHttp("save_facts", { account, subject: 7, kind: "task", changes: { ":task/field-0": "x" } }, {});
check("a changing tool without Origin is refused before it runs", noOrigin.status === 403 && noOrigin.value["error"]?.code === "OriginRequired");
const badOrigin = await viaHttp("database_summary", {}, { origin: "http://evil.example" });
check("any request from another Origin is refused", badOrigin.status === 403 && badOrigin.value["error"]?.code === "OriginRefused");
const otherPort = await viaHttp("save_facts", { account, subject: 7, kind: "task", changes: { ":task/field-0": "x" } }, { origin: "http://127.0.0.1:9" });
check("a changing tool from another loopback port is refused", otherPort.status === 403);
const badHost = await new Promise<number>((ok) => {
  import("node:http").then(({ request }) => {
    const r = request({ host: "127.0.0.1", port, path: "/api/catalogue", headers: { host: "attacker.example:" + port } }, (res) => { res.resume(); ok(res.statusCode ?? 0); });
    r.end();
  });
});
check("a request with a non-loopback Host is refused", badHost === 403);
const invalid = await viaHttp("find_subjects", { account, count: 500 }, {});
check("HTTP validates input with the tool's own schema", invalid.status === 400 && invalid.value["error"]?.code === "InvalidInput");
const conn = (await (await fetch(`${base}/api/connection`)).json()) as Record<string, unknown>;
check("GET /api/connection leaves the endpoints out", !("writeUrl" in conn) && !("readUrl" in conn) && conn["database"] === summary["database"]["id"]);
check("the connection records both pinned-read options on (G7)", JSON.stringify(conn["pinnedReads"]) === '{"shortcut":true,"cutLookup":true}', JSON.stringify(conn["pinnedReads"]));

await client.close();
page.kill();
const failed = checks.filter((c) => !c.ok);
const out = arg("--json");
if (out) writeFileSync(out, JSON.stringify({ gate: "catalogue", at: new Date().toISOString(), checks, passed: checks.length - failed.length, failed: failed.length }, null, 2) + "\n");
console.log(`CATALOGUE GATE ${failed.length ? "FAILED" : "PASSED"}: ${checks.length - failed.length} of ${checks.length} checks`);
process.exit(failed.length ? 1 : 0);
