// [DX-API1] The parsed-entity cache (entity_cache.clj, DX-B7-S3) under the events that change what a cached subject
// holds, and the world rule with a shared entity. Started by gate.sh with API1_DRIVER=cache-gate.ts; phases in
// API1_PHASES (comma-separated):
//   cache    two protected scopes (unsealed and sealed), each seeded with subjects that carry protected values on their
//            profile and first task. Both readers (8081 and 8082, separate processes, each its own cache) read every
//            subject's world first, so each holds it. Then, in order: (a) removals on request by assertion, by entity and
//            attribute, and by entity; (b) a removal committed in Datomic but not published (its publication made to fail),
//            with a derived write that copies the value, then the removal resumed; (c) settlement-shaped frames (ticketed
//            writes of what a subject owes) and a release change; (d) an import frame and the creation of entities inside
//            a cached world, and an import replay of a removed field; (e) a reader restarted, and a reader stopped while a
//            save and a removal land, then resumed. After every event every subject is probed on both readers, through
//            reach-many (with and without a session), the batch (reach, rows) and the rows route, at the head, at a pinned
//            position before the event and after it: a removed value must appear in no answer; every world entity must
//            equal the rows route's answer for it at the same position; the revision of every changed entity is recorded.
//   shared   one shared entity referenced by 1, 100 and 10,000 subjects (forward references only, then also with the shared
//            entity listing its members): what one subject's world returns and costs, followed and with stopAt.
//   request  the fixed cost of one request: keep-alive off, gzip on the world, the account entity as row texts.
// Times are diagnostic (the Mac); counts are results.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, readBatch } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText, decodeRowTextColumns } from "../../../../packages/datomic/dist/rowText.js";
import { decodeRow } from "../../../../packages/datomic/dist/protocol.js";
import { deepOwnFacts, taskId } from "../../../bench/lib/deep-world.ts";
import { ids } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { scaleAccount } from "../prep1/ceiling-seed.ts";
import { def, definitionFacts, releaseChange, templateFacts } from "./shapes.ts";

const [out, writerUrl, warmUrl, coldUrl] = process.argv.slice(2);
const phases = new Set((process.env.API1_PHASES ?? "cache,shared,request").split(","));
const container = process.env.API1_CONTAINER!;
const people = Number(process.env.API1_SUBJECTS ?? 24);
const log = (...a: unknown[]) => console.error(new Date().toISOString(), ...a);
const waitFor = async (file: string, seconds: number) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out!, file)); i++) await sleep(250);
  assert(existsSync(join(out!, file)), "timed out waiting for " + file);
};
await waitFor("ready", 300);
const nonce = crypto.randomUUID().slice(0, 8);
const writer = new DatomicClient(writerUrl!, 60_000);
const readers = { warm: new DatomicClient(warmUrl!, 60_000), cold: new DatomicClient(coldUrl!, 60_000) };
const A = "acct/" + scaleAccount(0) + "/";
type F = { e: string; a: string; v: { type: string; value: string } };
const withPrefix = (f: F): F => ({ e: A + f.e, a: f.a, v: f.v.type === "ref" ? { type: "ref", value: A + f.v.value } : f.v });
const str = (value: string) => ({ type: "string", value });
const ref = (value: string) => ({ type: "ref", value });
const results: Record<string, any> = { nonce };
const save = () => writeFileSync(join(out!, "cache-gate.json"), JSON.stringify(results, null, 2) + "\n");

const transact = async (db: string, input: unknown) => {
  for (let attempt = 0; ; attempt++) {
    try { return await writer.transact(db, input as any); }
    catch (e: any) {
      if (e?.code === "OperationDuplicate" && attempt > 0) return undefined;
      if (e?.code !== "OutcomeUnknown" || attempt >= 4) throw e;
    }
  }
};
const headOf = async (c: DatomicClient, db: string) => Number((await c.request<any>("GET", "/v1/db/" + db + "/write-options")).position);
const rowsAt = async (c: DatomicClient, db: string, entityIds: string[], basis: object) =>
  ((await c.request<any>("POST", "/v1/db/" + db + "/read", { entityIds, basis })).rows as any[]);
// One commit that replaces the given attributes' current values (the old rows are read at the head and retracted).
const replace = async (db: string, id: string, change: F[], extra: Record<string, unknown> = {}) => {
  const head = await headOf(writer, db);
  const old: any[] = [];
  for (const e of [...new Set(change.map((f) => f.e))]) {
    const rows = (await rowsAt(writer, db, [e], { recordedPosition: head, validAt: Date.now() })).map(decodeRow);
    old.push(...rows.filter((r) => change.some((f) => f.e === e && f.a === r.attribute)));
  }
  return transact(db, { ...command(id, change as any, old), ...extra });
};
const pidOf = (port: number) => readFileSync(join(out!, `pid-${port}`), "utf8").trim();
const cpuMs = (port: number) => {
  const stat = execFileSync("docker", ["exec", container, "cat", `/proc/${pidOf(port)}/stat`], { encoding: "utf8" });
  const f = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
  return (Number(f[11]) + Number(f[12])) * 10;
};
const cacheStats = async (c: DatomicClient) => (await c.request<any>("GET", "/v2/admin/scan-stats")).entityCache;

// ---- Seeding a protected scope.
const PROTECTED = [":worker/secret", ":task/secret"];
const secretOf = (mode: string, kind: "w" | "t", i: number) => `SECRET-${mode}-${kind}-${i}-${nonce}`;
const root = (i: number) => A + ids.placement(i), profile = (i: number) => A + ids.worker(i), task0 = (i: number) => A + taskId(i, 0);
async function seedProtected(mode: "unsealed" | "sealed") {
  const scope = JSON.stringify(["triplex-scope-v1", "test", "test", `dx-api1-cache-${mode}-${nonce}`, 0]);
  const init = await writer.create(scope, "lean", true, 60_000);
  assert(init.created && /^s2-/.test(init.db), "a new s2 scope");
  await writer.declareProtection(init.db, PROTECTED, mode === "sealed");
  const db = init.db as string;
  await transact(db, command(`cache-${mode}-defs-${nonce}`, definitionFacts(A) as any));
  for (let i = 0; i < people; i++) {
    const facts = [...deepOwnFacts(i).map((f) => withPrefix(f as F)), ...(templateFacts(A, i) as F[]),
      { e: profile(i), a: ":worker/secret", v: str(secretOf(mode, "w", i)) }, { e: task0(i), a: ":task/secret", v: str(secretOf(mode, "t", i)) }];
    await transact(db, command(`cache-${mode}-s-${i}-${nonce}`, facts as any));
  }
  return { scope, db, mode };
}

// ---- Probes.
type Probe = { reader: "warm" | "cold"; route: string; basis: string; subject: number; status: number | string; text: string; position?: number };
const post = async (c: DatomicClient, path: string, body: unknown) => {
  try { const r = await c.request<any>("POST", path, body); return { status: 200, json: r, text: JSON.stringify(r) }; }
  catch (e: any) { return { status: e?.status ?? e?.code ?? "error", json: undefined, text: String(e?.code ?? e?.message ?? e) }; }
};
async function probeSubject(db: string, reader: "warm" | "cold", i: number, bases: Record<string, number | undefined>): Promise<Probe[]> {
  const c = readers[reader], out: Probe[] = [];
  for (const [label, P] of Object.entries(bases)) {
    const basis = { validAt: Date.now(), ...(P !== undefined ? { recordedPosition: P } : {}) };
    const add = (route: string, r: { status: number | string; text: string; json?: any }) =>
      out.push({ reader, route, basis: label, subject: i, status: r.status, text: r.text, position: r.json?.position });
    add("reach-many", await post(c, `/v2/db/${db}/reach-many`, { roots: [root(i)], basis }));
    const session = `gate-${reader}-${i}-${label}`;
    await post(c, `/v2/db/${db}/reach-many`, { roots: [root(i)], basis, session, erasureRefs: true });
    add("reach-session", await post(c, `/v2/db/${db}/reach-many`, { roots: [root(i)], basis, session, erasureRefs: true }));
    add("batch", await post(c, `/v2/db/${db}/batch`, { basis, reads: [{ op: "reach", roots: [root(i)] }, { op: "rows", entityIds: [profile(i), task0(i)] }] }));
    add("rows", await post(c, `/v1/db/${db}/read`, { entityIds: [profile(i), task0(i)], basis }));
  }
  return out;
}
// A world's entities against the rows route at the same position on the same reader (the rows route never reads the
// parsed-entity cache). Rows are compared as stored (value columns as text), so removed rows compare as markers.
const FIELDS = ["id", "entity_id", "attribute", "value_type", "value_string", "value_number", "value_boolean", "value_datetime",
  "value_json", "recorded_position", "valid_from", "valid_to"];
const canon = (rows: any[]) => JSON.stringify(rows.map((x) => FIELDS.map((f) => (x[f] === undefined || x[f] === null ? null : String(x[f]))))
  .sort((p, q) => (String(p[0]) < String(q[0]) ? -1 : 1)));
const visible = (x: any, at: number) => x.valid_from <= at && (x.valid_to === null || x.valid_to > at);
async function worldOracle(db: string, reader: "warm" | "cold", world: any, at: number, tally: { comparisons: number; differences: any[] }) {
  if (!world || world.declined) { tally.differences.push({ reader, declined: world?.declined ?? "none" }); return; }
  const P = Number(world.position);
  for (const [id, rev, wire] of world.entities as any[]) {
    if (!Array.isArray(wire)) continue;
    const mine = wire.map((w: any) => (typeof w === "string" ? decodeRowText(w) : decodeRowTextColumns(w, "2"))).filter((x: any) => visible(x, at));
    const theirs = (await rowsAt(readers[reader], db, [id], { recordedPosition: P, validAt: at })).map((x: any) => {
      try { return decodeRow(x); }
      catch { const o: any = {}; for (const f of FIELDS) o[f] = x[f] && typeof x[f] === "object" && "v" in x[f] ? x[f].v : x[f]; return o; }
    });
    tally.comparisons++;
    if (canon(mine) !== canon(theirs)) tally.differences.push({ reader, id, rev, P });
  }
}

async function cachePhase() {
  const summary: Record<string, any> = {};
  for (const mode of ["unsealed", "sealed"] as const) {
    const s = await seedProtected(mode);
    const db = s.db;
    if (!existsSync(join(out!, "seed.json"))) writeFileSync(join(out!, "seed.json"), JSON.stringify({ db }) + "\n");
    await waitFor("readers-ready", 900);
    for (const c of Object.values(readers)) await c.create(s.scope, "lean", true, 60_000);
    const dir = join(out!, "erasure", createHash("sha256").update(db).digest("hex"));
    const m: Record<string, any> = { db, events: [], leaks: [], oracle: { comparisons: 0, differences: [] as any[] }, probes: 0, statuses: {} as Record<string, number> };
    summary[mode] = m;
    const removed = new Set<string>();          // secrets whose removal was acknowledged
    const present = new Set<string>();          // secrets that must still be readable
    for (let i = 0; i < people; i++) { present.add(secretOf(mode, "w", i)); present.add(secretOf(mode, "t", i)); }
    const seedCut = await headOf(writer, db);
    // Fill both caches: every subject's world on both readers, at the head and at the seed cut.
    for (const r of ["warm", "cold"] as const) for (let i = 0; i < people; i++) await probeSubject(db, r, i, { head: undefined, seed: seedCut });
    const statsBefore = { warm: await cacheStats(readers.warm), cold: await cacheStats(readers.cold) };
    const revOf = async (reader: "warm" | "cold", i: number, P?: number) => {
      const r = await post(readers[reader], `/v2/db/${db}/reach-many`, { roots: [root(i)], basis: { validAt: Date.now(), ...(P !== undefined ? { recordedPosition: P } : {}) } });
      return Object.fromEntries(((r.json?.entities ?? []) as any[]).map((e) => [e[0], e[1]]));
    };
    // Probe every subject on both readers; `allowed` statuses (503 while a removal is pending) are counted, not failed.
    const sweep = async (event: string, bases: Record<string, number | undefined>, allowed: (string | number)[] = [], subjects = [...Array(people).keys()]) => {
      const counts = { probes: 0, ok: 0, refused: 0, leaks: 0, missing: 0, oracle: 0 };
      for (const reader of ["warm", "cold"] as const) for (const i of subjects) {
        for (const p of await probeSubject(db, reader, i, bases)) {
          counts.probes++; m.probes++;
          m.statuses[`${event}:${p.status}`] = (m.statuses[`${event}:${p.status}`] ?? 0) + 1;
          if (p.status !== 200) {
            if (allowed.includes(p.status)) counts.refused++;
            else m.leaks.push({ event, kind: "unexpected status", ...p, text: p.text.slice(0, 200) });
            continue;
          }
          counts.ok++;
          for (const secret of removed) if (p.text.includes(secret)) { counts.leaks++; m.leaks.push({ event, kind: "removed value served", secret, ...p, text: undefined }); }
          // A value not removed is served by every route that returns its entity's rows (control).
          for (const kind of ["w", "t"] as const) {
            const secret = secretOf(mode, kind, i);
            if (present.has(secret) && !p.text.includes(secret) && p.route !== "reach-session") { counts.missing++; m.leaks.push({ event, kind: "present value missing", secret, ...p, text: p.text.slice(0, 160) }); }
          }
          if (p.route === "reach-many" && p.status === 200) {
            const before = m.oracle.comparisons;
            await worldOracle(db, reader, JSON.parse(p.text), Date.now(), m.oracle);
            counts.oracle += m.oracle.comparisons - before;
          }
        }
      }
      const pick = (x: any) => ({ drops: x.removalDrops, calls: x.removalDropCalls, named: x.removalDropNamed, entries: x.entries });
      const drops = { warm: pick(await cacheStats(readers.warm)), cold: pick(await cacheStats(readers.cold)) };
      m.events.push({ event, ...counts, removalDrops: drops });
      log(mode, event, JSON.stringify(counts));
      return counts;
    };
    const idOf = async (entity: string, attribute: string) =>
      (await rowsAt(writer, db, [entity], { validAt: Date.now() })).map(decodeRow).find((r: any) => r.attribute === attribute)!.id as string;
    const erase = async (command: string, selectors: object[]) => writer.erase(db, command, selectors as any);
    const ack = (i: number, kinds: ("w" | "t")[]) => { for (const k of kinds) { removed.add(secretOf(mode, k, i)); present.delete(secretOf(mode, k, i)); } };

    // (a) Removals on request: by assertion, by entity and attribute, by entity (every protected value of it).
    const revBefore = { warm: await revOf("warm", 1), cold: await revOf("cold", 1) };
    const beforeA = await headOf(writer, db);
    const e1 = await erase(`rm-a1-${nonce}`, [{ id: await idOf(task0(1), ":task/secret") }]);
    const e2 = await erase(`rm-a2-${nonce}`, [{ entityId: profile(2), attribute: ":worker/secret" }]);
    const e3 = await erase(`rm-a3-${nonce}`, [{ entityId: task0(3) }, { entityId: profile(3) }]);
    ack(1, ["t"]); ack(2, ["w"]); ack(3, ["w", "t"]);
    const revAfter = { warm: await revOf("warm", 1), cold: await revOf("cold", 1) };
    m.removalRevisions = { task0: task0(1), before: revBefore.warm[task0(1)], after: revAfter.warm[task0(1)], coldBefore: revBefore.cold[task0(1)], coldAfter: revAfter.cold[task0(1)],
      receipts: [e1, e2, e3].map((e: any) => ({ seq: e.seq, position: e.position })) };
    await sweep("a removals", { head: undefined, seed: seedCut, beforeRemoval: beforeA, afterRemoval: Number((e3 as any).position) });

    // (b) A removal committed in Datomic but not published: its log record's path is made a directory, so publication
    // fails after the commit. While pending: every read and the derived write are refused; then the removal resumed.
    const seqNow = Number((e3 as any).seq);
    // Inside the container (the bind mount's view on the Mac side can lag the container's).
    const blocker = `/out/erasure/${createHash("sha256").update(db).digest("hex")}/erase-${seqNow + 1}.json`;
    execFileSync("docker", ["exec", container, "mkdir", blocker]);
    const selectors = [{ entityId: task0(4), attribute: ":task/secret" }];
    let stuck: any;
    try { stuck = await erase(`rm-b-${nonce}`, selectors); } catch (e: any) { stuck = { refused: e?.code ?? String(e) }; }
    m.pending = { firstAttempt: stuck, pendingFile: execFileSync("docker", ["exec", container, "ls", blocker.replace(/erase-\d+\.json$/, "")], { encoding: "utf8" }).split("\n").includes("pending.json") };
    const derived = (i: number, value: string, seq: number) => ({ ...command(`derived-${i}-${seq}-${crypto.randomUUID()}`, [{ e: A + "derived/" + i, a: ":derived/copy", v: str("derived:" + value) }] as any), erasureSeq: seq });
    try { await transact(db, derived(4, secretOf(mode, "t", 4), seqNow)); m.pending.derivedWhilePending = "committed"; }
    catch (e: any) { m.pending.derivedWhilePending = e?.code ?? String(e); }
    await sweep("b pending", { head: undefined, seed: seedCut }, [503, "ErasureFrontierUnavailable"], [0, 4]);
    execFileSync("docker", ["exec", container, "rmdir", blocker]);
    const resumed: any = await erase(`rm-b-${nonce}`, selectors);
    ack(4, ["t"]);
    m.pending.resumed = { seq: resumed.seq, position: resumed.position };
    try { await transact(db, derived(4, secretOf(mode, "t", 4), seqNow)); m.pending.derivedAfter = "committed"; }
    catch (e: any) { m.pending.derivedAfter = e?.code ?? String(e); }
    const derivedRows = await rowsAt(writer, db, [A + "derived/4"], { validAt: Date.now() });
    m.pending.derivedCopyExists = derivedRows.length > 0;
    await sweep("b resumed", { head: undefined, seed: seedCut, beforeRemoval: seqNow > 0 ? beforeA : undefined, afterRemoval: Number(resumed.position) });

    // (c) Settlement-shaped frames: ticketed writes of what cached subjects owe (one frame of 8 subjects, with the
    // current removal sequence), then a release change of the account's definitions.
    const seq = Number(resumed.seq);
    const revC0 = await revOf("warm", 5);
    const beforeC = await headOf(writer, db);
    const frame = Array.from({ length: 8 }, (_, k) => ({ e: task0(5 + k), a: ":task/owed", v: str(`owed ${k} at release 2`) }));
    await transact(db, { ...command(`frame-${nonce}`, frame as any), erasureSeq: seq });
    await replace(db, `release-${nonce}`, releaseChange(A, 2) as any);
    const revC1 = await revOf("warm", 5);
    m.frameRevisions = { entity: task0(5), before: revC0[task0(5)], after: revC1[task0(5)] };
    await sweep("c frames and release", { head: undefined, beforeFrame: beforeC });

    // (d) An import frame changing a cached subject, the creation of entities inside a cached world (a new placement
    // with a task, referenced from the root), and an import replay of a removed field (refused).
    const revD0 = await revOf("cold", 6);
    const beforeD = await headOf(writer, db);
    await transact(db, { ...command(`import-${nonce}`, [{ e: task0(6), a: ":task/field-1", v: str("imported value") }] as any), erasureReplay: true });
    const pl = A + "pl-extra/" + nonce, tk = A + "task-extra/" + nonce;
    await transact(db, command(`create-${nonce}`, [{ e: root(6), a: ":person/placement", v: ref(pl) }, { e: pl, a: ":placement/task", v: ref(tk) },
      { e: tk, a: ":task/status", v: str("created inside a cached world") }] as any));
    try {
      await transact(db, { ...command(`replay-${nonce}`, [{ e: task0(1), a: ":task/secret", v: str(secretOf(mode, "t", 1)) }] as any), erasureReplay: true });
      m.replayOfRemoved = "committed";
    } catch (e: any) { m.replayOfRemoved = e?.code ?? String(e); }
    const revD1 = await revOf("cold", 6);
    m.createRevisions = { root: root(6), before: revD0[root(6)], after: revD1[root(6)], newEntities: [pl, tk].map((x) => x in revD1) };
    await sweep("d import and creation", { head: undefined, beforeImport: beforeD });

    // (e1) A reader restarted (its caches empty), then probed.
    writeFileSync(join(out!, "restart-8082"), "");
    await waitFor("restarted-8082", 300); rmSync(join(out!, "restarted-8082"));
    await readers.cold.create(s.scope, "lean", true, 60_000);
    await sweep("e restarted reader", { head: undefined, seed: seedCut });
    // (e2) A reader stopped (SIGSTOP) while a save and a removal land, then resumed and probed at once.
    execFileSync("docker", ["exec", container, "kill", "-STOP", pidOf(8081)]);
    let behind: any = {};
    try {
      await replace(db, `behind-save-${nonce}`, [{ e: task0(7), a: ":task/field-2", v: str("saved while a reader was stopped") }]);
      behind.removal = await erase(`rm-e-${nonce}`, [{ entityId: profile(7), attribute: ":worker/secret" }]);
      ack(7, ["w"]);
    } finally { execFileSync("docker", ["exec", container, "kill", "-CONT", pidOf(8081)]); }
    behind.first = (await probeSubject(db, "warm", 7, { head: undefined, after: Number(behind.removal.position) })).map((p) => ({ route: p.route, basis: p.basis, status: p.status, leak: p.text.includes(secretOf(mode, "w", 7)) }));
    m.behind = behind;
    for (const p of behind.first) if (p.leak) m.leaks.push({ event: "e behind", kind: "removed value served", ...p });
    await sweep("e behind", { head: undefined, after: Number(behind.removal.position) }, [503, "ErasureFrontierUnavailable"]);
    m.cache = { before: statsBefore, after: { warm: await cacheStats(readers.warm), cold: await cacheStats(readers.cold) } };
    save();
  }
  results.cache = summary;
  save();
}

// ---- Shared entity: what one subject's world costs when 1, 100 and 10,000 subjects reference one entity.
async function sharedPhase() {
  const scope = JSON.stringify(["triplex-scope-v1", "test", "test", `dx-api1-shared-${nonce}`, 0]);
  const init = await writer.create(scope, "lean", true, 60_000);
  const db = init.db as string;
  if (!existsSync(join(out!, "seed.json"))) writeFileSync(join(out!, "seed.json"), JSON.stringify({ db }) + "\n");
  const shared = A + "employer/shared", loc = A + "employer/shared/location";
  await transact(db, command(`shared-${nonce}`, [{ e: shared, a: ":employer/name", v: str("the shared employer") }, { e: shared, a: ":employer/location", v: ref(loc) },
    { e: loc, a: ":location/city", v: str("a city") }] as any));
  await waitFor("readers-ready", 900);
  for (const c of Object.values(readers)) await c.create(scope, "lean", true, 60_000);
  let made = 0;
  const grow = async (n: number) => {
    for (let start = made; start < n; start += 200) {
      const facts: F[] = [];
      for (let i = start; i < Math.min(n, start + 200); i++) {
        const r = A + "enrolment/" + i;
        facts.push({ e: r, a: ":enrolment/employer", v: ref(shared) }, { e: r, a: ":enrolment/profile", v: ref(r + "/profile") },
          { e: r + "/profile", a: ":profile/name", v: str("subject " + i) }, { e: r, a: ":enrolment/task", v: ref(r + "/task") },
          { e: r + "/task", a: ":task/status", v: str("open") });
      }
      await transact(db, command(`grow-${start}-${nonce}`, facts as any));
    }
    made = n;
  };
  const backrefs = async (from: number, to: number) => {
    for (let start = from; start < to; start += 500) {
      const facts: F[] = [];
      for (let i = start; i < Math.min(to, start + 500); i++) facts.push({ e: shared, a: ":employer/enrolment", v: ref(A + "enrolment/" + i) });
      await transact(db, command(`back-${start}-${nonce}`, facts as any));
    }
  };
  const measure = async (label: string, reads: any[], calls = 200) => {
    const c = readers.warm;
    const one = () => readBatch(c, db, { basis: { validAt: Date.now() }, reads });
    let first: any;
    try { first = await one(); } catch (e: any) { return { label, refused: e?.code ?? String(e) }; }
    const world = first.answers[0] as any;
    if (world?.declined) return { label, declined: world.declined };
    for (let k = 0; k < 20; k++) await one();
    const c0 = cpuMs(8081), t0 = performance.now();
    for (let k = 0; k < calls; k++) await one();
    const wall = (performance.now() - t0) / calls, cpu = (cpuMs(8081) - c0) / calls;
    return { label, entities: world.entities.length, bytes: JSON.stringify(first.answers).length, cpuMsPerCall: Math.round(cpu * 100) / 100, wallMsPerCall: Math.round(wall * 100) / 100 };
  };
  const rows: any[] = [];
  const subject = A + "enrolment/0";
  for (const n of [1, 100, 10_000]) {
    await grow(n);
    rows.push({ n, refs: "forward", ...(await measure("follow", [{ op: "reach", roots: [subject] }])) });
    rows.push({ n, refs: "forward", ...(await measure("stopAt employer", [{ op: "reach", roots: [subject], stopAt: [":enrolment/employer"] }, { op: "rows", entityIds: [shared] }])) });
    log("shared", n, JSON.stringify(rows.slice(-2)));
  }
  // The shared entity also lists its members (a back reference per enrolment).
  await backrefs(0, 1);
  rows.push({ n: 1, refs: "member list", ...(await measure("follow", [{ op: "reach", roots: [subject] }])) });
  rows.push({ n: 1, refs: "member list", ...(await measure("stopAt employer", [{ op: "reach", roots: [subject], stopAt: [":enrolment/employer"] }, { op: "rows", entityIds: [shared] }])) });
  await backrefs(1, 100);
  rows.push({ n: 100, refs: "member list", ...(await measure("follow", [{ op: "reach", roots: [subject] }], 50)) });
  rows.push({ n: 100, refs: "member list", ...(await measure("stopAt employer", [{ op: "reach", roots: [subject], stopAt: [":enrolment/employer"] }, { op: "rows", entityIds: [shared] }])) });
  await backrefs(100, 10_000);
  rows.push({ n: 10_000, refs: "member list", ...(await measure("follow", [{ op: "reach", roots: [subject] }], 5)) });
  rows.push({ n: 10_000, refs: "member list", ...(await measure("stopAt employer", [{ op: "reach", roots: [subject], stopAt: [":enrolment/employer"] }, { op: "rows", entityIds: [shared] }])) });
  log("shared", JSON.stringify(rows.slice(-6)));
  // Exactness of a stopAt world: every entity equal to the rows route at the same position; the stopped target absent.
  const tally = { comparisons: 0, differences: [] as any[] };
  const answer: any = await readBatch(readers.warm, db, { basis: { validAt: Date.now() }, reads: [{ op: "reach", roots: [subject], stopAt: [":enrolment/employer"] }] as any });
  const w = answer.answers[0];
  await worldOracle(db, "warm", { ...w, position: answer.position }, Date.now(), tally);
  results.shared = { rows, stopAtExactness: { ...tally, sharedAbsent: !w.entities.some((e: any) => e[0] === shared), entities: w.entities.map((e: any) => e[0]) } };
  save();
}

// ---- The fixed cost of one request (the floor's 65%): what keep-alive, gzip and row texts for the account change.
async function requestPhase() {
  const db = JSON.parse(readFileSync(join(out!, "seed.json"), "utf8")).db as string;
  const c = readers.warm;
  const subject = (k: number) => root(8 + (k % 12));
  const variants: Record<string, (k: number, client: DatomicClient) => Promise<unknown>> = {
    "floor: world + account rows": (k, cl) => readBatch(cl, db, { basis: { validAt: Date.now() }, reads: [{ op: "reach", roots: [subject(k)] }, { op: "rows", entityIds: [def.account(A)] }] }),
    "account as row texts (reach, stopAt its references)": (k, cl) => readBatch(cl, db, { basis: { validAt: Date.now() }, reads: [{ op: "reach", roots: [subject(k)] }, { op: "reach", roots: [def.account(A)], stopAt: [":account/property"] }] as any }),
    "minimal request (one revision)": (_k, cl) => readBatch(cl, db, { basis: { validAt: Date.now() }, reads: [{ op: "revisions", entityIds: [def.account(A)] }] as any }),
    "world alone, reach-many": (k, cl) => cl.request("POST", `/v2/db/${db}/reach-many`, { roots: [subject(k)], basis: { validAt: Date.now() } }),
    "world alone, reach-many gzipRows": (k, cl) => cl.request("POST", `/v2/db/${db}/reach-many`, { roots: [subject(k)], basis: { validAt: Date.now() }, gzipRows: true }),
    "health (no database)": (_k, cl) => cl.request("GET", "/health"),
  };
  const noKeepAlive = new DatomicClient(warmUrl!, 60_000);
  (noKeepAlive as any).agent = new http.Agent({ keepAlive: false });
  const rows: any[] = [];
  const run = async (label: string, f: (k: number, cl: DatomicClient) => Promise<unknown>, cl: DatomicClient, calls = 1500) => {
    for (let k = 0; k < 100; k++) await f(k, cl);
    const c0 = cpuMs(8081), t0 = performance.now();
    await Promise.all(Array.from({ length: 4 }, async (_, w) => { for (let k = w; k < calls; k += 4) await f(k, cl); }));
    rows.push({ label, calls, cpuMsPerCall: Math.round(((cpuMs(8081) - c0) / calls) * 1000) / 1000, wallMsPerCall: Math.round(((performance.now() - t0) / calls) * 1000) / 1000 });
    log("request", JSON.stringify(rows[rows.length - 1]));
  };
  for (const round of [1, 2]) {
    for (const [label, f] of Object.entries(variants)) await run(`${label} (round ${round})`, f, c);
    await run(`floor without keep-alive (round ${round})`, variants["floor: world + account rows"]!, noKeepAlive);
  }
  results.request = { db, rows };
  save();
}

if (phases.has("cache")) await cachePhase();
if (phases.has("shared")) await sharedPhase();
if (phases.has("request")) await requestPhase();
log("done");
