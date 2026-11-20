import assert from "node:assert/strict";
import { Worker, parentPort, workerData } from "node:worker_threads";
import {
  DatomicClient,
  Replica,
  ReplicaInvalid,
  ReplicaSnapshot,
  type ReplicaImage,
} from "../../../../packages/datomic/dist/index.js";
import { type CompositionHandle } from "../../../bench/lib/composition.ts";
import { policyWorld } from "../../../bench/lib/deep-activation.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { ids as nativeIds } from "../../../bench/lib/world.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { keyFor } from "../scale1/tenants.ts";
import { instant } from "./deep.ts";
import type { Event, Notices } from "./journal.ts";
import type { Coverage } from "./ranges.ts";
import { hash, transportHash, unpack } from "./store.ts";

type Work = W0.EvaluationRecord["workItems"];
type Input = {
  image: ReplicaImage;
  ids: string[];
  deep: boolean;
  basis: W0.Basis;
  next: "R1" | "R2";
};
type Match = { subject: string; work: Work };
type Result = { matches: Match[]; examined: number; evaluateMs: number };
const root = (subject: string, deep: boolean) =>
  deep ? nativeIds.placement(Number(subject.slice(4))) : "notice-fixture:" + subject;

const changedFloor = (pay: number, state: number, local: number) => {
  const upper = Math.max(state, local);
  return state !== upper && pay < upper;
};

export function wageRangeMember(world: W0.World) {
  const subject = world.subject;
  const one = (entity: string, attr: string) => {
    const items = world.facts.filter((f) => f.e === entity && f.a === attr);
    assert(items.length <= 1);
    return items[0]?.v;
  };
  const location = one(subject, "location"),
    pay = one(subject, "payRateCents");
  if (location === undefined || pay === undefined) return false;
  assert(typeof location === "string" && typeof pay === "number");
  const jurisdiction = one(location, "jurisdiction");
  assert(jurisdiction === undefined || typeof jurisdiction === "string");
  const state = jurisdiction === undefined ? undefined : one(jurisdiction, "stateMinWageCents");
  const local = one(location, "localMinWageCents");
  assert(
    (state === undefined || typeof state === "number") &&
      (local === undefined || typeof local === "number"),
  );
  // [DX-STG1] Why: R1 and R2 have the same notice rules except MINWAGE's
  // floor source. DOCEXP keeps the same document kinds and expiry instant.
  // Rejected: selecting only threshold crossings and losing revised payloads.
  return changedFloor(pay, state ?? -1, local ?? -1);
}

function scan(input: Input): Result {
  const view = new ReplicaSnapshot(input.image);
  const matches: Match[] = [];
  let evaluateMs = 0;
  for (const subject of input.ids) {
    const rows = view.world(root(subject, input.deep));
    let world: W0.World;
    if (input.deep) {
      const index = Number(subject.slice(4)),
        owner = nativeIds.worker(index);
      assert.deepEqual(
        rows
          .filter((r) => r.entityId === root(subject, true) && r.attribute === ":subject/account")
          .map((r) => r.value.value),
        [keyFor(0)],
      );
      // [DX-STG1] Why: the deep profile gives each person private floor values.
      // Rejected: building task and answer projections for the complement.
      const wage = (name: string) => {
        const scalar = rows.filter(
          (r) => r.entityId === owner && r.attribute === ":person/custom-" + name,
        );
        assert.equal(scalar.length, 1);
        const value = Number(scalar[0]!.value.value);
        assert(Number.isSafeInteger(value));
        return value;
      };
      if (!changedFloor(wage("pay-cents"), wage("state-floor"), wage("local-floor"))) continue;
      world = policyWorld(index, rows, {
        position: input.basis.tx,
        validAt: view.validAt,
      });
    } else {
      const body = rows.filter((r) => r.attribute === "world");
      assert.equal(body.length, 1);
      world = unpack<W0.World>(String(body[0]!.value.value));
      world = {
        subject: world.subject,
        facts: world.facts.map((f) => ({ ...f, tx: f.tx || body[0]!.position })),
      };
      if (!wageRangeMember(world)) continue;
    }
    assert.equal(world.subject, subject);
    const begin = performance.now();
    const result = W0.evaluateWorld(world, W0[input.next], input.basis);
    assert(!("error" in result), "Copied world cannot be evaluated");
    evaluateMs += performance.now() - begin;
    matches.push({ subject, work: result.workItems });
  }
  return { matches, examined: input.ids.length, evaluateMs };
}

if (parentPort && workerData?.kind === "notice-copy") {
  try {
    parentPort.postMessage({ result: scan(workerData.input) });
  } catch (error) {
    parentPort.postMessage({
      error: String(error),
      declined: error instanceof assert.AssertionError,
    });
  }
}

async function parallel(input: Input, workers: number) {
  const count = Math.min(workers, input.ids.length);
  const pool = Array.from({ length: count }, (_, i) => {
    const from = Math.floor((input.ids.length * i) / count);
    const end = Math.floor((input.ids.length * (i + 1)) / count);
    return new Worker(new URL(import.meta.url), {
      workerData: { kind: "notice-copy", input: { ...input, ids: input.ids.slice(from, end) } },
    });
  });
  try {
    return await Promise.all(
      pool.map(
        (worker) =>
          new Promise<Result>((resolve, reject) => {
            worker.once("message", (m: { result?: Result; error?: string; declined?: boolean }) => {
              if (m.result) resolve(m.result);
              else if (m.declined) reject(new ReplicaInvalid(m.error));
              else reject(new Error(m.error ?? "Notice copy worker did not return a result"));
            });
            worker.once("error", reject);
            worker.once("exit", (code) => reject(Error("Notice copy worker exited " + code)));
          }),
      ),
    );
  } finally {
    await Promise.all(pool.map((worker) => worker.terminate()));
  }
}

export class ReleaseCopy {
  readonly stats = {
    captures: 0,
    declines: 0,
    captureMs: 0,
    copiedBytes: 0,
    pages: 0,
    examined: 0,
    evaluated: 0,
    evaluateMs: 0,
    workerMs: 0,
  };
  private readonly source: CompositionHandle;
  private readonly ids: string[];
  private readonly deep: boolean;
  private readonly workers: number;
  private readonly censusHash: string;
  private copy?: {
    position: number;
    validTime: string;
    image: ReplicaImage;
    candidates?: string[];
  };
  private plan?: { assertion: string; results: Map<string, Work> };
  constructor(source: CompositionHandle, people: number, deep: boolean, workers: number) {
    assert(Number.isSafeInteger(people) && people > 0);
    assert(Number.isInteger(workers) && workers >= 1 && workers <= 8);
    this.source = source;
    this.ids = Array.from({ length: people }, (_, i) => W0.placementId(i));
    this.censusHash = hash(this.ids);
    this.deep = deep;
    this.workers = workers;
  }
  results(e: Event, ids: string[]) {
    const map = this.plan?.assertion === e.id ? this.plan.results : undefined;
    if (map && ids.every((s) => map.has(s))) return ids.map((s) => map.get(s)!);
  }
  async suggest(a: Notices, e: Event, sourceAt: number): Promise<Coverage | undefined> {
    try {
      return await this.select(a, e, sourceAt);
    } catch (error) {
      if (!(error instanceof ReplicaInvalid || error instanceof assert.AssertionError)) throw error;
      this.copy = undefined;
      this.plan = undefined;
      this.stats.declines++;
    }
  }
  private async select(a: Notices, e: Event, sourceAt: number): Promise<Coverage | undefined> {
    const next = e.value.next,
      old = e.value.old;
    if (
      e.value.kind !== "activation" ||
      !old ||
      (next !== "R1" && next !== "R2") ||
      (old !== "R1" && old !== "R2") ||
      old === next ||
      e.value.nextHash !== W0[next].hash ||
      e.value.oldHash !== W0[old].hash ||
      this.source.scopeName !== a.db.store.scopeName ||
      e.value.census.count !== this.ids.length ||
      e.value.census.members !== this.censusHash ||
      (await a.db.get<number>("erasure", sourceAt)).value !== 0
    )
      return;
    const prior = await a.event(e.value.sequence - 1, e.at - 1);
    if (
      prior.at !== e.at - 1 ||
      e.value.sourceBefore !== prior.at ||
      prior.value.nextHash !== e.value.oldHash ||
      hash(prior.value) !== e.value.parent ||
      prior.value.validTime !== e.value.validTime
    )
      return;
    const frame = (await this.source.feedPage(e.at - 1, 1)).transactions[0];
    if (
      frame?.position !== e.at ||
      !frame.txId ||
      frame.actor !== "notice-v1" ||
      frame.changes.length !== 4 ||
      frame.changes.some((c: { entityId: string }) => !c.entityId.startsWith(a.db.prefix)) ||
      !frame.changes.some(
        (c: { op: string; tripleId: string; entityId: string; value: { value: string } }) =>
          c.op === "assert" &&
          c.tripleId === e.id &&
          c.entityId === a.db.prefix + "event:" + e.value.sequence &&
          c.value.value === canonical(e.value),
      )
    )
      return;
    // [DX-STG1] Why: bootstrap inside the first dispatch and charge its cost.
    // A consecutive release frame can retain the view only when all four
    // native changes are journal metadata. Rejected: prewarming from latest.
    const validAt = instant(e.value.validTime);
    if (
      !this.copy ||
      this.copy.position !== prior.at ||
      this.copy.validTime !== e.value.validTime
    ) {
      const begin = performance.timeOrigin + performance.now();
      const client = new DatomicClient(this.source.backend.url, 35000, 64 * 1024 ** 2);
      try {
        // [DX-STG1] Why: the replica endpoint names the branded Triplex scope.
        // Rejected: encoding just the fixture label, which selects another database.
        const scope = runtimeApi.DatabaseScope.test(this.source.scopeName!);
        const db = "s2-" + Buffer.from(String(scope)).toString("base64url");
        const source = Replica.source(client, db, () => this.source.currentPosition(), validAt);
        const fetch = source.page;
        source.page = (...args) => {
          this.stats.pages++;
          return a.budget
            ? a.budget.http(
                "copy-page",
                "source",
                () => fetch(...args),
                (result) => ({ cut: result.position, roots: args[0].length }),
              )
            : fetch(...args);
        };
        const replica = new Replica(source, validAt);
        await replica.bootstrap(
          this.ids.map((s) => root(s, this.deep)),
          e.at,
        );
        const view = await replica.snapshotAt(e.at);
        assert.equal(view.position, e.at);
        this.stats.copiedBytes += view.bytes;
        this.copy = { position: e.at, validTime: e.value.validTime, image: view.sharedImage() };
        this.stats.captures++;
      } finally {
        client.close();
        this.stats.captureMs += performance.timeOrigin + performance.now() - begin;
        a.budget?.mark("copy-capture", begin);
      }
    } else this.copy.position = e.at;
    const begin = performance.timeOrigin + performance.now();
    // [DX-STG1] Why: the same proven wage bounds select the same people in
    // both directions on unchanged inputs. Rejected: carrying the range
    // across an unverified source update or a different business time.
    const examined = this.copy.candidates ?? this.ids;
    const batches = await parallel(
      {
        image: this.copy.image,
        ids: examined,
        deep: this.deep,
        basis: { tx: e.at, validTime: e.value.validTime },
        next,
      },
      this.workers,
    );
    const list = batches.flatMap((b) => b.matches);
    const ids = list.map((m) => m.subject);
    assert.deepEqual(ids, [...new Set(ids)].sort(), "Copied work overlaps or is out of order");
    assert.equal(
      batches.reduce((n, b) => n + b.examined, 0),
      examined.length,
    );
    this.copy.candidates = ids;
    this.stats.examined += examined.length;
    this.stats.evaluated += list.length;
    this.stats.evaluateMs += batches.reduce((n, b) => n + b.evaluateMs, 0);
    this.stats.workerMs += performance.timeOrigin + performance.now() - begin;
    a.budget?.mark("copy-workers", begin, { examined: examined.length, evaluations: list.length });
    this.plan = { assertion: e.id, results: new Map(list.map((m) => [m.subject, m.work])) };
    return {
      parent: prior.id,
      txId: frame.txId,
      edits: transportHash(frame.changes),
      ids,
      evaluated: list.length,
    };
  }
}
