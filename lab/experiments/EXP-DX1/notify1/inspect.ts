import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const digest = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const p99 = (samples: number[]) =>
  [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * 0.99) - 1];
export function inspectPair(dir: string) {
  const get = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const result = get("result.json"),
    { n, nonce, source, slot } = result;
  assert(Number.isSafeInteger(n) && n > 0 && nonce && /^[a-f0-9]{40}$/.test(source) && slot);
  const original = path.join(dir, "binding.json");
  if (fs.existsSync(original)) {
    const b = get("binding.json");
    assert(b.nonce === nonce && b.source === source && b.slot === slot);
    assert.equal(digest(fs.readFileSync(path.join(dir, "owner.json"))), b.owner);
  } else {
    const parent = path.dirname(dir);
    const local = path.join(parent, "binding.json");
    const b = JSON.parse(
      fs.readFileSync(fs.existsSync(local) ? local : path.join(parent, "attempt.json"), "utf8"),
    );
    assert(b.source === source && b.slot === slot);
    if (fs.existsSync(local))
      assert.equal(digest(fs.readFileSync(path.join(parent, "owner.json"))), b.owner);
    const pre = JSON.parse(fs.readFileSync(path.join(parent, "preflight-receipt.json"), "utf8"));
    assert.deepEqual(pre.binding, { source, slot, nonce: b.nonce });
    if (path.basename(dir) === "notice-preflight") {
      assert.equal(pre.noticeAttempt, nonce);
      assert.equal(pre.noticeDigest, result.dispatch.proof.orderedEffectSha256);
    } else {
      assert(
        path.basename(dir) === "deep" && b.nonce === nonce && pre.subjects === 1000 && n === 100000,
      );
    }
  }
  for (const file of [
    "journal.ts",
    "dispatcher.ts",
    "workload.ts",
    "oracle.py",
    "verify.ts",
    "rung.ts",
  ]) {
    assert(Object.hasOwn(result.inputs, file));
  }
  for (const [file, expected] of Object.entries(result.inputs)) {
    assert(/^[a-z]+\.(ts|py)$/.test(file));
    const actual = execFileSync("git", [
      "show",
      source + ":lab/experiments/EXP-DX1/notify1/" + file,
    ]);
    assert.equal(digest(actual), expected, file);
  }
  const offers = [];
  for (const arm of ["dispatch", "baseline"]) {
    const r = result[arm],
      raw = get(arm + "-raw.json");
    assert.deepEqual(r, get(arm + ".json"));
    assert(r.epoch === nonce + "-" + arm && r.scope === "notice-" + r.epoch && r.duration > 0);
    assert(
      r.readCount === raw.reads.length &&
        r.saveCount === raw.saves.length &&
        r.readCount &&
        r.saveCount,
    );
    assert.equal(r.readP99, p99(raw.reads.map((v: any) => v.latency)));
    assert.equal(r.saveP99, p99(raw.saves.map((v: any) => v.ackMs)));
    const scheduled = raw.saves.map((v: any) => [v.seq, v.atMs]);
    assert.equal(r.offerDigest, digest(JSON.stringify(scheduled)));
    offers.push(scheduled);
    const phases = raw.history.map((v: any) => v.receipt.position);
    assert(
      phases.every((p: number, i: number) => Number.isSafeInteger(p) && p > (phases[i - 1] ?? 0)),
    );
    assert(
      r.activation.position === phases[1] && r.activation.txId === raw.history[1].receipt.txId,
    );
    assert(r.activation.operations === 4 && r.activation.assertions === 3);
  }
  assert.deepEqual(offers[0], offers[1]);
  const a = result.dispatch,
    b = result.baseline;
  assert(a.scope !== b.scope && a.receiver !== b.receiver && a.duration === b.duration);
  assert(a.proof.subjects === n && a.proof.receiverStates === n && a.proof.ledgerStates === n);
  assert(
    a.proof.eventCounts.reduce((s: number, v: number) => s + v, 0) === a.proof.effects &&
      a.proof.eventCounts[1] === a.dispatch.deliveries,
  );
  assert(a.proof.evaluations >= 2 * n && a.proof.orderedEffectSha256.length === 64);
  const read = a.readP99 / b.readP99,
    write = a.saveP99 / b.saveP99,
    rate = (a.dispatch.deliveries * 1000) / a.duration;
  assert.equal(result.ratios.read, read);
  assert.equal(result.ratios.commit, write);
  assert.equal(a.deliveriesPerSecond, rate);
  // [DX-STG1] Why: the operating-point comparison needs both measured tails from the same offered saves, including queue time. Rejected: quoting a drain rate in a window whose live writes missed the limit.
  return {
    name: path.basename(dir),
    source,
    slot,
    nonce,
    subjects: n,
    noticeCommitMs: a.activationMs,
    changes: a.activation.operations,
    releaseNotices: a.dispatch.deliveries,
    noticesPerSecond: rate,
    elapsedMs: a.duration,
    readRatio: read,
    commitRatio: write,
    withinBoth: read <= 1.5 && write <= 1.5,
    reads: a.readCount,
    saves: a.saveCount,
    readP99: [a.readP99, b.readP99],
    commitP99: [a.saveP99, b.saveP99],
    firstEffectMs: a.firstEffectMs,
    lastEffectMs: a.lastEffectMs,
    phases: a.dispatch,
    oracleEffects: a.proof.effects,
    oracleDigest: a.proof.orderedEffectSha256,
  };
}
if (import.meta.filename === process.argv[1]) {
  assert(process.argv.length > 2);
  console.log(
    JSON.stringify(
      process.argv.slice(2).map((d) => inspectPair(d)),
      null,
      2,
    ),
  );
}
