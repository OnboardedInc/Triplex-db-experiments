// [DX-BM1] Why: issue the same durable command tape against each separately restored head.
// Rejected: resending a command to an already mutated database or charging a local replica pull to the gateway.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const [armDir, mode, setting, checkpointFile, nonce, profile] = process.argv.slice(2);
const smoke = profile === "smoke",
  limitMs = smoke ? 4000 : 90000;
assert(["growth", "readers"].includes(mode));
assert(["off", "on"].includes(setting));
assert.match(nonce, /^[a-f0-9-]+$/);
const load = (name) => import(pathToFileURL(path.join(process.cwd(), name)).href);
const { DatomicClient } = await load("packages/datomic/dist/index.js");
const { tracedRequest, currentTrace, flushTracing } = await load(
  "packages/datomic/dist/tracing.js",
);
const { ids, SEED_VALID_FROM } = await load("lab/bench/lib/world.ts");
const { generateTrace } = await load("lab/bench/lib/trace.ts");
const { command } = await load("lab/experiments/EXP-DX1/w1/group/workload.ts");
const { accounts } = await load("lab/experiments/EXP-DX1/w1/group/population.ts");
const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, "utf8")),
  db = checkpoint.db;
const write = (name, value) =>
  fs.writeFileSync(path.join(armDir, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const sha = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
const plan = generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 }).filter(
  (e) => !e.resend,
);
const fullShots =
  mode === "readers"
    ? plan
        .filter((e) => e.atMs >= 240000 && e.atMs < 330000)
        .map((e) => ({ ...e, at: e.atMs - 240000 }))
    : plan
        .filter((e) => e.atMs >= 120000 && e.atMs < 180000)
        .slice(0, 2250)
        .map((e, i) => ({ ...e, at: i * 40 }));
assert(mode === "growth" ? fullShots.length === 2250 : fullShots.length >= 70);
const shots = smoke ? fullShots.slice(0, 3).map((e, i) => ({ ...e, at: i * 500 })) : fullShots;
const slot = process.env.TRIPLEX_TRACE_SLOT,
  source = process.env.TRIPLEX_TRACE_SOURCE;
assert.equal(checkpoint.source, source);
const cut = { recordedPosition: checkpoint.lastPosition, validAt: SEED_VALID_FROM };
const writer = new DatomicClient(process.env.DATOMIC_URL, 35000),
  reader = new DatomicClient(process.env.PROBE_READ_URL, 35000);
const binding = {
  source,
  slot,
  nonce,
  checkpointSha256: sha(fs.readFileSync(checkpointFile, "utf8")),
  db,
  cut,
  mode,
  setting,
};
const writeStarts = new Map(),
  oldBySubject = new Map();
const children = [];
const errors = [];
function allChildrenDone() {
  return Promise.all(children.map((c) => c.exit));
}
async function waitPath(file, ms = 65000) {
  const until = Date.now() + ms;
  while (!fs.existsSync(file)) {
    if (Date.now() > until) throw Error("Missing " + path.basename(file));
    await sleep(80);
  }
}
function replaceNewIds(input, id) {
  const prefix = "01F" + sha(id).slice(0, 17).toUpperCase(),
    replacements = new Map();
  input.newIds.forEach((original, index) =>
    replacements.set(original, prefix + index.toString(16).padStart(6, "0").toUpperCase()),
  );
  // W1 puts the same assertion ID in the new row, the guard and the serialized change journal.
  assert.equal(replacements.size, input.newIds.length);
  const body = JSON.stringify(input).replace(
    /[0-9A-Z]{26}/g,
    (token) => replacements.get(token) ?? token,
  );
  const updated = JSON.parse(body);
  assert.deepEqual(updated.newIds, [...replacements.values()]);
  assert(updated.newIds.every((x) => updated.rows.some((r) => r.id === x)));
  return updated;
}
try {
  assert.equal(db, "s2-" + Buffer.from(checkpoint.scope).toString("base64url"));
  const found = await writer.create(checkpoint.scope, "lean", true, 35000);
  assert(!found.created && found.db === db && found.strictRecordClocks);
  const input = JSON.parse(fs.readFileSync(path.join(checkpoint.original, "raw.json"), "utf8"));
  assert.equal(input.nonce, checkpoint.nonce);
  assert.equal(input.db, db);
  const tail = input.phases.at(-1);
  assert.equal(tail.lastPosition, checkpoint.lastPosition);
  const expected = tail.records.find((s) => s.pos === checkpoint.lastPosition);
  assert(expected);
  const witness = await writer.operation(db, expected.id);
  assert.equal(witness.t.v, expected.t);
  assert.equal(Number(witness.position.v), checkpoint.lastPosition);
  const subjectIds = [...new Set(shots.map((e) => e.subject))].map((s) =>
    ids.placement(accounts[0].first + s),
  );
  for (let i = 0; i < subjectIds.length; i += 32) {
    const ids = subjectIds.slice(i, i + 32);
    const observed = await reader.rows(db, { entityIds: ids, basis: cut, pattern: {} });
    for (const id of ids) {
      const usable = observed.filter(
        (r) => r.entity_id === id && r.attribute === ":placement/stamp",
      );
      assert.equal(usable.length, 1);
      oldBySubject.set(id, usable[0]);
    }
  }
  const tape = shots.map((e) => ({
    id: (mode === "growth" && e === shots[0] ? "bm1-cal-" : "bm1-") + mode + "-" + e.seq,
    subject: e.subject,
    facts: e.facts,
    at: e.at,
  }));
  const oldRowsSha256 = sha([...oldBySubject.entries()].sort(([a], [b]) => a.localeCompare(b)));
  assert.equal((await writer.operation(db, tape[0].id)).status, "absent");
  write("offers.json", tape);
  const receiptFile = path.join(armDir, "rows.jsonl"),
    fd = fs.openSync(receiptFile, "wx");
  const result = [];
  if (mode === "readers" && setting === "on") {
    for (const [index, cpu] of [5, 6, 7, 9, 10, 11].entries()) {
      const folder = path.join(armDir, "reader-" + index);
      fs.mkdirSync(folder);
      const log = fs.openSync(path.join(folder, "worker.log"), "wx");
      const p = spawn(
        "taskset",
        [
          "-c",
          String(cpu),
          process.execPath,
          "--import",
          "tsx",
          path.join(import.meta.dirname, "local-replica.mjs"),
          process.cwd(),
          folder,
          String(index),
          "90",
          nonce,
        ],
        {
          stdio: ["ignore", log, log],
          env: { ...process.env, TRIPLEX_TRACE_NODE: "0", DATOMIC_URL: "", PROBE_READ_URL: "" },
        },
      );
      fs.closeSync(log);
      const exit = new Promise((resolve) => {
        p.on("error", (error) => resolve({ error: String(error) }));
        p.on("exit", (code, signal) => resolve({ code, signal }));
      });
      children.push({ p, exit, folder });
    }
    for (const c of children) await waitPath(path.join(c.folder, "ready.json"));
  }
  write("foreground-ready.json", { nonce, pid: process.pid });
  const gate = path.join(armDir, "timing-gate.json");
  await waitPath(gate);
  assert.equal(JSON.parse(fs.readFileSync(gate, "utf8")).nonce, nonce);
  const startAt = Date.now() + 350;
  write("go.json", { at: startAt });
  await sleep(Math.max(0, startAt - Date.now()));
  const start = performance.now(),
    end = start + limitMs;
  try {
    for (const [i, e] of tape.entries()) {
      const due = start + e.at;
      if (due > performance.now()) await sleep(due - performance.now());
      const entity = ids.placement(accounts[0].first + e.subject);
      const op = (writeStarts.get(entity) ?? Promise.resolve()).then(async () => {
        const original = oldBySubject.get(entity);
        const facts = [
          { e: entity, a: ":placement/stamp", v: { type: "integer", value: String(i + 1) } },
        ];
        for (let j = 1; j < e.facts; j++)
          facts.push({
            e: entity,
            a: ":bm1/field-" + j,
            v: { type: "string", value: e.id + "-" + j },
          });
        const request = replaceNewIds(command(e.id, facts, [original]), e.id);
        request.groupAccount = accounts[0].key;
        try {
          const startWork = performance.now();
          let traceId;
          const ack = await tracedRequest(
            "commit",
            "bm1.foreground",
            { mode, commandId: e.id },
            async () => {
              traceId = currentTrace()?.traceId;
              return writer.transact(db, request);
            },
          );
          assert(
            ack.operationId === e.id &&
              Number(ack.position.v) > cut.recordedPosition &&
              Number(ack.t.v) > 0 &&
              traceId,
          );
          assert.notEqual(request.newIds[0], original.id);
          const completion = performance.now(),
            pos = Number(ack.position.v),
            newStamp = {
              ...request.rows[0],
              recorded_at: Number(ack.recordedAt.v),
              recorded_position: pos,
            };
          oldBySubject.set(entity, newStamp);
          const row = {
            id: e.id,
            at: e.at,
            entity,
            old: original.id,
            new: newStamp.id,
            facts: e.facts,
            traceId,
            pos,
            t: ack.t.v,
            value: String(i + 1),
            ackMs: completion - due,
            serviceMs: completion - startWork,
            nativeEntryMs: ack.submitToNativeEntryMs,
            requestSha256: sha(request),
            intentSha256: sha({
              id: e.id,
              facts,
              old: original.id,
              newIds: request.newIds,
              sourceK: request.sourceK,
              span: request.span,
            }),
          };
          result.push(row);
          fs.writeSync(fd, JSON.stringify(row) + "\n");
        } catch (e) {
          errors.push(String(e));
          fs.writeSync(fd, JSON.stringify({ error: String(e), seq: i }) + "\n");
        }
      });
      writeStarts.set(entity, op);
    }
    await Promise.all(writeStarts.values());
    if (end > performance.now()) await sleep(end - performance.now());
  } finally {
    fs.closeSync(fd);
    await flushTracing();
  }
  const interval = performance.now() - start;
  write("foreground-done.json", { nonce, interval });
  const endGate = path.join(armDir, "verification-gate.json");
  await waitPath(endGate);
  assert.equal(JSON.parse(fs.readFileSync(endGate, "utf8")).nonce, nonce);
  const childExit = await allChildrenDone();
  assert(
    childExit.every((x) => x.code === 0),
    JSON.stringify(childExit),
  );
  const local = children.map((c) =>
    JSON.parse(fs.readFileSync(path.join(c.folder, "result.json"), "utf8")),
  );
  assert(local.length === 0 || local.length === 6);
  for (const sample of local)
    assert(sample.nonce === nonce && sample.checked === sample.count && sample.fallback === 0);
  assert.equal(result.length + errors.length, tape.length);
  assert.equal(new Set(result.map((r) => r.pos)).size, result.length);
  for (const row of result) {
    const receipt = await writer.operation(db, row.id);
    assert.equal(receipt.t.v, row.t);
    assert.equal(Number(receipt.position.v), row.pos);
    if (mode === "readers" || row === result[0] || row.pos % 19 === 0) {
      const rows = await reader.rows(db, {
        entityIds: [row.entity],
        basis: { recordedPosition: row.pos, validAt: cut.validAt },
        pattern: {},
      });
      const stamp = rows.find((r) => r.id === row.new),
        old = rows.find((r) => r.id === row.old);
      assert.equal(stamp?.attribute, ":placement/stamp");
      assert.equal(stamp?.value_string, row.value);
      assert.equal(old, undefined);
    }
  }
  write("foreground.json", {
    binding,
    startedAt: startAt,
    limitMs,
    interval,
    offers: tape.length,
    eligible: result.length,
    errors,
    tapeSha256: sha(tape),
    oldRowsSha256,
    rowsSha256: sha(fs.readFileSync(receiptFile, "utf8")),
    writeAccount: accounts[0].key,
    gatewayReadsDuringInterval: 0,
    fixture: local,
  });
} finally {
  for (const item of children) if (item.p.exitCode === null) item.p.kill("SIGTERM");
  writer.close();
  reader.close();
}
