import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { activePerson } from "./cohort.ts";
import { deepTasks } from "../../../bench/lib/deep-world.ts";
export const cases = [
  { key: "thin-1m", mode: "int1-thin", size: 1_000_000, accounts: 1, scopes: 1 },
  { key: "thin-4m", mode: "int1-thin", size: 4_000_000, accounts: 1, scopes: 1 },
  { key: "pooled-100", mode: "int1-pooled", size: 29000, accounts: 100, scopes: 1 },
  { key: "isolated-100", mode: "int1-isolated", size: 29000, accounts: 100, scopes: 100 },
] as const;
export type BenchCase = (typeof cases)[number];
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
export function verifyLatencies(dir: string, r: any, binding: string, attempt: string,
  options?: { spread: boolean; seedOnly: boolean }) {
  assert.equal(r.latencyReceipt.file, "latency-samples.json");
  const durations = fs.readFileSync(path.join(dir, r.latencyReceipt.file));
  assert.equal(createHash("sha256").update(durations).digest("hex"), r.latencyReceipt.sha256);
  const observed = JSON.parse(durations.toString());
  assert.equal(observed.binding, binding);
  assert.equal(observed.attempt, attempt);
  if (options) {
    let n = 0;
    for (const account of r.accounts) {
      const deep = r.mode === "int1-deep" || account.accountKey !== undefined;
      for (let block = options.seedOnly ? 0 : 1; block * 50 < account.people; block += options.seedOnly ? 1 : 2) {
        const local = activePerson(block, account.people, options.spread);
        const first = observed.firstReads[n];
        assert(first && first.subject === account.first + local && first.scope === account.scope);
        assert(first.position > 0 && first.rows > 0 && first.roundTrips >= 1);
        assert.equal(first.tasks, deep ? deepTasks(local) : 0);
        if (first.language === "revision-validated") {
          const d = first.diagnostic;
          assert(d && Number.isFinite(d.workerMs) && d.workerMs >= 0 && d.workerMs <= first.ms);
          assert.equal(d.exchanges.length, first.roundTrips);
          assert(d.exchanges.every((x: any) => ["reach", "reach-many"].includes(x.route) &&
            x.bytes > 0 && x.responseMs >= x.toHeadersMs && x.toHeadersMs >= 0));
        }
        assert.equal(first.ms, observed.samples.cold[n++]);
      }
    }
    assert.equal(n, observed.firstReads.length);
    assert.equal(n, observed.samples.cold.length);
  }
  for (const kind of ["cold", "commit", "resident", "ryow"]) {
    const values = observed.samples[kind] as number[];
    assert(values.length && values.every((t) => Number.isFinite(t) && t >= 0));
    values.sort((a, b) => a - b);
    assert.deepEqual(r.latency[kind], {
      n: values.length,
      p50: values[Math.ceil(values.length / 2) - 1],
      p99: values[Math.ceil((values.length * 99) / 100) - 1],
    });
  }
}
export async function verifyPages(dir: string, decision: any, first: number, count: number) {
  const { W0, canonical, sha256 } = await import("../../../bench/lib/w0-world.ts");
  const { eadRelease } = await import("../../../bench/lib/w0-selector.ts");
  const stem =
    "release-" +
    first +
    "-" +
    sha256(decision.cut.scope + decision.release + decision.cut.basis.tx).slice(0, 16);
  assert.equal(decision.receiptFile, path.join(stem, "page-receipts.jsonl"));
  const file = path.join(dir, decision.receiptFile);
  const sum = createHash("sha256"),
    raw = createHash("sha256"),
    roster = createHash("sha256").update("[");
  let through = first,
    lastPosition = decision.cut.basis.tx,
    pages = 0;
  const narrow = decision.release === eadRelease().hash;
  assert(narrow || decision.release === W0.R1.hash);
  // [DX-INT1] Why: reconstruct each immutable range and its member mask from the requested cohort, release and source cut before accepting a rung.
  // Rejected: comparing a file hash to another string emitted by the same publisher without inspecting its contents.
  const input = fs.createReadStream(file);
  input.on("data", (chunk) => raw.update(chunk));
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    const [start, seal, selector, coverage, claims] = JSON.parse(line);
    assert.equal(start, through);
    const end = Math.min(first + count, start + 256 - (start % 256));
    assert(end > start);
    const ids = Array.from({ length: end - start }, (_, j) => W0.placementId(start + j));
    const ordered = createHash("sha256");
    let mask = 0n;
    for (const [j, id] of ids.entries()) {
      roster.update((start + j > first ? "," : "") + JSON.stringify(id));
      const bytes = Buffer.alloc(4);
      bytes.writeUInt32BE(Buffer.byteLength(id));
      ordered.update(bytes).update(id);
      mask |= 1n << BigInt((start + j) % 256);
    }
    const hashes = { roster: sha256(canonical(ids)), ordered: ordered.digest("hex") };
    assert.deepEqual(seal.cut, decision.cut);
    assert.equal(seal.prior, W0.R1.hash);
    assert.equal(seal.roster, hashes.roster);
    assert.equal(seal.ordered, hashes.ordered);
    assert.equal(seal.pages.length, 1);
    assert.match(seal.pages[0], /^[a-f0-9]{64}$/);
    assert.equal(
      selector,
      sha256(
        canonical({
          domain: "W0-1.1.2/subject-documents-docType/v1",
          attempt: decision.cut.generation + "/" + start,
          cut: decision.cut,
          ...hashes,
          prior: W0.R1.hash,
          next: decision.release,
          seal: narrow ? seal : null,
        }),
      ),
    );
    assert.equal(claims.length, 1);
    const [span, input, tx, position, members] = claims[0];
    assert.deepEqual(span, {
      roster: hashes.roster,
      size: ids.length,
      first: 0,
      count: ids.length,
      basis: decision.cut.basis,
      release: decision.release,
    });
    assert.match(input, /^[a-f0-9]{64}$/);
    assert(
      typeof tx === "string" &&
        tx.length &&
        Number.isSafeInteger(position) &&
        position > lastPosition,
    );
    assert.equal(members, mask.toString(16));
    assert.deepEqual(coverage, {
      roster: hashes.roster,
      size: ids.length,
      pages: 1,
      receipts: sha256(canonical(claims.map((c: unknown) => sha256(canonical(c))))),
    });
    assert.equal(line, canonical([start, seal, selector, coverage, claims]));
    sum.update(line + "\n");
    lastPosition = position;
    through = end;
    pages++;
  }
  assert.equal(through, first + count);
  assert.equal(pages, decision.commits);
  assert.equal(roster.update("]").digest("hex"), decision.roster);
  assert.equal(sum.digest("hex"), decision.receipts);
  assert.equal(raw.digest("hex"), decision.receipts);
}
export async function verifyCase(
  dir: string,
  spec: BenchCase,
  head: string,
  tag: string,
  stack: any,
  cpus: { sender: string; readers: string },
) {
  const { W0, canonical, sha256, V_W0 } = await import("../../../bench/lib/w0-world.ts");
  const { eadRelease } = await import("../../../bench/lib/w0-selector.ts");
  const { compareOracleOutput } = await import("../../../bench/lib/oracle.ts");
  const { readOracleOutput } = await import("../../../bench/lib/oracle-output.ts");
  const inputs = read(path.join(dir, "inputs.json")),
    r = read(path.join(dir, "result.json"));
  const binding = createHash("sha256")
    .update(
      canonical([head, inputs.inputs, inputs.attempt, spec.mode, spec.size, tag, stack.containers,
        inputs.spread, inputs.seedOnly, inputs.policy]),
    )
    .digest("hex");
  const repo = fs.realpathSync(fileURLToPath(new URL("../../../../", import.meta.url)));
  for (const file of [
    "lab/experiments/EXP-DX1/int1/trial.ts",
    "lab/experiments/EXP-DX1/int1/activation.ts",
    "lab/bench/lib/touched-reads.ts",
    "packages/datomic/dist/replica/Replica.js",
  ])
    assert(Object.hasOwn(inputs.inputs, file));
  for (const [file, expected] of Object.entries(inputs.inputs)) {
    const original = fs.realpathSync(path.join(repo, file));
    assert(original.startsWith(repo + path.sep));
    assert.equal(sha256(fs.readFileSync(original)), expected, file);
  }
  assert.equal(inputs.binding, binding);
  assert.equal(inputs.spread, true);
  assert.equal(inputs.seedOnly, false);
  assert.deepEqual(inputs.policy, { readMode: "validated", gateways: "demand" });
  assert.equal(inputs.source, head);
  assert.equal(inputs.slot, tag);
  assert.equal(inputs.mode, spec.mode);
  assert.equal(inputs.size, spec.size);
  assert.equal(r.attempt, inputs.attempt);
  assert.equal(r.binding, binding);
  assert.equal(r.source, head);
  assert.equal(r.slot, tag);
  assert.equal(r.mode, spec.mode);
  assert.equal(r.size, spec.size);
  assert.deepEqual(inputs.containers, stack.containers);
  verifyLatencies(dir, r, binding, inputs.attempt, inputs);
  assert.equal(r.accounts.length, spec.accounts);
  assert.equal(new Set(r.accounts.map((a: any) => a.scope)).size, spec.scopes);
  assert.equal(r.activation.length, 2 * spec.accounts);
  const { smallPeople } = await import("../scale1/small-plan.ts");
  const { tenantFacts, keyFor } = await import("../scale1/tenants.ts");
  const sizes = Array.from({ length: spec.accounts }, (_, n) =>
    spec.accounts === 1 ? spec.size : smallPeople(n),
  );
  assert.equal(r.membership.length, spec.accounts === 1 ? 0 : spec.scopes);
  if (spec.accounts > 1) {
    const combined = Object.assign({}, ...r.membership.map((x: any) => x.counts));
    assert.deepEqual(combined, Object.fromEntries(sizes.map((size, n) => [keyFor(n), size])));
    assert.deepEqual(
      new Set(r.membership.map((x: any) => x.scope)),
      new Set(r.accounts.map((a: any) => a.scope)),
    );
    for (const m of r.membership) {
      assert(
        m.total === Object.values(m.counts).reduce((a: number, b) => a + Number(b), 0) &&
          m.basis.validAt === V_W0 &&
          Number.isSafeInteger(m.basis.position),
      );
      assert.equal(
        m.receiptProjection.rows,
        Object.values(m.counts).reduce(
          (s: number, n) => s + Number(n) + Math.ceil(Number(n) / 256) + 1,
          0,
        ),
      );
      const logicalMembers = createHash("sha256");
      for (const [key, people] of Object.entries(m.counts))
        logicalMembers.update(key).update(Buffer.alloc(Number(people), 1));
      assert.equal(logicalMembers.digest("hex"), m.ordered);
      assert.match(m.receiptProjection.sha256Xor, /^[a-f0-9]{64}$/);
    }
  }
  const rows = [];
  for (const [n, a] of r.accounts.entries()) {
    const scopeName = spec.accounts === 1 ? "population" : "account" + (spec.scopes === 1 ? 0 : n);
    assert.equal(a.scope, "int1-" + inputs.attempt + "-" + scopeName);
    assert.equal(
      a.first,
      sizes.slice(0, n).reduce((a, b) => a + b, 0),
    );
    assert.equal(a.people, sizes[n]);
    if (spec.accounts > 1) {
      assert.equal(a.accountKey, keyFor(n));
      const { seedFacts } = await import("./account.ts");
      const tenant = { index: n, key: keyFor(n), first: a.first, people: a.people },
        expected = createHash("sha256");
      for (const active of [true, false])
        for (let local = 0; local < a.people; local++) {
          if ((local === activePerson(Math.floor(local / 50), a.people, true)) !== active) continue;
          const id = a.first + local;
          expected.update(JSON.stringify([id, seedFacts("deep", id, a.first, tenant)]) + "\n");
        }
      assert.equal(a.seedIntent, expected.digest("hex"));
    }
    assert.equal(
      a.facts,
      spec.accounts === 1
        ? a.people * 8
        : tenantFacts([{ index: n, key: keyFor(n), first: a.first, people: a.people }]),
    );
    assert.equal(a.active, a.people / 50);
    assert.equal(a.ryow, a.active);
    assert(
      a.reads >= 4 * a.active &&
        a.replay.entityQueries >= a.replay.reads &&
        a.replay.reads > 0 &&
        a.replay.status === "PASS",
    );
    const accountBinding = sha256(binding + "/" + a.scope + "/" + a.first);
    const replay = path.join(dir, "replay-" + n);
    const caseText = fs.readFileSync(path.join(replay, "oracle-case.json"), "utf8");
    const caseDoc = JSON.parse(caseText);
    assert.equal(caseDoc.caseId, "int1-" + accountBinding);
    const checks = compareOracleOutput({
      out: readOracleOutput(path.join(replay, "oracle-expected.json")),
      caseText,
      caseDoc,
      reads: read(path.join(replay, "observed.json")),
      exitCode: a.replay.exitCode,
    });
    assert.equal(checks.status, "PASS");
    assert.equal(checks.entityQueries, a.replay.entityQueries);
    assert.equal(checks.reads, a.replay.reads);
    const releases = r.activation.slice(2 * n, 2 * n + 2);
    assert.deepEqual(
      releases.map((item: any) => item.release),
      [W0.R1.hash, eadRelease().hash],
    );
    assert(releases[1].cut.frontier > releases[0].cut.frontier);
    for (const decision of releases) {
      assert.equal(decision.cut.scope, a.scope);
      assert.equal(decision.cut.generation, accountBinding);
      assert.equal(decision.cut.source, accountBinding);
      assert.equal(decision.cut.frontier, decision.cut.basis.tx);
      assert.equal(decision.roster, a.roster);
      assert.equal(decision.covered, a.people);
      assert.equal(decision.guardReadbacks, a.people);
      assert.equal(decision.sourceWorldReads, a.active);
      assert.equal(decision.certifiedWorlds, a.people - a.active);
      assert.equal(decision.full + decision.candidates + decision.excluded, a.people);
      assert(decision.oracle > 0 && decision.wallMs > 0 && decision.commits > 0);
      assert.match(decision.logical, /^[a-f0-9]{64}$/);
      await verifyPages(dir, decision, a.first, a.people);
    }
    rows.push({
      first: a.first,
      key: a.accountKey,
      seedIntent: a.seedIntent,
      people: a.people,
      active: a.active,
      facts: a.facts,
      roster: a.roster,
      outputs: releases.map((d: any) => d.logical),
    });
  }
  assert(
    r.seedMs > 0 &&
      r.latency.commit.n === sizes.reduce((a, b) => a + b, 0) / 50 &&
      r.latency.cold.n > 0,
  );
  const phases = fs
    .readFileSync(path.join(dir, "phases.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  assert(phases.every((p) => p.binding === binding));
  for (const p of phases) {
    assert.deepEqual(p.driver.cpus, [Number(cpus.sender)]);
    assert.deepEqual(
      p.reader.cpus,
      cpus.readers
        .split(",")
        .map(Number)
        .sort((a, b) => a - b),
    );
    assert(p.driver.rssBytes > 0 && p.reader.rssBytes > 0 && p.native.disk.kvsIncludingIndexes > 0);
    for (const id of ["pg", "tx", "gw-w", "gw-r"])
      assert(p.native.roles[id].rssBytes > 0 && p.native.roles[id].threads > 0);
    assert(
      p.native.disk.fsync === "on" &&
        p.native.disk.synchronousCommit === "on" &&
        p.native.disk.fullPageWrites === "on",
    );
  }
  assert(
    Object.values(r.latency).every((q: any) => q.n > 0 && Number.isFinite(q.p50) && q.p99 >= q.p50),
  );
  assert.deepEqual(
    phases.map((p) => p.label),
    [
      "empty",
      "scopes-open",
      "fixed-hot",
      "after-cold-import",
      "after-activity",
      "after-publication",
    ],
  );
  const summary = {
    binding,
    source: head,
    slot: tag,
    people: sizes.reduce((a, b) => a + b, 0),
    physicalScopes: spec.scopes,
    membership: r.membership,
    logicalAccounts: spec.accounts,
    seedPipelineMs: r.seedPipelineMs,
    seedAckMs: r.seedAckMs,
    seedEndToEndMs: r.seedMs,
    latencyMs: r.latency,
    phases: phases.map((p) => ({
      name: p.label,
      disk: p.native.disk,
      roles: {
        ...p.native.roles,
        reader: { rssBytes: p.reader.rssBytes, threads: p.reader.threads },
        driver: p.driver,
      },
    })),
    releases: r.activation.map((d: any) => ({
      scope: d.cut.scope,
      hash: d.release,
      wallMs: d.wallMs,
      covered: d.covered,
      sourceWorldReads: d.sourceWorldReads,
      oracle: d.oracle,
      guardReadbacks: d.guardReadbacks,
      pageCommits: d.commits,
      bodyWrites: d.bodies,
    })),
  };
  assert(summary.seedPipelineMs > 0 && summary.seedAckMs > 0);
  fs.writeFileSync(path.join(dir, "rung-summary.json"), JSON.stringify(summary, null, 2) + "\n", {
    flag: "wx",
  });
  return { accounts: rows, summary };
}
