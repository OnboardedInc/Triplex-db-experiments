import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  openComposition,
  type CompositionHandle,
  type Receipt,
} from "../../../bench/lib/composition.ts";
import { W0, V_W0 } from "../../../bench/lib/w0-world.ts";
import { deepGroups } from "../../../bench/lib/deep-activation.ts";
import { makeDeepTrace } from "../../../bench/lib/deep-trace.ts";
import { subjectOf } from "../../../bench/lib/world.ts";
import type { SubjectState } from "../../../bench/lib/commands.ts";
import { seedAccounts } from "../act2/rung.ts";
import { TenantWriters, keyFor, type TenantEvent } from "../scale1/tenants.ts";
import { DeepAccount } from "./deep.ts";
import { hash } from "./store.ts";
import { emptyAudit, query, event, checkRoster } from "./bench-rung.ts";
import { CurrentDecisions, writerPipeline } from "./service.ts";
import { loadedOffers, Timeline, type TrafficArm } from "./loaded.ts";
import { iso } from "./v3.ts";
import { seedFacts } from "./model.ts";
import { expand, concrete } from "./dispatch.ts";
import { soloPopulation, soloScope } from "./solo-population.ts";
import { scopedDeepPolicy, scopedOvertimeRows } from "./solo-policy.ts";
import { pageReference } from "./solo-reference.ts";
import { headSha, stamp } from "./binding.ts";
import type { Identity } from "./server.ts";
import { compareWorlds, DeepInputs } from "./deep-inputs.ts";
import { AuditReplay } from "./audit-replay.ts";
import { auditOffers } from "./audit-offers.ts";
import { readerProcess } from "./audit-reader.ts";
import type { DurabilityMode } from "./model.ts";

type Arm = "reference" | DurabilityMode;

export async function openFreshSource(binding: Identity, people: number, arm?: Arm) {
  const scope = soloScope(binding.nonce, people, arm),
    c = await openComposition("reach", "datomic", scope);
  try {
    assert.equal(c.scopeName, scope);
    assert.equal(
      await c.currentPosition(),
      0,
      "large or preflight source already contains commands",
    );
    return c;
  } catch (e) {
    await c.close();
    throw e;
  }
}
export async function solo(
  dir: string,
  b: Identity,
  n: number,
  count: number,
  stage: (s: string) => void,
  arm?: Arm,
) {
  const timings: { stage: string; startMs: number }[] = [],
    begin = performance.now();
  const enter = (s: string) => {
    timings.push({ stage: s, startMs: performance.now() - begin });
    stage(s);
  };
  assert([1000, 10000, 100000].includes(n));
  const expectedSeed = n === 1000 || n === 100000 ? soloPopulation(n) : undefined;
  const code = stamp(),
    scope = soloScope(b.nonce, n, arm),
    target = { index: 0, key: keyFor(0), first: 0, people: n },
    neighbors =
      n === 10000
        ? [1, 2].map((index) => ({
            index,
            key: keyFor(index),
            first: n + (index - 1) * 96,
            people: 96,
          }))
        : [],
    accounts = [target, ...neighbors];
  const source = await openFreshSource(b, n, arm),
    url = process.env.DATOMIC_URL;
  if (process.env.DELTA_READER_URL) process.env.DATOMIC_URL = process.env.DELTA_READER_URL;
  let rc: CompositionHandle;
  try {
    rc = arm ? source : await openComposition("reach", "datomic", scope);
  } finally {
    process.env.DATOMIC_URL = url;
  }
  const pipe = writerPipeline(source),
    bind = hash([b, code, target]),
    oracle = emptyAudit(),
    pageOracle = emptyAudit(),
    inputs = arm ? new DeepInputs() : undefined;
  let cold: CompositionHandle | undefined;
  let remote: ReturnType<typeof readerProcess> | undefined;
  try {
    const byAccount = accounts.map((a) =>
        makeDeepTrace("delta-solo-deep", a.people, 1800)
          .events.filter((e) => !e.resend)
          .map((e) => ({
            ...e,
            tenant: a.index,
            localSubject: e.subject,
            subject: a.first + e.subject,
            localSeq: e.seq,
          })),
      ),
      events: TenantEvent[] = byAccount.flat(),
      w = new TenantWriters(accounts, events),
      active = new Set(events.map((e) => e.subject)),
      known = new Map<number, SubjectState>();
    function observe(r: Receipt) {
      w.bind(r);
      for (const t of r.triples) {
        const i = subjectOf(t.entityId);
        if (i === null || !active.has(i)) continue;
        if (t.attribute !== ":placement/stamp" && t.attribute !== ":worker/address") continue;
        const s = known.get(i) ?? {
          stamp: 0,
          stampId: "",
          stampValidFrom: 0,
          address: "",
          addressId: "",
          addressValidFrom: 0,
        };
        if (t.attribute === ":placement/stamp") {
          s.stamp = Number(t.value.value);
          s.stampId = t.id;
          s.stampValidFrom = t.validFrom!;
        } else {
          s.address = String(t.value.value);
          s.addressId = t.id;
          s.addressValidFrom = t.validFrom!;
        }
        known.set(i, s);
      }
    }
    enter("seeding " + accounts.length + " deep account" + (accounts.length === 1 ? "" : "s"));
    const seed = await seedAccounts(
      {
        ...source,
        transact: async (ops, meta) => {
          const r = await source.transact(ops, meta);
          if (r.ok) {
            inputs?.ingestSeed(ops, r.value);
            observe(r.value);
          }
          return r;
        },
      },
      accounts,
    );
    assert.deepEqual(seed.membership, Object.fromEntries(accounts.map((a) => [a.key, a.people])));
    if (expectedSeed)
      assert(
        seed.facts === expectedSeed.facts && seed.sha256 === expectedSeed.sha256,
        "native seed differs from the verified single-account fixture",
      );
    const policy = await scopedDeepPolicy(source, seed.position),
      bridge = new DeepAccount(pipe.comp, target.key, bind, policy.read),
      read = new DeepAccount(rc, target.key, bind, policy.read),
      ids = Array.from({ length: n }, (_, i) => W0.placementId(i)),
      basis = { tx: policy.catalog.position, validTime: iso(V_W0) },
      worlds: W0.World[] = [];
    enter("checking the source and building ordinary indexes");
    for (const group of deepGroups(0, n)) {
      const batch = await policy.read(
        rc,
        group,
        { position: policy.catalog.position, validAt: V_W0 },
        target.key,
      );
      const expected = inputs
        ? group.map((i) => inputs.world(i, policy.catalog.position, V_W0, policy.catalog.position))
        : batch;
      if (inputs)
        compareWorlds(
          batch.map((w) => ({ subject: w.subject, facts: seedFacts(w, basis) })),
          expected,
        );
      for (const o of arm === "reference" ? [pageOracle] : arm ? [oracle] : [oracle, pageOracle])
        assert.equal(await query(o, "source", expected), hash(batch.map((w) => w.subject)));
      worlds.push(...batch.map((w) => ({ subject: w.subject, facts: seedFacts(w, basis) })));
    }
    const ready = await bridge.control.bootstrap(
      ids,
      worlds,
      basis,
      true,
      arm ? "native" : undefined,
    );
    await event(oracle, { seq: 0, basis, doc: W0.R1.doc });
    const timeline = new Timeline(oracle, basis, ready.position),
      auditReplay = arm
        ? new AuditReplay(source, bridge.control, oracle, basis, ready.position)
        : undefined;
    const services = [bridge];
    for (const neighbor of neighbors) {
      const service = new DeepAccount(
          pipe.comp,
          neighbor.key,
          hash([b, code, neighbor]),
          policy.read,
        ),
        small: W0.World[] = [];
      for (const group of deepGroups(neighbor.first, neighbor.people))
        small.push(
          ...(await policy.read(
            rc,
            group,
            { position: policy.catalog.position, validAt: V_W0 },
            neighbor.key,
          )),
        );
      await service.control.bootstrap(
        small.map((w) => w.subject),
        small,
        basis,
        true,
        arm ? "native" : undefined,
      );
      services.push(service);
    }
    const ordinal = accounts.map(() => 0);
    async function writeReal(index = 0) {
      const a = accounts[index]!,
        service = services[index]!,
        e = byAccount[index]![ordinal[index]!++]!,
        st = known.get(e.subject);
      assert(st?.stampId && st.addressId);
      const from = V_W0 - 4000000 + Math.floor(e.atMs),
        cmd = w.build(b.nonce, e, st, from),
        saved = await service.commit(e.subject, cmd, V_W0, from),
        ackAt = performance.now();
      assert(!saved.duplicate);
      observe(saved.receipt);
      const p = saved.receipt.position,
        [raw] = await policy.read(rc, [e.subject], { position: p, validAt: V_W0 }, a.key);
      const repair = await rc.transactionByCommand(
        service.db.entity("cmd:event:repair-" + cmd.commandId),
      );
      assert(repair.ok && repair.value);
      const head = (await service.control.head(repair.value.position)).value;
      assert(raw && head.basis.tx === p);
      let worldAfter = raw;
      if (inputs) {
        await inputs.save(
          source,
          service.db.entity("cmd:source:" + cmd.commandId),
          e.subject,
          cmd,
          saved.receipt,
        );
        worldAfter = inputs.world(e.subject, p, V_W0, policy.catalog.position);
        compareWorlds(
          [{ subject: raw.subject, facts: seedFacts(raw, { tx: p, validTime: iso(V_W0) }) }],
          [worldAfter],
        );
      }
      if (e.ackLoss) {
        const claim = await rc.transactionByCommand(
          service.db.entity("cmd:source:" + cmd.commandId),
        );
        assert(claim.ok && claim.value?.txId === saved.receipt.txId);
      }
      return {
        seq: head.seq,
        item: { p, subject: raw.subject, worldAfter, tx: p },
        ackAt,
        receipt: saved.receipt,
      };
    }
    enter("running two page-guard reference releases with live source saves");
    const reference =
      arm && arm !== "reference"
        ? []
        : await pageReference(
            rc,
            pipe.comp,
            target,
            ids,
            pageOracle,
            async () => {
              const s = await writeReal();
              if (!arm) await timeline.add(s.seq, s.item);
              return s.item;
            },
            true,
            { position: policy.catalog.position, worlds },
            policy.read,
          );
    if (arm === "reference") {
      const result = {
        binding: b,
        scope,
        seed,
        policy: policy.catalog,
        subjects: n,
        reference,
        loaded: undefined,
        proofs: [],
      };
      fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(result) + "\n", {
        flag: "wx",
      });
      return result;
    }
    worlds.length = 0;
    enter("offering releases to sixty-four readers and bursting saves");
    const arms: TrafficArm[] = accounts.map((a, i) => ({
      name: a.key,
      write: async (_ordinal, record) => {
        const s = await writeReal(i);
        if (i === 0) {
          if (auditReplay) auditReplay.sourceSave(s.item.p, s.seq, s.item.worldAfter, s.ackAt);
          else await record(s.seq, s.item);
        } else {
          const actual = await services[i]!.decisionsAt([s.item.subject], s.item.p);
          const expected = W0.evaluateWorld(s.item.worldAfter, W0.R1, {
            ...actual.head.basis,
            tx: arm ? s.item.p : actual.head.basis.tx,
          });
          assert(!W0.isFailure(expected));
          assert.equal(W0.outputJson(actual.out.get(s.item.subject)!), W0.outputJson(expected));
        }
      },
    }));
    if (arm) {
      try {
        if (process.env.DELTA_READER_URL) process.env.DATOMIC_URL = process.env.DELTA_READER_URL;
        cold = await openComposition("reach", "datomic", scope);
      } finally {
        process.env.DATOMIC_URL = url;
      }
      const publicRead = new CurrentDecisions(
        new DeepAccount(cold, target.key, bind, policy.read),
        () => iso(V_W0),
      );
      remote = readerProcess({ scope, account: target.key, binding: bind, seed: seed.position });
      const decoder = remote;
      const timed = await auditOffers(
        bridge.control,
        [{ name: "public", read: (id) => publicRead.read(id) }, decoder],
        ids,
        arms,
        pipe.samples,
        count,
        arm,
        dir,
        { ...b, scope, digest: bind },
        async () => {},
        (offers, raw) => auditReplay!.verify(offers, raw, ids, decoder),
      );
      const result = {
        binding: b,
        scope,
        source: code,
        mode: arm,
        seed,
        policy: policy.catalog,
        subjects: n,
        loaded: timed,
        reference,
        proofs: [],
        timings: [...timings, { stage: "complete", startMs: performance.now() - begin }],
        accounts,
      };
      assert.equal(stamp(), code);
      fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(result) + "\n", {
        flag: "wx",
      });
      return result;
    }
    const reader = new CurrentDecisions(read, null);
    const loaded = await loadedOffers(
      bridge.control,
      reader,
      ids,
      timeline,
      arms,
      pipe.samples,
      count,
      dir,
      { scope, account: target.key, nonce: b.nonce, source: bind, identity: hash(b) },
    );
    enter("checking every changed row and owed notice at both loaded source cuts");
    const proofs = [];
    for (const o of loaded.offers.slice(0, 2)) {
      const x = await expand(bridge.control, o.seq),
        chunks = await concrete(read.db, x),
        all = await checkRoster(read.control, ids, o.position, o.seq, oracle);
      assert.deepEqual(
        chunks.flatMap((c) => c.rows),
        all.rows,
      );
      const owed = chunks.flatMap((c) =>
        JSON.parse(c.deliveries).map((d: any) => ({
          ...d,
          seq: BigInt(d.seq),
          payload: JSON.parse(d.payload),
        })),
      );
      assert.deepEqual(owed, all.notices);
      if (o.label === "narrow") assert.deepEqual(all.rows, scopedOvertimeRows(n));
      proofs.push({
        seq: o.seq,
        position: o.position,
        release: o.label,
        people: x.subjects,
        rows: x.rows,
        notices: x.notices,
        all: all.digest,
        rowsDigest: hash(all.rows),
        event: x.event,
        parts: x.digest,
      });
    }
    assert.equal(stamp(), code);
    const result = {
      binding: b,
      source: code,
      scope,
      target,
      accounts,
      subjects: n,
      seed,
      policy: policy.catalog,
      trace: hash(JSON.stringify(events)),
      timings: [...timings, { stage: "complete", startMs: performance.now() - begin }],
      reference,
      loaded: {
        count: loaded.all.count,
        p99: loaded.all.p99,
        queueP99: loaded.all.queueP99,
        sha: createHash("sha256")
          .update(fs.readFileSync(path.join(dir, "loaded.json")))
          .digest("hex"),
      },
      proofs,
    };
    fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(result) + "\n", { flag: "wx" });
    return result;
  } finally {
    oracle.close();
    pageOracle.close();
    await Promise.all([
      source.close(),
      ...(rc === source ? [] : [rc.close()]),
      ...(cold ? [cold.close()] : []),
      ...(remote ? [remote.close()] : []),
    ]);
  }
}
export async function run(dir: string, attempt: any) {
  const native = JSON.parse(fs.readFileSync(path.join(dir, "native.json"), "utf8"));
  const b = { source: headSha(), slot: native.prefix, nonce: attempt.nonce },
    deep = process.env.DELTA_GATE === "deep-loaded",
    n = deep ? 10000 : 1000,
    count = deep ? 300 : 6;
  const result = await solo(dir, b, n, count, console.log);
  const { checkSolo } = await import("./solo-proof.ts");
  assert.deepEqual(checkSolo(dir, b, n, count, process.env.DELTA_GATE!), result);
}
if (process.argv[1] === import.meta.filename) {
  const dir = process.argv[2]!,
    b: Identity = JSON.parse(fs.readFileSync(path.join(dir, "request.json"), "utf8"));
  assert(
    process.platform === "linux" &&
      b.source === headSha() &&
      process.env.TRIPLEX_TRACE_SOURCE === b.source &&
      process.env.TRIPLEX_TRACE_SLOT === b.slot,
  );
  await solo(dir, b, 100000, 90, (s) => {
    const f = path.join(dir, "STATUS.json");
    fs.writeFileSync(f + ".tmp", JSON.stringify({ binding: b, stage: s }));
    fs.renameSync(f + ".tmp", f);
    console.log(s);
  });
}
