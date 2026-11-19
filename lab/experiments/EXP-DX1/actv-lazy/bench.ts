import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFile, execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  createReadStream,
  readdirSync,
  statSync,
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as sleep } from "node:timers/promises";
import { buildTraceCommand, type SubjectState } from "../../../bench/lib/commands.ts";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";
import { checkV3Trace } from "../../../bench/lib/verdict-plan.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { seed, valid } from "./fixture.ts";
import { activation, openStore, type Store, millis } from "./store.ts";
import { Dispatcher, Receiver } from "./dispatch.ts";
import { price, pct } from "./price.ts";
import { readers } from "./traffic.ts";
import { checkPush } from "./push-check.ts";
import { observeFeed } from "./feed.ts";
const file = (p: string, x: unknown) =>
  writeFileSync(p, JSON.stringify(x, null, 2) + "\n", { flag: "wx" });
type Stamp = { p: number; v: string };
type Account = {
  s: Store;
  f: Awaited<ReturnType<typeof seed>>;
  d: Dispatcher;
  rx: Receiver;
  receiverPath: string;
  acts: W0.Activation[];
  updates: Map<number, Stamp[]>;
  st: Map<number, SubjectState>;
};
const trace = generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 });
checkV3Trace(trace);
assert.equal(traceDigest(trace), "aa8a7636ff027ab3");
const q = (a: number[]) => ({
  n: a.length,
  p50: pct(a, 0.5),
  p95: pct(a, 0.95),
  p99: pct(a, 0.99),
  max: pct(a, 1),
});
async function account(dir: string, n: number) {
  const s = await openStore("lazy-bench-" + randomUUID(), "act2-deep"),
    f = await seed(s, n),
    d = new Dispatcher(s, "act2-deep", 32),
    receiverPath = join(dir, s.scope + ".sqlite"),
    rx = new Receiver(receiverPath, s.scope, f.id);
  const a = await activation(s, "initial", W0.R1, valid);
  await d.drain();
  await rx.drain(s);
  file(join(dir, s.scope + ".json"), {
    n,
    facts: f.facts,
    roster: f.rosterHash,
    seed: f.sourceHash,
    first: f.id,
    R1: a.txId,
  });
  return {
    s,
    f,
    d,
    rx,
    receiverPath,
    acts: [{ tx: a.position, from: valid, release: W0.R1.hash }],
    updates: new Map<number, Stamp[]>(),
    st: new Map<number, SubjectState>(),
  };
}
async function writer(
  a: Account,
  at: number,
  ms: number,
  quiet: boolean,
  window: any,
  notify: () => void,
  offset = 0,
) {
  const offered = trace.filter(
    (e) =>
      e.atMs >= offset && e.atMs < offset + ms && e.subject < a.f.n && (!quiet || e.seq % 4 === 0),
  );
  const originals = new Set(offered.filter((e) => !e.resend).map((e) => e.seq)),
    mine = offered.filter((e) => !e.resend || originals.has(e.seq));
  const rows: {
      key: string;
      off: number;
      ms: number;
      durable: number;
      subject: number;
      facts: number;
      readOwnMs: number;
      affectedAt?: number;
      feedMs?: number;
      p: number;
      tx: string;
      retried: boolean;
    }[] = [],
    resends: { key: string; off: number; ms: number; tx: string }[] = [],
    seen = new Map<number, { ops: any[]; event: any; tx: string }>();
  let chain = Promise.resolve();
  let queued = 0,
    maximumQueue = 0;
  for (const e of mine) {
    const due = at + e.atMs - offset;
    await sleep(Math.max(0, due - Date.now()));
    maximumQueue = Math.max(maximumQueue, ++queued);
    chain = chain.then(async () => {
      const key = window.txId + "/" + e.seq;
      if (e.resend) {
        const original = seen.get(e.seq);
        assert(original);
        assert.equal((await a.s.input(key, original.event, original.ops)).txId, original.tx);
        resends.push({
          key: String(e.seq),
          off: e.atMs,
          ms: performance.timeOrigin + performance.now() - due,
          tx: original.tx,
        });
        return;
      }
      let st = a.st.get(e.subject);
      if (!st) {
        const page = await a.s.rows([ids.placement(e.subject)], await a.s.head(), valid);
        const stamp = page.find(
            (r) => r.entityId === ids.placement(e.subject) && r.attribute === ":placement/stamp",
          ),
          address = page.find(
            (r) => r.entityId === ids.worker(e.subject) && r.attribute === ":worker/address",
          );
        assert(stamp && address);
        st = {
          stamp: Number(stamp.value.value),
          stampId: stamp.id,
          stampValidFrom: stamp.validFrom,
          address: address.value.value,
          addressId: address.id,
          addressValidFrom: address.validFrom,
        };
        a.st.set(e.subject, st);
      }
      const b = buildTraceCommand({
        runTag: window.txId,
        event: e,
        state: st,
        scheduledAbsMs: SEED_VALID_FROM + e.atMs,
      });
      for (const op of b.operations)
        if (op.op === "assert") {
          if (op.entityId.startsWith("evt:")) op.entityId += "/" + window.position;
          if (op.value.type === "ref" && op.value.value.startsWith("evt:"))
            op.value = { ...op.value, value: op.value.value + "/" + window.position };
        }
      let durable = 0;
      const event = { kind: "source" as const, at: valid },
        tx = await a.s.input(key, event, b.operations, (t) => {
          durable = performance.timeOrigin + t;
        }),
        ack = performance.timeOrigin + performance.now();
      seen.set(e.seq, { ops: b.operations, event, tx: tx.txId });
      notify();
      if (e.ackLoss) assert.deepEqual(await a.s.input(key, event, b.operations), tx);
      const stamp = tx.changes.find(
          (v: any) => v.op === "assert" && v.attribute === ":placement/stamp",
        ),
        address = tx.changes.find(
          (v: any) => v.op === "assert" && v.attribute === ":worker/address",
        );
      assert(stamp && Number(stamp.value.value) === b.newStamp);
      Object.assign(st, {
        stamp: b.newStamp,
        stampId: stamp.tripleId,
        stampValidFrom: stamp.validFrom,
      });
      if (address)
        Object.assign(st, {
          address: address.value.value,
          addressId: address.tripleId,
          addressValidFrom: address.validFrom,
        });
      const l = a.updates.get(e.subject) ?? [];
      l.push({ p: tx.position, v: String(b.newStamp) });
      a.updates.set(e.subject, l);
      const f = (await a.s.comp.feedPage(tx.position - 1, 1)).transactions[0];
      assert.deepEqual(f, tx);
      const liveStamp = (await a.s.rows([ids.placement(e.subject)], tx.position, valid)).find(
        (row) => row.entityId === ids.placement(e.subject) && row.attribute === ":placement/stamp",
      );
      assert(
        liveStamp &&
          liveStamp.id === stamp.tripleId &&
          Number(liveStamp.value.value) === b.newStamp &&
          durable > 0,
      );
      rows.push({
        key: String(e.seq),
        off: e.atMs,
        ms: ack - due,
        readOwnMs: performance.timeOrigin + performance.now() - ack,
        subject: e.subject,
        facts: e.facts,
        durable,
        p: tx.position,
        tx: tx.txId,
        retried: e.ackLoss,
      });
    });
    chain = chain.finally(() => {
      queued--;
    });
    void chain.catch(() => {});
  }
  await chain;
  assert.equal(rows.length, mine.filter((e) => !e.resend).length);
  assert.equal(rows.length + resends.length, mine.length);
  assert.equal(queued, 0);
  return { rows, resends, maximumQueue };
}
function worldAt(a: Account, i: number, p: number) {
  const world = a.f.world(i),
    stamp = a.updates.get(i)?.findLast((x) => x.p <= p);
  if (stamp)
    for (const f of world.facts) {
      const target = world.subject + "/ans:revision";
      if (f.e === target || (f.a === "answers" && f.v === target)) {
        (f as any).tx = stamp.p;
        if (f.e === target && f.a === "value") (f as any).v = stamp.v;
      }
    }
  return world;
}
async function verifyReads(a: Account, dbPath: string) {
  const db = new DatabaseSync(dbPath, { readOnly: true }),
    oracle = new DomainOracle(),
    digest = createHash("sha256");
  try {
    let checked = 0;
    const times: number[] = [];
    for (const row of db
      .prepare("SELECT subject,p,digest,count(*) AS n FROM samples GROUP BY subject,p,digest")
      .iterate()) {
      const i = Number(row.subject),
        p = Number(row.p),
        world = worldAt(a, i, p);
      const ref = await oracle.call("reconcile", {
        world,
        activations: a.acts.filter((r) => r.tx <= p),
        basis: { tx: p, validTime: valid },
      });
      assert.equal(sha256(ref), row.digest, "Live reader disagreed with pinned source");
      checked += Number(row.n);
      digest.update(canonical([i, p, row.digest, row.n]) + "\n");
    }
    for (const r of db.prepare("SELECT ms FROM samples ORDER BY ms").iterate())
      times.push(Number(r.ms));
    assert.equal(times.length, checked);
    return { read: q(times), checked, digest: digest.digest("hex") };
  } finally {
    db.close();
    oracle.close();
  }
}
async function window(
  dir: string,
  accounts: Account[],
  target: boolean,
  concurrency: number,
  slot: string,
  nonce: string,
  solo = false,
  smoke = false,
) {
  mkdirSync(dir);
  const duration = smoke ? 2400 : 360000,
    bindings: any[] = [];
  for (const a of accounts)
    bindings.push(await a.s.input("window-" + randomUUID(), { kind: "source", at: valid }));
  const receiver = new DatabaseSync(accounts[0]!.receiverPath, { readOnly: true });
  const receiverStart = Number(
    receiver.prepare("SELECT coalesce(max(n),0) AS n FROM applied").get()!.n,
  );
  receiver.close();
  const children = accounts.map((a, i) =>
    readers({
      scope: a.s.scope,
      n: a.f.n,
      readers: solo || i > 0 ? 4 : concurrency,
      dir,
      tag: "read-" + i,
      slot,
      nonce,
      duration,
    }),
  );
  try {
    await Promise.all(children.map((c) => c.ready));
    const start = Date.now() + 1000;
    for (const c of children) c.start(start);
    let pending = true,
      finished = false,
      signal = Promise.withResolvers<void>();
    const notify = () => {
      pending = true;
      signal.resolve();
    };
    const neighbors = accounts.map((acct, i) => {
      if (!solo && i === 0) return;
      let dirty = false,
        active: Promise<void> | undefined,
        failure: unknown;
      const wake = () => {
        dirty = true;
        if (!active && !failure) {
          active = (async () => {
            while (dirty) {
              dirty = false;
              await acct.d.drain();
              await acct.rx.drain(acct.s);
            }
          })()
            .catch((e) => {
              failure = e;
            })
            .finally(() => {
              active = undefined;
            });
        }
      };
      return {
        wake,
        close: async () => {
          wake();
          await active;
          if (failure) throw failure;
        },
      };
    });
    const feeds = accounts.map((a, i) => observeFeed(a.s, bindings[i].position));
    const switches: any[] = [],
      a = accounts[0]!,
      writes = Promise.all(
        accounts.map((acct, i) =>
          writer(
            acct,
            start,
            duration,
            solo || i > 0,
            bindings[i],
            () => {
              feeds[i]!.wake();
              (neighbors[i]?.wake ?? notify)();
            },
            smoke ? 123000 : 0,
          ),
        ),
      );
    void writes.catch(() => {});
    const eventStats = new Map<
      number,
      {
        id: string;
        candidates: number;
        changed: number;
        deliveryCount: number;
        examined: number;
        firstOut: number | null;
        lastOut: number | null;
        closed: number | null;
        firstSend: number | null;
        lastSend: number | null;
        lastReceiver: number | null;
      }
    >();
    const pendingByKey = new Map<string, number>(),
      recipients = new Set<string>();
    const clock = () => performance.timeOrigin + performance.now();
    let outage:
      | { from: number; to: number; key: string; event: number; owedAtStart: number }
      | undefined;
    async function pump() {
      await a.d.drain((r) => {
        const stamp = clock(),
          e = eventStats.get(r.event) ?? {
            id: r.id,
            candidates: 0,
            changed: 0,
            deliveryCount: 0,
            examined: 0,
            firstOut: null,
            lastOut: null,
            closed: null,
            firstSend: null,
            lastSend: null,
            lastReceiver: null,
          };
        e.candidates += r.subjects.length;
        e.changed += r.changedSubjects.length;
        e.deliveryCount += r.deliveries.length;
        e.examined = Math.max(e.examined, r.examined);
        if (r.deliveries.length) {
          e.firstOut ??= stamp;
          e.lastOut = stamp;
        }
        if (r.complete) e.closed = stamp;
        eventStats.set(r.event, e);
        for (const d of r.deliveries) {
          recipients.add(d.subject);
          pendingByKey.set(d.id + "/" + d.seq, r.event);
        }
      });
      if (target && pendingByKey.size && !outage) {
        const [key, event] = pendingByKey.entries().next().value!;
        outage = { from: clock(), to: 0, key, event, owedAtStart: pendingByKey.size };
        await sleep(smoke ? 100 : 10000);
        outage.to = clock();
      }
      for (const subject of recipients) {
        for (;;) {
          let transmitted = 0,
            applied = 0;
          const next = await a.rx.send(a.s, subject, undefined, (stage) => {
            if (stage === "before-receive") transmitted ||= clock();
            if (stage === "after-receive") applied ||= clock();
          });
          if (!next) break;
          const k = next.d.id + "/" + next.d.seq,
            p = pendingByKey.get(k);
          assert(p !== undefined);
          const e = eventStats.get(p)!;
          e.firstSend ??= transmitted;
          e.lastSend = transmitted;
          e.lastReceiver = applied;
          pendingByKey.delete(k);
        }
      }
      recipients.clear();
    }
    const drain = (async () => {
      if (solo) return;
      await sleep(Math.max(0, start - Date.now()));
      while (!finished || pending) {
        if (!pending) {
          await signal.promise;
          continue;
        }
        pending = false;
        signal = Promise.withResolvers<void>();
        await pump();
      }
    })();
    void drain.catch(() => {});
    const promises = [];
    if (!solo)
      for (let i = 0; i < (smoke ? 2 : 100); i++) {
        const due = start + (smoke ? 100 : 1000) + i * (smoke ? 1200 : 3100);
        await sleep(Math.max(0, due - Date.now()));
        const release = i === 98 ? W0.R1 : i % 2 ? W0.R3 : W0.R2;
        const offer = performance.timeOrigin + performance.now(),
          pBefore = await a.s.head();
        let receipt: any, ownAck: number | undefined;
        if (target) {
          receipt = await activation(
            a.s,
            bindings[0].txId + "/switch/" + i,
            release,
            valid,
            valid,
            (t) => {
              ownAck = performance.timeOrigin + t;
            },
          );
          assert.equal(receipt.changes.length, 1);
          a.acts.push({ tx: receipt.position, from: valid, release: release.hash });
          notify();
        }
        if (target) assert(ownAck !== undefined);
        const durable = ownAck ?? performance.timeOrigin + performance.now(),
          who = a.f.n - 1 - i,
          tag = randomUUID();
        const proc = execFile(
          process.execPath,
          ["--experimental-strip-types", new URL("./cold.ts", import.meta.url).pathname],
          { encoding: "utf8", timeout: 90000, maxBuffer: 8 << 20 },
        );
        const reply = new Promise<void>((res, rej) => {
          let out = "";
          proc.stdout!.on("data", (b) => (out += b));
          proc.once("error", rej);
          proc.once("close", (code) => {
            try {
              assert.equal(code, 0);
              const r = JSON.parse(out),
                end = performance.timeOrigin + performance.now();
              assert(
                r.nonce === tag &&
                  r.scope === a.s.scope &&
                  r.result.basis.tx >= (receipt?.position ?? pBefore),
              );
              switches.push({
                i,
                due,
                offer,
                durable,
                end,
                p: r.result.basis.tx,
                rid: receipt?.txId ?? null,
                activated: receipt?.position ?? null,
                hash: sha256(r.result.json),
                subject: who,
                pin: r.result.basis,
                callMs: r.callMs,
              });
              res();
            } catch (e) {
              rej(e);
            }
          });
        });
        void reply.catch(() => {});
        promises.push(reply);
        proc.stdin!.end(
          JSON.stringify({
            scope: a.s.scope,
            format: "act2-deep",
            subject: a.f.roster[who],
            validTime: valid,
            nonce: tag,
          }),
        );
      }
    let records: Awaited<ReturnType<typeof writer>>[];
    try {
      [records] = await Promise.all([
        writes,
        Promise.all(children.map((c) => c.done)),
        Promise.all(promises),
      ]);
    } finally {
      finished = true;
      notify();
    }
    await drain;
    await Promise.all(neighbors.map((n) => n?.close()));
    if (!solo) {
      await pump();
      assert.equal(pendingByKey.size, 0);
    }
    const summaries = [];
    for (const [i, acct] of accounts.entries()) {
      const record: Awaited<ReturnType<typeof writer>> = records[i]!,
        w = record.rows;
      const affected = await feeds[i]!.finish();
      assert.equal(affected.size, w.length);
      for (const raw of w) {
        const got = affected.get(raw.tx);
        assert(got && got.p === raw.p);
        assert.deepEqual(got.owners, [raw.subject]);
        raw.affectedAt = got.at;
        raw.feedMs = Math.max(0, got.at - raw.durable);
      }
      file(join(dir, "writes-" + i + ".json"), record);
      const reads = await verifyReads(acct, join(dir, "read-" + i + ".sqlite"));
      const routes = JSON.parse(readFileSync(join(dir, "read-" + i + "-routes.json"), "utf8"));
      assert(
        routes.nonce === nonce &&
          routes.scope === acct.s.scope &&
          routes.held > 0 &&
          routes.fallback >= routes.held,
      );
      summaries.push({
        ...reads,
        scope: acct.s.scope,
        seed: acct.f.sourceHash,
        offers: sha256(
          canonical([
            w.map((r) => [r.key, r.off, r.retried]),
            record.resends.map((r) => [r.key, r.off]),
          ]),
        ),
        scheduled: w.length + record.resends.length,
        original: w.length,
        resends: record.resends.length,
        maximumQueue: record.maximumQueue,
        routes,
        readGoodput: reads.checked / (duration / 1000),
        commitBands: [
          [5, 10],
          [11, 25],
          [26, 50],
        ].map(([lo, hi]) => {
          const values = w.filter((r) => r.facts >= lo! && r.facts <= hi!).map((r) => r.ms);
          return { lo, hi, latency: values.length ? q(values) : null };
        }),
        commit: q(w.map((x) => x.ms)),
        feed: q(w.map((x) => x.feedMs!)),
      });
    }
    const oracle = new DomainOracle();
    try {
      for (const sw of switches) {
        const world = a.f.world(sw.subject);
        assert(!a.updates.has(sw.subject));
        const x = await oracle.call("reconcile", {
          world,
          activations: a.acts.filter((act) => act.tx <= sw.p),
          basis: sw.pin,
        });
        assert.equal(sha256(x), sw.hash);
        sw.observedOwnRelease =
          sw.activated === null || a.acts.filter((r) => r.tx <= sw.p).at(-1)?.tx === sw.activated;
      }
    } finally {
      oracle.close();
    }
    for (const sw of switches)
      if (sw.activated !== null) {
        const e = eventStats.get(sw.activated);
        assert(e && e.id === sw.rid && e.closed !== null);
        sw.push = e;
        sw.deliveryLagMs = e.lastReceiver === null ? null : e.lastReceiver - sw.durable;
        sw.coverageLagMs = e.closed - sw.durable;
      }
    file(join(dir, "switches.json"), switches);
    const push = target
      ? await checkPush(
          a.s,
          a.f.roster,
          (i, p) => worldAt(a, i, p),
          bindings[0].position,
          await a.s.head(),
          switches
            .toSorted((u, v) => u.activated - v.activated)
            .map((sw) => {
              const act = a.acts.find((x) => x.tx === sw.activated)!;
              const name = (["R1", "R2", "R3"] as const).find((n) => W0[n].hash === act.release)!;
              assert(name);
              return { name, tx: act.tx, receipt: sw.rid };
            }),
          a.receiverPath,
          receiverStart,
        )
      : null;
    return {
      nonce,
      slot,
      concurrency,
      target,
      solo,
      push,
      outage: outage ?? null,
      summaries,
      switches: switches.length
        ? {
            durable: q(switches.map((x) => x.durable - x.due)),
            cold: q(switches.map((x) => x.end - x.due)),
            missed: switches.filter((x) => !x.observedOwnRelease).length,
            breaches: switches.filter((x) => !x.observedOwnRelease || x.end - x.due >= 1000).length,
          }
        : null,
    };
  } finally {
    for (const c of children) c.close();
  }
}
export async function bench(
  dir: string,
  source: string,
  slot: string,
  nonce: string,
  rawRoot: string,
) {
  assert(
    process.platform === "linux" &&
      execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() === source,
  );
  const root = join(rawRoot, "lazy");
  mkdirSync(root);
  const pre = join(root, "preflight");
  mkdirSync(pre);
  for (const f of [
    "admission-gate",
    "read-gate",
    "dispatch-gate",
    "dependency-gate",
    "boundary-gate",
    "crash",
    "service-gate",
    "pressure",
  ])
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", new URL("./" + f + ".ts", import.meta.url).pathname, pre],
      { stdio: "inherit", timeout: 600000 },
    );
  const legacy = execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--test",
      "--test-concurrency=1",
      "lab/experiments/EXP-DX1/act1/guard.test.ts",
      "lab/experiments/EXP-DX1/act1/page.test.ts",
    ],
    { encoding: "utf8", env: { ...process.env, DX_ACT1_NATIVE: "1" }, timeout: 600000 },
  );
  assert.match(legacy, /# pass 23\b/);
  assert.match(legacy, /# fail 0\b/);
  writeFileSync(join(pre, "legacy.tap"), legacy, { flag: "wx" });
  await price(pre, 1000, "w0", true);
  const opened: Account[] = [],
    rows = [];
  const close = async () => {
    while (opened.length) {
      const a = opened.pop()!;
      a.rx.close();
      a.d.close();
      await a.s.close();
    }
  };
  try {
    const solo = await account(root, 10000);
    opened.push(solo);
    const quietBases = new Map<number, Awaited<ReturnType<typeof window>>>();
    for (const n of [64, 256])
      quietBases.set(
        n,
        await window(join(root, "quiet-" + n), [solo], false, n, slot, nonce, true),
      );
    for (const n of [100000, 100000, 10000, 10000]) opened.push(await account(root, n));
    const [, active, control, quiet, quietLoaded] = opened as [
      Account,
      Account,
      Account,
      Account,
      Account,
    ];
    for (const n of [64, 256]) {
      const quietBase = quietBases.get(n)!;
      const b = await window(join(root, "baseline-" + n), [control, quiet], false, n, slot, nonce),
        v = await window(join(root, "active-" + n), [active, quietLoaded], true, n, slot, nonce);
      const ratios = v.summaries.map((s, i) => {
        const before = i ? quietBase.summaries[0]! : b.summaries[0]!;
        assert(
          s.offers === before.offers &&
            s.seed === before.seed &&
            Math.min(s.commit.n, before.commit.n, s.read.n, before.read.n) >= 500,
        );
        return {
          read: s.read.p99 / before.read.p99,
          commit: s.commit.p99 / before.commit.p99,
          feed: s.feed.p99 / before.feed.p99,
        };
      });
      assert.equal(v.switches?.durable.n, 100);
      assert.equal(v.switches?.cold.n, 100);
      const [hot, neighbor] = ratios;
      const screens = {
        readVisibility:
          v.switches!.missed === 0 && v.switches!.durable.p99 < 1000 && v.switches!.cold.p99 < 1000,
        everyColdResponse: v.switches!.breaches === 0,
        activeReadP99Within100ms: v.summaries[0]!.read.p99 <= 100,
        activeMaxWriterWithin2s: v.summaries[0]!.commit.max <= 2000,
        affectedOwnersKnownWithin250ms: v.summaries[0]!.feed.p99 <= 250,
        followerServedAfterHold: v.summaries.every((r) => r.routes.peer > 0),
        active: hot!.read <= 1.5 && hot!.commit <= 1.5,
        quiet: Math.max(neighbor!.read, neighbor!.commit, neighbor!.feed) <= 1.25,
      };
      rows.push({ quietBase, baseline: b, during: v, ratios, screens });
      file(join(root, "pair-" + n + ".json"), rows.at(-1));
      if (n === 64)
        for (const acct of [active, control]) {
          const reset = await activation(acct.s, "paired-restore", W0.R1, valid);
          acct.acts.push({ from: valid, tx: reset.position, release: W0.R1.hash });
          await acct.d.drain();
          await acct.rx.drain(acct.s);
        }
    }
    const result = {
      source,
      slot,
      nonce,
      scopeCount: 5,
      profile: "lazy-deep",
      subjects: 100000,
      trace: traceDigest(trace),
      rows,
    };
    await close();
    let bytes = 0;
    const files: string[] = [];
    for (const f of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!f.isFile()) continue;
      const path = join(f.parentPath, f.name),
        h = createHash("sha256");
      bytes += statSync(path).size;
      assert(bytes < 1024 ** 3, "Lazy evidence exceeded one GiB");
      for await (const chunk of createReadStream(path)) h.update(chunk);
      files.push(h.digest("hex") + "  " + path.slice(root.length + 1));
    }
    writeFileSync(join(root, "SHA256SUMS"), files.sort().join("\n") + "\n", { flag: "wx" });
    file(join(dir, "summary.json"), result);
  } finally {
    await close();
  }
}
export async function smokeWindow(path: string) {
  const attempt = JSON.parse(readFileSync(join(path, "attempt.json"), "utf8")),
    holder = JSON.parse(readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!, "utf8"));
  assert(
    attempt.mode === "--smoke" &&
      holder.holder === "DX-ACT1" &&
      holder.container === attempt.slot &&
      holder.volume === attempt.volume &&
      execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() === attempt.source,
  );
  const a = await account(path, 256);
  try {
    const r = await window(
      join(path, "traffic-smoke"),
      [a],
      true,
      2,
      attempt.slot,
      attempt.nonce,
      false,
      true,
    );
    assert(r.switches?.cold.n === 2 && r.summaries[0]!.commit.n > 0 && r.summaries[0]!.checked > 0);
    file(join(path, "bench-smoke.json"), r);
  } finally {
    a.rx.close();
    a.d.close();
    await a.s.close();
  }
}
if (process.argv[2] === "--smoke") await smokeWindow(process.argv[3]!);
if (process.argv[2] === "--execute")
  await bench(
    process.argv[3]!,
    process.argv[4]!,
    process.argv[5]!,
    process.argv[6]!,
    process.argv[7]!,
  );
