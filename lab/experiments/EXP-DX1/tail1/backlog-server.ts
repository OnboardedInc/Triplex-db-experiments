// @ts-nocheck -- JVM1's optional integration and the sealed seed/report JSON are checked at runtime.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { bindNativeTransaction, nativeWaitLegs } from "../../../trace/native-transactions.mjs";
import { alignClockRecord } from "../../../trace/report.mjs";
import { finishNativeRecording, startWalSamples } from "../../../trace/native-recording.mjs";
import { fileHash } from "../scale1/measurements.ts";

const read = (name) => JSON.parse(fs.readFileSync(name, "utf8"));
const jsonl = (name) => fs.readFileSync(name, "utf8").trim().split("\n").map(JSON.parse);
const write = (name, row) =>
  fs.writeFileSync(name, JSON.stringify(row, null, 2) + "\n", { flag: "wx" });
const sha = (value) => createHash("sha256").update(value).digest("hex");
const roles = ["gw-w", "gw-r", "tx"];
const distribution = (values) => {
  const ordered = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!ordered.length) return { n: 0 };
  return {
    n: ordered.length,
    mean: ordered.reduce((sum, x) => sum + x, 0) / ordered.length,
    p50: ordered[Math.ceil(ordered.length * 0.5) - 1],
    p99: ordered[Math.ceil(ordered.length * 0.99) - 1],
  };
};

async function runWorker(dir, cpus, env, timeout) {
  assert(timeout > 0);
  const fd = fs.openSync(path.join(dir, "field.log"), "wx");
  try {
    const child = spawn(
      "taskset",
      ["-c", cpus, process.execPath, "--import", "tsx", import.meta.filename, "worker", dir],
      { env, timeout, stdio: ["ignore", fd, fd] },
    );
    const status = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    assert.deepEqual(status, { code: 0, signal: null });
  } finally {
    fs.closeSync(fd);
  }
}

async function worker(dir) {
  const { seed, arm } = read(path.join(dir, "request.json"));
  assert.equal(process.env.TRIPLEX_TRACE_SOURCE, arm.source);
  assert.equal(process.env.TRIPLEX_TRACE_SLOT, arm.slot);
  const { DatomicClient } = await import("../../../../packages/datomic/dist/index.js");
  const { fieldPlan } = await import("../w1/field/bench-check.ts");
  const { fieldPhase } = await import("../w1/field/traffic.ts");
  const client = new DatomicClient(process.env.DATOMIC_URL, 35_000);
  try {
    const open = await client.create(seed.scope, "lean", true, 35_000);
    assert(!open.created && open.db === seed.db && open.strictRecordClocks);
    const cut = await client.begin(seed.db);
    assert.equal(cut.position, seed.seedCut);
    await client.release(seed.db, cut.handle);
    const windows = fieldPlan().filter((r) => r.label === "solo394");
    assert.equal(windows.length, 1);
    // [DX-TAIL1] Why: count completions on the same real field commands and spacing as the JVM1 window.
    // Rejected: making cache probes issue additional writes or query segment keys before the timed work.
    const { label, schedule } = windows[0];
    const phase = await fieldPhase(
      client,
      seed.db,
      seed.seedCut,
      seed.nonce,
      label,
      schedule,
      true,
      new Map(),
    );
    write(path.join(dir, "window.json"), { arm, phase });
    assert(
      phase.readback &&
        !phase.failures.length &&
        phase.rows.length === schedule.length &&
        schedule.length === 2364,
    );
  } finally {
    client.close();
  }
}

async function collect(dir, arm, seed, deadline, placements) {
  const raw = path.join(dir, "engines", arm.slot, "trace/raw");
  await finishNativeRecording(dir, raw, arm, placements, deadline);
  const rows = Object.fromEntries(
    roles.map((role) => [role, jsonl(path.join(raw, role + ".jfr.jsonl"))]),
  );
  const dbHash = sha(seed.db);
  const gateways = new Map();
  for (const r of jsonl(path.join(raw, "gw-w.jsonl"))) {
    const t = r.attributes?.datomicT;
    if (r.attributes?.databaseHash === dbHash && r.attributes?.status === 200 && t) {
      assert(!gateways.has(t));
      gateways.set(t, r);
    }
  }
  const native = new Map();
  for (const r of rows.tx)
    if (r.databaseHash === dbHash && r.nativeType === "triplex.NativeTransaction") {
      assert(!native.has(r.datomicT));
      native.set(r.datomicT, r);
    }
  const { phase } = read(path.join(dir, "window.json"));
  const reference = gateways.values().next().value.clock;
  const pauses = Object.fromEntries(
    roles.map((role) => [
      role,
      rows[role]
        .filter(
          (e) =>
            e.name === "jdk.GCPhasePause" &&
            e.clock?.crossProcessQualified === true &&
            e.clock.bootId === reference.bootId,
        )
        .map((e) => alignClockRecord(e, reference)),
    ]),
  );
  const joined = phase.rows.map((r) => {
    const gateway = gateways.get(r.t),
      candidate = native.get(r.t);
    assert(gateway && candidate && gateway.slot === arm.slot && gateway.source === arm.source);
    const awaiting = gateway.spans.find((s) => s.name.startsWith("peer.transact-await"));
    const submit = gateway.spans.find((s) => s.name === "d/transact-async");
    assert(awaiting && submit && gateway.clock.bootId === candidate.clock.bootId);
    const event = bindNativeTransaction(gateway, [alignClockRecord(candidate, gateway.clock)]);
    assert(event);
    return {
      id: r.id,
      t: r.t,
      position: r.p,
      traceId: gateway.traceId,
      native: event.nativeStats,
      ackMs: r.end - r.due,
      receive: gateway.start,
      submit: submit.start,
      peerResponse: awaiting.end,
      response: gateway.end,
      recordedPauseOverlapMs: Object.fromEntries(
        roles.map((role) => [
          role,
          pauses[role].reduce(
            (sum, pause) =>
              sum +
              Math.max(0, Math.min(awaiting.end, pause.end) - Math.max(submit.start, pause.start)),
            0,
          ),
        ]),
      ),
      ...nativeWaitLegs(
        { ...gateway, gatewayRoot: gateway.root, peerStart: submit.start, peerEnd: awaiting.end },
        event,
      ),
    };
  });
  const ordered = [...joined].sort((a, b) => (BigInt(a.t) < BigInt(b.t) ? -1 : 1));
  for (const [index, row] of ordered.entries()) {
    row.earlierNativeRepliesOutstanding = ordered
      .slice(0, index)
      .filter((earlier) => earlier.submit < row.submit && row.submit < earlier.peerResponse).length;
  }
  const summary = {
    ackMs: distribution(joined.map((x) => x.ackMs)),
    applyMs: distribution(joined.map((x) => x.native["apply-msec"])),
    nativeProcessMs: distribution(joined.map((x) => x.nativeProcessMs)),
    sqlReads: distribution(
      joined.map(
        (x) => x.native["io-stats"]?.reads?.sql ?? (x.native["io-stats"]?.reads ? 0 : null),
      ),
    ),
    afterNativeMs: distribution(joined.map((x) => x.nativeToPeerMs)),
    earlierRepliesOutstanding: distribution(joined.map((x) => x.earlierNativeRepliesOutstanding)),
  };
  write(path.join(dir, "joined.json"), {
    arm,
    placements,
    scheduleSha256: phase.scheduleSha256,
    joined,
    summary,
  });
  return { scheduleSha256: phase.scheduleSha256, summary };
}

async function campaign(out, seedDir, policyName) {
  assert(process.platform === "linux" && process.env.DOCKER_HOST === "unix:///var/run/docker.sock");
  assert.equal(execFileSync("systemd-detect-virt", { encoding: "utf8" }).trim(), "none");
  const startup = Date.now();
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  execFileSync("git", ["diff", "--quiet", "HEAD", "--"]);
  const w1 = new URL("../w1/bench.ts", import.meta.url);
  assert(
    fs.readFileSync(w1, "utf8").includes("DX_JVM1_PG_RESTORE"),
    "Integrate JVM1's sealed-seed restore first",
  );
  const { withStack } = await import(w1.href);
  const { jvmPolicy, serverArms } = await import(
    new URL("../jvm1/policy.mjs", import.meta.url).href
  );
  const { part2Policy } = await import(new URL("../jvm1/launch.mjs", import.meta.url).href);
  const { accounts, pooledDigest } = await import("../w1/group/population.ts");
  const { scopeKey } = await import("../w1/field/traffic.ts");
  const dump = path.join(seedDir, "seed.pgdump");
  const seedFile = path.join(seedDir, "seed.json"),
    seed = read(seedFile);
  const seedReceiptSha256 = await fileHash(seedFile);
  assert.match(seed.source, /^[0-9a-f]{40}$/);
  execFileSync("git", ["merge-base", "--is-ancestor", seed.source, head]);
  assert.deepEqual(read(path.join(seedDir, "results/seed/cleanup.json")), {
    containers: [],
    volumes: [],
    networks: [],
  });
  assert.equal(seed.digest, pooledDigest);
  assert.equal(seed.facts, 16_245_050);
  assert.equal(seed.seedCommits, seed.seedCut);
  assert.deepEqual(
    seed.seeds.map((r) => [r.account, r.subjects]),
    accounts.map((r) => [r.index, r.people]),
  );
  assert.deepEqual(
    read(path.join(seedDir, "results/seed/identity.json")),
    Object.fromEntries(
      ["source", "slot", "nonce", "population", "lookup", "readers"].map((key) => [key, seed[key]]),
    ),
  );
  assert.equal(seed.scope, scopeKey(seed.nonce + "-load"));
  assert.equal(seed.db, "s2-" + Buffer.from(seed.scope).toString("base64url"));
  assert.equal(seed.dumpBytes, fs.statSync(dump).size);
  assert.equal(seed.dumpSha256, await fileHash(dump));
  for (const p of [out, seedDir]) assert(path.isAbsolute(p));
  fs.mkdirSync(out);
  const predictionsSha256 = await fileHash(path.join(import.meta.dirname, "PREDICTIONS-PART3.md"));
  const policy = serverArms.includes(policyName)
    ? jvmPolicy("server", policyName)
    : part2Policy(policyName);
  const results = [];
  process.env.DX_W1_EVENT_TRACE = "1";
  for (const cache of [256, policy.txObjectCache]) {
    const deadline = Math.min(startup + 37 * 60_000, Date.now() + 17 * 60_000);
    const arm = {
      source: head,
      slot: "tx2-dxt1-jvm1-" + randomUUID(),
      nonce: randomUUID(),
      population: "deep",
      lookup: "individual",
      readers: false,
    };
    const dir = path.join(out, "cache-" + cache);
    fs.mkdirSync(dir);
    const profile = { ...policy, txObjectCache: cache };
    write(path.join(dir, "request.json"), {
      arm,
      seed,
      profile,
      deadline,
      predictionsSha256,
      seedReceiptSha256,
    });
    const measured = await withStack(
      dir,
      arm,
      async (env) => {
        assert.equal(
          fs.readFileSync(path.join(dir, "engines", arm.slot, "restore.sha256"), "utf8").trim(),
          seed.dumpSha256,
        );
        const placements = Object.fromEntries(
          read(path.join(dir, "placements.json")).engines.map((role) => [role.role, role]),
        );
        const stopWal = startWalSamples(dir, placements.pg.id, arm);
        try {
          await runWorker(dir, policy.cpus.sender, env, deadline - Date.now() - 60_000);
        } finally {
          await stopWal();
        }
        return await collect(dir, arm, seed, deadline, placements);
      },
      false,
      "individual",
      false,
      {
        policy: profile,
        deadline,
        seed: { dump, sha256: seed.dumpSha256 },
        javaMajor: profile.javaMajor,
      },
    );
    assert(Date.now() < startup + 40 * 60_000);
    results.push({
      arm,
      cache,
      ...measured,
      sha256: await fileHash(path.join(dir, "joined.json")),
    });
  }
  assert.equal(results[0].scheduleSha256, results[1].scheduleSha256);
  assert.equal(seed.dumpSha256, await fileHash(dump));
  assert.equal(seedReceiptSha256, await fileHash(seedFile));
  write(path.join(out, "comparison.json"), {
    source: head,
    seedSha256: seed.dumpSha256,
    seedReceiptSha256,
    predictionsSha256,
    results,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [, , mode, out, seed, policy] = process.argv;
  if (mode === "worker") await worker(out);
  else {
    assert(
      mode === "run" && out && seed && policy,
      "Supply run, output, JVM1 seed and selected policy",
    );
    await campaign(path.resolve(out), path.resolve(seed), policy);
  }
}
