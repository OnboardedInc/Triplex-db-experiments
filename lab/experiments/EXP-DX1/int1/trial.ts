import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  openComposition,
  type Basis,
  type CompositionHandle,
} from "../../../bench/lib/composition.ts";
import { buildCase, checkWithOracle } from "../../../bench/lib/oracle.ts";
import { V_W0, W0, canonical } from "../../../bench/lib/w0-world.ts";
import { nativeMetrics } from "../thin1/native-metrics.ts";
import { measurementWindow } from "../thin1/measure.ts";
import { startReader, processSize } from "./reader.ts";
import { Account, rootOf, digest, verifyTenants, type Shape } from "./account.ts";
import { activate, eadRelease } from "./activation.ts";
import { keyFor } from "../scale1/tenants.ts";
import { smallPeople } from "../scale1/small-plan.ts";
import { deepShape } from "../../../bench/lib/deep-world.ts";
import { activePerson } from "./cohort.ts";
import { gatewayProfiles } from "./gateway-profile.ts";
import { pageNamespace } from "../../../bench/lib/w0-page-outbox.ts";
import { checkSchedules, nativeScheduleNames, programInputs } from "../act1/bench-proof.ts";

const [, mode, rung, dir] = process.argv.slice(2),
  size = Number(rung);
assert(
  global.gc &&
    process.platform === "linux" &&
    path.isAbsolute(dir!) &&
    Number.isSafeInteger(size) &&
    size > 0,
);
assert(
  ["int1-thin", "int1-deep", "int1-proof", "int1-cold-probe", "int1-idle", "int1-pooled", "int1-isolated"].includes(
    mode!,
  ),
);
const root = fileURLToPath(new URL("../../../../", import.meta.url));
process.chdir(root);
const stack = JSON.parse(fs.readFileSync(process.env.DX_THIN_STACK!, "utf8"));
assert.equal(stack.writeUrl, process.env.DATOMIC_URL);
assert.equal(stack.readUrl, process.env.DATOMIC_READ_URLS);
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim(),
  source = git("rev-parse", "HEAD");
const paths = git(
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "--",
  "lab/experiments/EXP-DX1/int1",
  "lab/experiments/EXP-DX1/scale1",
  "lab/experiments/EXP-DX1/act1",
  "lab/world/W0/cases",
  "lab/experiments/EXP-DX1/thin1",
  "lab/bench/lib",
  "packages/datomic/src",
  "packages/w0/src",
  "lab/world/W0/releases",
  "lab/oracles",
)
  .split("\n")
  .filter((f) => /\.(ts|mjs|py|json)$/.test(f));
paths.push(...Object.keys(programInputs()));
for (const pkg of ["datomic", "w0", "core", "qualification"]) {
  const p = "packages/" + pkg + "/dist";
  paths.push(
    ...fs
      .readdirSync(p, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".js"))
      .map((f) => p + "/" + f),
  );
}
const inputs = Object.fromEntries(
  [...new Set(paths)].sort().map((f) => [f, digest(fs.readFileSync(f))]),
);
const attempt = randomUUID(),
  spread = process.env.DX_INT1_COHORT === "spread",
  seedOnly = process.env.DX_INT1_CENSUS === "seed-only",
  policy = { readMode: process.env.DX_TOUCHED_READ_MODE ?? "following", gateways: process.env.DX_INT1_GATEWAYS ?? "original",
    ...(process.env.DX_INT1_PEER_GC === "elastic" ? { peerGc: "elastic" } : {}),
    ...(process.env.DX_INT1_PEER_HEAP === "128m" ? { peerHeap: "128m" } : {}),
    ...(process.env.DX_INT1_ROW_WIRE === "gzip" ? { rowWire: "gzip" } : {}),
    ...(process.env.DX_INT1_READER_PAGES === "1" ? { readerPages: true } : {}),
    ...(process.env.DX_INT1_SEED_FEED === "after-sampling" ? { seedFeed: "after-sampling" } : {}) },
  gatewaySource = stack.gatewaySourceSha256 as string,
  binding = digest(
    canonical([source, inputs, attempt, mode, size, stack.prefix, stack.containers, spread, seedOnly, policy, gatewaySource]),
  );
assert.match(gatewaySource, /^[a-f0-9]{64}$/);
fs.mkdirSync(dir!);
const save = (name: string, v: unknown) =>
  fs.writeFileSync(path.join(dir!, name), JSON.stringify(v, null, 2) + "\n", { flag: "wx" });
save("inputs.json", {
  source,
  inputs,
  attempt,
  binding,
  mode,
  size,
  slot: stack.prefix,
  containers: stack.containers,
  spread, seedOnly, policy, gatewaySource,
  managedSlots: stack.managed?.compact ? 1 : stack.managed ? 2 : undefined,
  boot: fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
});
process.env.TX2_W0_OUTBOX_NAMESPACE = pageNamespace("int1");
const lease = measurementWindow(binding, stack.prefix),
  reader = startReader(binding),
  accounts: Account[] = [],
  handles: CompositionHandle[] = [];
const phases: any[] = [];
const now = () => performance.now();
const readerStats = async (client = reader) => {
  const stats = await client.stats();
  for (const [file, hash] of Object.entries(stats.code))
    assert.equal(hash, inputs[file], "Reader input changed: " + file);
  return stats;
};
async function phase(label: string) {
  const sources: Record<string, { position: number; people: number }> = {};
  for (const account of accounts) {
    if (!account.count) continue;
    const scope = account.comp.scopeName!;
    const entry = sources[scope] ??= { position: account.head, people: 0 };
    assert.equal(entry.position, account.head);
    entry.people += Number(account.db.prepare("SELECT count(*) AS n FROM people").get()!.n);
  }
  const a = {
    label,
    at: new Date().toISOString(),
    binding,
    driver: processSize(),
    reader: await readerStats(),
    native: await nativeMetrics(stack),
    sources,
  };
  phases.push(a);
  fs.appendFileSync(path.join(dir!, "phases.jsonl"), JSON.stringify(a) + "\n");
  console.log(label);
  return a;
}
const quant = (s: number[]) => {
  const a = [...s].sort((x, y) => x - y);
  return {
    n: a.length,
    p50: a[Math.ceil(0.5 * a.length) - 1],
    p99: a[Math.ceil(0.99 * a.length) - 1],
  };
};
async function open(
  name: string,
  shape: Shape,
  count: number,
  first = 0,
  pooled?: Account,
  tenantIndex?: number,
) {
  const scope = pooled?.comp.scopeName ?? "int1-" + attempt + "-" + name;
  const comp = pooled?.comp ?? (await openComposition("reach", "datomic", scope));
  if (!pooled) {
    handles.push(comp);
    assert.equal(await comp.currentPosition(), 0);
    await reader.open(scope);
  }
  const a = new Account(
    comp,
    shape,
    digest(binding + "/" + scope + "/" + first),
    first,
    count,
    new DatabaseSync(path.join(dir!, name + ".sqlite")),
    pooled?.cursor,
    tenantIndex === undefined
      ? undefined
      : { index: tenantIndex, key: keyFor(tenantIndex), first, people: count },
    pooled?.membership,
    policy.seedFeed === "after-sampling",
  );
  accounts.push(a);
  return a;
}
async function batch(a: Account, active: boolean) {
  const cap = a.shape === "deep" ? 900 : 384;
  let group: number[] = [];
  let facts = 0;
  let seeded = 0, sample = 1;
  const coldCount = a.count - Math.ceil(a.count / 50);
  const observeSlope = !active && spread && accounts.length === 1 && a.count >= 10000;
  const flush = async () => {
    await a.seed(group);
    seeded += group.length;
    if (observeSlope && seeded * 4 >= sample * coldCount) {
      // [DX-THIN1] Why: intermediate RSS and V8 heap sizes reveal whether the import footprint keeps growing after caches fill. Rejected: forcing collection or touching a subject to sample its reader.
      assert.equal(Number(a.db.prepare("SELECT count(*) AS n FROM people").get()!.n), seeded + Math.ceil(a.count / 50));
      const reading = await reader.stats(false);
      for (const [file, hash] of Object.entries(reading.code)) assert.equal(inputs[file], hash);
      const value = { binding, slot: stack.prefix, scope: a.comp.scopeName, position: a.head,
        cold: seeded, reader: reading, driver: processSize(false), native: await nativeMetrics(stack) };
      fs.appendFileSync(path.join(dir!, "import-samples.jsonl"), JSON.stringify(value) + "\n");
      sample++;
    }
  };
  for (let i = a.first; i < a.first + a.count; i++) {
    if (a.isTouched(i) !== active) continue;
    const next = a.shape === "deep" ? deepShape(i - a.first).facts : 8;
    // [DX-INT1] Why: a 34-task person can exceed five ordinary people in size. Keep each person's seed atomic and cap the aggregate command by facts.
    // Rejected: a fixed number of people per command (six heavy deep worlds overflow the gateway transaction).
    if (group.length && facts + next > cap) {
      await lease.checkpoint();
      await flush();
      group = [];
      facts = 0;
    }
    group.push(i);
    facts += next;
  }
  if (group.length) await flush();
}
const firstReads: { subject: number; scope: string; position: number; tasks: number; rows: number; roundTrips: number; route: string; language: string; ms: number; diagnostic?: unknown }[] = [];
async function pull(a: Account, i: number, p: number, v = V_W0, first = false) {
  const start = now();
  const result = await reader.pull(a.comp.scopeName!, rootOf(a.shape, i), p, v, first);
  const ms = now() - start;
  a.verify(i, p, v, result);
  if (first) firstReads.push({ subject: i, scope: a.comp.scopeName!, position: p,
    tasks: a.shape === "deep" ? deepShape(i - a.first).tasks : 0, rows: result.triples.length, roundTrips: result.roundTrips, route: result.route, ms,
    language: result.language, diagnostic: result.diagnostic });
  return ms;
}
async function caughtUp() {
  for (const a of accounts) {
    let previous = -1,
      changed = Date.now();
    for (;;) {
      const p = await reader.watermark(a.comp.scopeName!);
      if (p === undefined || p >= a.head) break;
      if (p > previous) {
        previous = p;
        changed = Date.now();
      }
      assert(Date.now() - changed < 120000, "Reader feed stopped advancing");
      await delay(100);
    }
  }
}
function replay(a: Account, key = String(accounts.indexOf(a))) {
  const samples = a.timeline;
  assert(samples.length);
  const dest = path.join(dir!, "replay-" + key);
  fs.mkdirSync(dest);
  const command = a.db
    .prepare("SELECT body FROM tx WHERE body IS NOT NULL ORDER BY p")
    .all()
    .map((x) => JSON.parse(String(x.body)));
  const doc = buildCase({
    caseId: "int1-" + a.binding,
    commands: command,
    lastPosition: a.head,
    reads: samples,
  });
  doc.queries = samples.flatMap((r: any, n: number) =>
    r.roots.map((entityId: string) => ({
      id: "r" + n + "|" + entityId,
      kind: "entityTriples",
      entityId,
      cut: { scope: "s1", position: r.p, recordedAt: r.basis.recordedAt, validAt: r.basis.validAt },
    })),
  );
  const pin = "03d86f3346cccd6794487b77293fb56077dd020e",
    oracleRoot = path.join(dir!, "pinned-oracle");
  if (!fs.existsSync(oracleRoot)) {
    for (const f of git("ls-tree", "-r", "--name-only", pin, "--", "lab/oracles/replay")
      .split("\n")
      .filter((f) => f.endsWith(".py"))) {
      const target = path.join(oracleRoot, f);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, execFileSync("git", ["show", pin + ":" + f]), { flag: "wx" });
    }
  }
  const result = checkWithOracle({ dir: dest, oracleRoot, caseDoc: doc, reads: samples });
  assert.equal(result.status, "PASS");
  assert.equal(result.reads, samples.length);
  assert("entityQueries" in result && result.entityQueries === doc.queries.length);
  fs.writeFileSync(path.join(dest, "observed.json"), JSON.stringify(samples), { flag: "wx" });
  return result;
}
async function deepColdProbe() {
  const scope = "int1-" + attempt + "-deep-cold", comp = await openComposition("reach", "datomic", scope);
  const client = startReader(binding + "-deep-cold");
  const a = new Account(comp, "deep", digest(binding + "/" + scope), 0, 10000,
    new DatabaseSync(path.join(dir!, "deep-cold.sqlite")));
  const subjects = Array.from({ length: 200 }, (_, b) => activePerson(b, 10000, true));
  try {
    assert.equal(await comp.currentPosition(), 0);
    for (const id of subjects) { await lease.checkpoint(); await a.seed([id]); }
    await client.open(scope);
    const stats = await readerStats(client);
    assert.equal(stats.scopes[scope].entries, 0);
    const output = [];
    for (const id of subjects) {
      await lease.checkpoint();
      const start = now(), result = await client.pull(scope, rootOf("deep", id), a.head, V_W0, true);
      const ms = now() - start;
      a.verify(id, a.head, V_W0, result);
      if (policy.rowWire === "gzip") assert(result.diagnostic.exchanges.length === result.roundTrips && result.diagnostic.exchanges.every((x: any) => x.gzipRows === true));
      output.push({ id, tasks: deepShape(id).tasks, ms, rows: result.triples.length, requests: result.roundTrips, diagnostic: result.diagnostic });
    }
    const filename = "deep-cold-reads.json";
    save(filename, { binding, scope, position: a.head, output });
    return { scope, position: a.head, subjects: output.length, file: filename,
      sha256: digest(fs.readFileSync(path.join(dir!, filename))), latency: quant(output.map(x => x.ms)), replay: replay(a, "deep-cold") };
  } finally { await client.close(); a.db.close(); await comp.close(); }
}
async function release(a: Account, next: W0.CompiledRelease, afterCapture?: () => Promise<void>) {
  const wr = await a.comp.transact(
    [
      {
        op: "assert",
        entityId: "release:" + a.binding,
        attribute: "active",
        value: { type: "string", value: next.hash },
        validFrom: V_W0,
      },
    ],
    { commandId: a.binding + "-" + next.name, actor: "release" },
  );
  assert(wr.ok && wr.value.triples.length === 1 && wr.value.triples[0]!.value.value === next.hash);
  a.head = wr.value.position;
  if (afterCapture) await afterCapture();
  const decision = await activate(a, dir!, next, wr.value.position, lease.checkpoint);
  a.head = await a.comp.currentPosition();
  return decision;
}
// [DX-INT1] Why: verify the same live deep people and releases in a pooled scope and eight isolated scopes through one real reading process.
// Rejected: counting unopened scopes as evidence of multi-account reads and guarded writes.
async function placementProof() {
  const arms = [];
  for (const placement of ["pooled", "isolated"] as const) {
    const logical: Account[] = [],
      scopes = new Set<string>(),
      outputs = [];
    try {
      for (let n = 0; n < 8; n++) {
        await lease.checkpoint();
        const shared = placement === "pooled" ? logical[0] : undefined;
        const scope = shared?.comp.scopeName ?? "int1-" + attempt + "-" + placement + "-" + n;
        const comp = shared?.comp ?? (await openComposition("reach", "datomic", scope));
        if (!shared) {
          handles.push(comp);
          assert.equal(await comp.currentPosition(), 0);
          await reader.open(scope);
        }
        scopes.add(scope);
        const key = placement + "-" + n;
        const a = new Account(
          comp,
          "deep",
          digest(binding + "/" + key + "/" + scope),
          n * 4,
          4,
          new DatabaseSync(path.join(dir!, key + ".sqlite")),
          shared?.cursor,
          { index: n, key: keyFor(n), first: n * 4, people: 4 },
          shared?.membership,
        );
        logical.push(a);
        await a.seed(Array.from({ length: 4 }, (_, j) => a.first + j));
      }
      for (const [n, a] of logical.entries()) {
        const cut = a.head;
        await pull(a, a.first + 1, cut);
        await a.update(a.first);
        await pull(a, a.first, a.head);
        await pull(a, a.first, cut);
        const before = (await readerStats()).scopes[a.comp.scopeName!];
        const releases = [];
        for (const next of [W0.R1, eadRelease()]) {
          const decision = await release(a, next);
          assert.equal(decision.guardReadbacks, 4);
          assert.equal(decision.oracle, 4);
          assert.equal(decision.sourceWorldReads, 1);
          releases.push(decision);
        }
        const after = (await readerStats()).scopes[a.comp.scopeName!];
        assert.equal(after.admissions, before.admissions);
        outputs.push({
          first: a.first,
          roster: a.roster(),
          key: a.tenant!.key,
          seedIntent: a.seedIntent,
          scope: a.comp.scopeName,
          releases,
          replay: replay(a, placement + "-" + n),
        });
      }
      assert.equal(scopes.size, placement === "pooled" ? 1 : 8);
      arms.push({
        placement,
        scopes: scopes.size,
        accounts: outputs,
        membership: await verifyTenants(logical),
      });
    } finally {
      for (const a of logical) a.db.close();
    }
  }
  const signatures = arms.map((arm) =>
    arm.accounts.map((a) => [
      a.first,
      a.key,
      a.seedIntent,
      a.roster,
      a.releases.map((r) => r.logical),
    ]),
  );
  assert.deepEqual(signatures[0], signatures[1]);
  return arms;
}
async function trial() {
  await lease.checkpoint();
  await phase("empty");
  if (mode === "int1-cold-probe") {
    assert(size === 200 && spread && policy.readMode === "validated");
    const benchDeepCold = await deepColdProbe();
    const { verifyDeepColdProbe } = await import("./bench-cases.ts");
    await verifyDeepColdProbe(dir!, benchDeepCold, binding, attempt, policy.rowWire);
    return { benchDeepCold };
  }
  if (mode === "int1-idle") {
    for (let i = 0; i < size; i++) {
      await lease.checkpoint();
      await open("idle" + i, "thin", 0);
      if (i === 0) await phase("one-idle");
    }
    await phase("all-idle");
    return { idleScopes: size, phases: phases.map((p) => p.label) };
  }
  if (mode === "int1-proof") {
    const scheduleInputs = programInputs();
    for (const [file, hash] of Object.entries(scheduleInputs)) {
      assert.equal(inputs[file], hash, "Unbound publication schedule input " + file);
    }
    await open("thin", "thin", size);
    await open("deep", "deep", size);
  } else if (mode === "int1-isolated" || mode === "int1-pooled") {
    let first = 0;
    for (let n = 0; n < 100; n++) {
      const people = smallPeople(n);
      await open(
        "account" + n,
        "deep",
        people,
        first,
        mode === "int1-pooled" ? accounts[0] : undefined,
        n,
      );
      first += people;
    }
    assert.equal(first, size);
  } else await open("population", mode === "int1-deep" ? "deep" : "thin", size);
  await phase("scopes-open");
  const seedStart = now();
  for (const a of accounts) {
    await batch(a, true);
    if (!seedOnly) for (let block = 0; block * 50 < a.count; block += 2)
      await pull(a, a.first + activePerson(block, a.count, spread), a.head);
  }
  await caughtUp();
  await phase("fixed-hot");
  const seedCold = now();
  for (const a of accounts) await batch(a, false);
  await caughtUp();
  await phase("after-cold-import");
  const coldSeedMs = now() - seedCold,
    totalSeedMs = now() - seedStart;
  if (seedOnly) {
    assert(accounts.every(a => a.reads === 0 && a.ryow === 0));
    await gatewayProfiles(stack, dir!, "seed-only", binding);
  }
  const cold: number[] = [],
    commit: number[] = [],
    hot: number[] = [],
    own: number[] = [];
  for (const a of accounts) {
    for (let block = 0; block * 50 < a.count; block++) {
      const i = a.first + activePerson(block, a.count, spread);
      await lease.checkpoint();
      if (seedOnly || block % 2) cold.push(await pull(a, i, a.head, V_W0, true));
      const before = a.head,
        ack = await a.update(i);
      commit.push(a.commits.at(-1)!);
      own.push(await pull(a, i, ack.position));
      a.ryow++;
      hot.push(await pull(a, i, ack.position));
      await pull(a, i, before);
    }
  }
  await caughtUp();
  const before = await phase("after-activity");
  if (seedOnly) await gatewayProfiles(stack, dir!, "two-percent", binding);
  const seedFeedChecks = [];
  const proofStarted = now();
  for (const a of accounts) seedFeedChecks.push(await a.verifySeedFeed(lease.checkpoint));
  if (policy.seedFeed) {
    save("seed-feed-proof.json", { binding, wallMs: now() - proofStarted, scopes: accounts.map(a => a.comp.scopeName), checks: seedFeedChecks });
    await phase("after-seed-feed-proof");
    if (seedOnly) await gatewayProfiles(stack,dir!,"after-seed-feed-proof",binding);
  }
  let sender, regularDeep, regularTenant, placements, identities;
  if (mode === "int1-proof") {
    const proofs = await import("./receipt-proof.ts");
    sender = await proofs.receiptProof(accounts[1]!, dir!);
    const regular = await openComposition(
      "reach-touched",
      "datomic",
      "int1-" + attempt + "-regular",
    );
    try {
      regularDeep = await proofs.regularDeepProof(regular, path.join(dir!, "regular-deep"));
    } finally {
      await regular.close();
    }
    const tenant = await openComposition(
      "reach-touched",
      "datomic",
      "int1-" + attempt + "-tenant-release",
    );
    try {
      regularTenant = await proofs.regularDeepProof(
        tenant,
        path.join(dir!, "regular-tenant"),
        true,
      );
    } finally {
      await tenant.close();
    }
  }

  const activation: any[] = [];
  let schedules = 0;
  if (
    mode === "int1-proof" ||
    mode === "int1-pooled" ||
    mode === "int1-isolated" ||
    process.env.DX_BARE_METAL === "1"
  ) {
    for (const a of accounts) {
      const scope = a.comp.scopeName!,
        cut = a.head,
        i = a.first + 1;
      if (mode === "int1-proof") {
        const target = await openComposition("reach-touched", "datomic", scope);
        try {
          const split = await target.pull(
            rootOf(a.shape, i),
            { recordedPosition: cut, validAt: V_W0 } as Basis,
            async () => {
              const t = now();
              const out = await release(a, W0.R1, async () => {
                const update = await a.update(i);
                const later = await target.pull(rootOf(a.shape, i), {
                  recordedPosition: update.position,
                  validAt: V_W0,
                } as Basis);
                a.verify(i, update.position, V_W0, later);
                assert(later.triples.some((row) => row.id === update.triples[0]!.id));
              });
              activation.push({ ...out, wallMs: now() - t });
            },
          );
          a.verify(i, cut, V_W0, split);
          const after = await target.pull(rootOf(a.shape, i), {
            recordedPosition: a.head,
            validAt: V_W0,
          } as Basis);
          a.verify(i, a.head, V_W0, after);
          assert.equal(after.triples.length, split.triples.length + 1);
        } finally {
          await target.close();
        }
      } else {
        const t = now();
        const out = await release(a, W0.R1);
        activation.push({ ...out, wallMs: now() - t });
      }
      const t = now();
      const out = await release(a, eadRelease());
      activation.push({ ...out, wallMs: now() - t });
    }
    const after = await phase("after-publication");
    for (const a of accounts) {
      const s = a.comp.scopeName!;
      assert.equal(
        after.reader.scopes[s].admissions,
        before.reader.scopes[s].admissions,
        "Activation caused a demand admission",
      );
      assert.equal(
        after.reader.scopes[s].entries,
        before.reader.scopes[s].entries,
        "activation admitted a subject",
      );
    }
  }
  if (mode === "int1-proof") {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DX_ACT1_NATIVE: "1",
      DX_INT1_GUARD_READER: "1",
    };
    delete env.TX2_W0_OUTBOX_NAMESPACE;
    const log = execFileSync(
      process.execPath,
      [
        "--no-warnings",
        "--experimental-transform-types",
        "--test",
        "--test-concurrency=1",
        "lab/experiments/EXP-DX1/act1/guard.test.ts",
        "lab/experiments/EXP-DX1/act1/page.test.ts",
      ],
      { encoding: "utf8", env, maxBuffer: 16 << 20, timeout: 480000 },
    );
    fs.writeFileSync(path.join(dir!, "schedules.tap"), log, { flag: "wx" });
    checkSchedules(log);
    for (const [file, hash] of Object.entries(programInputs())) assert.equal(inputs[file], hash);
    schedules = nativeScheduleNames.length;
    placements = await placementProof();
    if (policy.gateways === "demand") {
      await lease.checkpoint();
      identities = await (await import("./identity-proof.ts")).proveEvictedIdentities(attempt);
    }
  }
  let moving;
  if (mode === "int1-thin" && size === 100000 && stack.managed) {
    const a = accounts[0]!,
      scope = a.comp.scopeName!,
      independent = startReader(binding + "-moving", 128 * 1024);
    const samples = [];
    let read = 0;
    try {
      await independent.open(scope);
      for (let cycle = 0; cycle < 4; cycle++)
        for (let block = 0; block * 50 < a.count; block++) {
          const i = a.first + activePerson(block, a.count, spread);
          if (read % 128 === 0) await lease.checkpoint();
          const x = await independent.pull(scope, rootOf(a.shape, i), a.head, V_W0);
          a.verify(i, a.head, V_W0, x);
          if (++read % 250 === 0) {
            const m = await readerStats(independent);
            assert(m.scopes[scope].bytes <= 128 * 1024);
            samples.push({ read, rss: m.rssBytes, ...m.scopes[scope] });
          }
        }
      assert(samples.at(-1)!.evictions > 0);
      moving = { scope, reads: read, budget: 128 * 1024, samples };
    } finally {
      await independent.close();
    }
  }
  const replayResults = accounts.map((a) => replay(a));
  // [DX-THIN1] Why: the four physical placements contain no 34-task person. Measure the five-class mix once on a fresh read scope after the wide arm's own census. Rejected: relabelling a thin read or changing a small account's roster.
  const benchDeepCold = ((mode === "int1-thin" && size === 1000000 && process.env.DX_BARE_METAL === "1") ||
    (mode === "int1-proof" && policy.readMode === "validated"))
    ? await deepColdProbe() : undefined;
  const latencyFile = "latency-samples.json";
  const samples = { cold, commit, resident: hot, ryow: own };
  // [DX-INT1] Why: preserve every timed observation after the measurement window so the physical collector can recompute both percentiles.
  // Rejected: accepting a plausible percentile and sample count without the durations that produced them.
  save(latencyFile, { binding, attempt, samples, firstReads });
  return {
    seedMs: totalSeedMs,
    seedPipelineMs: accounts.reduce((n, a) => n + a.seedWallMs, 0),
    seedAckMs: accounts.reduce((n, a) => n + a.seedAckMs, 0),
    coldSeedMs,
    latency: { cold: quant(cold), commit: quant(commit), resident: quant(hot), ryow: quant(own) },
    latencyReceipt: {
      file: latencyFile,
      sha256: digest(fs.readFileSync(path.join(dir!, latencyFile))),
    },
    accounts: accounts.map((a, n) => ({
      scope: a.comp.scopeName,
      first: a.first,
      people: a.count,
      facts: a.facts,
      accountKey: a.tenant?.key,
      seedIntent: a.seedIntent,
      active: Math.ceil(a.count / 50),
      reads: a.reads,
      ryow: a.ryow,
      roster: a.roster(),
      replay: replayResults[n],
    })),
    activation,
    sender,
    membership: await verifyTenants(accounts),
    regularDeep,
    regularTenant,
    placements,
    identities,
    schedules,
    moving,
    benchDeepCold,
    ...(policy.seedFeed ? { seedFeedChecks } : {}),
  };
}
try {
  const result = await trial();
  save("result.json", {
    source,
    attempt,
    binding,
    mode,
    size,
    slot: stack.prefix,
    measurement: lease.stats(),
    ...result,
  });
} finally {
  lease.release();
  await reader.close();
  for (const a of accounts) a.db.close();
  for (const h of handles) await h.close();
}
