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
import { Account, rootOf, digest, type Shape } from "./account.ts";
import { activate, eadRelease } from "./activation.ts";
import { smallPeople } from "../scale1/small-plan.ts";
import { pageNamespace } from "../../../bench/lib/w0-page-outbox.ts";

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
  ["int1-thin", "int1-deep", "int1-proof", "int1-idle", "int1-pooled", "int1-isolated"].includes(
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
  "lab/experiments/EXP-DX1/scale1/small-plan.ts",
  "lab/experiments/EXP-DX1/scale1/small-pins.json",
  "lab/experiments/EXP-DX1/thin1",
  "lab/bench/lib",
  "packages/datomic/src/replica",
  "packages/w0/src",
  "lab/world/W0/releases",
  "lab/oracles",
)
  .split("\n")
  .filter((f) => /\.(ts|py|json)$/.test(f));
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
  binding = digest(
    canonical([source, inputs, attempt, mode, size, stack.prefix, stack.containers]),
  );
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
  const a = {
    label,
    at: new Date().toISOString(),
    binding,
    driver: processSize(),
    reader: await readerStats(),
    native: await nativeMetrics(stack),
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
async function open(name: string, shape: Shape, count: number, first = 0, pooled?: Account) {
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
  );
  accounts.push(a);
  return a;
}
async function batch(a: Account, active: boolean) {
  const cap = a.shape === "deep" ? 6 : 48;
  let group: number[] = [];
  for (let i = a.first; i < a.first + a.count; i++) {
    if (a.isTouched(i) !== active) continue;
    group.push(i);
    if (group.length === cap) {
      await lease.checkpoint();
      await a.seed(group);
      group = [];
    }
  }
  if (group.length) await a.seed(group);
}
async function pull(a: Account, i: number, p: number, v = V_W0) {
  const start = now();
  const result = await reader.pull(a.comp.scopeName!, rootOf(a.shape, i), p, v);
  const ms = now() - start;
  a.verify(i, p, v, result);
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
function replay(a: Account) {
  const samples = a.timeline;
  assert(samples.length);
  const dest = path.join(dir!, "replay-" + accounts.indexOf(a));
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
  return result;
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
async function trial() {
  await lease.checkpoint();
  await phase("empty");
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
      );
      first += people;
    }
    assert.equal(first, size);
  } else await open("population", mode === "int1-deep" ? "deep" : "thin", size);
  await phase("scopes-open");
  const seedStart = now();
  for (const a of accounts) {
    await batch(a, true);
    for (let i = a.first; i < a.first + a.count; i += 100) await pull(a, i, a.head);
  }
  await caughtUp();
  await phase("fixed-hot");
  const seedCold = now();
  for (const a of accounts) await batch(a, false);
  await caughtUp();
  await phase("after-cold-import");
  const coldSeedMs = now() - seedCold,
    totalSeedMs = now() - seedStart;
  const cold: number[] = [],
    commit: number[] = [],
    hot: number[] = [],
    own: number[] = [];
  for (const a of accounts) {
    for (let i = a.first; i < a.first + a.count; i += 50) {
      await lease.checkpoint();
      if ((i - a.first) % 100 === 50) cold.push(await pull(a, i, a.head));
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
  const sender = mode==='int1-proof'?await (await import('./receipt-proof.ts')).receiptProof(accounts[1]!,dir!):undefined;

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
    assert(/# fail 0\b/.test(log) && /# pass 23\b/.test(log));
    schedules = 23;
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
        for (let i = a.first; i < a.first + a.count; i += 50) {
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
  const replayResults = accounts.map(replay);
  return {
    seedMs: totalSeedMs,
    coldSeedMs,
    latency: { cold: quant(cold), commit: quant(commit), resident: quant(hot), ryow: quant(own) },
    accounts: accounts.map((a, n) => ({
      scope: a.comp.scopeName,
      first: a.first,
      people: a.count,
      facts: a.facts,
      active: Math.ceil(a.count / 50),
      reads: a.reads,
      ryow: a.ryow,
      roster: a.roster(),
      replay: replayResults[n],
    })),
    activation,
    sender,
    schedules,
    moving,
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
