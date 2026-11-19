import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { createHash } from "node:crypto";
import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  openComposition,
  type CompositionHandle,
  type Receipt,
} from "../../../bench/lib/composition.ts";
import { W0, canonical, V_W0 } from "../../../bench/lib/w0-world.ts";
import { deepGroups, readDeepWorlds } from "../../../bench/lib/deep-activation.ts";
import { makeDeepTrace } from "../../../bench/lib/deep-trace.ts";
import { subjectOf } from "../../../bench/lib/world.ts";
import type { SubjectState, BuiltCommand } from "../../../bench/lib/commands.ts";
import { percentile } from "../../../bench/lib/w0-traffic.ts";
import { accountsAt, seedAccounts } from "../act2/rung.ts";
import { tenantPlan } from "../scale1/tenant-traffic.ts";
import { TenantWriters, type Account as Tenant, type TenantEvent } from "../scale1/tenants.ts";
import { DeepAccount } from "./deep.ts";
import { Objects, hash } from "./store.ts";
import { Receiver, drain } from "./dispatch.ts";
import { emptyAudit, event, query, measure } from "./bench-rung.ts";
import { iso } from "./v3.ts";
import { stamp } from "./binding.ts";
export type Identity = { source: string; nonce: string; slot: string };
type Sample = {
  tenant: number;
  phase: number;
  ms: number;
  kind: "read" | "save" | "feed";
  position?: number;
  subject?: number;
  seq?: number;
};
function write(dir: string, k: string, v: unknown) {
  fs.writeFileSync(path.join(dir, k + ".json"), JSON.stringify(v) + "\n", { flag: "wx" });
}
function preflightPlan() {
  const accounts = accountsAt(1000),
    a = accounts[1]!;
  // [DX-ACT2] Why: preserve each real intent's predecessor in a small two-window deep preflight. Rejected: sampling a late edit without its earlier saves.
  const fixture = makeDeepTrace("delta-preflight", a.people, 120)
    .events.filter((e) => !e.resend)
    .slice(0, 3);
  const events: TenantEvent[] = fixture.map((e, i) => ({
    ...e,
    tenant: a.index,
    localSubject: e.subject,
    subject: a.first + e.subject,
    localSeq: e.seq,
    atMs: i * 250,
  }));
  assert.equal(events.length, 3);
  return { accounts, events, sha256: hash(JSON.stringify(events)), populationSha256: "" };
}
function scopePlan(small: boolean) {
  return small
    ? preflightPlan()
    : tenantPlan({ study: "million", topology: "pooled", physical: 0 }, "activation");
}
export async function nativeDeep(
  dir: string,
  binding: Identity,
  small: boolean,
  progress: (s: string) => void,
) {
  const plan = scopePlan(small),
    target = plan.accounts[1]!,
    scope = "delta-deep-" + binding.nonce + (small ? "-check" : "-run");
  assert(target.people === (small ? 1000 : 100000));
  const code = stamp(),
    bound = hash([binding, code, plan.sha256, target]);
  const comp = await openComposition("reach", "datomic", scope),
    sinkComp = await openComposition("reach", "datomic", scope + "-effects"),
    url = process.env.DATOMIC_URL;
  if (process.env.DELTA_READER_URL) process.env.DATOMIC_URL = process.env.DELTA_READER_URL;
  let rc: CompositionHandle;
  try {
    rc = await openComposition("reach", "datomic", scope);
  } finally {
    process.env.DATOMIC_URL = url;
  }
  const bridge = new DeepAccount(comp, target.key, bound),
    second = new DeepAccount(rc, target.key, bound),
    oracle = emptyAudit(),
    sink = new Receiver(new Objects(sinkComp, target.key));
  const stats: Sample[] = [],
    known = new Map<number, SubjectState>(),
    writers = new TenantWriters(plan.accounts, plan.events),
    active = new Set(plan.events.map((e) => e.subject));
  const validAt = V_W0,
    anchor = validAt - 4_000_000;
  function bind(r: Receipt) {
    writers.bind(r);
    for (const t of r.triples) {
      const n = subjectOf(t.entityId);
      if (n === null || !active.has(n)) continue;
      if (![":placement/stamp", ":worker/address"].includes(t.attribute)) continue;
      const st = known.get(n) ?? {
        stamp: 0,
        stampId: "",
        stampValidFrom: 0,
        address: "",
        addressId: "",
        addressValidFrom: 0,
      };
      if (t.attribute === ":placement/stamp") {
        st.stamp = Number(t.value.value);
        st.stampId = t.id;
        st.stampValidFrom = t.validFrom!;
      } else {
        st.address = String(t.value.value);
        st.addressId = t.id;
        st.addressValidFrom = t.validFrom!;
      }
      known.set(n, st);
    }
  }
  try {
    progress("seeding " + plan.accounts.length + " deep accounts");
    const seeded = await seedAccounts(
      {
        ...comp,
        transact: async (ops, meta) => {
          const r = await comp.transact(ops, meta);
          if (r.ok) bind(r.value);
          return r;
        },
      },
      plan.accounts,
    );
    if (plan.populationSha256)
      assert.equal(seeded.sha256, plan.populationSha256, "frozen pooled seed");
    const census = Array.from({ length: target.people }, (_, i) =>
        W0.placementId(target.first + i),
      ),
      worlds: W0.World[] = [];
    const sourceBasis = { position: seeded.position, validAt },
      basis = { tx: seeded.position, validTime: iso(validAt) };
    progress("building the release indexes and initializing the actual outbox");
    for (const group of deepGroups(target.first, target.people)) {
      const raw = await readDeepWorlds(rc, group, sourceBasis, target.key);
      assert.equal(await query(oracle, "source", raw), hash(raw.map((w) => w.subject)));
      worlds.push(...raw);
    }
    const initialized = await bridge.control.bootstrap(census, worlds, basis);
    worlds.length = 0;
    await event(oracle, { seq: 0, basis, doc: W0.R1.doc });
    const initial = await drain(bridge.control, sink, 0);
    write(dir, "population", {
      binding,
      target,
      membership: seeded.membership,
      seed: seeded,
      initialized,
      initialDeliveries: initial.applied,
      source: code,
      trace: plan.sha256,
    });
    const ctx = {
      account: bridge.control,
      reader: second.control,
      sink,
      census,
      oracle,
      dir,
      nonce: binding.nonce,
      basis,
    };
    let seq = 0,
      originalTarget = 0,
      phase = 0,
      published = 0,
      stop = false,
      failure: unknown;
    const measurements: Promise<Awaited<ReturnType<typeof measure>>>[] = [],
      clock = performance.now(),
      queues = new Map<number, Promise<void>>();
    const originals = new Map<number, { cmd: BuiltCommand; r: Receipt; from: number }>(),
      needsRetry = new Set(plan.events.filter((e) => e.resend).map((e) => e.seq));
    async function apply(e: TenantEvent) {
      const scheduled = anchor + Math.floor(e.atMs),
        w = writers,
        state = known.get(e.subject);
      assert(state?.stampId && state.addressId);
      const prior = e.resend ? originals.get(e.seq) : undefined;
      if (e.resend) assert(prior, "resend has no committed original");
      const cmd =
          prior?.cmd ??
          w.build(binding.nonce + (small ? ":window-" + originalTarget : ""), e, state, scheduled),
        from = prior?.from ?? scheduled;
      let r: Receipt;
      if (e.tenant === target.index) {
        const saved = await bridge.commit(e.subject, cmd, validAt, from);
        r = saved.receipt;
        assert(saved.duplicate === e.resend);
        if (saved.repaired) {
          assert.equal(saved.repaired.seq, seq + 1);
          const [worldAfter] = await readDeepWorlds(
            rc,
            [e.subject],
            { position: r.position, validAt },
            target.key,
          );
          await query(oracle, "event", { ...saved.repaired, edits: [], worldAfter });
          seq = saved.repaired.seq;
        }
      } else if (prior) {
        const rr = await comp.transactionByCommand(cmd.commandId);
        assert(rr.ok && rr.value?.txId === prior.r.txId);
        r = prior.r;
      } else {
        const rr = await comp.transact(cmd.operations, {
          actor: e.kind,
          commandId: cmd.commandId,
          preconditions: cmd.preconditions,
        });
        assert(rr.ok, "neighbor save failed");
        r = rr.value;
        const got = r.triples
          .map((t) => canonical([t.entityId, t.attribute, t.value, t.validFrom]))
          .sort();
        assert.deepEqual(
          got,
          cmd.operations
            .filter((op) => op.op === "assert")
            .map((t) => canonical([t.entityId, t.attribute, t.value, t.validFrom]))
            .sort(),
        );
      }
      if (!e.resend) {
        bind(r);
        if (needsRetry.has(e.seq)) originals.set(e.seq, { cmd, r, from });
      }
      if (e.resend) originals.delete(e.seq);
      const expected = cmd.operations.filter((op) => op.op === "assert");
      assert.equal(expected.length, e.facts);
      if (e.ackLoss) {
        const command =
          e.tenant === target.index
            ? bridge.db.entity("cmd:source:" + cmd.commandId)
            : cmd.commandId;
        const claim = await rc.transactionByCommand(command);
        assert(claim.ok && claim.value?.position === r.position && claim.value.txId === r.txId);
      }
      return r;
    }
    const observedReads = new Map<
      string,
      { seq: number; subject: string; output: string; state: string }
    >();
    async function readLoop(tenant: Tenant, client: number) {
      let n = 0;
      while (!stop) {
        const id = tenant.first + ((client * 103 + n++ * 191) % tenant.people),
          at = performance.now(),
          ph = phase,
          p = await rc.currentPosition();
        const [raw] = await readDeepWorlds(rc, [id], { position: p, validAt }, tenant.key);
        if (tenant.index === target.index) {
          const v = await second.readAt(raw!.subject, p),
            expected = W0.evaluateWorld(
              raw!,
              W0.compileRelease(
                v.head.activations.filter((x) => x.from <= iso(validAt)).at(-1)!.doc,
              ),
              v.output.basis,
            );
          assert(!W0.isFailure(expected));
          assert.equal(W0.outputJson(expected), W0.outputJson(v.output));
          if (!(await second.debt(p)) && observedReads.size < 2048) {
            const k = v.head.seq + "/" + raw!.subject,
              entry = {
                seq: v.head.seq,
                subject: raw!.subject,
                output: hash(JSON.parse(W0.outputJson(v.output))),
                state: hash(parseOutbox(W0.publishJson({ state: v.state, deliveries: [] })).state),
              };
            const prior = observedReads.get(k);
            if (prior) assert.deepEqual(prior, entry);
            observedReads.set(k, entry);
          }
        }
        stats.push({
          tenant: tenant.index,
          phase: ph,
          kind: "read",
          ms: performance.now() - at,
          position: p,
          subject: id,
        });
      }
    }
    const loops = plan.accounts.flatMap((t) =>
      Array.from({ length: small ? 1 : t.index === target.index ? 64 : 1 }, (_, i) =>
        readLoop(t, i).catch((e) => {
          stop = true;
          failure = e;
        }),
      ),
    );
    const doOffer = async (e: TenantEvent, rel: W0.CompiledRelease) => {
      let signal!: () => void;
      const registered = new Promise<void>((ok) => {
        signal = ok;
      });
      const order = ++published;
      const m = measure(ctx, rel, order, seq, {
        label: rel === W0.R2 ? "broad" : "narrow",
        live: async () => {
          await apply(e);
        },
        registered: () => {
          seq++;
          signal();
        },
      });
      m.catch((err) => {
        failure = err;
        stop = true;
        signal();
      });
      measurements.push(m);
      await registered;
      if (failure) throw failure;
    };
    let broadAt = small ? 1 : 500,
      narrowAt = small ? 2 : 1000;
    try {
      progress("running deep reads, saves and both releases");
      for (const e of plan.events) {
        if (failure) throw failure;
        if (!small) {
          const due = clock + e.atMs;
          while (performance.now() + 1 < due) {
            await delay(Math.min(250, due - performance.now()));
            if (failure) throw failure;
          }
        }
        const offered = small ? performance.now() : clock + e.atMs;
        const next = (queues.get(e.tenant) ?? Promise.resolve()).then(async () => {
          if (failure) throw failure;
          const ph = phase;
          let r: Receipt | undefined;
          if (
            e.tenant === target.index &&
            !e.resend &&
            [broadAt, narrowAt].includes(++originalTarget)
          ) {
            phase = 1;
            await doOffer(e, originalTarget === broadAt ? W0.R2 : W0.R3);
          } else r = await apply(e);
          const ack = performance.now();
          if (!e.resend)
            stats.push({
              tenant: e.tenant,
              phase: ph,
              kind: "save",
              ms: ack - offered,
              seq: e.seq,
              subject: e.subject,
              position: r?.position,
            });
          if (r && !e.resend && e.tenant !== target.index) {
            const feed = await rc.feedPage(r.position - 1, 1);
            assert.equal(feed.transactions[0]?.txId, r.txId);
            stats.push({
              tenant: e.tenant,
              phase: ph,
              kind: "feed",
              ms: performance.now() - ack,
              seq: e.seq,
              subject: e.subject,
              position: r.position,
            });
          }
        });
        next.catch((err) => {
          failure = err;
          stop = true;
        });
        queues.set(e.tenant, next);
      }
      await Promise.all(queues.values());
      await Promise.all(measurements);
      assert.equal(published, 2);
    } finally {
      stop = true;
      await Promise.allSettled(queues.values());
      await Promise.allSettled(measurements);
      await Promise.all(loops);
    }
    if (failure) throw failure;
    const grouped = new Map<number, typeof observedReads>();
    for (const r of observedReads.values()) {
      const m = grouped.get(r.seq) ?? new Map();
      m.set(r.subject, r);
      grouped.set(r.seq, m);
    }
    for (const [seq, g] of [...grouped].sort((a, b) => a[0] - b[0])) {
      const xs = await query(oracle, "read", { seq, subjects: [...g.keys()] });
      for (const x of xs) {
        const actual = g.get(x.subject)!;
        assert.equal(actual.output, x.output);
        assert.equal(actual.state, x.state);
      }
    }
    const ratios = plan.accounts.map((t) => ({
      account: t.key,
      metrics: Object.fromEntries(
        ["read", "save", "feed"].map((k) => {
          const samples = [0, 1].map((ph) =>
            stats
              .filter((s) => s.tenant === t.index && s.kind === k && s.phase === ph)
              .map((s) => s.ms),
          );
          const ms = samples.map((v) => (v.length ? percentile(v, 0.99) : null));
          return [
            k,
            {
              n: samples.map((v) => v.length),
              p99: ms,
              ratio: ms[0] && ms[1] ? ms[1] / ms[0] : null,
            },
          ];
        }),
      ),
    }));
    const reports = await Promise.all(measurements);
    await drain(bridge.control, sink, seq);
    assert.equal(stamp(), code);
    assert.equal(
      stats.filter((s) => s.kind === "save").length,
      plan.events.filter((e) => !e.resend).length,
      "offer denominator differs",
    );
    const sampleDigest = createHash("sha256");
    const file = path.join(dir, "samples.ndjson.gz");
    await pipeline(
      Readable.from(
        (function* () {
          for (const row of stats) {
            const bytes = JSON.stringify(row) + "\n";
            sampleDigest.update(bytes);
            yield bytes;
          }
        })(),
      ),
      createGzip(),
      fs.createWriteStream(file, { flags: "wx" }),
    );
    const summary = {
      binding,
      sampleCount: stats.length,
      samplesSha256: sampleDigest.digest("hex"),
      source: code,
      target,
      trace: plan.sha256,
      subjects: census.length,
      scope,
      offers: reports,
      ratios,
      saves: stats.filter((s) => s.kind === "save").length,
      reads: stats.filter((s) => s.kind === "read").length,
      sourceBoundReadAudits: observedReads.size,
      events: seq,
    };
    write(dir, "result", summary);
    return summary;
  } finally {
    oracle.close();
    await Promise.all([comp.close(), rc.close(), sinkComp.close()]);
  }
}

if (process.argv[1] === import.meta.filename) {
  const dir = process.argv[2]!,
    binding: Identity = JSON.parse(fs.readFileSync(path.join(dir, "request.json"), "utf8"));
  assert(
    process.platform === "linux" &&
      process.env.TRIPLEX_TRACE_SOURCE === binding.source &&
      process.env.TRIPLEX_TRACE_SLOT === binding.slot,
  );
  await nativeDeep(dir, binding, false, (s) => {
    const p = path.join(dir, "STATUS.json");
    fs.writeFileSync(p + ".tmp", JSON.stringify({ binding, stage: s }) + "\n");
    fs.renameSync(p + ".tmp", p);
    console.log(s);
  });
}
