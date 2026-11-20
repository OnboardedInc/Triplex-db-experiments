import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { percentile } from "../../../bench/lib/w0-traffic.ts";
import { keyFor } from "../scale1/tenants.ts";
import type { Identity } from "./server.ts";
import { solo, openFreshSource } from "./solo.ts";
import { soloPopulation, soloScope } from "./solo-population.ts";
import { checkDeepPolicy, scopedOvertimeRows } from "./solo-policy.ts";
import { scoreClock, assertOnTime, type RawDecision } from "./audit-clock.ts";
import { headSha, sources, stamp } from "./binding.ts";
import { hash } from "./store.ts";
import { unseenRelease } from "./audit-offers.ts";
import { checkColdWitnesses } from "./audit-cold.ts";

const phases = ["reference", "record", "stored"] as const;
const sum = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const write = (f: string, x: unknown) =>
  fs.writeFileSync(f, JSON.stringify(x) + "\n", { flag: "wx" });

export async function auditSolo(
  dir: string,
  b: Identity,
  n: number,
  count: number,
  stage: (s: string) => void,
) {
  const source = stamp(),
    target = { index: 0, key: keyFor(0), first: 0, people: n };
  const runs: any[] = [];
  for (const phase of phases) {
    const folder = path.join(dir, phase);
    fs.mkdirSync(folder);
    await solo(folder, b, n, count, (s) => stage(phase + " / " + s), phase);
    runs.push(read(path.join(folder, "result.json")));
  }
  const offers = runs.slice(1).flatMap((r) => r.loaded.all);
  const result = {
    format: "activation-clock/2",
    binding: b,
    source,
    subjects: n,
    target,
    accounts: runs[1].accounts,
    reference: runs[0].reference,
    arms: Object.fromEntries(
      phases.map((s, i) => [
        s,
        { scope: runs[i].scope, sha: sum(fs.readFileSync(path.join(dir, s, "result.json"))) },
      ]),
    ),
    loaded: { count: offers.length, sha: "" },
  };
  write(path.join(dir, "loaded.json"), { offers });
  result.loaded.sha = sum(fs.readFileSync(path.join(dir, "loaded.json")));
  fs.writeFileSync(
    path.join(dir, "offers.ndjson"),
    offers.map((o) => JSON.stringify({ nonce: b.nonce, ...o })).join("\n") + "\n",
    { flag: "wx" },
  );
  write(path.join(dir, "result.json"), result);
  return checkAuditSolo(dir, b, n, count, process.env.DELTA_GATE!);
}

export function checkAuditSolo(
  dir: string,
  b: Identity,
  n: number,
  count: number,
  mode: string,
  deadline = false,
) {
  const result = read(path.join(dir, "result.json")),
    load = fs.readFileSync(path.join(dir, "loaded.json")),
    offers = JSON.parse(load.toString()).offers;
  assert.equal(result.format, "activation-clock/2");
  assert.deepEqual(result.binding, b);
  assert.equal(result.source, hash(sources(mode)));
  assert.equal(result.subjects, n);
  assert.deepEqual(result.target, { index: 0, key: keyFor(0), first: 0, people: n });
  assert.deepEqual(result.loaded, { count: count * 2, sha: sum(load) });
  assert.equal(offers.length, count * 2);
  assert.deepEqual(
    fs
      .readFileSync(path.join(dir, "offers.ndjson"), "utf8")
      .trimEnd()
      .split("\n")
      .map((s) => JSON.parse(s)),
    offers.map((o: any) => ({ nonce: b.nonce, ...o })),
  );
  const reports: Record<string, { p99: number | null; misses: number; stale: number }> = {};
  for (const [j, phase] of phases.entries()) {
    const folder = path.join(dir, phase),
      bytes = fs.readFileSync(path.join(folder, "result.json")),
      a = JSON.parse(bytes.toString()),
      scope = soloScope(b.nonce, n, phase);
    assert.deepEqual(result.arms[phase], { scope, sha: sum(bytes) });
    assert.deepEqual(a.binding, b);
    assert.equal(a.scope, scope);
    assert.equal(a.subjects, n);
    checkDeepPolicy(a.policy, scope, a.seed.position);
    if (n !== 10000) {
      const wanted = soloPopulation(n as 1000 | 100000);
      assert(a.seed.sha256 === wanted.sha256 && a.seed.facts === wanted.facts);
      assert.deepEqual(a.seed.membership, { [keyFor(0)]: n });
    }
    if (phase === "reference") {
      assert.deepEqual(a.reference, result.reference);
      assert.deepEqual(
        a.reference.map((r: any) => r.release),
        [W0.R1.hash, W0.R2.hash, W0.R3.hash],
      );
      for (const [k, r] of a.reference.entries()) {
        assert(
          r.people === n &&
            r.receipts > 0 &&
            r.position > (a.reference[k - 1]?.end ?? a.seed.position) &&
            r.end >= r.position,
        );
        if (k)
          assert(
            r.livePosition > r.position &&
              r.livePosition <= r.end &&
              r.burst === 55 &&
              r.liveReads >= 64,
          );
      }
      continue;
    }
    assert.equal(a.source, result.source);
    assert.deepEqual(a.accounts, result.accounts);
    const lit = a.loaded;
    assert.deepEqual(lit, read(path.join(folder, "timings.json")));
    assert.deepEqual(lit.binding, { ...b, scope, digest: hash([b, result.source, result.target]) });
    assert.deepEqual(lit.routeNames, ["public", "fresh-process"]);
    assert.equal(lit.mode, phase);
    assert.equal(lit.count, count);
    assert.equal(lit.all.length, count);
    assert.equal(lit.segments.length, Math.ceil(count / 30));
    assert(
      lit.readers.length === 64 &&
        lit.readers.every((x: number) => Number.isSafeInteger(x) && x > 0),
    );
    assert.deepEqual(lit.all, offers.slice((j - 1) * count, j * count));
    for (const [order, o] of lit.all.entries()) {
      assert.deepEqual({ phase: o.phase, doc: o.doc }, unseenRelease(order));
      assert(o.order === order && o.id === "audit-publish-" + order);
    }
    const scores = [];
    for (const [index, s] of lit.segments.entries()) {
      const base = index * 30;
      assert.equal(s.file, "reads-" + base + ".ndjson.gz");
      const portion = lit.all.slice(base, base + 30),
        raw = fs.readFileSync(path.join(folder, s.file));
      assert.equal(s.sha, hash(raw.toString("base64")));
      assert.deepEqual(read(path.join(folder, "offers-" + base + ".json")), {
        binding: lit.binding,
        offers: portion,
      });
      const reads: RawDecision[] = gunzipSync(raw)
        .toString()
        .trimEnd()
        .split("\n")
        .map((line) => JSON.parse(line));
      assert(s.count === reads.length && s.verified.observations === reads.length);
      assert.deepEqual(read(path.join(folder, "replay-" + base + ".json")), {
        binding: lit.binding,
        rawSha: s.sha,
        verified: s.verified,
      });
      const acknowledgements = portion.filter((o: any) => o.ack);
      assert.equal(s.verified.receipts.length, acknowledgements.length);
      for (const [k, r] of s.verified.receipts.entries()) {
        const offer = acknowledgements[k]!;
        assert.deepEqual(r, {
          id: offer.id,
          txId: offer.ack.txId,
          position: offer.ack.position,
          fence: r.fence,
        });
        assert(Number.isSafeInteger(r.fence) && r.fence > a.seed.position && r.fence < r.position);
      }
      const plan = read(path.join(folder, "schedule-" + base + ".json"));
      assert.deepEqual(plan, {
        binding: lit.binding,
        mode: phase,
        schedule: portion.map((o: any) => ({ id: o.id, order: o.order, scheduled: o.scheduled })),
      });
      assert(
        plan.schedule.every(
          (x: any, j: number) => x.scheduled === plan.schedule[0].scheduled + j * 1000,
        ),
      );
      checkColdWitnesses(portion, reads, lit.routeNames, n);
      const observed = new Map<number, Map<string, string>>();
      for (const r of [...reads].sort((a, b) => a.invoked - b.invoked)) {
        const at = observed.get(r.position) ?? new Map<string, string>();
        const digest = hash(JSON.parse(r.raw)),
          prior = at.get(r.id);
        if (prior) assert.equal(prior, digest);
        at.set(r.id, digest);
        observed.set(r.position, at);
      }
      assert.equal(
        hash([...observed].sort(([a], [b]) => a - b).map(([p, ids]) => [p, [...ids]])),
        s.verified.answers,
      );
      const scored = scoreClock(
        portion.map((o: any) => ({ ...o, order: o.order - base })),
        reads.map((r) => ({ ...r, offer: r.offer === undefined ? undefined : r.offer - base })),
        lit.routeNames,
        phase,
      );
      assert.deepEqual(scored, lit.reports[index]);
      if (deadline) assertOnTime(scored);
      const proven = portion.filter(
        (o: any) => o.ack && o.owed && (phase === "record" ? !o.stored : o.stored),
      );
      assert.equal(s.verified.proofs.length, proven.length);
      for (const [k, p] of s.verified.proofs.entries()) {
        const o = proven[k]!;
        assert(
          p.id === o.id &&
            p.mode === phase &&
            p.pos === o.ack.position &&
            p.seq === o.ack.seq &&
            p.stored === (o.stored?.position ?? null) &&
            p.owedCut === o.owed.position &&
            /^[a-f0-9]{64}$/.test(p.digest) &&
            /^[a-f0-9]{64}$/.test(p.object),
        );
        if (o.phase === "broad") assert(p.people === n && p.rows >= n && p.notices > 0);
        if (o.phase === "narrow")
          assert(
            p.people === scopedOvertimeRows(n).length && p.people === p.rows && p.notices === 0,
          );
        if (o.phase === "no-change") assert(p.people === 0 && p.rows === 0 && p.notices === 0);
      }
      scores.push(scored);
    }
    const valid = scores.flatMap((s) => s.offers.flatMap((o) => (o.done === null ? [] : [o.done])));
    const metric = {
      p99: valid.length === count ? percentile(valid, 0.99) : null,
      misses: scores.reduce((n, s) => n + s.misses, 0),
      stale: scores.reduce((n, s) => n + s.stale, 0),
    };
    assert.deepEqual(metric, { p99: lit.p99, misses: lit.misses, stale: lit.stale });
    reports[phase] = metric;
  }
  return { result, reports };
}

export function checkCollector(dir: string, b: Identity, n: number, count: number) {
  const call = execFileSync(
    "python3",
    [path.join(import.meta.dirname, "bm1-collector.py"), dir, String(n), String(count)],
    {
      input: JSON.stringify({
        binding: b,
        releases: { R1: W0.R1.hash, R2: W0.R2.hash, R3: W0.R3.hash },
      }),
      encoding: "utf8",
    },
  );
  assert.deepEqual(JSON.parse(call), read(path.join(dir, "result.json")));
}

export async function run(dir: string, attempt: any) {
  const native = read(path.join(dir, "native.json")),
    b = { source: headSha(), nonce: attempt.nonce, slot: native.prefix },
    n = process.env.DELTA_GATE === "audit-loaded" ? 10000 : 1000,
    count = n === 1000 ? 4 : 204;
  const folder = path.join(dir, "campaign");
  fs.mkdirSync(folder);
  write(path.join(folder, "request.json"), b);
  if (n === 10000) {
    const record = await solo(folder, b, n, count, console.log, "record");
    write(path.join(dir, "audit-result.json"), record);
    return;
  }
  const proof = await auditSolo(folder, b, n, count, console.log);
  checkCollector(folder, b, n, count * 2);
  for (const phase of phases) {
    const empty = await openFreshSource(b, 100000, phase);
    await empty.close();
  }
  write(path.join(dir, "audit-result.json"), proof);
}

if (process.argv[1] === import.meta.filename) {
  const dir = process.argv[2]!;
  const b: Identity = read(path.join(dir, "request.json"));
  assert(
    process.platform === "linux" &&
      b.source === headSha() &&
      b.source === process.env.TRIPLEX_TRACE_SOURCE &&
      b.slot === process.env.TRIPLEX_TRACE_SLOT,
  );
  await auditSolo(dir, b, 100000, 45, (stage) => {
    const f = path.join(dir, "STATUS.json");
    fs.writeFileSync(f + ".tmp", JSON.stringify({ binding: b, stage }) + "\n");
    fs.renameSync(f + ".tmp", f);
    console.log(stage);
  });
}
