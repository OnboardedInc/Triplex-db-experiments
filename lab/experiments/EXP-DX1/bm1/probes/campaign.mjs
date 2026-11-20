// [DX-BM1] Why: exercise the collector with real Datomic receipts before building either large pulse seed.
// Rejected: invented counts, a mocked HTTP server, or labelling the reduced population a production pulse.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as wait } from "node:timers/promises";

const [root, source, tag, mode] = process.argv.slice(2);
const load = (name) => import(pathToFileURL(path.join(process.cwd(), name)).href);
const { DatomicClient } = await load("packages/datomic/dist/index.js");
const { tracedRequest, currentTrace, flushTracing } = await load(
  "packages/datomic/dist/tracing.js",
);
const { withStack } = await load("lab/experiments/EXP-DX1/w1/bench.ts");
const { command } = await load("lab/experiments/EXP-DX1/w1/group/workload.ts");
const { ids, ownFacts, SEED_VALID_FROM } = await load("lab/bench/lib/world.ts");
const { deepOwnFacts } = await load("lab/bench/lib/deep-world.ts");
const { accounts } = await load("lab/experiments/EXP-DX1/w1/group/population.ts");
const results = path.join(root, "results");
if (mode !== "field-worker") fs.mkdirSync(results);

const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data) + "\n", { flag: "wx" });
const json = (file) => JSON.parse(fs.readFileSync(file));
const digest = (data) => createHash("sha256").update(data).digest("hex");
const sha = (file) => digest(fs.readFileSync(file));
const percentile = (xs, q) => [...xs].sort((a, b) => a - b)[Math.ceil(q * xs.length) - 1];
const dist = (xs) => ({
  p50: percentile(xs, 0.5),
  p95: percentile(xs, 0.95),
  p99: percentile(xs, 0.99),
  max: Math.max(...xs),
});
const fact = (e, a, value) => ({ e, a, v: { type: "string", value } });
const scopeFor = (nonce) =>
  JSON.stringify(["triplex-scope-v1", "test", "test", nonce + "-load", 0]);

function newArm(directory, slot, population) {
  fs.mkdirSync(directory);
  return { source, slot, nonce: randomUUID(), population, lookup: "individual", readers: false };
}

async function checkReceipt(client, db, id, ack) {
  assert.equal(ack.operationId, id);
  const receipt = await client.operation(db, id);
  assert.equal(receipt.t.v, ack.t.v);
  assert.equal(receipt.position.v, ack.position.v);
  assert.equal(receipt.status, "committed");
}

async function pulseSmall() {
  const prediction = "lab/experiments/EXP-DX1/w1/field/predictions.json";
  const predictionSha256 = sha(prediction);
  fs.copyFileSync(prediction, path.join(results, "predictions.json"), fs.constants.COPYFILE_EXCL);
  const arms = [];
  for (const [i, grouped] of [false, true].entries()) {
    const directory = path.join(results, "arm-" + (i + 1));
    const arm = newArm(directory, `tx2-dxscale1-w1-${tag}-${i + 1}`, "deep");
    const run = await withStack(
      directory,
      arm,
      async (env) => {
        const c = new DatomicClient(env.DATOMIC_URL, 35000),
          scope = scopeFor(arm.nonce);
        try {
          const init = await c.create(scope, "lean", true, 35000),
            db = init.db;
          assert(init.created && init.strictRecordClocks);
          const seed = accounts.map((a) => fact(ids.placement(a.first), ":pulse/preflight", a.key));
          const issued = command("pulse-small-seed", seed, [], false);
          const initial = await c.transact(db, issued);
          await checkReceipt(c, db, issued.operationId, initial);
          let through = Number(initial.position.v);
          const recovered = await c.rows(db, {
            entityIds: seed.map((f) => f.e),
            basis: { recordedPosition: through, validAt: SEED_VALID_FROM },
            pattern: {},
          });
          assert.equal(recovered.length, seed.length);
          assert.deepEqual(
            recovered.map((r) => [r.entity_id, r.attribute, r.value_string]).sort(),
            seed.map((r) => [r.e, r.a, r.v.value]).sort(),
          );
          const seedCut = through,
            digestSeed = digest(JSON.stringify(seed));
          const phases = [];
          for (const name of ["alone", "nine"]) {
            const spec = Array.from({ length: 3 }, (_, j) => ({ account: 9, j, probe: true }));
            if (name === "nine")
              spec.push(
                ...accounts.slice(0, 9).map((a) => ({ account: a.index, j: 0, probe: false })),
              );
            const start = performance.now();
            const rows = await Promise.all(
              spec.map(async ({ account, j, probe }) => {
                const due = probe ? j * 100 : 0;
                if (due) await wait(due);
                const id = name + "-" + (probe ? "q-" : "") + account + "-" + j;
                const subject = ids.placement(accounts[account].first + j);
                const body = command(
                  id,
                  Array.from({ length: 8 }, (_, k) =>
                    fact(subject, ":save/field" + k, `${id}-${k}`),
                  ),
                );
                body.groupAccount = accounts[account].key;
                const started = performance.now() - start;
                const ack = await c.transact(db, body);
                const ended = performance.now() - start;
                return {
                  id,
                  probe,
                  subject,
                  account,
                  started,
                  ended,
                  scheduled: ended - due,
                  elapsed: ended - started,
                  pos: Number(ack.position.v),
                  t: ack.t.v,
                  bytes: ack.requestBytes,
                  clock: ack.recordedAt.v,
                  businessFacts: 8,
                  ack,
                };
              }),
            );
            const wall = performance.now() - start;
            await Promise.all(rows.map((r) => checkReceipt(c, db, r.id, r.ack)));
            const records = rows.map(({ ack, ...r }) => r).sort((a, b) => a.pos - b.pos);
            assert(records.every((r, j) => r.pos === through + j + 1));
            const quietMs = dist(records.filter((r) => r.probe).map((r) => r.scheduled));
            phases.push({
              name,
              firstPosition: through + 1,
              lastPosition: through + records.length,
              wall,
              count: records.length,
              throughput: (1000 * records.length) / wall,
              physical: new Set(records.map((r) => r.t)).size,
              quietMs,
              records,
            });
            through += records.length;
          }
          write(path.join(directory, "raw.json"), { nonce: arm.nonce, scope, db, grouped, phases });
          write(path.join(directory, "seed-readback.json"), {
            seedCut,
            facts: recovered.length,
            digest: digestSeed,
          });
          return {
            arm,
            mode: grouped ? "all" : "individual",
            scope,
            db,
            predictionSha256,
            seed: digestSeed,
            seedFacts: recovered.length,
            rawSha256: sha(path.join(directory, "raw.json")),
            seedReadbackSha256: sha(path.join(directory, "seed-readback.json")),
            phases: phases.map(({ records, ...phase }) => ({
              ...phase,
              quietP99Ratio: phase.quietMs.p99 / phases[0].quietMs.p99,
            })),
          };
        } finally {
          c.close();
        }
      },
      grouped,
      grouped ? "all" : "individual",
    );
    write(path.join(directory, "summary.json"), run);
    arms.push(run);
  }
  write(path.join(results, "comparison.json"), { source, study: "pulse", predictionSha256, arms });
}

async function fieldCut(directory, arm, population, subjects, seconds) {
  return withStack(directory, arm, async (env) => {
    const trace = path.join(directory, "engines", arm.slot, "trace/raw");
    execFileSync(
      "taskset",
      [
        "-c",
        "3",
        process.execPath,
        "--import",
        "tsx",
        import.meta.filename,
        directory,
        source,
        arm.slot,
        "field-worker",
        population,
        String(subjects),
        String(seconds),
      ],
      { env: { ...env, TRIPLEX_TRACE_DIR: trace }, stdio: "inherit", timeout: 40 * 60000 },
    );
    return json(path.join(directory, "field-output.json"));
  });
}

async function fieldWorker(directory, population, subjects, seconds) {
  const c = new DatomicClient(process.env.DATOMIC_URL, 35000),
    arm = json(path.join(directory, "identity.json"));
  assert.equal(arm.source, source);
  assert.equal(arm.slot, process.env.TRIPLEX_TRACE_SLOT);
  const tapeLength = Math.floor(seconds * 39.4);
  const tape = Array.from({ length: tapeLength }, (_, i) => ({
    i,
    subject: (i * 7919) % subjects,
    due: (i * 1000) / 39.4,
  }));
  const touched = new Set(tape.map((t) => t.subject));
  try {
    const scope = scopeFor(arm.nonce);
    const { created, db } = await c.create(scope, "lean", true, 35000);
    assert(created);
    const witness = new Map(),
      census = createHash("sha256");
    let rows = [],
      sequence = 0,
      count = 0,
      head = 0;
    async function flush() {
      if (!rows.length) return;
      const id = "bm1-seed-" + String(sequence++).padStart(7, "0"),
        payload = command(id, rows, [], false);
      const ack = await c.transact(db, payload);
      assert.equal(ack.operationId, id);
      assert.equal(Number(ack.position.v), ++head);
      for (const row of payload.rows)
        if (row.attribute.startsWith(":bm1/field/")) {
          const prior = witness.get(row.entity_id) ?? [];
          prior.push({ ...row, recorded_at: ack.recordedAt.v, recorded_position: head });
          witness.set(row.entity_id, prior);
        }
      count += rows.length;
      rows = [];
    }
    for (let i = 0; i < subjects; i++) {
      const material = population === "thin" ? ownFacts(i, 1) : deepOwnFacts(i);
      const entity = ids.placement(i);
      assert(material.some((f) => f.e === entity));
      if (touched.has(i))
        for (let j = 0; j < 5; j++)
          material.push(fact(entity, ":bm1/field/" + j, "original-value-" + j));
      if (rows.length + material.length > 1800) await flush();
      rows.push(...material);
      census.update(JSON.stringify(material) + "\n");
    }
    await flush();
    const seedCut = head;
    const seedReads = new Map();
    for (const batch of [...witness.keys()].reduce((xs, k, i) => {
      if (i % 48 === 0) xs.push([]);
      xs.at(-1).push(k);
      return xs;
    }, [])) {
      const known = await c.rows(db, {
        entityIds: batch,
        basis: { recordedPosition: head, validAt: SEED_VALID_FROM },
        pattern: {},
      });
      for (const row of known)
        if (row.attribute.startsWith(":bm1/field/")) seedReads.set(row.id, row);
    }
    assert.equal(seedReads.size, witness.size * 5);
    for (const rows of witness.values())
      for (const r of rows)
        assert.deepEqual(
          [
            seedReads.get(r.id).entity_id,
            seedReads.get(r.id).attribute,
            seedReads.get(r.id).value_string,
          ],
          [r.entity_id, r.attribute, r.value_string],
        );
    const bySubject = new Map(),
      obs = [];
    const t0 = performance.now() + 100;
    for (const event of tape) {
      const due = t0 + event.due;
      if (due > performance.now()) await wait(due - performance.now());
      const id = "bm1-matched-" + String(event.i).padStart(6, "0"),
        entity = ids.placement(event.subject);
      const previous = bySubject.get(entity) ?? Promise.resolve();
      const work = previous.then(async () => {
        const old = witness.get(entity),
          facts = Array.from({ length: 5 }, (_, j) =>
            fact(entity, ":bm1/field/" + j, id + "-" + j),
          );
        assert.equal(old.length, 5);
        const normalized = command(id, facts, old);
        let traceId;
        const start = performance.now();
        const ack = await tracedRequest("commit", "bm1.field-cut", { commandId: id }, async () => {
          traceId = currentTrace()?.traceId;
          return c.transact(db, normalized);
        });
        const end = performance.now(),
          pos = Number(ack.position.v);
        assert(ack.operationId === id && pos > seedCut && Number(ack.t.v) > 0 && traceId);
        const fresh = normalized.rows
          .slice(0, 5)
          .map((r) => ({ ...r, recorded_at: ack.recordedAt.v, recorded_position: pos }));
        witness.set(entity, fresh);
        obs.push({
          id,
          entity,
          ordinal: event.i,
          due: event.due,
          started: start - t0,
          ackMs: end - due,
          traceId,
          pos,
          t: ack.t.v,
          bytes: ack.requestBytes,
          ints: digest(JSON.stringify([id, facts, old.map((r) => r.attribute)])),
          fresh: fresh.map((r) => r.id),
          old: old.map((r) => r.id),
          values: facts.map((f) => f.v.value),
          ack,
        });
      });
      bySubject.set(entity, work);
    }
    await Promise.all(bySubject.values());
    const elapsed = performance.now() - t0;
    assert.equal(obs.length, tape.length);
    assert.equal(new Set(obs.map((s) => s.pos)).size, obs.length);
    for (const r of obs) {
      await checkReceipt(c, db, r.id, r.ack);
      const read = await c.rows(db, {
        entityIds: [r.entity],
        basis: { recordedPosition: r.pos, validAt: SEED_VALID_FROM },
        pattern: {},
      });
      assert.deepEqual(
        r.fresh.map((id) => read.find((row) => row.id === id)?.value_string),
        r.values,
      );
      assert(r.old.every((id) => !read.some((row) => row.id === id)));
    }
    const file = path.join(directory, "writer.jsonl");
    fs.writeFileSync(
      file,
      obs
        .sort((a, b) => a.ordinal - b.ordinal)
        .map(({ ack, ...r }) => JSON.stringify(r))
        .join("\n") + "\n",
      { flag: "wx" },
    );
    return {
      arm,
      people: subjects,
      population,
      seedCut,
      sourceCensus: census.digest("hex"),
      seedFacts: count,
      seedRootsChecked: seedReads.size / 5,
      offers: obs.length,
      elapsed,
      rate: 39.4,
      seconds,
      writerSha256: sha(file),
      tapeSha256: digest(JSON.stringify(tape)),
      intentSha256: digest(JSON.stringify(obs.map((r) => r.ints))),
      ms: dist(obs.map((r) => r.ackMs)),
      bytes: dist(obs.map((r) => r.bytes)),
      rowsPerOffer: [5, 5],
    };
  } finally {
    c.close();
    await flushTracing();
  }
}

async function matched() {
  const small = mode === "matched-small";
  const arms = [];
  for (const [i, population] of (small ? ["thin"] : ["thin", "deep", "deep", "thin"]).entries()) {
    const directory = path.join(results, "arm-" + (i + 1)),
      arm = newArm(directory, `tx2-dxscale1-w1-${tag}-${i + 1}`, population);
    const measured = await fieldCut(directory, arm, population, small ? 64 : 10000, small ? 1 : 45);
    write(path.join(directory, "summary.json"), measured);
    arms.push(measured);
  }
  write(path.join(results, "comparison.json"), { source, study: "thin-deep", small, arms });
}

if (mode === "pulse-small") await pulseSmall();
else if (mode === "matched" || mode === "matched-small") await matched();
else if (mode === "field-worker") {
  const [population, subjects, seconds] = process.argv.slice(6);
  write(
    path.join(root, "field-output.json"),
    await fieldWorker(root, population, Number(subjects), Number(seconds)),
  );
} else throw Error("Unknown probe mode");
