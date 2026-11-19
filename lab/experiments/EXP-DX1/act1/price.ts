import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DomainOracle, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import { pageAddress } from "../../../bench/lib/w0-page-outbox.ts";
import { measureHttp } from "../../../bench/lib/http-counts.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { outboxEntity, type OutboxStore } from "../../../bench/lib/w0-outbox.ts";
import { observe, open, oracleRecord } from "./check.ts";

const N = 1000,
  script = import.meta.filename;
const [action, root, scope] = process.argv.slice(2);
if (!root || !["measure", "readback"].includes(action ?? ""))
  throw Error("price.ts measure NEW_DIRECTORY");
const native = process.env.DX_ACT1_NATIVE === "1";
if (!native) process.env.DX_ACT1_SQLITE_DIR = resolve(root);
function slotBinding() {
  if (!native) return { slot: "local-sqlite-full-sync" };
  const ownerBytes = readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!);
  const owner = JSON.parse(ownerBytes.toString());
  assert.equal(owner.holder, "DX-ACT1");
  assert.equal(owner.mode, "exclusive");
  assert.equal(owner.lane, "datomic");
  assert.equal(owner.endpoint, process.env.DATOMIC_URL);
  const config = readFileSync(join(process.env.TX2_CONFIG_DIR!, "lab/config/slots.json"));
  const lane = JSON.parse(config.toString()).lanes.datomic;
  return {
    slot: owner.container,
    ownerSha256: sha256(ownerBytes),
    configSha256: sha256(config),
    imageId: lane.imageId,
    gatewayInputsSha256: lane.sourceInputsSha256,
  };
}
const slot = slotBinding();
const engineCpu: ((container: string) => { usageUsec?: number } | null) | undefined = native
  ? (await import(new URL("../../../bin/engine.mjs", import.meta.url).href)).cgroupOf
  : undefined;
if (action === "readback") {
  const expected = JSON.parse(readFileSync(join(root, "expected.json"), "utf8"));
  const comp = await open(scope!);
  try {
    const head = await comp.currentPosition();
    const rows = [];
    for (let i = 0; i < N; i += 64) {
      const page = expected.slice(i, i + 64);
      const states = await observe(
        comp,
        page.map((r: any) => r.subject),
        head,
        process.argv[5],
      );
      for (const [j, state] of states.entries()) rows.push({ subject: page[j].subject, state });
    }
    const bytes = canonical(rows);
    writeFileSync(join(root, scope + ".observed.json"), bytes, { flag: "wx" });
    const mismatches = rows.filter((r, i) => canonical(r) !== canonical(expected[i])).length;
    console.log(
      JSON.stringify({
        scope,
        head,
        subjects: rows.length,
        mismatches,
        hash: sha256(bytes),
        guardsAtRelease: rows.filter(
          (r, i) => canonical(r.state.subjects) === canonical(expected[i].state.subjects),
        ).length,
      }),
    );
  } finally {
    await comp.close();
  }
} else {
  mkdirSync(root, { recursive: false });
  // [DX-ACT1] Why: capture source and built bytes before the expensive population pass, then check them after the final native ACK. Rejected: a late manifest that can describe a different executable.
  const paths = execFileSync("git", [
    "ls-files",
    "-co",
    "--exclude-standard",
    "--",
    "lab/experiments/EXP-DX1/act1/*.ts",
    "lab/bench/lib/*.ts",
    "lab/bench/lib/w0-oracle.py",
    "lab/oracles/domain/*.py",
    "lab/world/W0/releases",
    "pnpm-lock.yaml",
    "lab/bin/engine.mjs",
  ])
    .toString()
    .trim()
    .split("\n");
  const sourceFiles = Object.fromEntries(paths.map((f) => [f, sha256(readFileSync(f))]));
  for (const pkg of ["core", "sql", "sqlite", "w0", "datomic"]) {
    const { readdirSync } = await import("node:fs");
    const dir = "packages/" + pkg + "/dist";
    for (const f of readdirSync(dir, { recursive: true }) as string[])
      if (f.endsWith(".js")) sourceFiles[dir + "/" + f] = sha256(readFileSync(join(dir, f)));
  }
  writeFileSync(join(root, "sources.json"), JSON.stringify(sourceFiles), { flag: "wx" });
  const nonce = randomUUID(),
    expected = [],
    a: W0.EvaluationRecord[] = [],
    b: W0.EvaluationRecord[] = [];
  const rung = W0.rung(N),
    basis = W0.populationBasis(rung),
    later = { ...basis, tx: basis.tx + 1 };
  const oracle = new DomainOracle();
  const changedItems = new Set<string>();
  let itemChanges = 0;
  try {
    for (const { world } of W0.population(rung)) {
      let prior = emptyWireState();
      for (const [release, cut, records] of [
        [W0.R1, basis, a],
        [W0.R2, later, b],
      ] as const) {
        const result = W0.sweepSubject(world, release, cut);
        assert.ok(!("error" in result));
        const output = JSON.parse(
          await oracle.call("evaluate", { world, release: release.name, basis: cut }),
        );
        assert.equal(result.json, canonical(output));
        const next = JSON.parse(
          await oracle.call("publish", { state: prior, evaluations: [oracleRecord(output)] }),
        );
        assert.ok(next.state);
        if (release === W0.R2 && canonical(next.state.items) !== canonical(prior.items)) {
          itemChanges++;
          changedItems.add(outboxEntity(world.subject));
          changedItems.add(pageAddress(world.subject).body);
        }
        records.push(result.record);
        prior = next.state;
      }
      expected.push({ subject: world.subject, state: prior });
    }
  } finally {
    oracle.close();
  }
  assert.equal(expected.length, N);
  const reference = canonical(expected);
  writeFileSync(join(root, "expected.json"), reference, { flag: "wx" });
  const inputs = sha256(canonical([a, b]));
  const binding = {
    nonce,
    sourceSha256: sha256(canonical(sourceFiles)),
    inputs,
    expected: sha256(reference),
    N,
    basis,
    later,
    releases: [W0.R1.hash, W0.R2.hash],
    ...slot,
    node: process.version,
    itemChanges,
  };
  const arms = [];
  const rosterSubjects = Array.from({ length: N }, (_, i) => W0.placementId(i));
  const modes = process.argv.includes("--page-cut")
    ? ([undefined, "full-state", "guard-fact", "page-cut"] as const)
    : ([undefined, "full-state", "guard-fact"] as const);
  for (const layout of process.argv.includes("--reverse") ? [...modes].reverse() : modes) {
    const paged = layout === "page-cut";
    const opts = (release: W0.CompiledRelease, cut: W0.Basis) => ({
      layout,
      frameSize: paged ? 256 : 32,
      inflight: 1,
      ...(paged
        ? {
            roster: {
              subjects: rosterSubjects,
              basis: { ...cut, tx: BigInt(cut.tx) },
              release: release.hash,
            },
          }
        : {}),
    });
    const name = layout ?? "historical",
      scope = "act1-" + name + "-" + nonce;
    let store = await open(scope);
    await publishChanged(store, a, opts(W0.R1, basis));
    await store.close();
    const fileBytes = () => statSync(join(root, scope + ".db")).size;
    const initialBytes = native ? 0 : fileBytes();
    store = await open(scope);
    let statePages = 0,
      stateRows = 0,
      headReads = 0,
      claimReads = 0,
      casSubjects = 0,
      assertedBytes = 0;
    let commitMs = 0,
      opsBytes = 0,
      txCount = 0;
    let guardOnlyValueBytes = 0,
      pageAssertions = 0,
      bodyAssertions = 0,
      absentChangeWrites = 0,
      assertionCount = 0,
      retractCount = 0;
    const frames: unknown[] = [];
    const comp: OutboxStore = {
      ...store,
      currentPosition: () => {
        headReads++;
        return store.currentPosition();
      },
      sweepPage: async (...args) => {
        const r = await store.sweepPage(...args);
        statePages += r.roundTrips;
        stateRows += r.rows.length;
        return r;
      },
      transactionByCommand: (cmd) => {
        claimReads++;
        return store.transactionByCommand(cmd);
      },
      transact: async (ops, meta) => {
        const start = performance.now();
        const r = await store.transact(ops, meta);
        const duration = performance.now() - start;
        assert.ok(r.ok);
        const bytes = Buffer.byteLength(JSON.stringify(ops));
        casSubjects += (meta.preconditions as any[]).filter((p) => p._tag === "EntityState").length;
        assertedBytes += ops.reduce(
          (n, op) => n + (op.op === "assert" ? Buffer.byteLength(op.value.value) : 0),
          0,
        );
        for (const op of ops)
          if (op.op === "assert" && !changedItems.has(op.entityId))
            guardOnlyValueBytes += Buffer.byteLength(op.value.value);
        for (const op of ops) {
          if (op.op === "retract") {
            retractCount++;
            continue;
          }
          assertionCount++;
          if (op.attribute === "p5/page-cut") pageAssertions++;
          if (op.attribute === "p5/page-body") {
            bodyAssertions++;
            if (!changedItems.has(op.entityId)) absentChangeWrites++;
          }
        }
        txCount++;
        commitMs += duration;
        opsBytes += bytes;
        frames.push({
          commandId: meta.commandId,
          position: r.value.position,
          txId: r.value.txId,
          duration,
          bytes,
        });
        return r;
      },
    };
    const nativeBefore = engineCpu?.(slot.slot)?.usageUsec;
    const cpu = process.cpuUsage(),
      start = performance.now();
    const transport = await measureHttp(() => publishChanged(comp, b, opts(W0.R2, later)));
    const result = transport.value;
    const wallMs = performance.now() - start,
      usage = process.cpuUsage(cpu);
    const nativeAfter = engineCpu?.(slot.slot)?.usageUsec;
    await store.close();
    const reopened = JSON.parse(
      execFileSync(
        process.execPath,
        ["--experimental-strip-types", script, "readback", root, scope, layout ?? "historical"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
      ),
    );
    assert.equal(reopened.subjects, N);
    assert.equal(reopened.mismatches, layout ? 0 : N - itemChanges);
    if (layout) assert.equal(reopened.hash, binding.expected);
    assert.equal(reopened.scope, scope);
    assert.equal(txCount, result.commits);
    if (paged) {
      assert.equal(pageAssertions, Math.ceil(N / 256));
      assert.equal(txCount, pageAssertions);
      assert.equal(bodyAssertions, itemChanges);
      assert.equal(absentChangeWrites, 0);
      assert.equal(result.coverage?.roster, sha256(canonical(rosterSubjects)));
      assert.equal(result.coverage?.size, N);
    }
    const arm = {
      name,
      scope,
      wallMs,
      commitMs,
      cpuMs: (usage.user + usage.system) / 1000,
      engineCpuMs:
        nativeAfter !== undefined && nativeBefore !== undefined
          ? (nativeAfter - nativeBefore) / 1000
          : null,
      statePages,
      stateRows,
      headReads,
      httpRequests: transport.requests,
      claimReads,
      casSubjects,
      assertedBytes,
      opsBytes,
      pageAssertions,
      bodyAssertions,
      absentChangeWrites,
      assertionCount,
      retractCount,
      coverage: result.coverage,
      guardOnlyValueBytes: paged ? 0 : guardOnlyValueBytes,
      guardOnlySubjects: N - itemChanges,
      fileGrowth: native ? null : fileBytes() - initialBytes,
      txCount,
      reopened,
    };
    writeFileSync(join(root, name + "-frames.json"), JSON.stringify(frames), { flag: "wx" });
    arms.push(arm);
    console.log(JSON.stringify(arm));
  }
  for (const [path, digest] of Object.entries(sourceFiles))
    assert.equal(sha256(readFileSync(path)), digest);
  assert.deepEqual(slotBinding(), slot);
  const historicalMs = arms.find((a) => a.name === "historical")!.wallMs;
  const projections = arms
    .filter((a) => a.name !== "historical")
    .map((arm) => {
      const seconds100k = 50.79 + (22.99 * arm.wallMs) / historicalMs;
      return { layout: arm.name, seconds100k, secondsMillionSerial: 10 * seconds100k };
    });
  writeFileSync(
    join(root, "price.json"),
    JSON.stringify({ ...binding, arms, projections }, null, 2) + "\n",
    {
      flag: "wx",
    },
  );
}
