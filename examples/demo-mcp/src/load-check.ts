// [DX-DEMO1] The dashboard load check: start a bounded load through the dashboard server's own endpoints (or take the run
// a viewer started with the Start button: --existing), sample it per second, stop it, then check every acknowledged save
// and every read against the SDK at the same position. Used by proof.ts, and alone:
//   node src/load-check.ts --dashboard http://127.0.0.1:28580 --existing        (verify the run a viewer pressed)
//   node src/load-check.ts [--load-saves 20 --load-reads 200 --load-seconds 60]  (start one on a private server)
import assert from "node:assert/strict";
import { join } from "node:path";
import { DatomicClient } from "@triplex-build/triplex-datomic";
import { loadConnection, type Connection } from "./store.ts";

type Rows = Awaited<ReturnType<DatomicClient["rows"]>>;
type Ctx = { arg: (name: string) => string | undefined; conn: Connection; reader: DatomicClient;
  rowsAt: (entityIds: string[], position: number, validAt: number, history?: boolean) => Promise<Rows>; big: boolean };
// ---- the dashboard's live load: start it through the dashboard server's own endpoint, sample it per second, stop it,
// then check every acknowledged save and every read against the SDK at the same position --------------------------
type LoadStatus = { running: boolean; runId: string; options: { savesPerSecond: number; readsPerSecond: number; subjects: number; seconds: number }; startHead: number; head: number;
  totals: { saves: number; reads: number; errors: number; gateway: { save: { p50: number | null; p99: number | null }; current: { p50: number | null; p99: number | null }; pinned: { p50: number | null; p99: number | null } }; transact: { p50: number | null; p99: number | null } };
  seconds: { second: number; done: Record<string, number>; partial: boolean }[]; errors: string[] };
export async function checkLoad({ arg, conn, reader, rowsAt, big }: Ctx) {
  const num = (name: string, d: number) => Number(arg(name) ?? d);
  const bounds = { savesPerSecond: num("--load-saves", big ? 20 : 10), readsPerSecond: num("--load-reads", big ? 200 : 60),
    seconds: num("--load-seconds", big ? 60 : 15), subjects: num("--load-subjects", 300) };
  let base = arg("--dashboard");
  let server: import("node:child_process").ChildProcess | undefined;
  if (!base) {
    const { spawn } = await import("node:child_process");
    server = spawn(process.execPath, [join(import.meta.dirname, "page.ts"), "28590"], { stdio: ["ignore", "pipe", "inherit"], env: process.env });
    await new Promise<void>((ok) => server!.stdout!.on("data", (d) => { if (String(d).includes("Dashboard on")) ok(); }));
    base = "http://127.0.0.1:28590";
  }
  const api = async (name: string, body: object = {}): Promise<any> => {
    const r = await fetch(`${base}/api/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json() as any;
    if (j.error) throw new Error(`${name}: ${j.error.code} ${j.error.message}`);
    return j;
  };
  const page = await (await fetch(base + "/")).text();
  assert(page.includes("Live load") && page.includes("Measured results"), "the dashboard page is served");
  if (!process.argv.includes("--existing")) await api("load/start", bounds);
  const sampled = new Set<number>();
  let status: LoadStatus;
  for (;;) {
    await new Promise((r) => setTimeout(r, 1000));
    status = await api("load/status", { since: 0 });
    for (const sec of status.seconds) if (!sec.partial) sampled.add(sec.second);
    if (!status.running) break;
    // Stop one second early through the stop endpoint, to exercise the button.
    if (!process.argv.includes("--existing") && status.seconds.length >= bounds.seconds) await api("load/stop");
  }
  await new Promise((r) => setTimeout(r, 1500)); // let in-flight operations settle
  status = await api("load/status", { since: 0 });
  const records = await api("load/records") as { saves: { entity: string; attribute: string; value: string; position: number }[];
    reads: { root: string; position: number; validAt: number; entities: string[]; facts: number; digest: string }[] };
  server?.kill("SIGTERM");
  const { canonicalFact, digest } = await import("./load.ts");
  const valueOf = (r: { value_type: string; value_string: string | null; value_number: number | null; value_datetime: number | null }) =>
    r.value_type === "string" ? r.value_string : r.value_type === "datetime" ? r.value_datetime : r.value_type === "integer" ? (r.value_string ?? r.value_number) : r.value_number;
  const pool = async <T>(items: T[], width: number, work: (x: T) => Promise<void>) => {
    let i = 0;
    await Promise.all(Array.from({ length: width }, async () => { while (i < items.length) await work(items[i++]!); }));
  };
  const badSaves: string[] = [], badReads: string[] = [];
  await pool(records.saves, 16, async (a) => {
    const rows = (await rowsAt([a.entity], a.position, Date.now())).filter((r) => r.attribute === a.attribute);
    if (rows.length !== 1 || rows[0]!.value_string !== a.value) badSaves.push(`${a.entity} at ${a.position}`);
  });
  await pool(records.reads, 16, async (x) => {
    const rows = await rowsAt(x.entities, x.position, x.validAt);
    const d = digest(rows.map((r) => canonicalFact(r.entity_id, r.attribute, r.value_type, valueOf(r))));
    if (rows.length !== x.facts || d !== x.digest) badReads.push(`${x.root} at ${x.position}`);
  });
  const lastPerEntity = new Map<string, { value: string; position: number }>();
  for (const a of records.saves) if ((lastPerEntity.get(a.entity)?.position ?? 0) < a.position) lastPerEntity.set(a.entity, a);
  const headNow = Number((await reader.basis(conn.database)).position.v);
  await pool([...lastPerEntity.entries()], 16, async ([entity, a]) => {
    const rows = (await rowsAt([entity], headNow, Date.now())).filter((r) => r.attribute === ":task/field-4");
    if (rows.length !== 1 || rows[0]!.value_string !== a.value) badSaves.push(`${entity} not current at the head`);
  });
  assert(status.totals.saves > 0 && status.totals.reads > 0, "the load acknowledged saves and returned reads");
  assert.equal(badSaves.length, 0, `saves not found exactly: ${badSaves.slice(0, 5).join(", ")}`);
  assert.equal(badReads.length, 0, `reads not exact: ${badReads.slice(0, 5).join(", ")}`);
  assert(headNow >= status.startHead + records.saves.length, "the head advanced by at least the acknowledged saves");
  const result = { status, savesChecked: records.saves.length, readsChecked: records.reads.length, secondsSampled: sampled.size };
  console.log(`LOAD CHECK PASSED: ${records.saves.length} acknowledged saves present at their positions (and the last of each subject current at head ${headNow}); ${records.reads.length} reads exact against the SDK at the same position; ${sampled.size} per-second samples; ${status.totals.errors} errors`);
  return result;
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const arg = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
  const conn = loadConnection();
  const reader = new DatomicClient(conn.readUrl, 60_000);
  const rowsAt = (entityIds: string[], position: number, validAt: number, history = false) =>
    reader.rows(conn.database, { entityIds, basis: { recordedPosition: position, validAt }, basisWaitMs: 2000, ...(history ? { history: true } : {}) });
  const r = await checkLoad({ arg, conn, reader, rowsAt, big: conn.kind === "1b" });
  console.log(JSON.stringify({ runId: r.status.runId, options: r.status.options, totals: r.status.totals, startHead: r.status.startHead, head: r.status.head }, null, 2));
  reader.close();
}
