import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { DependencyIndex } from "../../../packages/host/dist/feed/index.js";
import type { FeedPage, FeedChange } from "../../../packages/core/dist/feed/index.js";
import { dependencyPlans, resolveActivation } from "./di01-refs.ts";
import {
  W0,
  visibleRows,
  reachableRows,
  worldOf,
  triplexValue,
  factValue,
  isReference,
  many,
  sha256,
  canonical,
  type WorldRow,
} from "./w0-world.ts";
export { DependencyIndex, W0, sha256, canonical };
export type Pair = readonly [string, string];
export type Row = readonly [string, string, any];
const immutableWorlds = new WeakSet<object>();
const encodedWorlds = new WeakMap<object, string>();
// [EXP-DI01] Why: repeat full-world checks must still send every fact, but need not re-encode an unchanged immutable body. Rejected: caching affected/dependency outputs, omitting facts, or memoizing mutable caller inputs.
export function oracleInputBytes(input: any): string {
  if (
    !input ||
    Object.keys(input).sort().join(",") !== "basis,release,worlds,writes" ||
    !Array.isArray(input.worlds)
  )
    return canonical(input);
  const worlds = input.worlds.map((w: any) => {
    if (w && typeof w === "object" && immutableWorlds.has(w)) {
      let bytes = encodedWorlds.get(w);
      if (bytes === undefined) {
        bytes = canonical(w);
        encodedWorlds.set(w, bytes);
      }
      return bytes;
    }
    return canonical(w);
  });
  return (
    '{"basis":' +
    canonical(input.basis) +
    ',"release":' +
    canonical(input.release) +
    ',"worlds":[' +
    worlds.join(",") +
    '],"writes":' +
    canonical(input.writes) +
    "}"
  );
}
function freezeWorld(world: W0.World): void {
  const seen = new WeakSet<object>();
  const freeze = (value: any): void => {
    if (!value || typeof value !== "object" || Object.isFrozen(value) || seen.has(value)) return;
    seen.add(value);
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(world);
  immutableWorlds.add(world);
}
export interface DomainReader {
  run(op: string, input: any): Promise<any>;
}
export class DomainOracle {
  sent = 0;
  child = spawn("python3", ["-B", "lab/bench/lib/w0-oracle.py"], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  pending: { resolve: (value: any) => void; reject: (e: Error) => void }[] = [];
  constructor(readonly output?: number) {
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      const p = this.pending.shift();
      if (!p) throw Error("Unexpected oracle output");
      if (output !== undefined) fs.writeSync(output, line + "\n");
      p.resolve(JSON.parse(line));
    });
    this.child.on("exit", (code) => {
      for (const p of this.pending.splice(0)) p.reject(Error("Oracle exited " + code));
    });
  }
  async run(op: string, input: any): Promise<any> {
    return this.runEncoded(op, oracleInputBytes(input));
  }
  runEncoded(op: string, inputBytes: string): Promise<any> {
    this.sent++;
    const result = new Promise((resolve, reject) => this.pending.push({ resolve, reject }));
    this.child.stdin.write('{"input":' + inputBytes + ',"op":' + JSON.stringify(op) + "}\n");
    return result;
  }
  close() {
    this.child.stdin.end();
  }
}
// [EXP-DI01] Why: SPEC 10 is the sorted union of independent per-world intersections. Partition valid unique-subject inputs among fresh unchanged O-DOMAIN processes, with the same release, writes and basis. Rejected: omitting full-world checks, projecting their facts, or caching oracle outputs. Global duplicate/shape validation falls back to an unsplit call.
export class ParallelDomainOracle implements DomainReader {
  private workers: { oracle: DomainOracle; fd: number }[];
  private next = 0;
  private request = 0;
  constructor(
    directory: string,
    readonly output: number,
  ) {
    this.workers = Array.from({ length: 3 }, (_, i) => {
      const fd = fs.openSync(`${directory}/oracle-worker-${i}.jsonl`, "wx");
      return { oracle: new DomainOracle(fd), fd };
    });
  }
  async run(op: string, input: any): Promise<any> {
    const id = ++this.request,
      worlds = input?.worlds;
    const split =
      op === "affected" &&
      Array.isArray(worlds) &&
      worlds.every((w) => w && typeof w.subject === "string") &&
      new Set(worlds.map((w) => w.subject)).size === worlds.length;
    const parts = split ? Math.max(1, Math.min(this.workers.length, worlds.length)) : 1;
    const size = split ? Math.ceil(worlds.length / parts) : 0;
    const requests: any[] = [];
    const calls = Array.from({ length: parts }, (_, part) => {
      const worker = this.next++ % this.workers.length,
        oracle = this.workers[worker]!.oracle;
      const body = split
        ? { ...input, worlds: worlds.slice(part * size, (part + 1) * size) }
        : input;
      const bytes = oracleInputBytes(body),
        ordinal = oracle.sent + 1;
      const ref = { worker, ordinal, inputSha256: sha256(bytes), worlds: body.worlds?.length ?? 0 };
      requests.push(ref);
      return oracle.runEncoded(op, bytes).then((result) => {
        if (split && !result.error) {
          assert(Array.isArray(result.affected));
          assert.deepEqual(result.affected, [...new Set(result.affected)].sort());
          const subjects = new Set(body.worlds.map((w: any) => w.subject));
          assert(result.affected.every((s: string) => subjects.has(s)));
        }
        return result;
      });
    });
    const outcomes = await Promise.allSettled(calls);
    const values = outcomes.map((o) => {
      if (o.status === "rejected") throw o.reason;
      return o.value;
    });
    let result: any;
    if (!split) result = values[0];
    else if (values.some((v) => v.error)) result = values.find((v) => v.error);
    else {
      const affected = values.flatMap((v) => v.affected).sort();
      assert.equal(new Set(affected).size, affected.length);
      result = { affected };
    }
    fs.writeSync(
      this.output,
      canonical({
        requestId: id,
        basis: input.basis,
        release: input.release,
        worlds: worlds?.length ?? 0,
        requests,
        result,
      }) + "\n",
    );
    return { ...result, oracleRequestId: id, oracleRequests: requests };
  }
  close() {
    for (const w of this.workers) {
      w.oracle.close();
      fs.closeSync(w.fd);
    }
  }
}
export class Replay {
  position = 0;
  seedRung: W0.Rung | null = null;
  seedMode = false;
  rows: WorldRow[] = [];
  byEntity = new Map<string, WorldRow[]>();
  subjects = new Set<string>();
  firstSeen = new Map<string, number>();
  private worldCache = new Map<string, { signature: string; world: W0.World }>();
  readonly cacheStats = { hits: 0, rebuilds: 0 };
  latest = new Map<string, WorldRow[]>();
  logHash = awaitHash();
  add(
    rows: readonly Row[],
    validFrom: number,
    retract: readonly Pair[] = [],
    position = this.position + 1,
  ): FeedPage {
    this.position = position;
    const changes: FeedChange[] = [];
    const retire = (r: WorldRow) => {
      if (r.retractedPosition !== undefined) return;
      r.retractedPosition = position;
      changes.push({
        op: "retract",
        entity: r.entityId,
        attribute: r.attribute,
        assertionId: r.id,
        position: String(position),
        validFrom: r.validFrom,
        validTo: r.validTo ?? null,
      });
    };
    for (const [e, a] of retract) for (const r of this.latest.get(e + "\0" + a) ?? []) retire(r);
    for (const [entityId, attribute, v] of rows) {
      if (/^pl:[a-z0-9-]{1,32}$/.test(entityId)) {
        this.subjects.add(entityId);
        if (!this.firstSeen.has(entityId)) this.firstSeen.set(entityId, position);
      }
      const key = entityId + "\0" + attribute,
        prior = this.latest.get(key) ?? [];
      if (
        !many.has(attribute) &&
        !(this.seedMode && validFrom > Date.parse(W0.POPULATION_VALID_TIME))
      )
        for (const r of prior) retire(r);
      const row: WorldRow = {
        id: `di:${position}:${changes.length}`,
        entityId,
        attribute,
        value: triplexValue(attribute, v),
        position,
        validFrom,
      };
      if (
        this.seedMode &&
        this.seedRung &&
        attribute === "payRateCents" &&
        validFrom <= Date.parse(W0.POPULATION_VALID_TIME) &&
        W0.plan(this.seedRung, Number(entityId.slice(4))).raise
      )
        row.validTo = Date.parse("2026-11-16T00:00:00Z");
      this.rows.push(row);
      const body = this.byEntity.get(entityId) ?? [];
      body.push(row);
      this.byEntity.set(entityId, body);
      this.latest.set(key, many.has(attribute) ? [...prior, row] : [row]);
      changes.push({
        op: "assert",
        entity: entityId,
        attribute,
        assertionId: row.id,
        position: String(position),
        validFrom,
        validTo: row.validTo ?? null,
      });
    }
    this.logHash.update(canonical({ position, rows, validFrom, retract }) + "\n");
    return {
      entries: [
        {
          kind: "commit",
          stream: "di01",
          epoch: "0",
          offset: String(position),
          transactions: [
            {
              positions: [String(position)],
              txIds: [`tx:${position}`],
              commandIds: [`cmd:${position}`],
              operationId: `op:${position}`,
              stamp: null,
              stampStatus: "pending-RT01",
              changes,
            },
          ],
        },
      ],
      cursor: { source: "DI01/offline/replay", token: String(position) },
    };
  }
  visible(entity: string, position: number, validAt: number) {
    return visibleRows(this.byEntity.get(entity) ?? [], { position, validAt });
  }
  world(subject: string, position: number, validAt: number): W0.World {
    const index = new Map<string, WorldRow[]>(),
      seen = new Set([subject]);
    for (const e of seen) {
      const rows = this.visible(e, position, validAt);
      index.set(e, rows);
      for (const r of rows)
        if (isReference(r.attribute) && r.value.type === "ref") seen.add(r.value.value);
    }
    const rows = reachableRows([subject], [], index);
    // [EXP-DI01] Why: the full-world checkpoints repeatedly canonicalized unchanged worlds. The visible immutable assertion IDs identify the exact fact body at (p,V). Rejected: caching by subject or source head (misses historical reads and shared-hop changes), or using candidate-index state on the expected side.
    const signature = rows.map((r) => r.id).join("\0");
    const prior = this.worldCache.get(subject);
    if (prior?.signature === signature) {
      this.cacheStats.hits++;
      return prior.world;
    }
    // [EXP-DI01] Why: worldOf's comparator re-encodes each fact at every comparison. Decorate once and pass already byte-ordered rows through the unchanged worldOf, preserving its exact output while making its adaptive sort linear. Rejected: dropping ballast from oracle worlds or replacing the reference world encoder.
    const ordered = rows
      .map((row) => ({
        row,
        key: Buffer.from(
          canonical({
            e: row.entityId,
            a: row.attribute,
            v: factValue(row.value),
            tx: row.position,
          }),
        ),
      }))
      .sort((a, b) => Buffer.compare(a.key, b.key))
      .map((v) => v.row);
    const world = worldOf(subject, ordered);
    freezeWorld(world);
    this.worldCache.set(subject, { signature, world });
    this.cacheStats.rebuilds++;
    return world;
  }
  reader = async (entities: readonly string[], position: number, validAt: number) =>
    entities
      .flatMap((e) => this.visible(e, position, validAt))
      .filter((r) =>
        ["location", "jurisdiction", "documents", "decisions", "p5/activation"].includes(
          r.attribute,
        ),
      )
      .map((r) => ({
        entity: r.entityId,
        attribute: r.attribute,
        value: String(factValue(r.value)),
        position: r.position,
        validFrom: r.validFrom,
        ...(r.validTo === undefined ? {} : { validTo: r.validTo }),
      }));
}
import { createHash } from "node:crypto";
function awaitHash() {
  return createHash("sha256");
}
export const indexFor = (file: string, replay: Replay, V: number, release = W0.R1) =>
  new DependencyIndex(file, {
    consumer: "c",
    validAt: V,
    initialRelease: release.hash,
    plans: dependencyPlans(),
    readRefs: replay.reader,
    resolveActivation,
  });
export const writesOf = (page: FeedPage): Pair[] =>
  page.entries.flatMap((e) =>
    e.kind === "commit"
      ? e.transactions.flatMap((t) => t.changes.map((c) => [c.entity, c.attribute] as const))
      : [],
  );
export async function checkPosition(
  index: DependencyIndex,
  replay: Replay,
  page: FeedPage,
  V: number,
  release: W0.CompiledRelease,
  oracle: DomainReader,
  all = false,
) {
  const position = Number(page.cursor.token),
    writes = writesOf(page),
    entities = new Set(writes.map(([e]) => e));
  const subjects = [...replay.subjects]
    .filter((s) => {
      if (replay.firstSeen.get(s)! > position) return false;
      if (all || entities.has(s)) return true;
      // [EXP-DI01] Why: owned-entity candidates are conservative by owner prefix; shared positions always scan all worlds. Rejected: asking the candidate index for oracle candidates (shared bugs).
      return [...entities].some((e) => e.startsWith(s + "/"));
    })
    .sort();
  const worlds = subjects.map((s) => replay.world(s, position - 1, V));
  const input = {
    basis: { tx: position - 1, validTime: new Date(V).toISOString().replace(".000Z", ".000000Z") },
    release: release.name,
    worlds,
    writes,
  };
  const expected = await oracle.run("affected", input);
  if (expected.error) throw Error(`O-DOMAIN ${position}: ${expected.error}`);
  const observed = index.affectedAt("c", "0", String(position));
  assert.deepEqual(observed, expected.affected, `affected position ${position}`);
  const direct = [
    ...new Set(
      writes
        .map(([e]) => (/^pl:[a-z0-9-]{1,32}$/.test(e) ? e : e.match(/^(pl:[a-z0-9-]+)\//)?.[1]))
        .filter(Boolean),
    ),
  ].sort();
  return {
    position,
    ...(expected.oracleRequestId === undefined
      ? {}
      : { oracleRequestId: expected.oracleRequestId, oracleRequests: expected.oracleRequests }),
    worlds: worlds.length,
    inputSha256: sha256(oracleInputBytes(input)),
    expected: expected.affected,
    observed,
    differsFromDirect: canonical(direct) !== canonical(expected.affected),
    full: all,
  };
}
export function crosscheck(
  index: DependencyIndex,
  replay: Replay,
  position: number,
  V: number,
  release: W0.CompiledRelease,
) {
  for (const s of replay.subjects) {
    const output = W0.evaluateWorld(replay.world(s, position, V), release, {
      tx: position,
      validTime: new Date(V).toISOString().replace(".000Z", ".000000Z"),
    });
    if (W0.isFailure(output)) throw Error(output.error);
    assert.deepEqual(
      index.instantiated(s, release.hash),
      output.dependencies,
      `dependency ${position}/${s}`,
    );
  }
  return replay.subjects.size;
}
