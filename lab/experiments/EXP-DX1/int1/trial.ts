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
const lease = measurementWindow(binding, stack.prefix),
  reader = startReader(binding),
  accounts: Account[] = [],
  handles: CompositionHandle[] = [];
const phases: any[] = [];
const now = () => performance.now();
const readerStats = () => reader.stats();
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
async function open(name: string, shape: Shape, count: number, first = 0) {
  const scope = "int1-" + attempt + "-" + name,
    comp = await openComposition("reach", "datomic", scope);
  handles.push(comp);
  assert.equal(await comp.currentPosition(), 0);
  await reader.open(scope);
  const a = new Account(
    comp,
    shape,
    digest(binding + "/" + scope),
    first,
    count,
    new DatabaseSync(path.join(dir!, name + ".sqlite")),
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
    const deadline = Date.now() + 120000;
    while (true) {
      const stats = (await readerStats()).scopes[a.comp.scopeName!];
      if (stats.position === undefined || stats.position >= a.head) break;
      assert(Date.now() < deadline, "reader feed did not reach cut");
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
async function release(a: Account, next: W0.CompiledRelease) {
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
  return await activate(a, dir!, next, wr.value.position, lease.checkpoint);
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
  } else if (mode === "int1-isolated") {
    for (let n = 0; n < 100; n++) await open("account" + n, "thin", size, n * size);
  } else
    await open(
      "population",
      mode === "int1-deep" ? "deep" : "thin",
      mode === "int1-pooled" ? 100 * size : size,
    );
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
      const target = await openComposition("reach-touched", "datomic", scope);
      try {
        const split = await target.pull(
          rootOf(a.shape, i),
          { recordedPosition: cut, validAt: V_W0 } as Basis,
          async () => {
            const t = now();
            const out = await release(a, W0.R1);
            activation.push({ ...out, wallMs: now() - t });
          },
        );
        a.verify(i, cut, V_W0, split);
        const current = await a.comp.currentPosition();
        a.verify(i, current, V_W0, await target.pull(rootOf(a.shape,i),{recordedPosition:current, validAt:V_W0} as Basis));
      } finally {
        await target.close();
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
    schedules,
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
