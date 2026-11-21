import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  DatomicClient,
  flushTracing,
  tracedRequest,
} from "../../../../packages/datomic/dist/index.js";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import {
  openComposition,
  type Basis,
  type CompositionHandle,
  type Receipt,
} from "../../../bench/lib/composition.ts";
import { deepOwnFacts, deepShape, taskId } from "../../../bench/lib/deep-world.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { ids, SEED_VALID_FROM, subjectOf } from "../../../bench/lib/world.ts";

type Layout =
  | "smoke"
  | "scale"
  | "batch"
  | "overlap"
  | "regression"
  | "ledger-regression"
  | "ledger-authority-regression"
  | "ledger-authority-parallel"
  | "fast-authority-regression"
  | "ledger-overhead"
  | "ledger-profile"
  | "ledger-match"
  | "ledger-reuse"
  | "ledger-parallel"
  | "ledger-derived"
  | "guard-prepared-smoke"
  | "fast"
  | "fast-neighbours-smoke"
  | "fast-cleanup-separate"
  | "fast-cleanup-folded"
  | "fast-smoke";
type Attempt = {
  binding: string;
  nonce: string;
  people: number;
  mode: Layout;
  slot: string;
  source?: string;
  stageSha256?: string;
  stagedSource?: string;
  controlSha256?: string;
  seedRole?: "control";
  guardComparison?: boolean;
  neighbourCheck?: boolean;
  cleanupStudy?: "separate" | "folded";
  authorityCost?: boolean;
  sealedWitness?: boolean;
};
type Row = Receipt["triples"][number];
type Fact = ReturnType<typeof deepOwnFacts>[number];
type Acc = {
  people: number[];
  depths: number[];
  journal: string[];
  positions: number[];
  values?: string[][];
};
type Sample = { start: number; end: number; ms: number; position: number; subject: number };
type Window = { start: number; end: number };
type Staged = {
  facts: number;
  head: Omit<Receipt, "triples">;
  fieldIds: [number, string[]][];
  groups: Acc[];
  inputDigest: string;
};
const action = process.argv[3] ?? "run";
assert(["run", "stage", "check"].includes(action));
const dir = process.argv[2]!;
const run: Attempt = JSON.parse(fs.readFileSync(path.join(dir, "native.json"), "utf8"));
const output = (name: string, v: unknown) =>
  fs.writeFileSync(
    path.join(dir, name + ".json"),
    JSON.stringify({ ...run, data: v }, null, 2) + "\n",
    { flag: "wx" },
  );
const progress = (phase: string, data: unknown) => {
  fs.appendFileSync(
    path.join(dir, "progress.jsonl"),
    JSON.stringify({ binding: run.binding, at: Date.now(), phase, data }) + "\n",
  );
  console.log(phase, JSON.stringify(data));
};
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const valueKey = (e: string, a: string, v: Row["value"]) =>
  JSON.stringify([e, a, v.type, v.value], (_k, x) => (typeof x === "bigint" ? String(x) : x));
const rowKey = (row: Row) => valueKey(row.entityId, row.attribute, row.value);
const factKey = (f: Fact) => valueKey(f.e, f.a, f.v);
const assertOps = (facts: Fact[]) =>
  facts.map((f) => ({
    op: "assert",
    entityId: f.e,
    attribute: f.a,
    value: f.v,
    validFrom: SEED_VALID_FROM,
  }));
const field = (f: number) => `:task/field-${f}`;
const mark = (i: number, f: number, revision: number) =>
  `e1-${i}-${f}-${revision}-${digest(`${run.nonce}/${i}/${f}/${revision}`).slice(0, 40)}`;
const endToEnd = (start: number, end: number) => Math.max(0, end - start);
let messageId = 0;
const responses = new Map<number, { ok: (v: any) => void; fail: (e: Error) => void }>();
process.on("message", (msg: any) => {
  const waiter = responses.get(msg?.id);
  assert(waiter);
  responses.delete(msg.id);
  if (msg.error) waiter.fail(Error(msg.error));
  else waiter.ok(msg.result);
});
function getParent(op: string, data = {}) {
  assert(process.send);
  const id = ++messageId;
  return new Promise<any>((ok, fail) => {
    responses.set(id, { ok, fail });
    process.send!({ binding: run.binding, op, id, ...data });
  });
}
async function diag(op: string, data = {}) {
  const r = await fetch(process.env.DATOMIC_URL! + "/erase1/" + op, {
    method: "POST",
    headers: { "content-type": "application/json", "x-erase1-token": process.env.DX_ERASE_TOKEN! },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(500_000),
  });
  const body = await r.json();
  assert(r.ok, `${op}: ${JSON.stringify(body)}`);
  return body;
}
const sql = (text: string) => getParent("sql", { sql: text });
const storage = () =>
  sql(`SELECT json_build_object(
    'rows', count(*), 'valueBytes', sum(pg_column_size(val)),
    'relationBytes', pg_total_relation_size('datomic_kvs'),
    'dbBytes', pg_database_size(current_database()),
    'walBytes', (SELECT sum(size) FROM pg_ls_waldir()),
    'walWritten', pg_wal_lsn_diff(pg_current_wal_insert_lsn(), '0/0'),
    'dead', pg_stat_get_dead_tuples('datomic_kvs'::regclass)) FROM datomic_kvs`).then(JSON.parse);

async function markStorage() {
  await sql(`DROP TABLE IF EXISTS erase1_before; CREATE UNLOGGED TABLE erase1_before AS
    SELECT id, rev, pg_column_size(val) AS bytes FROM datomic_kvs`);
  return storage();
}
async function storageDiff() {
  // [DX-ERASE1] Why: count KVS object insertions/updates/deletions around the exact arm.
  // Rejected: interpreting the count as an index-leaf count since log and root objects live here too.
  return JSON.parse(
    await sql(`SELECT COALESCE(json_object_agg(kind, stats),'{}'::json) FROM (
    SELECT kind, json_build_object('keys',count(*),'beforeBytes',COALESCE(sum(prior_bytes),0),'afterBytes',COALESCE(sum(next_bytes),0)) stats
    FROM (SELECT CASE WHEN b.id IS NULL THEN 'created' WHEN k.id IS NULL THEN 'deleted' ELSE 'revved' END kind,
      b.bytes prior_bytes, pg_column_size(k.val) next_bytes
      FROM erase1_before b FULL JOIN datomic_kvs k USING(id)
      WHERE b.id IS NULL OR k.id IS NULL OR b.rev IS DISTINCT FROM k.rev) d GROUP BY kind) s`),
  );
}

async function clock() {
  const comparisons = [];
  for (let i = 0; i < 5; i++) {
    const a = performance.timeOrigin + performance.now();
    const { now } = await diag("clock");
    const b = performance.timeOrigin + performance.now();
    comparisons.push({ low: a - now, high: b - now });
  }
  return comparisons.sort((a, b) => a.high - a.low - (b.high - b.low))[0]!;
}
const wall = () => performance.timeOrigin + performance.now();
async function measured<T>(work: () => Promise<T>) {
  const lock = process.env.DX_ERASE_MEASURE;
  if (!lock) return work();
  const owner = path.join(lock, "owner.json");
  for (;;) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await delay(5000);
    }
  }
  const inode = fs.statSync(lock).ino;
  const ownerBody = JSON.stringify({
    id: "DX-ERASE1",
    pid: process.ppid,
    nonce: run.nonce,
    slot: run.slot,
    at: new Date().toISOString(),
  });
  try {
    fs.writeFileSync(owner, ownerBody, { flag: "wx" });
  } catch (err) {
    fs.rmdirSync(lock);
    throw err;
  }
  function release() {
    assert.equal(fs.statSync(lock!).ino, inode);
    assert.equal(fs.readFileSync(owner, "utf8"), ownerBody);
    fs.unlinkSync(owner);
    fs.rmdirSync(lock!);
  }
  const timer = setTimeout(() => {
    release();
    process.exit(75);
  }, 14 * 60_000);
  const interrupt = () => {
    clearTimeout(timer);
    release();
    process.exit(130);
  };
  process.once("SIGTERM", interrupt);
  process.once("SIGINT", interrupt);
  try {
    return await work();
  } finally {
    clearTimeout(timer);
    process.off("SIGTERM", interrupt);
    process.off("SIGINT", interrupt);
    release();
  }
}

function blocks() {
  const mid = Math.floor(run.people * 0.52);
  if (run.mode === "batch") {
    assert(run.people >= 250);
    return [makeGroup(mid - 25, 10, 32), makeGroup(mid, 100, 8)];
  }
  const history =
    run.mode === "smoke" ||
    run.mode.endsWith("regression") ||
    ["ledger-overhead", "ledger-profile", "ledger-match", "ledger-reuse"].includes(run.mode)
      ? 5
      : 415;
  return [
    makeGroup(mid - 1, 1, 0),
    makeGroup(mid, 1, run.mode.startsWith("fast") || run.guardComparison ? 0 : history),
  ];
}
function makeGroup(first: number, n: number, depth: number): Acc {
  return {
    people: Array.from({ length: n }, (_, i) => first + i),
    depths: Array(n).fill(depth),
    journal: [],
    positions: [],
  };
}
function bystanders() {
  return Array.from(
    { length: Math.min(4, Math.floor(run.people / 4)) },
    (_, i) => run.people - 1 - i,
  );
}

class Fixture {
  readonly scope: string;
  readonly db: string;
  private saveCounter = 0;
  private resumed = false;
  private live = new Map<number, string[]>();
  private head: Receipt | undefined;
  facts = 0;
  readonly inputs = createHash("sha256");
  constructor(
    readonly comp: CompositionHandle,
    readonly name: string,
  ) {
    this.scope = String(runtimeApi.DatabaseScope.test(name));
    this.db = "s2-" + Buffer.from(this.scope).toString("base64url");
  }
  get position() {
    return this.head?.position ?? 0;
  }
  basis(): Basis {
    assert(this.head);
    return {
      recordedPosition: this.head.position,
      validAt: SEED_VALID_FROM,
      recordedAt: this.head.instant,
    };
  }
  acceptErasure(command: { position: number; erasedAt: number; txId: string }) {
    assert.equal(command.position, this.position + 1);
    this.head = {
      position: command.position,
      txId: command.txId,
      instant: command.erasedAt,
      triples: [],
    };
  }
  stage(groups: Acc[]): Staged {
    assert(this.head);
    const { position, txId, instant } = this.head;
    const fieldIds: [number, string[]][] = bystanders().map((subject) => {
      const ids = this.live.get(subject);
      assert(ids && ids.length === 2 && ids.every((id) => typeof id === "string"));
      return [subject, ids];
    });
    return {
      facts: this.facts,
      head: { position, txId, instant },
      fieldIds,
      groups,
      inputDigest: this.inputs.copy().digest("hex"),
    };
  }
  // [DX-ERASE1] Why: stage loading is outside the 55-minute server clock, and the live writer resumes at the recorded receipt.
  // Rejected: generating new assertion IDs or seeding inside the timed check.
  restore(stage: Staged) {
    assert(!this.head && this.facts === 0);
    assert(
      Number.isSafeInteger(stage.head.position) &&
        stage.head.position > 0 &&
        Number.isFinite(stage.head.instant),
    );
    assert.equal(typeof stage.head.txId, "string");
    assert.deepEqual(
      stage.fieldIds.map(([i]) => i),
      bystanders(),
    );
    assert(
      stage.fieldIds.every(
        ([, ids]) =>
          ids.length === 2 && new Set(ids).size === 2 && ids.every((id) => typeof id === "string"),
      ),
    );
    assert.match(stage.inputDigest, /^[a-f0-9]{64}$/);
    this.resumed = true;
    this.live = new Map(stage.fieldIds);
    this.facts = stage.facts;
    this.head = { ...stage.head, triples: [] };
    // Preserve the original write IDs. Staged checks use a fresh command namespace.
    this.inputs.update(`stage:${stage.inputDigest}\n`);
  }
  async write(facts: Fact[], retired: string[], actor: string) {
    const commandId = `e1-${run.nonce}-${this.resumed ? "check-" : ""}${++this.saveCounter}`;
    const operations = [...retired.map((id) => ({ op: "retract", id })), ...assertOps(facts)];
    const start = wall(),
      tick = performance.now();
    const ack = await this.comp.transact(operations, {
      actor,
      commandId,
      preconditions: retired.map((id) => ({ _tag: "TripleLive", id })),
    });
    const end = wall(),
      ms = performance.now() - tick;
    if (!ack.ok)
      throw Error(
        `${actor} ${this.saveCounter}: ${ack.tag} ${ack.error?.message ?? ""} ${ack.error?.cause?.message ?? ""}`,
      );
    const receipt = ack.value;
    assert(
      Number.isSafeInteger(receipt.position) &&
        Number.isFinite(receipt.instant) &&
        typeof receipt.txId === "string",
    );
    assert.equal(receipt.position, this.position + 1);
    assert.equal(receipt.triples.length, facts.length);
    const returned = new Map(receipt.triples.map((row) => [rowKey(row), row.id]));
    const assertionIds = facts.map((f) => {
      const id = returned.get(factKey(f));
      assert(id, "Save changed an assertion");
      return id;
    });
    assert.equal(new Set(assertionIds).size, facts.length);
    this.inputs.update(
      JSON.stringify([receipt.position, receipt.txId, commandId, retired, facts, assertionIds]) +
        "\n",
    );
    this.head = receipt;
    return { start, end, ms, cmd: commandId, receipt, assertionIds };
  }
  async seed(people: number[], group?: Acc, wanted = 1500) {
    let facts: Fact[] = [];
    async function send(self: Fixture) {
      if (!facts.length) return;
      const { receipt, assertionIds } = await self.write(facts, [], "bulk-seed");
      if (group) {
        group.journal.push(receipt.txId);
        group.positions.push(receipt.position);
      }
      for (let j = 0; j < facts.length; j++) {
        const f = facts[j]!;
        if (f.a !== ":task/field-0" && f.a !== ":task/field-1") continue;
        const n = subjectOf(f.e);
        if (n === null || f.e !== taskId(n, 0) || !(group || bystanders().includes(n))) continue;
        if (!self.live.has(n)) self.live.set(n, []);
        self.live.get(n)![f.a.endsWith("0") ? 0 : 1] = assertionIds[j]!;
      }
      self.facts += facts.length;
      facts = [];
    }
    for (const i of people) {
      const own = deepOwnFacts(i).map((f) => {
        if (!group) return f;
        assert.equal(subjectOf(f.e), i);
        return f.e === taskId(i, 0) && [field(0), field(1)].includes(f.a)
          ? { ...f, v: { type: "string" as const, value: mark(i, Number(f.a.at(-1)), 0) } }
          : f;
      });
      assert.equal(own.length, deepShape(i).facts);
      if (facts.length + own.length > wanted) await send(this);
      facts.push(...own);
    }
    await send(this);
  }
  async edit(i: number, rev: number, group?: Acc) {
    const retired = this.live.get(i);
    assert(retired?.[0] && retired[1]);
    const facts: Fact[] = [0, 1].map((f) => ({
      e: taskId(i, 0),
      a: field(f),
      v: { type: "string", value: mark(i, f, rev) },
    }));
    const ack = await this.write(facts, retired, "field-save");
    this.live.set(i, ack.assertionIds);
    if (group) {
      group.journal.push(ack.receipt.txId);
      if (rev === 1) group.positions.push(ack.receipt.position);
    }
    return ack;
  }
}

function percentile(values: number[]) {
  const sorted = values.sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.ceil(p * sorted.length) - 1] ?? null;
  return { n: sorted.length, p50: at(0.5), p99: at(0.99) };
}
const samplesStats = (samples: Sample[]) => percentile(samples.map((s) => s.ms));
async function traffic(
  f: Fixture,
  reader: CompositionHandle,
  basis: Basis,
  label: string,
  erase?: () => Promise<any>,
  runReaders = true,
) {
  const subjects = bystanders(),
    saved: Sample[] = [],
    reads: Sample[] = [];
  const pinned = new Map<number, string>();
  for (const subject of subjects) {
    const want = deepOwnFacts(subject).map(factKey).sort();
    const r = await reader.pull(ids.placement(subject), basis);
    const actual = r.triples.map(rowKey).sort();
    assert.deepEqual(actual, want, "Pinned witness differs from seed values");
    pinned.set(subject, digest(canonicalWorld(r.triples)));
  }
  let running = true,
    error: unknown,
    result: any,
    window: Window | undefined;
  const workers = (runReaders ? subjects : [])
    .map(async (subject) => {
      const pull = () => reader.pull(ids.placement(subject), basis);
      while (running) {
        const start = wall(),
          t = performance.now();
        // [DX-ERASE1] Why: the normal recorder samples fast reads even at full detail.
        // Rejected: estimating median Reach cost from the retained slow-tail sample.
        const r = await (run.mode === "ledger-profile"
          ? tracedRequest("internal", "erase1.profile.read", { phase: label, subject }, pull)
          : pull());
        const end = wall(),
          ms = performance.now() - t;
        assert.equal(
          digest(canonicalWorld(r.triples)),
          pinned.get(subject),
          "Pinned bystander changed",
        );
        reads.push({ start, end, ms, position: basis.recordedPosition!, subject });
      }
    })
    .map((p) =>
      p.catch((e) => {
        error = e;
        running = false;
      }),
    );
  const eraseRun = erase?.()
    .then((r) => {
      result = r;
    })
    .catch((e) => {
      error = e;
      running = false;
    });
  const count = run.mode === "smoke" ? 8 : 500;
  let last: Awaited<ReturnType<Fixture["edit"]>> | undefined;
  try {
    for (let j = 0; running && j < count; j++) {
      const subject = subjects[j % subjects.length]!;
      const revision = run.guardComparison
        ? 1_000_000_000 + j
        : j + 1 + basis.recordedPosition! * 1_000_000 + f.position;
      last = await f.edit(subject, revision);
      saved.push({
        start: last.start,
        end: last.end,
        ms: last.ms,
        position: last.receipt.position,
        subject,
      });
    }
    await eraseRun;
  } finally {
    running = false;
    await Promise.all(workers);
  }
  if (error) throw error;
  assert(last && saved.length === count);
  const latest = await reader.pull(ids.placement(saved.at(-1)!.subject), f.basis());
  assert(
    last.assertionIds.every((id) => latest.triples.some((r) => r.id === id)),
    "Acknowledged save failed exact readback",
  );
  const txn = await f.comp.transactionByCommand(last.cmd);
  assert(
    txn.ok && txn.value?.txId === last.receipt.txId && txn.value.position === last.receipt.position,
  );
  if (result) window = result.window;
  const complete = (s: Sample) => window && s.start >= window.start && s.end <= window.end;
  const touches = (s: Sample) => window && s.start < window.end && s.end > window.start;
  const summary = {
    label,
    basis,
    writes: samplesStats(saved),
    reads: samplesStats(reads),
    writesInsideJob: samplesStats(saved.filter(complete)),
    readsInsideJob: samplesStats(reads.filter(complete)),
    writesTouchingJob: samplesStats(saved.filter(touches)),
    readsTouchingJob: samplesStats(reads.filter(touches)),
    elapsedMs: endToEnd(saved[0]!.start, saved.at(-1)!.end),
    checkedReadback: last.receipt.position,
  };
  output(`traffic-${label}`, { saved, reads, summary, result });
  return summary;
}

async function eraseArm<T>(
  f: Fixture,
  index: number,
  group: Acc,
  work: (start: () => Promise<any>) => Promise<T>,
) {
  const client = new DatomicClient(process.env.DATOMIC_URL!, 15000);
  const arm = `erase-${index}`;
  const data = {
    scope: f.scope,
    arm,
    domain: [...new Set(group.people.flatMap((i) => deepOwnFacts(i).map((row) => row.e)))],
    journal: group.journal,
    witnesses: group.people.map((i) => taskId(i, 0)),
    values: group.values ?? group.people.map((i, j) => [mark(i, 0, group.depths[j]!)]),
    historyCounts: group.depths.map((d) => 2 * d + 1),
    logPositions: group.positions.slice(0, 4),
  };
  output(`plan-${index}`, { ...data, group });
  const prepared = await diag("prepare", data);
  const held = await client.begin(f.db);
  const read = (handle?: string) =>
    client.rows(f.db, {
      ...(handle ? { handle } : {}),
      entityIds: data.witnesses.slice(0, 1),
      pattern: { attribute: ":task/field-0" },
    });
  try {
    const positive = await read(held.handle);
    assert.deepEqual(
      positive.map((r) => r.value_string),
      data.values[0],
    );
    const beforeBytes = await markStorage();
    const offset = await clock();
    let erase: any;
    const load = await work(async () => {
      const sentAt = wall();
      const result = await diag("erase", { scope: f.scope, arm });
      const receivedAt = wall();
      assert(
        result.arm === arm &&
          result.t > prepared.plan.pin &&
          result.requests === data.domain.length + data.journal.length,
      );
      assert(
        result.ackAt >= result.submittedAt &&
          result.finishedAt >= result.indexAskedAt &&
          result.requestToSyncMs >= result.ackMs,
      );
      // [DX-ERASE1] Why: the conservative clock bounds avoid claiming post-job saves as fully inside it.
      // Rejected: measuring contention over the entire response wait without classifying exact overlap.
      const window = {
        start: result.indexAskedAt + offset.high,
        end: result.finishedAt + offset.low,
      };
      erase = { ...result, sentAt, receivedAt, offset, window };
      return erase;
    });
    const observation = await diag("observe", { scope: f.scope, arm });
    const stillHeld = await read(held.handle),
      current = await read();
    const readAt = wall();
    assert.deepEqual(stillHeld, positive, "Gateway held rows no longer match the original cut");
    assert.deepEqual(current, [], "Fresh gateway still reads excised field");
    assert.deepEqual(observation.held, prepared.before);
    for (const s of [observation.fresh, observation.latest]) checkGone(s, data.witnesses.length);
    assert.deepEqual(
      observation.log,
      prepared.log.map((item: any) => ({ t: item.t, selected: 0 })),
    );
    const storageAfter = await storage();
    const objects = await storageDiff();
    const result = {
      erase,
      load,
      prepared,
      observation,
      heldGatewayRows: stillHeld.length,
      lastPositiveMs: readAt - erase.sentAt,
      beforeBytes,
      storageAfter,
      objects,
      group: { people: group.people, depths: group.depths },
    };
    output(`excision-${index}`, result);
    progress(arm, {
      requestToSyncMs: erase.requestToSyncMs,
      heldGatewayRows: stillHeld.length,
      matched: prepared.before.domainHistory.datoms + prepared.before.journalHistory.datoms,
      load,
    });
    return { result, plan: observation.plan };
  } finally {
    await client.release(f.db, held.handle);
    client.close();
    await diag("drop-pin", { scope: f.scope });
  }
}
function checkGone(s: any, count: number) {
  assert.deepEqual(
    s.values,
    Array.from({ length: count }, () => []),
  );
  assert.deepEqual(s.atPin, s.values);
  assert.deepEqual(s.inHistory, Array(count).fill(0));
  for (const prop of ["domain", "domainHistory", "journal", "journalHistory"])
    assert.deepEqual(s[prop], { datoms: 0, adds: 0, retracts: 0, sha256: digest("") });
}

async function freshPeer(f: Fixture, arm: Awaited<ReturnType<typeof eraseArm>>, i: number) {
  const t = arm.result.erase.t;
  const text: string = await getParent("fresh", { plan: { scope: f.scope, plan: arm.plan, t } });
  const line = text.split("\n").find((l) => l.startsWith("ERASE1 "));
  assert(line, "Fresh JVM did not return its native observation");
  const observed = JSON.parse(line.slice(7));
  assert.equal(observed.t, t);
  assert(observed.snapshot.basis >= t);
  checkGone(observed.snapshot, arm.result.group.people.length);
  assert.deepEqual(observed.log, arm.result.observation.log);
  output(`fresh-${i}`, observed);
}

async function collect(f: Fixture, label: string, full: boolean) {
  const settled = await diag("index", { scope: f.scope });
  const before = await markStorage();
  const gc = await diag("gc", { scope: f.scope });
  let same = 0,
    previous = before.rows;
  const poll = [];
  // [DX-ERASE1] Why: the API can return before SQL deletion is observable.
  // Rejected: interpreting the API wait as completion, or counting VACUUM FULL bytes as GC deletion.
  for (let i = 0; i < 150 && same < 4; i++) {
    await delay(300);
    const after = await storage();
    poll.push({ rows: after.rows, valueBytes: after.valueBytes, at: wall() });
    same = after.rows === previous ? same + 1 : 0;
    previous = after.rows;
  }
  const afterGC = await storage(),
    objects = await storageDiff();
  await sql("VACUUM (ANALYZE) datomic_kvs");
  const afterVacuum = await storage();
  let afterFull;
  if (full) {
    await getParent("guard");
    await sql("VACUUM (FULL, ANALYZE) datomic_kvs");
    afterFull = await storage();
  }
  const result = { settled, before, gc, poll, afterGC, objects, afterVacuum, afterFull };
  output(label, result);
  return result;
}

async function restoreFixture(f: Fixture, staged: Staged) {
  f.restore(staged);
  assert.equal(await f.comp.currentPosition(), f.position);
  const head = (await f.comp.feedPage(f.position - 1, 1)).transactions[0];
  assert.equal(head?.position, f.position);
  assert.equal(head.txId, staged.head.txId);
  for (const [subject, pair] of staged.fieldIds) {
    const view = await f.comp.pull(ids.placement(subject), f.basis());
    const actual = view.triples.filter(
      (r) =>
        r.entityId === taskId(subject, 0) && (r.attribute === field(0) || r.attribute === field(1)),
    );
    assert.deepEqual(
      actual.sort((a, b) => a.attribute.localeCompare(b.attribute)).map((r) => r.id),
      pair,
    );
  }
}

async function seedFixture(f: Fixture, groups: Acc[], recordProgress: boolean) {
  assert.equal(await f.comp.currentPosition(), 0);
  const reserved = new Set(groups.flatMap((g) => g.people));
  // [DX-ERASE1] Why: write the target's history between seed batches to reach several log regions.
  // Rejected: appending every revision after the main seed, which artificially clusters the purge.
  for (const group of groups) await f.seed(group.people, group);
  const chunk = Math.min(800, Math.max(100, Math.floor(run.people / 16)));
  for (let first = 0; first < run.people; first += chunk) {
    const n = Math.min(chunk, run.people - first);
    await f.seed(Array.from({ length: n }, (_, j) => first + j).filter((i) => !reserved.has(i)));
    for (const group of groups)
      for (const [i, subject] of group.people.entries())
        for (
          let revision = Math.floor((group.depths[i]! * first) / run.people) + 1;
          revision <= Math.floor((group.depths[i]! * (first + n)) / run.people);
          revision++
        )
          await f.edit(subject, revision, group);
    if (recordProgress)
      progress("seed", { people: first + n, facts: f.facts, position: f.position });
    await getParent("guard");
  }
  if (recordProgress)
    for (const group of groups)
      progress("aged", {
        people: group.people.length,
        fieldSaves: group.depths.reduce((a, b) => a + b, 0),
        position: f.position,
      });
}

async function loadStage(
  f: Fixture,
  file: string,
  sha: string | undefined,
  source: string | undefined,
) {
  const raw = fs.readFileSync(file);
  assert.equal(createHash("sha256").update(raw).digest("hex"), sha);
  const staged = JSON.parse(raw.toString()) as Attempt & { data: Staged };
  assert(staged.nonce === run.nonce && staged.people === run.people && staged.source === source);
  assert.deepEqual(
    staged.data.groups.map(({ people, depths }) => [people, depths]),
    blocks().map(({ people, depths }) => [people, depths]),
  );
  await restoreFixture(f, staged.data);
  return staged.data.groups;
}

async function comparePreparedGuard(guarded: Fixture) {
  const { measureW0Http } = await import("../../../bench/lib/w0-http.ts");
  const address = process.env.DATOMIC_URL!;
  const controlName = guarded.name + "-control";
  const composition = await openComposition("reach", "datomic", controlName);
  const peer = new DatomicClient(address);
  try {
    let control = new Fixture(composition, controlName);
    if (action === "check") {
      await loadStage(control, process.argv[5]!, run.controlSha256, run.source);
    } else {
      const groups = blocks();
      await seedFixture(control, groups, false);
      const manifest = control.stage(groups);
      control = new Fixture(composition, controlName);
      await restoreFixture(control, manifest);
    }
    assert.equal(control.facts, guarded.facts);
    const plainHead = await peer.erasureFrontier(control.db);
    const guardedHead = await peer.erasureFrontier(guarded.db);
    assert(!plainHead.protected && plainHead.seq === 0);
    assert(guardedHead.protected && guardedHead.seq === 0);
    const controlPin = control.basis();
    const guardedPin = guarded.basis();
    assert.equal(controlPin.recordedPosition, guardedPin.recordedPosition);
    // [DX-ERASE1] Why: both arms send the same workload through the public routes at their original sealed seed cut.
    // Rejected: bypassing the guard on a database that contains protected values.
    const observe = async (f: Fixture, pin: Basis, label: string) => {
      const { value, samples } = await measureW0Http(() => traffic(f, f.comp, pin, label));
      const responseBytes = (ending: RegExp) =>
        percentile(
          samples.filter((r) => ending.test(String(r.path))).map((r) => Number(r.responseBytes)),
        );
      return {
        ...value,
        reachBytes: responseBytes(/\/reach(?:-many)?$/),
        saveBytes: responseBytes(/\/transact$/),
      };
    };
    const before = await observe(control, controlPin, "control-before");
    const guardedBefore = await observe(guarded, guardedPin, "guarded-before");
    const middle = await observe(control, controlPin, "control-middle");
    const attribute = ":privacy/field";
    const entity = `guard-comparison-${run.nonce}`;
    const added = await guarded.write(
      [{ e: entity, a: attribute, v: { type: "string", value: mark(0, 0, 1) } }],
      [],
      "comparison",
    );
    const [id] = added.assertionIds;
    assert(id);
    const plantedPin = guarded.basis();
    const erased = await peer.erase(guarded.db, `${run.nonce}-guard-comparison`, [{ id }]);
    const atOldPin = await peer.rows(guarded.db, { entityIds: [entity], basis: plantedPin });
    const marker = atOldPin.find((r) => r.id === id);
    assert.equal(erased.seq, 1);
    assert.equal(erased.identities.length, 1);
    assert.equal(erased.identities[0]?.assertionId, id);
    assert(marker?.value_type === "erased" && marker.value_string === null && marker.value_json);
    assert.deepEqual(JSON.parse(marker.value_json), {
      type: "erased",
      valueType: "string",
      erasedAt: erased.erasedAt,
      erasureTxId: erased.txId,
    });
    const detached = await diag("key-state", { scope: guarded.scope, id });
    assert.equal(detached.id, id);
    assert.equal(detached.seq, erased.seq);
    assert.equal(detached.bodyPresent, true);
    guarded.acceptErasure(erased);
    const guardedAfter = await observe(guarded, guardedPin, "guarded-after");
    const after = await observe(control, controlPin, "control-after");
    const compare = (actual: typeof before, reference: typeof before) => {
      const pair = (a: typeof actual.reads, b: typeof reference.reads) => {
        assert(a.p50 && a.p99 && b.p50 && b.p99);
        return { p50: a.p50 / b.p50, p99: a.p99 / b.p99 };
      };
      assert.equal(actual.writes.n, 500);
      assert.equal(reference.writes.n, 500);
      assert(actual.reachBytes.n && reference.reachBytes.n && actual.reads.n && reference.reads.n);
      return {
        against: reference.label,
        saves: pair(actual.writes, reference.writes),
        reads: pair(actual.reads, reference.reads),
      };
    };
    output("guarded-comparison", {
      facts: guarded.facts,
      erased,
      bars: { p50: 1.05, p99: 1.1 },
      predictions: {
        saves: { p50: [1.0, 1.08], p99: [1.0, 1.18] },
        reads: { p50: [1.0, 1.07], p99: [1.0, 1.15] },
      },
      observations: [before, guardedBefore, middle, guardedAfter, after],
      beforeErasure: [compare(guardedBefore, before), compare(guardedBefore, middle)],
      afterErasure: [compare(guardedAfter, middle), compare(guardedAfter, after)],
    });
  } finally {
    peer.close();
    await composition.close();
  }
}

async function scale() {
  const fixtureName = "erase1-" + run.nonce + (run.seedRole === "control" ? "-control" : "");
  const comp = await openComposition("reach", "datomic", fixtureName);
  let f = new Fixture(comp, fixtureName);
  let reader: CompositionHandle | undefined;
  try {
    if (run.mode === "ledger-derived") {
      const { derivedRegression } = await import("./regression.ts");
      await derivedRegression(run.binding, output);
      return;
    }
    const sealedK = run.mode === "sealed-k-regression";
    const parallel = run.mode.endsWith("-parallel");
    const sealed =
      run.mode.startsWith("fast") ||
      run.guardComparison ||
      run.mode === "ledger-authority-parallel" ||
      run.sealedWitness === true || sealedK;
    if (
      sealedK || parallel ||
      ["ledger-regression", "ledger-authority-regression", "ledger-reuse"].includes(run.mode) ||
      (sealed && action !== "check" && !run.seedRole)
    ) {
      const authority = new DatomicClient(process.env.DATOMIC_URL!);
      try {
        await authority.declareProtection(
          f.db,
          parallel ? [":v"] : sealed && !run.sealedWitness && !sealedK ? [":privacy/field"] : [field(0)],
          sealed,
        );
      } finally {
        authority.close();
      }
    }
    if (parallel) {
      output("parallel-writer", await diag("parallel-writer", { scope: f.scope }));
      return;
    }
    if (run.mode === "fast-authority-regression") {
      const { checkSharedAuthority } = await import("./authority.ts");
      await checkSharedAuthority(f, run.nonce, getParent, diag, output);
      return;
    }
    let groups: Acc[];
    if (action === "check") {
      await getParent("guard");
      groups = await loadStage(
        f,
        process.argv[4]!,
        run.stageSha256,
        run.stagedSource ?? run.source,
      );
    } else {
      groups = blocks();
      await seedFixture(f, groups, true);
    }
    const basis = f.basis();
    assert.equal(
      f.facts,
      Array.from({ length: run.people }, (_, i) => deepShape(i).facts).reduce((a, b) => a + b, 0),
    );
    output("seed", { facts: f.facts, basis, inputDigest: f.inputs.copy().digest("hex"), groups });
    if (action === "stage") {
      await collect(f, "stage-gc", true);
      output("staged", f.stage(groups));
      return;
    }
    if (run.guardComparison) {
      if (action === "run") {
        const manifest = f.stage(groups);
        f = new Fixture(comp, fixtureName);
        await restoreFixture(f, manifest);
      }
      await comparePreparedGuard(f);
      return;
    }
    if (run.neighbourCheck) {
      const { quietNeighbours } = await import("./quiet.ts");
      await quietNeighbours(f, run.nonce, diag, output, action === "check", run.cleanupStudy);
      return;
    }
    if (run.authorityCost) {
      const { compareSharedAuthoritySaves } = await import("./authority.ts");
      await compareSharedAuthoritySaves(f, run.nonce, diag, output, 500);
      return;
    }
    if (run.mode === "ledger-reuse") {
      const { checkErasedIdentity } = await import("./reuse.ts");
      await checkErasedIdentity(f, field(0), run.nonce, diag, output);
      return;
    }
    if (run.mode === "smoke") {
      const stage = JSON.parse(JSON.stringify(f.stage(groups))) as Staged;
      f = new Fixture(comp, fixtureName);
      await restoreFixture(f, stage);
    }
    if (run.mode.endsWith("regression")) {
      const { regression } = await import("./regression.ts");
      await regression(
        f,
        groups[1]!.people[0]!,
        dir,
        run.binding,
        diag,
        getParent,
        output,
        run.mode.startsWith("ledger-") || sealedK,
        run.sealedWitness,
        sealedK,
      );
      return;
    }
    if (run.mode.startsWith("fast")) {
      const { fast } = await import("./fast.ts");
      await measured(() =>
        fast(
          f,
          run.people,
          f.facts,
          run.nonce,
          diag,
          storage,
          () => getParent("guard"),
          output,
          ...(run.mode === "fast-smoke" ? ([2, 8] as const) : []),
        ),
      );
      return;
    }
    if (["ledger-overhead", "ledger-profile", "ledger-match"].includes(run.mode)) {
      const { measureW0Http } = await import("../../../bench/lib/w0-http.ts");
      const otherName = fixtureName + "-guarded";
      const guarded = await openComposition("reach", "datomic", otherName);
      const probe = new DatomicClient(process.env.DATOMIC_URL!);
      try {
        const other = new Fixture(guarded, otherName);
        await probe.declareProtection(other.db, [field(0)]);
        await seedFixture(other, blocks(), false);
        assert.equal(other.facts, f.facts);
        const controlPin = f.basis(),
          guardedPin = other.basis();
        const arms = await measured(async () => {
          const observe = async (
            candidate: Fixture,
            which: string,
            pin: Basis,
            runReaders = true,
          ) => {
            await diag("index", { scope: candidate.scope });
            const before = await storage();
            const measuredTraffic = await measureW0Http(() =>
              traffic(candidate, candidate.comp, pin, which, undefined, runReaders),
            );
            const bytes = (ending: RegExp) => {
              const samples = measuredTraffic.samples.filter((r) => ending.test(String(r.path)));
              return {
                n: samples.length,
                request: percentile(samples.map((r) => Number(r.requestBytes))),
                response: percentile(samples.map((r) => Number(r.responseBytes))),
              };
            };
            const after = await storage();
            const wire: { request: number; response: number }[] = [];
            probe.onRequest = (r) =>
              wire.push({ request: r.requestBytes, response: r.responseBytes });
            const rows = await probe.rows(candidate.db, {
              entityIds: [ids.placement(run.people - 1)],
              basis: candidate.basis(),
            });
            assert(rows.length && wire.length === 1);
            return {
              which,
              summary: measuredTraffic.value,
              wire,
              saveWire: bytes(/\/transact$/),
              readWire: bytes(/\/(reach|reach-many|read)$/),
              valueByteChange: after.valueBytes - before.valueBytes,
            };
          };
          if (run.mode !== "ledger-match")
            return [
              await observe(f, "ledger-control", controlPin),
              await observe(other, "ledger-guarded", guardedPin),
            ];
          const parity = (sequence: number) =>
            diag("reach-parity", {
              scope: other.scope,
              root: ids.placement(bystanders()[0]!),
              basis: guardedPin,
              sequence,
            });
          const before = await parity(0);
          const observations = [
            await observe(f, "control-before", controlPin),
            await observe(other, "guarded-before", guardedPin),
            await observe(f, "control-middle", controlPin),
          ];
          const target = taskId(groups[1]!.people[0]!, 0);
          const atPin = () => probe.rows(other.db, { entityIds: [target], basis: guardedPin });
          const original = (await atPin()).find((r) => r.attribute === field(0));
          assert(original?.value_string);
          const erasure = await probe.erase(other.db, `${run.nonce}-matched-erase`, [
            { id: original.id },
          ]);
          const marker = (await atPin()).find((r) => r.id === original.id);
          assert.equal(erasure.seq, 1);
          assert.equal(erasure.identities.length, 1);
          assert.equal(erasure.identities[0]?.assertionId, original.id);
          assert.equal(await other.comp.currentPosition(), erasure.position);
          assert.equal(marker?.value_type, "erased");
          assert(marker?.value_json && marker.value_string === null);
          assert.deepEqual(JSON.parse(marker.value_json), {
            type: "erased",
            valueType: "string",
            erasedAt: erasure.erasedAt,
            erasureTxId: erasure.txId,
          });
          other.acceptErasure(erasure);
          const after = await parity(1);
          assert.equal(before.pin, after.pin);
          assert.equal(before.warmSha256, after.warmSha256);
          assert.equal(before.coldSha256, after.coldSha256);
          output("ledger-reach-parity", { before, after, erasure });
          observations.push(
            await observe(other, "guarded-after", guardedPin),
            await observe(f, "control-after", controlPin),
            await observe(f, "control-without-readers", controlPin, false),
            await observe(other, "guarded-without-readers", guardedPin, false),
          );
          return observations;
        });
        output("ledger-overhead", { facts: f.facts, arms });
      } finally {
        probe.close();
        await guarded.close();
      }
      return;
    }
    if (run.mode === "overlap") {
      const { importWork, publishWork, replayErased } = await import("./scenarios.ts");
      const group = groups[1]!;
      const { imported, late } = await measured(async () => {
        const imported = await importWork(f.name, run.binding, dir, async (work) => {
          const arm = await eraseArm(f, 0, group, work);
          await freshPeer(f, arm, 0);
          return arm.result;
        });
        const i = group.people[0]!,
          value = mark(i, 0, group.depths[0]!);
        const late = await replayErased(f.name, run.binding, dir, taskId(i, 0), value);
        const client = new DatomicClient(process.env.DATOMIC_URL!);
        try {
          const current = await client.rows(f.db, {
            entityIds: [taskId(i, 0)],
            pattern: { attribute: field(0) },
          });
          assert.deepEqual(
            current.map((r) => r.value_string),
            [value],
          );
        } finally {
          client.close();
        }
        return { imported, late };
      });
      output("import-overlap", { imported, late });
      const published = await publishWork(
        f.name + "-publish",
        run.binding,
        dir,
        (publisher, cohort, work) =>
          measured(async () => {
            const other = new Fixture(publisher, f.name + "-publish");
            await diag("index", { scope: other.scope });
            const arm = await eraseArm(other, 1, cohort, work);
            await freshPeer(other, arm, 1);
            return arm.result;
          }),
      );
      output("publish-overlap", published);
      return;
    }
    reader = await openComposition("reach", "datomic", fixtureName);
    const r = reader;
    const { arms, gc } = await measured(async () => {
      await collect(f, "seed-gc", false);
      const attempts = [];
      for (const [i, group] of groups.entries()) {
        const baseline = await traffic(f, r, basis, `control-${i}`);
        await diag("index", { scope: f.scope });
        const arm = await eraseArm(f, i, group, (start) =>
          traffic(f, r, basis, `erase-${i}`, start),
        );
        attempts.push({ baseline, arm });
      }
      for (const [i, arm] of attempts.entries()) await freshPeer(f, arm.arm, i);
      return { arms: attempts, gc: await collect(f, "erase-gc", true) };
    });
    output("result", {
      facts: f.facts,
      basis,
      inputs: f.inputs.copy().digest("hex"),
      arms: arms.map(({ baseline, arm }) => ({ baseline, ...arm.result })),
      gc,
    });
  } finally {
    await reader?.close();
    await comp.close();
  }
}

try {
  await scale();
} finally {
  try {
    if (run.mode === "ledger-profile") await flushTracing();
  } finally {
    process.disconnect?.();
  }
}
