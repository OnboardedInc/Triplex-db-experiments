import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { expectedSave, play, resolveUncertain, type PublishInterleave, type Sender } from "../scale1/decision/writes.ts";
import { now } from "../scale1/decision/observer.ts";
import { expiryMs, field, operationId, sha, task, type Write } from "../scale1/decision/plan.ts";
import { command } from "../w1/group/workload.ts";

const [phase, widthArg, witnessPath] = process.argv.slice(2);
const credits = Number(widthArg);
assert(phase === "before" || phase === "after");
assert(witnessPath && [6, 16].includes(credits));
const attempt = process.env.PREP1_ATTEMPT!;
assert.match(attempt, /^[a-f0-9-]{36}$/);
const nonce = `${attempt}-${credits}`;
const freshFirst = process.env.PREP1_FRESH_FIRST === "1";
const selection = { mode: "rolling", credits, freshFirst } as const;
const url = process.env.PREP1_PEERS!;
const client = new DatomicClient(url, 5000);
const scope = JSON.stringify(["triplex-scope-v1", "test", "rolling", nonce, 0]);

function tape(n: number, label: string, samePerson = false): Write[] {
  return Array.from({ length: n }, (_, ordinal) => ({
    ordinal, account: ordinal % 10, subject: samePerson ? Math.floor(ordinal / 10) % 2 : ordinal,
    ms: 0, width: 1, version: `${label}/${ordinal}`,
  }));
}

async function exactRead(db: string, entity: string, position: number, id: string, value: string) {
  const got = await client.rows(db, { entityIds: [entity], basis: { recordedPosition: position, validAt: 1 } });
  const visible = got.filter((r) => r.attribute === field(0));
  assert.deepEqual(visible.map((r) => [r.id, r.value_string]), [[id, value]]);
}

async function head(db: string) {
  const pin = await client.begin(db);
  await client.release(db, pin.handle);
  return pin.position;
}

type Receipt = { id: string; p: number; t: string; clock: number; replyNs: string };
type Witness = { attempt: string; db: string; head: number; lost: Receipt; acked: Receipt[]; missing: string[] };

async function before(witness: string) {
  const { db, created } = await client.create(scope, "lean", true, 35000);
  assert(created);
  const seedSet = [...tape(credits, "seed"), ...tape(50, "repeat", true)];
  const templates = new Map(seedSet.map((e) => [task(e.account, e.subject), e]));
  const facts = [...templates].flatMap(([e]) => Array.from({ length: 4 }, (_, i) =>
    ({ e, a: field(i), v: { type: "string" as const, value: "seed" } })));
  const change = command(nonce + "-seed", facts, [], false);
  const seed = await client.transact(db, change) as { position: { v: string }; recordedAt: { v: number } };
  const cut = Number(seed.position.v);
  assert.equal(cut, 1);
  const rowsByOwner = new Map([...templates].map(([e], i) => [e, change.rows.slice(i * 4, i * 4 + 4)
    .map((r) => ({ ...r, recorded_position: cut, recorded_at: seed.recordedAt.v }))]));
  const senders: Sender[] = Array.from({ length: 10 }, () => ({
    client, rows: rowsByOwner,
    scope: { name: scope, db, cut, seedCut: cut, accounts: Array.from({ length: 10 }, (_, i) => i) },
  }));
  const expire = await play(senders, tape(1, "expired"), now() - expiryMs - 100, nonce, true, true, selection);
  assert.deepEqual(expire.rows.map((r) => [r.status, r.expiryCause]), [["expired-before-dispatch", "timer"]]);
  assert.equal(await head(db), cut);

  const real = client.transact.bind(client);
  const replyClocks = new Map<string, string>();
  let immediate = 0;
  client.transact = async (...args) => {
    const reply = await real(...args) as { position: { v: string } };
    replyClocks.set(args[1].operationId, process.hrtime.bigint().toString());
    const row = args[1].rows[0]!;
    await exactRead(db, row.entity_id, Number(reply.position.v), row.id, row.value_string!);
    immediate++;
    return reply as Awaited<ReturnType<DatomicClient["transact"]>>;
  };
  const okTape = tape(50, "healthy", true);
  const ok = await play(senders, okTape, now(), nonce, true, true, selection);
  assert.equal(immediate, okTape.length);
  for (const e of okTape) {
    const saved = ok.rows[e.ordinal]!;
    assert(saved.status === "acked" && saved.stage?.subjectOrderedIds && saved.receipt);
    const exact = expectedSave(saved, e, rowsByOwner.get(task(e.account, e.subject))!);
    await exactRead(db, exact.entity, saved.receipt.p, exact.input.rows[0]!.id, sha([e.version, 0]).slice(0, 57));
    const sequence = ok.rows.filter((s) => s.account === e.account && s.subject === e.subject);
    assert(sequence.every((s, i) => i === 0 || sequence[i-1]!.receipt!.p < s.receipt!.p));
  }
  assert.equal(await head(db), cut + okTape.length);

  const pressureRows = [];
  if (freshFirst) {
    // [DX-PREP1] Why: hold dispatch until four offers are queued on one fresh scope.
    // Rejected: relying on elapsed engine speed to manufacture a stale predecessor.
    const pressure: Write[] = [
      { account: 1, subject: 0, ms: 0, width: 1, ordinal: 0, version: "pressure/0" },
      { account: 1, subject: 0, ms: 96, width: 1, ordinal: 1, version: "pressure/1" },
      { account: 1, subject: 1, ms: 97, width: 1, ordinal: 2, version: "pressure/2" },
      { account: 0, subject: 0, ms: 98, width: 1, ordinal: 3, version: "pressure/3" },
    ];
    const pause: PublishInterleave = { paused: true, committed: () => {} };
    const playback = play(senders, pressure, now() - 100, nonce, true, true, selection, pause);
    assert.equal(pause.waiting!().reduce((a, b) => a + b, 0), pressure.length);
    pause.paused = false;
    pause.resume!();
    const disposition = await playback;
    const [old, successor, independent, quiet] = disposition.rows;
    assert(disposition.rows.every((r) => r.status === "acked" && r.receipt && r.stage?.subjectOrderedIds));
    assert.equal(quiet!.fairTurn, 1);
    assert.equal(independent!.fairTurn, 2);
    assert(old!.receipt!.p < successor!.receipt!.p);
    pressureRows.push(...disposition.rows);
  }
  assert.equal(immediate, okTape.length + pressureRows.length);
  const lostTape = tape(credits, "lost");
  const lostId = operationId(nonce, lostTape[credits-1]!.version);
  let withheld: unknown;
  client.transact = async (...args) => {
    const result = await real(...args);
    replyClocks.set(args[1].operationId, process.hrtime.bigint().toString());
    if (args[1].operationId === lostId) {
      withheld = result;
      throw new Error("test: client reply withheld after a genuine durable ACK");
    }
    return result;
  };
  const lostResult = await play(senders, lostTape, now(), nonce, true, true, selection);
  client.transact = real;
  const [unresolved] = [...lostResult.unresolved];
  assert(unresolved && lostResult.unresolved.size === 1 && unresolved[0].id === lostId && withheld);
  await resolveUncertain(senders, lostResult.unresolved);
  const recovered = unresolved[0];
  const initial = withheld as { position: { v: string }; t: { v: string }; recordedAt: { v: number } };
  assert(recovered.status === "recovered" && recovered.receipt);
  assert.deepEqual([recovered.receipt.p, recovered.receipt.t, recovered.receipt.clock],
    [Number(initial.position.v), initial.t.v, initial.recordedAt.v]);
  await assert.rejects(() => real(db, unresolved[1].input), { code: "OperationDuplicate" });
  await assert.rejects(() => real(db, { ...unresolved[1].input, operationId: nonce + "-new-operation" }),
    { code: "CommandConflict" });
  const beforeFailure = await head(db);
  assert.equal(beforeFailure, cut + okTape.length + pressureRows.length + lostTape.length);

  // [DX-PREP1] Why: let the real transactor reject its next append while requests hold rolling credits.
  // Rejected: a timer-based stop or treating a fabricated failed HTTP response as a refused storage write.
  const marker = process.env.PREP1_ROLLING_FAIL_PATH!;
  const failureTape = tape(credits, "failure");
  const target = operationId(nonce, failureTape[0]!.version);
  let submitted = 0;
  client.transact = async (...args) => {
    submitted++;
    if (args[1].operationId === target) writeFileSync(marker, db, { flag: "wx" });
    return real(...args);
  };
  const failed = await play(senders, failureTape, now(), nonce, true, true, selection);
  assert.equal(submitted, credits);
  assert(failed.rows.every((r) => r.status === "uncertain" && r.receipt === undefined));
  const proof: Witness = { attempt, db, head: beforeFailure,
    lost: { id: lostId, ...recovered.receipt, replyNs: replyClocks.get(lostId)! },
    acked: [...ok.rows, ...pressureRows, ...lostResult.rows].map((r) => {
      assert(r.receipt);
      return { id: r.id, p: r.receipt.p, t: r.receipt.t, clock: r.receipt.clock, replyNs: replyClocks.get(r.id)! };
    }),
    missing: failed.rows.map((r) => r.id) };
  writeFileSync(witness, JSON.stringify(proof), { flag: "wx" });
}

async function after(witness: string) {
  const proof = JSON.parse(readFileSync(witness, "utf8")) as Witness;
  assert.equal(proof.attempt, attempt);
  const opened = await client.create(scope, "lean", true, 35000);
  assert.equal(opened.created, false);
  assert.equal(opened.db, proof.db);
  const db = proof.db;
  assert.equal(await head(db), proof.head);
  const page = await client.request<{ transactions: [string, number, string[]][] }>("POST",
    `/v2/db/${db}/transactions`, { after: 1, limit: 100, basis: { recordedPosition: proof.head } });
  assert.deepEqual(page.transactions.map(([, position]) => position), proof.acked.map((_, i) => 2+i));
  const ids = page.transactions.map(([, , lines]) => lines.map(decodeRowText)
    .find((r) => r.attribute === ":_tx/command-id")!.value_string!);
  assert.deepEqual([...ids].sort(), proof.acked.map((r) => r.id).sort());
  for (const r of proof.acked) {
    const observed = await client.operation(db, r.id);
    assert.equal(observed.status, "committed");
    assert.deepEqual([observed.operationId, Number(observed.position?.v), observed.t?.v, observed.recordedAt?.v],
      [r.id, r.p, r.t, r.clock]);
  }
  for (const id of proof.missing) assert.equal((await client.operation(db, id)).status, "absent");
  const recoveredId = operationId(nonce, tape(credits, "lost")[credits-1]!.version);
  const original = await client.operation(db, recoveredId);
  assert.deepEqual([Number(original.position?.v), original.t?.v, original.recordedAt?.v],
    [proof.lost.p, proof.lost.t, proof.lost.clock]);
  console.log("PREP1_ROLLING " + JSON.stringify({ attempt, credits, freshFirst, db, head: proof.head,
    durable: ids.length, refused: proof.missing.length, lost: proof.lost, checked: proof.acked }));
}
try {
  if (phase === "before") await before(witnessPath);
  else await after(witnessPath);
} finally {
  client.close();
}
