// [EXP-P2X2] Why: fixed scheduled offers measure queueing; candidate owns per-subject admission.
// Rejected: waiting for one commit before offering the next (coordinated omission).
import fs from "node:fs";
import path from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { generateTrace, traceDigest, GENERATOR_SHA256 } from "./trace.mjs";
import { compose } from "./candidate.mjs";
import { runtime, buildIdentity } from "./runtime.mjs";
import { attempt, observe, quiet, save, finish, RECEIPTS, sha } from "./observe.mjs";
import { summary, engineMeans, failedRead } from "./analysis.mjs";
import { seedReaders, readers } from "./readers.mjs";
const [root, scope, readerArg = "0", secondsArg = "600", mode = "C"] = process.argv.slice(2),
  readerCount = Number(readerArg),
  seconds = Number(secondsArg);
const arm = mode === "A0" ? "F9" : readerCount ? "F8" : "F7",
  a = attempt(`${arm}-${readerCount}`),
  seed = "EXP-P2X2-v1";
const build = buildIdentity(root);
save(path.join(a.dir, "build.json"), build);
const events = generateTrace({ seed, subjects: 10000, durationS: seconds }),
  raw = [],
  checks = [],
  pending = [];
const prereg = JSON.parse(fs.readFileSync(path.join(RECEIPTS, "preregistered.json")));
if (GENERATOR_SHA256 !== prereg.generatorSha256) throw new Error("frozen generator mismatch");
const rt = await runtime(root, mode, scope),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const receiptSeqs = new Set(events.filter((e) => e.resend || e.ackLoss).map((e) => e.seq));
const prefix = a.id;
const outcomes = new Map();
let reader, first, after;
const errorRecord = (e) => ({
  tag: e?._tag ?? e?.name ?? "unknown",
  reason: e?.reason ?? null,
  message: String(e?.message ?? e).slice(0, 1000),
});
const queue = compose(rt, prefix, mode);
const issue = (event, retry = false) => {
  const offeredAt = start + (retry ? event.originAtMs : event.atMs),
    t = performance.now();
  const command = { ...event, retry };
  fs.appendFileSync(
    path.join(a.dir, "events.jsonl"),
    JSON.stringify({ kind: "offer", event, retry, offeredAt, issuedAt: t }) + "\n",
  );
  const p = queue
    .submit(command)
    .then(async (out) => {
      const ack = performance.now(),
        attemptIndex = raw.length,
        entry = {
          attemptIndex,
          event,
          retry,
          offeredAt,
          issuedAt: t,
          ackAt: ack,
          ackMs: ack - offeredAt,
          serviceAndQueueMs: ack - t,
          ...out,
        };
      raw.push(entry);
      fs.appendFileSync(
        path.join(a.dir, "events.jsonl"),
        JSON.stringify({ kind: "ack", entry }) + "\n",
      );
      if (!event.resend && !retry) outcomes.set(event.seq, entry);
      if (mode === "C" && !out.duplicate) reader?.receipt(event, out.result, event.seq);
      // Lost ACK injection discards this response from the published latency and uses the retry's ACK.
      if (event.ackLoss && !event.resend && !retry) {
        entry.discardedAck = true;
        const p2 = sleep(10).then(() =>
          issue(
            {
              ...event,
              ackLoss: false,
              resend: true,
              atMs: performance.now() - start,
              originAtMs: event.atMs,
            },
            true,
          ),
        );
        pending.push(p2);
      }
      const check = (async () => {
        const record =
          out.record ??
          (receiptSeqs.has(event.seq)
            ? await rt.run(rt.triples.transaction(out.result.txId))
            : null);
        const wait0 = rt.waitCount();
        const at = Date.now();
        const bounded = await rt.inner.query(
          "SELECT tx_id,recorded_position,entity_id,entity_type,attribute,value_type,value_string FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND tx_id = ? AND entity_id = ? AND recorded_position <= ? AND valid_from <= ? AND (valid_to IS NULL OR valid_to > ?)",
          [scope, out.result.txId, `subj:${event.subject}`, out.result.position, at, at],
        );
        const rows = bounded.map((r) => ({ ...r, recorded_position: Number(r.recorded_position) }));
        const fullRows =
          !event.resend && !retry && event.seq % 37 === 0
            ? await rt.run(
                rt.adapter.getByEntity(rt.core.EntityId.make(`subj:${event.subject}`), {
                  validAt: at,
                  recordedPosition: out.result.position,
                }),
              )
            : null;
        const own = rows.filter(
          (r) => r.tx_id === out.result.txId && r.attribute.startsWith(":p2x/f"),
        );
        const expected = Array.from(
          { length: event.facts },
          (_, k) => `${k}|v${prefix}:${event.seq}-${k}`,
        ).sort();
        const actual = own.map((r) => `${r.attribute.slice(6)}|${r.value_string}`).sort();
        checks.push({
          attemptIndex,
          fullActual:
            !event.resend && !retry && event.seq % 37 === 0
              ? fullRows
                  .filter((r) => r.attribute.startsWith(":p2x/f"))
                  .map((r) => [
                    r.tx_id,
                    r.recorded_position,
                    r.attribute,
                    r.value_string,
                    r.value_type,
                    r.entity_id,
                    r.entity_type,
                  ])
                  .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
              : undefined,
          seq: event.seq,
          resend: event.resend,
          retry,
          txId: out.result.txId,
          position: out.result.position,
          record,
          expected,
          actual,
          contentMatches:
            JSON.stringify(expected) === JSON.stringify(actual) &&
            own.every(
              (r) =>
                r.value_type === "string" &&
                r.entity_id === `subj:${event.subject}` &&
                r.entity_type === "p2x-subject",
            ),
          explicitWaitQueries: rt.waitCount() - wait0,
        });
      })();
      pending.push(
        check.catch((error) => checks.push(failedRead(attemptIndex, event, retry, error))),
      );
      return entry;
    })
    .catch((error) => {
      const entry = { event, retry, offeredAt, issuedAt: t, error: errorRecord(error) };
      raw.push(entry);
      fs.appendFileSync(
        path.join(a.dir, "events.jsonl"),
        JSON.stringify({ kind: "error", entry }) + "\n",
      );
      return entry;
    });
  pending.push(p);
  return p;
};
let start;
try {
  const readSeed = readerCount ? await seedReaders() : null;
  reader = await readers(readerCount, readSeed, a.dir);
  first = observe();
  save(path.join(a.dir, "before.json"), first);
  if (!quiet(first).zero) throw new Error("G-QUIET");
  if (first.host.freeDiskBytes < 5 * 1024 ** 3) throw new Error("G-DISK");
  save(path.join(a.dir, "offers.json"), {
    seed,
    generatorSha256: GENERATOR_SHA256,
    traceDigest: traceDigest(events),
    events,
  });
  start = performance.now() + 1000;
  const absStart = performance.timeOrigin + start;
  reader.start(absStart, absStart + seconds * 1000);
  let lastReport = 0;
  for (const event of events) {
    const wait = start + event.atMs - performance.now();
    if (wait > 0) await sleep(wait);
    issue(event);
    if (performance.now() - lastReport > 30000) {
      console.log(
        `${a.id} completed ${raw.length}, frozen offers ${events.length}; active ${queue.running}`,
      );
      lastReport = performance.now();
    }
  }
  while (performance.now() < start + seconds * 1000)
    await sleep(Math.min(1000, start + seconds * 1000 - performance.now()));
  const offerEnd = performance.now();
  const canceled =
    mode === "A0"
      ? queue.stopPending(
          Object.assign(new Error("control window ended before submission"), {
            _tag: "ExperimentWindowClosed",
          }),
        )
      : 0;
  // Drain all pending offers and validation; additions from lost-ACK retries are included.
  let cursor = 0;
  while (cursor < pending.length) {
    const batch = pending.slice(cursor);
    cursor = pending.length;
    await Promise.all(batch);
  }
  const drainMs = performance.now() - offerEnd;
  let readerResults = [];
  if (readerCount) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("reader completion timeout")), 90000);
    });
    try {
      readerResults = await Promise.race([reader.done(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
  await reader.close();
  after = observe();
  save(path.join(a.dir, "after.json"), after);
  const claims = await rt.inner.query(
    "SELECT command_id,tx_id,position FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ? AND command_id LIKE ?",
    [scope, prefix + ":%"],
  );
  const claimMap = new Map(claims.map((r) => [String(r.command_id), r]));
  const originals = events.filter((e) => !e.resend),
    errors = raw.filter((r) => r.error),
    successful = raw.filter((r) => r.result),
    originalSuccess = successful.filter((r) => !r.event.resend && !r.retry);
  const unaccounted = originals.filter(
    (e) =>
      !claimMap.has(`${prefix}:${e.seq}`) &&
      !raw.some((r) => r.event.seq === e.seq && r.error && r.error.tag !== "unknown"),
  );
  const mismatchedClaims = originalSuccess.filter((r) => {
    const c = claimMap.get(`${prefix}:${r.event.seq}`);
    return !c || c.tx_id !== r.result.txId || Number(c.position) !== r.result.position;
  });
  const dupes = successful.filter((r) => r.event.resend || r.retry);
  const idemMismatches = dupes.filter((r) => {
    const original = outcomes.get(r.event.seq);
    const originalCheck = checks.find((c) => c.seq === r.event.seq && !c.resend && !c.retry),
      duplicateCheck = checks.find((c) => c.attemptIndex === r.attemptIndex);
    return (
      !original?.result ||
      r.result.txId !== original.result.txId ||
      r.result.position !== original.result.position ||
      !originalCheck?.record ||
      !duplicateCheck?.record ||
      JSON.stringify(originalCheck.record) !== JSON.stringify(duplicateCheck.record)
    );
  });
  const lostIds = new Set(originals.filter((e) => e.ackLoss).map((e) => e.seq));
  const published = originalSuccess
    .map((r) =>
      r.event.ackLoss ? successful.find((s) => s.retry && s.event.seq === r.event.seq) : r,
    )
    .filter(Boolean);
  const byBand = {};
  for (const [name, min, max] of [
    ["5-10", 5, 10],
    ["11-25", 11, 25],
    ["26-50", 26, 50],
  ]) {
    const values = published
      .filter((r) => r.event.facts >= min && r.event.facts <= max)
      .map((r) => r.ackMs);
    byBand[name] = values.length ? summary(values) : null;
  }
  const readerFaults = readerResults.reduce(
    (n, r) =>
      n +
      Object.values(r.faults).reduce((a, b) => a + b, 0) +
      Object.values(r.errors).reduce((a, b) => a + b, 0),
    0,
  );
  const burst = published.filter((r) => r.event.burst);
  const burstDrainMs = burst.length
    ? Math.max(...burst.map((r) => r.ackAt)) - (start + 180000)
    : null;
  // O-REPLAY sample independently reconstructs the entire subject multiset for acknowledged trace commands.
  // It is deliberately limited to the attempt's own tx ids; inherited history is outside this oracle's claim.
  const model = [];
  const oracleInputs = [];
  let historyBound = false;
  for (const file of fs.readdirSync(RECEIPTS)) {
    const r = JSON.parse(fs.readFileSync(path.join(RECEIPTS, file)));
    if (r.scope !== scope || r.binding?.container !== first.binding.container) continue;
    if (r.n === 10000 && r.account === true && r.arm === "C") {
      const bytes = fs.readFileSync(path.join(r.evidenceDir, "commits.json"));
      for (const h of JSON.parse(bytes))
        model.push({
          subject: h.i,
          seq: `history-${h.i}`,
          facts: 10,
          txId: h.txId,
          position: h.position,
        });
      historyBound = true;
      oracleInputs.push({
        receipt: file,
        sha256: sha(path.join(RECEIPTS, file)),
        rawSha256: sha(path.join(r.evidenceDir, "commits.json")),
      });
    }
    if (
      ["F7", "F8"].includes(r.arm) &&
      r.id !== a.id &&
      fs.existsSync(path.join(r.evidenceDir, "samples.json.gz"))
    ) {
      const fileName = path.join(r.evidenceDir, "samples.json.gz");
      const manifest = JSON.parse(fs.readFileSync(path.join(r.evidenceDir, "manifest.json")));
      if (manifest.find((e) => e.file === "samples.json.gz")?.sha256 !== sha(fileName))
        throw new Error("prior trace sample checksum mismatch");
      const prior = JSON.parse(gunzipSync(fs.readFileSync(fileName)));
      for (const e of prior.raw.filter((e) => e.result && !e.event.resend && !e.retry))
        model.push({
          subject: e.event.subject,
          seq: `${r.valuePrefix ?? r.id}:${e.event.seq}`,
          facts: e.event.facts,
          ...e.result,
        });
      oracleInputs.push({
        receipt: file,
        sha256: sha(path.join(RECEIPTS, file)),
        rawSha256: sha(fileName),
      });
    }
  }
  for (const e of originalSuccess)
    model.push({
      subject: e.event.subject,
      seq: `${prefix}:${e.event.seq}`,
      facts: e.event.facts,
      ...e.result,
    });
  const sampled = checks.filter((r) => r.fullActual);
  const expectedSamples = originalSuccess.filter((r) => r.event.seq % 37 === 0).length;
  for (const sample of sampled) {
    const e = originalSuccess.find((e) => e.event.seq === sample.seq);
    const expected = model
      .filter((m) => m.subject === e.event.subject && m.position <= sample.position)
      .flatMap((m) =>
        Array.from({ length: m.facts }, (_, k) => [
          m.txId,
          m.position,
          `:p2x/f${k}`,
          `v${m.seq}-${k}`,
          "string",
          `subj:${m.subject}`,
          "p2x-subject",
        ]),
      )
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    sample.fullExpected = expected;
    sample.fullMatches = JSON.stringify(expected) === JSON.stringify(sample.fullActual);
  }
  const oracleMismatches = sampled.filter((r) => !r.fullMatches).length;
  fs.writeFileSync(
    path.join(a.dir, "samples.json.gz"),
    gzipSync(
      JSON.stringify({
        raw,
        checks,
        readerResults: readerResults.map((r) => ({ ...r, pairs: Array.from(r.pairs) })),
        claims,
      }),
    ),
  );
  finish(a, {
    arm,
    readers: readerCount,
    seconds,
    scope,
    seed,
    traceDigest: traceDigest(events),
    generatorSha256: GENERATOR_SHA256,
    buildHead: build.head,
    binding: first.binding,
    afterBinding: after.binding,
    offered: events.length,
    canceledAtWindowEnd: canceled,
    originalCommands: originals.length,
    committed: originalSuccess.length,
    retries: raw.filter((r) => r.retry).length,
    duplicateResponses: dupes.length,
    lostAcks: lostIds.size,
    errors,
    unaccounted: unaccounted.length,
    mismatchedClaims: mismatchedClaims.length,
    idemMismatches: idemMismatches.length,
    ryowChecks: checks.length,
    ryowMismatches: checks.filter((r) => !r.contentMatches).length,
    oracle: {
      kind: "full subject assertion multiset at the returned cut, replayed independently from history and offered commands",
      historyBound,
      inputs: oracleInputs,
      expectedSamples,
      sampled: sampled.length,
      mismatches: oracleMismatches,
    },
    byBand,
    commitsPerS: originalSuccess.length / ((performance.now() - start) / 1000),
    drainMs,
    burstDrainMs,
    queue: { ...queue.identity, groupSizes: queue.groups, maxRunning: queue.maxRunning },
    counts: rt.counts,
    readerFaults,
    timings: Object.fromEntries(
      Object.entries(rt.timings).map(([k, v]) => [k, v.length ? summary(v) : null]),
    ),
    engine: engineMeans(first.metrics, after.metrics, originalSuccess.length),
    gates: {
      "G-QUIET": quiet(first).zero,
      "G-ACCT":
        originals.length > 0 &&
        unaccounted.length === 0 &&
        mismatchedClaims.length === 0 &&
        errors.length === 0,
      "G-RYOW": "UNVERIFIED_WAIT_TELEMETRY",
      exactCutContents:
        checks.length === successful.length && checks.every((r) => r.contentMatches),
      "G-IDEM":
        events.some((e) => e.resend) && lostIds.size > 0
          ? idemMismatches.length === 0 &&
            dupes.length === events.filter((e) => e.resend).length + lostIds.size
          : "NOT_RUN_NO_INJECTIONS",
      "G-ORACLE":
        mode === "C" &&
        historyBound &&
        expectedSamples > 0 &&
        sampled.length === expectedSamples &&
        oracleMismatches === 0,
    },
    runKind: seconds === 600 || (mode === "A0" && seconds === 300) ? "diagnostic" : "smoke",
  });
  if (
    unaccounted.length ||
    mismatchedClaims.length ||
    idemMismatches.length ||
    checks.some((r) => !r.contentMatches) ||
    oracleMismatches ||
    readerFaults ||
    (mode === "C" && errors.length)
  )
    process.exitCode = 1;
  console.log(
    a.id,
    JSON.stringify({
      byBand,
      committed: originalSuccess.length,
      errors: errors.length,
      drainMs,
      unaccounted: unaccounted.length,
      idemMismatches: idemMismatches.length,
      ryowMismatches: checks.filter((r) => !r.contentMatches).length,
      readerFaults,
    }),
  );
} catch (e) {
  save(path.join(a.dir, "failure.json"), { message: e.stack, acknowledged: raw.length });
  throw e;
} finally {
  await reader?.close();
  await rt.close();
}
