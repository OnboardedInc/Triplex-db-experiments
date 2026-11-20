// [DX-BM1] Why: retain the offer clock and outcome of every save, including ones never sent.
// Rejected: computing storage capacity from ACK survivors or starting a new population for each rate.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as wait } from "node:timers/promises";

const [root, stage, setting, seedFile, nonce, profile] = process.argv.slice(2);
assert(["ceil", "size", "pred"].includes(stage));
assert(["control", "candidate"].includes(setting));
const smoke = profile === "smoke";
const load = (f) => import(pathToFileURL(path.join(process.cwd(), f)).href);
const { DatomicClient } = await load("packages/datomic/dist/index.js");
const { tracedRequest, currentTrace, flushTracing } = await load(
  "packages/datomic/dist/tracing.js",
);
const { command } = await load("lab/experiments/EXP-DX1/w1/group/workload.ts");
const { ids, SEED_VALID_FROM } = await load("lab/bench/lib/world.ts");
const { accounts } = await load("lab/experiments/EXP-DX1/w1/group/population.ts");
const seed = JSON.parse(fs.readFileSync(seedFile));
const sha = (x) => createHash("sha256").update(x).digest("hex");
const hashFile = (f) => sha(fs.readFileSync(f));
const file = (p) => path.join(root, p);
const write = (name, value) =>
  fs.writeFileSync(file(name), JSON.stringify(value) + "\n", { flag: "wx" });
const source = process.env.TRIPLEX_TRACE_SOURCE,
  slot = process.env.TRIPLEX_TRACE_SLOT;
const db = seed.db,
  cut = { recordedPosition: seed.lastPosition, validAt: SEED_VALID_FROM };
const intervals = smoke
  ? [{ rate: 50, from: 0, seconds: 1 }]
  : stage === "ceil"
    ? [
        { rate: 50, from: 0, seconds: 20 },
        { rate: 235, from: 20, seconds: 40 },
        { rate: 394, from: 60, seconds: 60 },
      ]
    : [{ rate: stage === "size" ? 50 : 39.4, from: 0, seconds: stage === "size" ? 200 : 60 }];
const offeredMs = (intervals.at(-1).from + intervals.at(-1).seconds) * 1000,
  drain = smoke ? 2000 : 15000;
const width = (n) => (stage === "size" ? (n % 10 < 8 ? 2 : n % 2 ? 1 : 3) : 1);
const selected = new Map();
const int = (e, a, n) => ({ e, a, v: { type: "integer", value: String(n) } });
const text = (e, a, value) => ({ e, a, v: { type: "string", value } });
const tape = [];
for (const [cell, p] of intervals.entries()) {
  for (let i = 0; i < Math.floor(p.rate * p.seconds); i++) {
    const ordinal = tape.length;
    const account = stage === "size" ? 0 : ordinal % 10;
    const local = (7919 * Math.floor(ordinal / (stage === "size" ? 1 : 10)) + 137 * account) % 400;
    const entity = ids.placement(accounts[account].first + local);
    const offset = p.from * 1000 + ((i + 0.1 * ((ordinal % 7) - 3) + 0.4) * 1000) / p.rate;
    tape.push({
      ordinal,
      cell,
      account,
      entity,
      offset,
      width: width(ordinal),
      id: "bm1-" + stage + "-" + ordinal,
    });
    selected.set(entity, account);
  }
}
assert(tape.every((o, i) => !i || o.offset >= tape[i - 1].offset));
const writer = new DatomicClient(process.env.DATOMIC_URL, 35000),
  peer = new DatomicClient(process.env.PROBE_READ_URL, 35000);
const old = new Map();
const plan = {
  source,
  slot,
  nonce,
  seedSource: seed.source,
  seed: hashFile(seedFile),
  db,
  cut,
  stage,
  setting,
  smoke,
  intervals,
  offers: tape.length,
};
write("plan.json", plan);
fs.writeFileSync(file("offers.jsonl"), tape.map((o) => JSON.stringify(o)).join("\n") + "\n", {
  flag: "wx",
});

async function gate(name) {
  const limit = Date.now() + 150000;
  while (!fs.existsSync(file(name))) {
    if (Date.now() >= limit) throw Error("Missing " + name);
    await wait(100);
  }
  assert.equal(JSON.parse(fs.readFileSync(file(name))).nonce, nonce);
}

function convert(input, response, pos, n) {
  return input.rows
    .slice(0, n)
    .map((r) => ({ ...r, recorded_at: response.recordedAt.v, recorded_position: pos }));
}

async function restoreWitness() {
  const open = await writer.create(seed.scope, "lean", true, 35000);
  assert(!open.created && open.db === db);
  const original = await writer.operation(db, seed.witness.id);
  assert.equal(original.t.v, seed.witness.t);
  assert.equal(Number(original.position.v), seed.lastPosition);
  const staticRoots = accounts.map((a) => ids.placement(a.first + 9999));
  const stable = await peer.rows(db, { entityIds: staticRoots, basis: cut, pattern: {} });
  for (const id of staticRoots)
    assert.equal(
      stable.filter((row) => row.entity_id === id && row.attribute === ":placement/stamp").length,
      1,
    );
  // These are fixed starting rows for the measured replacements. Their setup stays outside the offer clock.
  const roots = [...selected.keys()];
  let through = cut.recordedPosition;
  for (let i = 0; i < roots.length; i += 50) {
    const initial = roots
      .slice(i, i + 50)
      .flatMap((e) => [
        int(e, ":bm1/live-stamp", 0),
        text(e, ":bm1/live-field1", "initial-1"),
        text(e, ":bm1/live-field2", "initial-2"),
      ]);
    const op = command("bm1-" + stage + "-setup-" + i, initial, [], false),
      ack = await writer.transact(db, op);
    assert(ack.operationId === op.operationId && Number(ack.position.v) === ++through);
    for (const row of convert(op, ack, through, initial.length)) {
      const previous = old.get(row.entity_id) ?? [];
      previous.push(row);
      old.set(row.entity_id, previous);
    }
  }
  const witness = await peer.rows(db, {
    entityIds: [roots[0]],
    basis: { ...cut, recordedPosition: through },
    pattern: {},
  });
  assert(
    old
      .get(roots[0])
      .every((e) => witness.some((r) => r.id === e.id && r.value_string === e.value_string)),
  );
  const fixed = stable.filter((row) => row.attribute === ":placement/stamp");
  return { through, fixed };
}

try {
  const initial = await restoreWitness();
  write("foreground-ready.json", { source, slot, nonce, head: initial.through });
  await gate("timing-gate.json");
  // The size comparison records a no-write baseline from the same indexed version.
  if (stage === "size" && !smoke) {
    await wait(60000);
    write("baseline-done.json", { nonce, at: Date.now() });
    await gate("baseline-gate.json");
  }
  const t0 = performance.now() + 300,
    startAt = Date.now() + 300,
    end = t0 + offeredMs + drain;
  write("clock.json", { source, slot, nonce, startAt, head: initial.through });
  const active = Array.from({ length: 10 }, () => new Set()),
    busy = new Set(),
    outcome = new Map(),
    inflight = new Set();
  const book = fs.openSync(file("outcomes.jsonl"), "wx");
  const readBook = stage === "ceil" ? fs.openSync(file("reads.jsonl"), "wx") : null;
  const fixedReads = [];
  function record(o) {
    outcome.set(o.ordinal, o);
    fs.writeSync(book, JSON.stringify(o) + "\n");
  }
  async function issue(o) {
    const submitted = performance.now() - t0;
    const opOld = old.get(o.entity),
      previous = opOld.slice(0, o.width);
    const facts = [int(o.entity, ":bm1/live-stamp", o.ordinal + 1)];
    for (let j = 1; j < o.width; j++)
      facts.push(text(o.entity, ":bm1/live-field" + j, o.id + "-" + j));
    const input = command(o.id, facts, previous);
    input.groupAccount = accounts[o.account].key;
    if (stage === "pred") {
      input.readProfile = true;
      input.predecessorLookup = setting === "candidate";
    }
    try {
      let traceId, firstPacket;
      const ack = await tracedRequest("commit", "bm1.seeded-save", { id: o.id }, async () => {
        traceId = currentTrace()?.traceId;
        return writer.transact(db, input, () => {
          firstPacket = performance.now() - t0;
        });
      });
      const ackAt = performance.now() - t0,
        pos = Number(ack.position.v);
      assert(
        traceId &&
          ack.operationId === o.id &&
          Number(ack.t.v) > 0 &&
          pos > initial.through &&
          Number.isFinite(firstPacket),
      );
      if (stage === "pred") assert(ack.readProfile?.reads);
      const fresh = convert(input, ack, pos, o.width);
      old.set(o.entity, [...fresh, ...opOld.slice(o.width)]);
      record({
        ...o,
        disposition: "ack",
        submitted,
        firstPacket,
        ackAt,
        traceId,
        pos,
        t: ack.t.v,
        datoms: ack.datoms,
        bytes: ack.requestBytes,
        groupSize: ack.groupSize ?? 1,
        queue: ack.groupQueueMicros,
        intoNative: ack.submitToNativeEntryMs,
        prepare: ack.timeline,
        nativeComputeMs: ack.nativeComputeMs,
        stages: ack.groupStages,
        readProfile: ack.readProfile,
      });
    } catch (error) {
      record({ ...o, disposition: "submitted-without-ack", submitted, reason: String(error) });
    }
  }
  if (readBook !== null) {
    // Independent fixed-dose pinned probes do not speed up when preceding reads return early.
    for (let worker = 0; worker < 64; worker++)
      fixedReads.push(
        (async () => {
          for (let j = 0; j < (smoke ? 1 : Math.floor(offeredMs / 1000)); j++) {
            const requested = j * 1000 + worker * 4;
            const remain = t0 + requested - performance.now();
            if (remain > 0) await wait(remain);
            const r = initial.fixed[(worker + j) % initial.fixed.length],
              issued = performance.now() - t0;
            try {
              const rows = await peer.rows(db, {
                entityIds: [r.entity_id],
                basis: cut,
                pattern: {},
              });
              assert(rows.some((o) => o.id === r.id && o.value_string === r.value_string));
              fs.writeSync(
                readBook,
                JSON.stringify({
                  worker,
                  j,
                  requested,
                  issued,
                  finished: performance.now() - t0,
                  disposition: "matched",
                }) + "\n",
              );
            } catch (error) {
              fs.writeSync(
                readBook,
                JSON.stringify({
                  worker,
                  j,
                  requested,
                  issued,
                  disposition: "failed",
                  reason: String(error),
                }) + "\n",
              );
            }
          }
        })(),
      );
  }
  const pending = Array.from({ length: 10 }, () => ({ rows: [], read: 0 }));
  let next = 0,
    remaining = 0;
  try {
    while (performance.now() < end && (next < tape.length || remaining || inflight.size)) {
      const elapsed = performance.now() - t0;
      while (next < tape.length && tape[next].offset <= elapsed) {
        const o = tape[next++];
        pending[o.account].rows.push(o);
        remaining++;
      }
      for (const [account, q] of pending.entries()) {
        while (q.read < q.rows.length) {
          const o = q.rows[q.read];
          if (elapsed - o.offset >= 30000) {
            record({ ...o, disposition: "expired-before-submit", at: elapsed });
            q.read++;
            remaining--;
            continue;
          }
          if (active[account].size >= 12 || busy.has(o.entity)) break;
          q.read++;
          remaining--;
          active[account].add(o.id);
          busy.add(o.entity);
          const job = issue(o).finally(() => {
            active[account].delete(o.id);
            busy.delete(o.entity);
            inflight.delete(job);
          });
          inflight.add(job);
        }
      }
      await wait(1);
    }
    for (const o of [...pending.flatMap((q) => q.rows.slice(q.read)), ...tape.slice(next)])
      record({ ...o, disposition: "unsent-at-cutoff", at: performance.now() - t0 });
    await Promise.all(inflight);
    await Promise.all(fixedReads);
  } finally {
    fs.closeSync(book);
    if (readBook !== null) fs.closeSync(readBook);
    await flushTracing();
  }
  assert.equal(outcome.size, tape.length);
  write("foreground-done.json", {
    nonce,
    at: Date.now(),
    acks: [...outcome.values()].filter((r) => r.disposition === "ack").length,
  });
  await gate("verification-gate.json");
  const found = [...outcome.values()].filter((r) => r.disposition === "ack");
  const recovered = [];
  const toCheck = [...outcome.values()];
  for (let i = 0; i < toCheck.length; i += 12) {
    await Promise.all(
      toCheck.slice(i, i + 12).map(async (row) => {
        const receipt = await writer.operation(db, row.id);
        if (row.disposition === "ack")
          assert(
            receipt.status === "committed" &&
              receipt.t.v === row.t &&
              Number(receipt.position.v) === row.pos,
          );
        else if (receipt.status === "committed") {
          assert.equal(row.disposition, "submitted-without-ack");
          recovered.push({ id: row.id, pos: Number(receipt.position.v), t: receipt.t.v });
        } else assert.equal(receipt.status, "absent");
      }),
    );
  }
  assert.equal(
    new Set([...found, ...recovered].map((o) => o.pos)).size,
    found.length + recovered.length,
  );
  const last = Math.max(
    initial.through,
    ...found.map((r) => r.pos),
    ...recovered.map((r) => r.pos),
  );
  if (stage === "size" && last > initial.through) {
    const response = await fetch(process.env.DATOMIC_URL + "/v2/db/" + db + "/request-index", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ position: last, timeoutMs: 90000 }),
      signal: AbortSignal.timeout(95000),
    });
    if (response.ok) write("index.json", await response.json());
    else
      write("index-error.json", {
        status: response.status,
        body: (await response.text()).slice(0, 500),
      });
  }
  write("result.json", {
    plan,
    scope: seed.scope,
    headBefore: initial.through,
    last,
    found: found.length,
    recovered,
    dispositions: Object.fromEntries(
      [...Map.groupBy(outcome.values(), (r) => r.disposition)].map(([k, v]) => [k, v.length]),
    ),
    tapeSha256: hashFile(file("offers.jsonl")),
    outcomesSha256: hashFile(file("outcomes.jsonl")),
    ...(stage === "ceil"
      ? {
          readSha256: hashFile(file("reads.jsonl")),
          scheduledReads: 64 * (smoke ? 1 : offeredMs / 1000),
        }
      : {}),
  });
} finally {
  writer.close();
  peer.close();
}
