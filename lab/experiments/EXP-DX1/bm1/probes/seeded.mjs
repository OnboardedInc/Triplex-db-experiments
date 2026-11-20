// [DX-BM1] Why: retain the offer clock and outcome of every save, including ones never sent.
// Rejected: computing storage capacity from ACK survivors or starting a new population for each rate.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as wait } from "node:timers/promises";

const [root, stage, setting, seedFile, nonce, profile] = process.argv.slice(2);
assert(["ceil", "size", "pred", "growth", "pulse"].includes(stage));
assert((stage === "pulse" ? ["individual", "all", "compact", "prepared", "bounded"] :
  ["control", "candidate"]).includes(setting));
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
const scaled = seed.kind === "scale1-single";
const distributed = stage === "ceil" || stage === "pulse";
const deep = scaled ? await load("lab/bench/lib/deep-world.ts") : undefined;
const readOptions = process.env.DX_W1_WRITER_EXPECTATION
  ? (await load("lab/experiments/EXP-DX1/w1/write-options.ts")).readWriteOptions
  : undefined;
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
  : stage === "pulse"
    ? [{ rate: 10, from: 0, seconds: 60 }, { rate: 235, from: 60, seconds: 60 }]
  : stage === "ceil"
    ? [
        { rate: 50, from: 0, seconds: 20 },
        { rate: 235, from: 20, seconds: 40 },
        { rate: 394, from: 60, seconds: 60 },
      ]
    : [{ rate: stage === "size" ? 50 : stage === "growth" ? 25 : 39.4, from: 0,
         seconds: stage === "size" ? 200 : stage === "growth" ? 90 : 60 }];
const offeredMs = (intervals.at(-1).from + intervals.at(-1).seconds) * 1000,
  drain = smoke ? 2000 : 15000;
const width = (n) => stage === "size" ? (n % 10 < 8 ? 2 : n % 2 ? 1 : 3)
  : scaled ? (n % 20 < 16 ? 1 : n % 20 < 19 ? 2 : 3) : 1;
const selected = new Map();
const int = (e, a, n) => ({ e, a, v: { type: "integer", value: String(n) } });
const text = (e, a, value) => ({ e, a, v: { type: "string", value } });
const tenant = (account) => "acct/" + accounts[account].key + "/";
const field = (index) => ":task/field-" + index;
const tape = [];
for (const [cell, p] of intervals.entries()) {
  const count = Math.floor(p.rate * p.seconds);
  const phase = [];
  if (stage === "pulse" && !smoke) {
    const quiet = 10 * p.seconds;
    for (let i = 0; i < quiet; i++) phase.push({ account: 9, accountSeq: i, queuedAt: i * 100 });
    const background = count - quiet;
    for (let i = 0; i < background; i++)
      phase.push({ account: i % 9, accountSeq: Math.floor(i / 9), queuedAt: (i + .3) * p.seconds * 1000 / background });
    phase.sort((a ,b) => a.queuedAt - b.queuedAt);
  } else {
    for (let i = 0; i < count; i++) {
      const account = distributed || (!scaled && stage !== "size") ? i % 10 : 0;
      phase.push({account, accountSeq: Math.floor(i / (distributed ? 10 : 1)),
        queuedAt: (i + .1 * ((i % 7) - 3) + .4) * 1000 / p.rate});
    }
  }
  for (const { account, accountSeq, queuedAt } of phase) {
    const ordinal = tape.length;
    const local = (7919 * accountSeq + 137 * account) % 400;
    const entity = scaled ? tenant(account) + deep.taskId(local, 0) : ids.placement(accounts[account].first + local);
    const offset = p.from * 1000 + queuedAt;
    tape.push({
      ordinal,
      cell,
      account,
      entity,
      local,
      accountSeq,
      offset,
      width: width(stage === "pulse" ? accountSeq : ordinal),
      id: "bm1-" + stage + "-" + ordinal,
    });
    selected.set(entity, { account, local });
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
  seedFacts: seed.seed.facts,
  db,
  cut,
  stage,
  setting,
  smoke,
  intervals,
  offers: tape.length,
  topology: scaled && distributed ? "one-100k-account-plus-nine-active-namespaces" : undefined,
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

async function indexAt(label, head) {
  const response = await fetch(process.env.DATOMIC_URL + "/v2/db/" + db + "/request-index", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ waitMs: 90_000 }),
    signal: AbortSignal.timeout(95_000),
  });
  assert(response.ok, `Index request returned HTTP ${response.status}`);
  const receipt = await response.json();
  assert(receipt.database === db && receipt.completed === true);
  assert(BigInt(receipt.requestedT) >= BigInt(head.t.v));
  assert(receipt.completedAtMs >= receipt.requestedAtMs);
  write(label, { source, slot, nonce, position: Number(head.position.v), receipt });
}

function nativeSize(mode, low, high, name) {
  const script = new URL("./size-log.clj", import.meta.url);
  assert.match(slot, /^tx2-dxt1-bm1-n19probe-[a-f0-9]{8}-size[1-4]$/);
  const output = execFileSync(
    "docker",
    ["exec", "-i", "-e", "DATOMIC_JAVA_OPTS=-Xms128m -Xmx768m -Ddatomic.objectCacheMax=64m",
      slot + "-gw-r", "/opt/datomic/bin/run", "clojure.main", "-", mode, db, low, high],
    { input: fs.readFileSync(script), timeout: 120_000, maxBuffer: 16 << 20, encoding: "utf8" },
  );
  fs.writeFileSync(file(name), output, { flag: "wx" });
  const line = output.split("\n").filter(s => s.startsWith("BM1_SIZE_JSON "));
  assert.equal(line.length, 1);
  const raw = JSON.parse(line[0].slice("BM1_SIZE_JSON ".length));
  assert.deepEqual([raw.database, raw.low, raw.high, raw.mode], [db, low, high, mode]);
  assert(BigInt(raw.basis) >= BigInt(raw.high));
  return raw;
}

function nativeLog(before, after, found, recovered) {
  const script = new URL("./size-log.clj", import.meta.url);
  const raw = nativeSize("log", before.t.v, after.t.v, "native-log.stdout");
  const expected = new Map([...found, ...recovered].map((row) => [row.t, row]));
  assert.equal(expected.size, found.length + recovered.length);
  const commits = [];
  let previous = BigInt(raw.low);
  for (const event of raw.records) {
    assert(BigInt(event.t) > previous && BigInt(event.t) <= BigInt(raw.high));
    assert(event.datoms > 0 && event.datoms === event.adds + event.retracts);
    previous = BigInt(event.t);
    if (event.claims.length === 0) {
      assert(!expected.has(event.t));
      continue;
    }
    const offer = expected.get(event.t);
    assert(offer, "Unexpected application write in the measured native log suffix");
    assert.deepEqual(event.claims, [{ operation: offer.id, position: offer.pos }]);
    if (offer.datoms !== undefined && offer.datoms !== null)
      assert.equal(event.datoms, offer.datoms);
    commits.push({ t: event.t, position: offer.pos, datoms: event.datoms, adds: event.adds,
      retracts: event.retracts, operation: offer.id });
    expected.delete(event.t);
  }
  assert.equal(expected.size, 0);
  write("log-suffix.json", {
    nonce, source, slot, db, low: raw.low, high: raw.high, basis: raw.basis, commits,
    nativeLogSha256: hashFile(file("native-log.stdout")), scriptSha256: sha(fs.readFileSync(script)),
    nonTriplex: raw.records.length - commits.length,
  });
}

function convert(input, response, pos, n) {
  return input.rows
    .slice(0, n)
    .map((r) => ({ ...r, recorded_at: response.recordedAt.v, recorded_position: pos }));
}

async function restoreWitness() {
  const open = await writer.create(seed.scope, "lean", true, 35000);
  assert(!open.created && open.db === db && open.strictRecordClocks);
  if (scaled) {
    const { txId, receipt } = await writer.request("POST", `/v1/db/${db}/claim`, {
      commandId: seed.witness.commandId, position: seed.lastPosition, receipt: true,
    });
    assert.equal(txId, seed.witness.txId);
    assert.equal(Number(receipt.position.v), seed.lastPosition);
    assert.equal(Number(receipt.recordedAt.v), Number(seed.witness.recordedAt));
  } else {
    const original = await writer.operation(db, seed.witness.id);
    assert.equal(original.t.v, seed.witness.t);
    assert.equal(Number(original.position.v), seed.lastPosition);
  }
  assert.equal(Number((await writer.basis(db)).position.v), seed.lastPosition);
  if (scaled) return prepareScaledFields();
  const roster = seed.seed.accounts === 1 ? accounts.slice(0, 1) : accounts;
  const staticRoots = roster.map((a) => ids.placement(a.first + 9999));
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

async function prepareScaledFields() {
  const staticRoots = [0, 1, 257, 99999].map((i) => tenant(0) + ids.placement(i));
  const fixed = await peer.rows(db, { entityIds: staticRoots, basis: cut,
    pattern: { attribute: ":placement/stamp" } });
  // [DX-BM1] Why: the Datomic row codec stores exact integers as canonical text in value_string.
  // Rejected: reading a nonexistent value_integer column or accepting the subject count alone.
  assert.deepEqual(fixed.map((row) => row.entity_id).sort(), [...staticRoots].sort());
  assert(fixed.every((row) => row.value_type === "integer" && row.value_string === "0"));
  const membership = await peer.rows(db, { entityIds: staticRoots, basis: cut,
    pattern: { attribute: ":subject/account" } });
  assert.equal(membership.length, staticRoots.length);
  assert(membership.every((row) => row.value_string === accounts[0].key));
  let through = seed.lastPosition;
  // [DX-BM1] Why: use the single verified 100k account as the base and real stored owner namespaces for the other lanes.
  // Rejected: labeling different clients on one owner as ten independently scheduled accounts.
  const extras = [];
  for (const [entity, { account, local }] of selected) {
    if (account === 0) continue;
    extras.push(text(entity, ":subject/account", accounts[account].key));
    for (let f = 0; f < 3; f++) extras.push({ e: entity, a: field(f), v: deep.fieldValue(local, 0, f, 0) });
  }
  for (let i = 0; i < extras.length; i += 200) {
    const input = command("bm1-shadow-setup-" + i, extras.slice(i, i + 200), [], false);
    const reply = await peer.transact(db, input);
    assert(reply.operationId === input.operationId && Number(reply.position.v) === ++through);
  }
  const entities = [...selected.keys()];
  for (let i = 0; i < entities.length; i += 32) {
    const roots = entities.slice(i, i + 32);
    const rows = await peer.rows(db, { entityIds: roots, basis: { ...cut, recordedPosition: through }, pattern: {} });
    for (const entity of roots) {
      const { local } = selected.get(entity);
      const fields = Array.from({ length: 3 }, (_, n) => {
        const matches = rows.filter((r) => r.entity_id === entity && r.attribute === field(n));
        assert.equal(matches.length, 1);
        assert.equal(matches[0].value_string, deep.fieldValue(local, 0, n, 0).value);
        return matches[0];
      });
      old.set(entity, fields);
    }
  }
  write("prepared-fields.json", { source, slot, nonce, sealedCut: seed.lastPosition, through,
    shadowRows: extras.length, ownerKeys: [...new Set([...selected.values()].map(({account}) => accounts[account].key))],
    subjects: selected.size, fullSourceAccounts: 1 });
  return { through, fixed };
}

try {
  const initial = await restoreWitness();
  const initialFields = new Map(old);
  const before = await writer.basis(db);
  assert(Number(before.position.v) === initial.through);
  if (readOptions) {
    const writerOptions = await readOptions(process.env.DATOMIC_URL, db, process.env.DX_W1_WRITER_EXPECTATION);
    assert.equal(writerOptions.observed.position, initial.through);
    write("writer-options.json", writerOptions);
  }
  if (stage === "size") {
    await indexAt("index-before.json", before);
    nativeSize("indexed", before.t.v, before.t.v, "native-size-before.stdout");
  }
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
    const facts = scaled
      ? Array.from({ length: o.width }, (_, j) => ({ e: o.entity, a: field(j), v: deep.fieldValue(o.local, 0, j, o.ordinal + 1) }))
      : [int(o.entity, ":bm1/live-stamp", o.ordinal + 1),
          ...Array.from({ length: o.width - 1 }, (_, j) => text(o.entity, ":bm1/live-field" + (j + 1), o.id + "-" + (j + 1)))];
    const input = command(o.id, facts, previous);
    input.groupAccount = accounts[o.account].key;
    if (stage === "growth") {
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
      if (stage === "growth") assert(ack.readProfile?.reads);
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
              assert(rows.some((o) => o.id === r.id && o.entity_id === r.entity_id &&
                o.attribute === r.attribute && o.recorded_position === r.recorded_position &&
                o.value_type === r.value_type && o.value_string === r.value_string));
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
  const after = await writer.basis(db);
  assert(Number(after.position.v) === last);
  let readbackSha256;
  if (scaled) {
    // [DX-BM1] Why: compare stored field identities and bytes at the original and new cuts.
    // Rejected: accepting an operation status alone as proof that the replacement payload was correct.
    const uncertain = new Set(recovered.map((r) => tape[Number(r.id.split("-").at(-1))].entity));
    const candidates = [...new Set(found.map((r) => r.entity))].filter((entity) => !uncertain.has(entity)).sort();
    const selectedCuts = smoke ? candidates : candidates.filter((_, i) => i % Math.max(1, Math.floor(candidates.length / 24)) === 0);
    const tags = (rows) => rows.filter((row) => [field(0), field(1), field(2)].includes(row.attribute))
      .sort((a,b) => a.attribute.localeCompare(b.attribute)).map((row) =>
        [row.entity_id, row.attribute, row.id, row.value_type, row.value_string, row.valid_from, row.recorded_position]);
    const readChecked = async (at, expected) => {
      const samples = [];
      for (let i = 0; i < selectedCuts.length; i += 24) {
        const keys = selectedCuts.slice(i, i + 24);
        const actual = await peer.rows(db, { entityIds: keys, pattern: {}, basis: { ...cut, recordedPosition: at } });
        for (const key of keys) {
          const observed = tags(actual.filter((row) => row.entity_id === key));
          const wanted = tags(expected.get(key));
          assert.equal(wanted.length, 3);
          assert.deepEqual(observed, wanted);
          samples.push({ entity: key, expected: wanted, observed });
        }
      }
      return samples;
    };
    assert(!smoke || selectedCuts.length > 0);
    write("field-readback.json", { source, slot, nonce, db, oldCut: initial.through, newCut: last,
      subjects: selectedCuts, excludedAfterRecoveredCommit: uncertain.size,
      before: await readChecked(initial.through, initialFields), after: await readChecked(last, old) });
    readbackSha256 = hashFile(file("field-readback.json"));
  }
  if (stage === "size" && last > initial.through) {
    nativeLog(before, after, found, recovered);
    nativeSize("current", after.t.v, after.t.v, "native-size-before-barrier.stdout");
    await indexAt("index.json", after);
    nativeSize("indexed", after.t.v, after.t.v, "native-size-indexed.stdout");
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
    readbackSha256,
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
