import assert from "node:assert/strict";
import { ackProxy } from "../ha1/ack-proxy.ts";
import { hash, sleep, type Mode } from "../ha1/common.ts";
import {
  immutable,
  pinnedLoop,
  populate,
  receipts,
  requestIndex,
  state,
  type Account,
  type Receipt,
} from "../ha1/one-db.ts";
import { DatomicClient } from "../../../../packages/datomic/test/ha1-account.ts";
import type { SyncPair } from "./pair.ts";
import { replayEvidence } from "./replay.ts";
import { lsn, timeouts, wait } from "./supervisor.ts";
import { walLink } from "./wal-link.ts";

export const faultModes = [
  "hasync-commit",
  "hasync-ack",
  "hasync-index",
  "hasync-import",
  "hasync-cut-wal",
  "hasync-cut-reply",
  "hasync-restart",
] as const;
type Fault = (typeof faultModes)[number];
const latchMs = 35000;
const witness = "fault-witness";

function detached<T>(work: Promise<T>) {
  work.catch(() => {});
  return work;
}
function sendOnce(ac: Account, input: Account["inputs"][number], client = ac.w) {
  return detached(
    client.transact(ac.db, input).then(
      (reply) => ({ reply, error: undefined, at: performance.now() }),
      (error: Error) => ({ reply: undefined, error: error.name, at: performance.now() }),
    ),
  );
}

async function holdSql(pair: SyncPair, statement: string) {
  const owner = "hasync_hold_" + pair.s.e.nonce.slice(0, 8);
  const work = detached(
    pair.sql(
      "pg",
      "begin; set application_name='" +
        owner +
        "'; " +
        statement +
        "; select pg_sleep(" +
        latchMs / 1000 +
        "); rollback",
      "moving",
      latchMs + 5000,
    ),
  );
  const ownerPid = await wait("test SQL lock owner", 5000, async () => {
    const row = await pair.sql(
      "pg",
      "select pid from pg_stat_activity where application_name='" +
        owner +
        "' and wait_event='PgSleep'",
    );
    return /^\d+$/.test(row) ? row : undefined;
  });
  return {
    async blocked(query: "update" | "insert") {
      const proof = await wait("Datomic SQL blocked by the test latch", 10000, async () => {
        const r = await pair.sql(
          "pg",
          "select pid,wait_event,query from pg_stat_activity where " +
            ownerPid +
            "=any(pg_blocking_pids(pid)) and usename='moving' and lower(query) like '" +
            query +
            "%datomic_kvs%' order by pid limit 1",
        );
        return r.includes("|") ? r : undefined;
      });
      return { ownerPid, proof };
    },
    async close() {
      await pair
        .sql(
          "pg",
          "select pg_terminate_backend(pid) from pg_stat_activity where application_name='" +
            owner +
            "' and pid=" +
            ownerPid,
        )
        .catch(() => undefined);
      await work.catch(() => undefined);
    },
  };
}

async function podRevisions(pair: SyncPair) {
  const raw = await pair.sql(
    "pg",
    "select id,rev from datomic_kvs where id like 'pod-log-tail/%' order by id",
    "moving",
  );
  const entries = raw
    .split("\n")
    .filter(Boolean)
    .map((s) => s.split("|") as [string, string]);
  assert(
    entries.every(
      ([k, revision]) => /^pod-log-tail\/[a-zA-Z0-9_./-]+$/.test(k) && /^\d+$/.test(revision),
    ),
  );
  return new Map(entries);
}
async function podForSave(pair: SyncPair, ac: Account) {
  const before = await podRevisions(pair);
  const pin = await ac.send(ac.intent("link-pin", 10, witness));
  const after = await podRevisions(pair);
  const changed = [...after].filter(([id, rev]) => rev !== before.get(id));
  assert.equal(changed.length, 1, "One authored save must identify exactly one native log pod");
  return { id: changed[0]![0], rev: changed[0]![1], pin };
}

async function checkOldRestart(pair: SyncPair) {
  const result = await Promise.all(
    (["pg", "active"] as const).map(async (role) => {
      const before = await pair.s.view(role, timeouts.control);
      assert.equal(before.State.Running, false);
      await pair.docker(role, "start");
      const rejected = await wait("old role refuses startup with the latch", 5000, async () => {
        const v = await pair.s.view(role, timeouts.control);
        return !v.State.Running && v.State.StartedAt !== before.State.StartedAt ? v : undefined;
      });
      assert.equal(rejected.State.ExitCode, 74);
      const log = await pair.s.members.get(role)!.site.docker(["logs", "--tail", "2", rejected.Id]);
      assert.match(log, /DX-HASYNC1-fenced/);
      return {
        role,
        id: rejected.Id,
        oldStart: before.State.StartedAt,
        triedAt: rejected.State.StartedAt,
        exit: rejected.State.ExitCode,
      };
    }),
  );
  return result;
}

async function auditFeed(ac: Account, inputs: typeof ac.inputs, from: string) {
  const order = inputs
    .slice()
    .sort((a, b) =>
      Number(
        BigInt(ac.receipts.get(a.operationId)!.position.v) -
          BigInt(ac.receipts.get(b.operationId)!.position.v),
      ),
    );
  let index = 0;
  let cursor = from;
  let t = BigInt(from) - 1n;
  const positions = new Set<string>();
  for (;;) {
    const page = await ac.r.log(ac.db, cursor, 12);
    assert.equal(page.fromT, cursor);
    for (const row of page.rows) {
      assert(BigInt(row.t) > t, "Feed coordinates must strictly increase");
      t = BigInt(row.t);
      if (row.kind === "skipped") continue;
      assert.equal(row.transaction.operationId, order[index++]?.operationId);
      ac.checkEntry(row);
      const position = row.transaction.positions[0]!;
      assert(!positions.has(position));
      positions.add(position);
    }
    if (page.rows.length === 0) break;
    assert(BigInt(page.nextT) > BigInt(cursor));
    cursor = page.nextT;
  }
  assert.equal(index, order.length);
  return { from, next: cursor, operations: index, positions: positions.size };
}

function trackWitness(ac: Account) {
  type Basis = Awaited<ReturnType<DatomicClient["basis"]>>;
  const read = async (basis: Basis) => {
    assert(basis.t.t === "long" && basis.position.t === "long");
    const rows = await ac.r.rows(ac.db, {
      entityIds: [ac.key + "/" + witness],
      basisT: basis.t.v,
      basis: { recordedPosition: Number(basis.position.v), validAt: 10 },
    });
    return hash(JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id))));
  };
  const samples: { basis: Basis; digest: string }[] = [];
  let open = true;
  const loop = detached(
    (async () => {
      while (open) {
        const basis = await ac.r.basis(ac.db);
        samples.push({ basis, digest: await read(basis) });
        await sleep(100);
      }
    })(),
  );
  return {
    async finish(recheck: boolean) {
      open = false;
      if (!recheck) return loop.catch(() => undefined);
      await loop;
      const unique = new Map<string, string>();
      for (const { basis, digest } of samples) {
        const key = JSON.stringify(basis);
        if (!unique.has(key)) unique.set(key, await read(basis));
        assert.equal(digest, unique.get(key), "A previously served answer changed");
      }
      return { samples, cuts: unique.size };
    },
  };
}

export async function faultDrill(
  pair: SyncPair,
  people: number,
  mode: Mode,
  options: { populated?: (ac: Account) => Promise<unknown>; auditSeed?: boolean } = {},
) {
  assert(faultModes.includes(mode as Fault));
  const { ac, setup: population } = await pair.open({
    init: options.populated ?? ((client) => populate(pair.s, client, people)),
  });
  const link =
    mode === "hasync-cut-wal" || mode === "hasync-cut-reply" ? await walLink(pair) : undefined;
  try {
    const copy = await pair.clone(link?.host, link?.port);
    await pair.service();
    return await faultWork(
      pair,
      ac,
      mode as Fault,
      population,
      copy,
      link,
      options.auditSeed ?? true,
    );
  } finally {
    link?.close();
  }
}

async function faultWork(
  pair: SyncPair,
  ac: Account,
  mode: Fault,
  population: unknown,
  copy: unknown,
  link: Awaited<ReturnType<typeof walLink>> | undefined,
  auditSeed: boolean,
) {
  const e = pair.s.e;
  const baseline = await ac.send(ac.intent("baseline", 10, witness));
  await ac.pinned(baseline);
  const selected = [ac.inputs.at(-1)!];
  const checkpoint = await requestIndex(ac);
  e.log("index-floor", checkpoint);
  let pin = baseline;
  let logPod: Awaited<ReturnType<typeof podForSave>> | undefined;
  if (mode === "hasync-commit" || mode === "hasync-import") {
    logPod = await podForSave(pair, ac);
    selected.push(ac.inputs.at(-1)!);
    pin = logPod.pin;
  }
  if (mode === "hasync-index") {
    for (let i = 0; i < 8; i++) {
      pin = await ac.send(ac.intent("index-tail-" + i, 160, witness));
      selected.push(ac.inputs.at(-1)!);
    }
  }
  await ac.pinned(pin);
  const ackedBefore = ac.inputs.filter((i) => ac.receipts.has(i.operationId));
  const readbackBefore = await receipts(ac, ackedBefore);
  let pending: Account["inputs"][number] | undefined;
  let original: Receipt | undefined;
  let readOriginal: Receipt | undefined;
  let transport: ReturnType<typeof sendOnce> | undefined;
  let control: Promise<void> | undefined;
  let hold: Awaited<ReturnType<typeof holdSql>> | undefined;
  let withheld: Awaited<ReturnType<typeof ackProxy>> | undefined;
  let withoutAck: DatomicClient | undefined;
  let trap: unknown;
  let restart: Awaited<ReturnType<typeof checkOldRestart>> | undefined;
  let from: number;
  let indexWork: Promise<unknown> | undefined;
  const monitor = pinnedLoop(ac, pin);
  const current = trackWitness(ac);
  try {
    if (mode !== "hasync-index" && mode !== "hasync-restart") {
      // The 2,000-fact import is one authored transaction across ten subjects.
      pending = ac.intent(
        "in-flight",
        mode === "hasync-import" ? 2000 : 10,
        mode === "hasync-import" ? "import" : witness,
        mode === "hasync-import" ? 10 : 1,
      );
      e.log("fault-input", {
        operation: pending.operationId,
        facts: pending.rows.length,
        sha256: hash(JSON.stringify(pending)),
      });
      selected.push(pending);
    }
    if (logPod && pending) {
      hold = await holdSql(
        pair,
        "select id from datomic_kvs where id='" + logPod.id + "' for update",
      );
      transport = sendOnce(ac, pending);
      trap = {
        ...(await hold.blocked("update")),
        pod: logPod.id,
        previousRevision: logPod.rev,
        phase: "tail chunk written, log pointer still in transaction",
      };
      assert.equal((await ac.r.operation(ac.db, pending.operationId)).status, "absent");
    } else if (mode === "hasync-ack" && pending) {
      withheld = await ackProxy(pair.route!.url);
      withoutAck = new DatomicClient(withheld.url, timeouts.request);
      transport = sendOnce(ac, pending, withoutAck);
      await withheld.wait([pending.operationId], true);
      const bytes = withheld.requests.get(pending.operationId)!;
      assert.equal(bytes.status, 200);
      original = immutable(bytes.reply);
      assert.equal(original.operationId, pending.operationId);
      readOriginal = await wait("survivor sees the logged command", 5000, async () => {
        const observed = await ac.r.operation(ac.db, pending!.operationId);
        return observed.status === "committed" ? immutable(observed) : undefined;
      });
      assert.deepEqual(readOriginal, original);
      trap = {
        phase: "surviving reader saw the logged write before the caller's reply",
        request: hash(Buffer.from(bytes.requestBytes, "base64")),
        reply: hash(Buffer.from(bytes.responseBytes!, "base64")),
        original,
        readOriginal,
      };
    } else if (mode === "hasync-index") {
      const before = await state(ac);
      assert(before.indexBasis && BigInt(before.indexBasis) < BigInt(pin.t.v));
      hold = await holdSql(pair, "lock table datomic_kvs in share mode");
      indexWork = detached(
        ac.w.request(
          "POST",
          "/v2/db/" + ac.db + "/request-index",
          { waitMs: 12000 },
          timeouts.request,
        ),
      );
      trap = {
        ...(await hold.blocked("insert")),
        before,
        requestedAt: before.basis,
        phase: "requested Datomic index job blocked writing a segment",
      };
    }
    if (link && pending) {
      const before = link.counters();
      const durable = await pair.candidate();
      from = link.cut(mode === "hasync-cut-wal" ? "wal" : "reply");
      transport = sendOnce(ac, pending);
      const direction = mode === "hasync-cut-wal" ? "wal" : "reply";
      const other = direction === "wal" ? "reply" : "wal";
      // [DX-HASYNC1] Why: prove that the cut delayed a real local commit and traffic still flowed in the reverse direction. Rejected: assuming the fault from the relay switch alone.
      trap = await wait("asymmetric replication and a blocked append", 7000, async () => {
        const packet = link.counters();
        const waiting = await pair.sql(
          "pg",
          "select pg_current_wal_flush_lsn(),pid,query from pg_stat_activity where " +
            "usename='moving' and wait_event='SyncRep' and lower(query) like '%datomic_kvs%' " +
            "order by query_start desc limit 1",
        );
        if (
          !waiting ||
          packet[direction].dropped <= before[direction].dropped ||
          packet[other].sent <= before[other].sent
        )
          return undefined;
        const current = await pair.candidate();
        if (direction === "reply" && lsn(current.receive) <= lsn(durable.receive)) return undefined;
        return { direction, before, packet, waiting, durable, current };
      });
      e.log("fault-trap", trap);
      control = detached(pair.supervisor().run("fault", "single-copy-after-fence"));
    } else {
      if (trap) e.log("fault-trap", trap);
      control = detached(pair.supervisor().run("fault", "single-copy-after-fence"));
      const killed = await pair.s.kill("pg");
      from = killed.from;
    }
    await control;
    if (mode === "hasync-restart") restart = await checkOldRestart(pair);
    let initialStatus: string | undefined;
    let resolution: Receipt | undefined;
    if (pending) {
      withheld?.drop();
      const result = await transport;
      assert(
        result && !result.reply && result.error,
        "Faulted operation must have an ambiguous caller outcome",
      );
      const beforeRetry = await ac.r.operation(ac.db, pending.operationId);
      initialStatus = beforeRetry.status;
      assert.equal(initialStatus, original ? "committed" : "absent");
      resolution = await ac.send(pending);
      if (original) assert.deepEqual(resolution, original);
      if (readOriginal) assert.deepEqual(resolution, readOriginal);
      assert.deepEqual(await ac.send(pending), resolution);
    }
    const fresh = await ac.send(ac.intent("new-writer", 10, witness));
    const firstNewAt =
      resolution && initialStatus === "absent"
        ? ac.arrivals.get(resolution.operationId)!
        : ac.arrivals.get(fresh.operationId)!;
    selected.push(ac.inputs.at(-1)!);
    const polls = await monitor.finish();
    const repeat = await current.finish(true);
    const during = polls.filter((v) => v.start >= from && v.end <= firstNewAt);
    assert(
      during.length > 0 && during.every((v) => v.code === "ok"),
      "Read outage or missing in-window probe",
    );
    await ac.pinned(pin);
    const recovered = await receipts(ac);
    const replay = await replayEvidence(e, ac, selected);
    const feed = await auditFeed(
      ac,
      auditSeed ? ac.inputs : selected,
      auditSeed ? ac.cursor : baseline.t.v,
    );
    const report = {
      mode,
      population,
      copy,
      from,
      initialStatus,
      resolution,
      fresh,
      restart,
      firstNewMs: firstNewAt - from,
      polls,
      repeat,
      during: during.length,
      trap,
      before: readbackBefore,
      recovered,
      oracle: replay,
      feed,
      policy: "single-copy-after-fence",
    };
    e.write("fault", report);
    return report;
  } finally {
    await monitor.finish();
    await current.finish(false);
    withheld?.drop();
    withheld?.close();
    withoutAck?.close();
    await hold?.close();
    await indexWork?.catch(() => undefined);
    await control?.catch(() => undefined);
  }
}
