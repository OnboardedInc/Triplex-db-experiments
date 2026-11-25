// [DX-S2] Product-path gate (Mac toy, correctness; times are diagnostic). Every save goes through TriplesLive and the
// Datomic adapter with `orderedSaves` and `saveSizeRule` on, to a gateway with the per-subject writer (wide as the
// gateway was started). Each committed request is then sent unchanged to a control gateway whose per-subject writer
// is off, so every save there takes the general writer, and every read route is compared between the two databases.
//   node --experimental-transform-types s2/gate.ts <subject url> <control url> <wide 0|1> <out.json>
// Parts: (b) the matrix of save shapes and the product's own save shapes; (c) two saves of one subject at once;
// (d) a lost reply and a resend; the save-size rule; then the control comparison.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { core, datomic, Effect, openProduct, type ProductStore, type Wire } from "./product.ts";

const [subjectUrl, controlUrl, wideArg, outFile] = process.argv.slice(2);
assert(subjectUrl && controlUrl && (wideArg === "0" || wideArg === "1") && outFile, "usage: gate.ts <subject> <control> <0|1> <out>");
const wide = wideArg === "1";
const run = randomUUID().slice(0, 8);
let lostCommand: string | undefined;
const on = await openProduct(subjectUrl, `s2-gate-${run}`, { orderedSaves: true, saveSizeRule: true },
  (input) => lostCommand !== undefined && input.claims?.[0]?.commandId === lostCommand);
const off = await openProduct(subjectUrl, `s2-gate-off-${run}`, {});
const control = await openProduct(controlUrl, `s2-control-${run}`, {});

const T0 = 1_700_000_000_000; // seeded facts are true from here (valid time)
const DAY = 86_400_000;
const value = (label: string, i: number, width = 57) =>
  createHash("sha256").update(`${label}/${i}`).digest("hex").repeat(Math.ceil(width / 64)).slice(0, width);
const str = (v: string) => ({ type: "string", value: v });
type Live = { id: string; attribute: string; value: string; validFrom: number; validTo: number | null };
const live = new Map<string, Map<string, Live[]>>(); // subject -> attribute -> live rows

function remember(result: any, retracted: readonly string[]) {
  const gone = new Set(retracted);
  for (const rows of live.values()) for (const [a, list] of rows) rows.set(a, list.filter((r) => !gone.has(r.id)));
  for (const t of result.triples) {
    const rows = live.get(t.entityId) ?? new Map<string, Live[]>();
    live.set(t.entityId, rows);
    rows.set(t.attribute, [...(rows.get(t.attribute) ?? []), {
      id: t.id, attribute: t.attribute, value: t.value.value, validFrom: t.validFrom,
      validTo: t.validTo?._tag === "Some" ? t.validTo.value : null,
    }]);
  }
}
const rowsOf = (subject: string, attribute: string) => live.get(subject)?.get(attribute) ?? [];

type Case = {
  label: string; group: string; facts: number; assertions: number; retirements: number; entities: number;
  writer?: "per-subject" | "general"; orderedIds?: boolean; block?: "one-byte" | "wide" | "runtime"; route?: string;
  outcome: string; ms?: number; expectQualifies?: boolean;
};
const cases: Case[] = [];
const commands: string[] = [];

async function save(group: string, label: string, ops: any[], meta: Record<string, unknown> = {}, store: ProductStore = on) {
  const commandId = `${label}-${run}`;
  const before = store.wire.length;
  const routesBefore = new Map(store.client.saveRoutes as Map<string, number>);
  const started = performance.now();
  const retracted = ops.filter((o) => o.op === "retract").map((o) => o.id);
  const result = await store.transact(ops, { commandId, ...meta });
  remember(result, retracted);
  commands.push(commandId);
  const sent = store.wire.slice(before).filter((w) => w.ack);
  const last = sent.at(-1)!;
  const routes = [...(store.client.saveRoutes as Map<string, number>)].filter(([k, n]) => n !== (routesBefore.get(k) ?? 0)).map(([k]) => k);
  const entities = new Set(ops.filter((o) => o.op === "assert").map((o) => o.entityId));
  const c: Case = {
    label, group,
    facts: Math.max(ops.filter((o) => o.op === "assert").length, retracted.length),
    assertions: ops.filter((o) => o.op === "assert").length, retirements: retracted.length, entities: entities.size,
    writer: last.ack?.subjectSave ? "per-subject" : "general", orderedIds: last.ack?.subjectOrderedIds === true,
    // The SDK's own record of the identity it gave the save (orderedSaves): an ordered block, or the runtime's IDs.
    block: routes.includes("ordered:wide") ? "wide" : routes.includes("ordered:one-byte") ? "one-byte" : "runtime",
    route: routes.join(","), outcome: "committed", ms: Math.round((performance.now() - started) * 100) / 100,
  };
  cases.push(c);
  return { result, c };
}

// Subjects are seeded by a first save that creates the owner (the general writer, since the owner does not exist yet).
async function seed(subject: string, n: number, from = T0) {
  const ops = Array.from({ length: Math.max(1, n) }, (_, i) => ({
    op: "assert", entityId: subject, attribute: `:task/f${i}`, value: str(value(subject, i)), validFrom: from, entityType: "Task",
  }));
  for (let i = 0; i < ops.length; i += 900) await save("seed", `seed-${subject}-${i}`, ops.slice(i, i + 900));
}
const replaceOps = (subject: string, fields: number[], tag: string) => fields.flatMap((i) => [
  ...rowsOf(subject, `:task/f${i}`).map((r) => ({ op: "retract", id: r.id })),
  { op: "assert", entityId: subject, attribute: `:task/f${i}`, value: str(value(`${subject}/${tag}`, i)), validFrom: T0, entityType: "Task" },
]);
// The console's and the playground's form: retire the current value, keep it true until `at` as a bounded row, and
// assert the new value from `at` (a correction when `at` is in the past, a save "from now on" when it is now).
const boundedOps = (subject: string, fields: number[], tag: string, at: number) => fields.flatMap((i) => {
  const prior = rowsOf(subject, `:task/f${i}`);
  return [
    ...prior.flatMap((r) => [
      { op: "retract", id: r.id },
      ...(r.validFrom < at ? [{ op: "assert", entityId: subject, attribute: r.attribute, value: str(r.value), validFrom: r.validFrom, validTo: at, entityType: "Task" }] : []),
    ]),
    { op: "assert", entityId: subject, attribute: `:task/f${i}`, value: str(value(`${subject}/${tag}`, i)), validFrom: at, entityType: "Task" },
  ];
});
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// (b) The matrix: sizes by kind, one subject; two subjects; a scope-wide constraint.
const sizes = [1, 3, 20, 64, 128, 129, 500];
for (const n of sizes) {
  const first = `task/first-${n}-${run}`;
  await seed(first, 1);
  await save("matrix", `first-${n}`, range(n).map((i) => ({ op: "assert", entityId: first, attribute: `:task/new${i}`, value: str(value(first, i)), entityType: "Task" })));
  const replace = `task/replace-${n}-${run}`;
  await seed(replace, n);
  await save("matrix", `replace-${n}`, replaceOps(replace, range(n), "r"));
  const retire = `task/retire-${n}-${run}`;
  await seed(retire, n);
  await save("matrix", `retire-${n}`, range(n).flatMap((i) => rowsOf(retire, `:task/f${i}`).map((r) => ({ op: "retract", id: r.id }))));
  const correct = `task/correct-${n}-${run}`;
  await seed(correct, n);
  await save("matrix", `correct-${n}`, boundedOps(correct, range(n), "c", T0 + DAY));
}
for (const n of [3, 20, 128]) {
  const a = `task/two-a-${n}-${run}`, b = `task/two-b-${n}-${run}`;
  await seed(a, n);
  await seed(b, n);
  await save("matrix", `two-subjects-${n}`, [...replaceOps(a, range(Math.ceil(n / 2)), "t"), ...replaceOps(b, range(Math.floor(n / 2)), "t")]);
}
for (const n of [3, 20]) {
  const s = `task/constraint-${n}-${run}`;
  await seed(s, n);
  await save("matrix", `constraint-${n}`, replaceOps(s, range(n), "k"),
    { enforce: { constraints: [{ _tag: "Unique", v: 1, entityType: "Task", attribute: ":task/f0" }] } });
}

// The product's own save shapes (v01/SAVE-SHAPE.md section 2), each on its own subject.
const product: { label: string; expect: boolean }[] = [];
async function productSave(label: string, expect: boolean, ops: any[], meta: Record<string, unknown> = {}) {
  const { c } = await save("product", label, ops, meta);
  c.expectQualifies = expect;
  product.push({ label, expect });
}
{
  const answers = range(20).map((i) => `:task/answer-${i}`);
  const form = `task/form-${run}`, profile = `profile/form-${run}`;
  await seed(form, 0);
  const formFields = [...answers, ":task/progress", ":task/status", ":task/audit-ip", ":task/audit-agent", ":task/audit-by"];
  const write = (subject: string, fields: string[], tag: string, at?: number) => fields.flatMap((a, i) => [
    ...rowsOf(subject, a).flatMap((r) => [
      { op: "retract", id: r.id },
      ...(at !== undefined && r.validFrom < at ? [{ op: "assert", entityId: subject, attribute: a, value: str(r.value), validFrom: r.validFrom, validTo: at, entityType: "Task" }] : []),
    ]),
    { op: "assert", entityId: subject, attribute: a, value: str(value(`${subject}/${tag}`, i)), ...(at === undefined ? { validFrom: T0 } : { validFrom: at }), entityType: "Task" },
  ]);
  await save("seed", `seed-form-${run}`, write(form, formFields, "s0"));
  await productSave("form page submit, 20 rows (task only, plain replacement: 25 facts)", true, write(form, formFields, "s1"));
  await productSave("form page submit, 20 rows, kept true until now (the console's and playground's form)", true, write(form, formFields, "s2", Date.now()));
  await seed(profile, 3);
  await productSave("form page submit, 20 rows, with profile fields (task and profile)", false,
    [...write(form, formFields, "s3"), ...write(profile, [":task/f0", ":task/f1"], "p3")]);
  const status = `task/status-${run}`;
  await seed(status, 3);
  await save("seed", `seed-status-${run}`, write(status, [":task/status"], "s0"));
  await productSave("status change (status, completion time, file name, event)", true,
    [...write(status, [":task/status"], "done"), ...write(status, [":task/completed-at", ":task/file", ":task/event"], "e")]);
  const statusRef = `task/status-ref-${run}`;
  await seed(statusRef, 3);
  await productSave("status change with the file as a reference to its own entity", false,
    [...write(statusRef, [":task/f0"], "done"), { op: "assert", entityId: statusRef, attribute: ":task/file", value: { type: "ref", value: `file/${run}` } }]);
  const check = `task/check-${run}`;
  await seed(check, 3);
  await save("seed", `seed-check-${run}`, write(check, [":task/check", ":task/progress"], "s0"));
  await productSave("check result (check field and progress, both replaced)", true, write(check, [":task/check", ":task/progress"], "r1"));
  const other = `task/other-${run}`;
  await seed(other, 3);
  await productSave("work-eligibility writeback to the subject's other form (one field)", true, write(other, [":task/f1"], "w1"));
  await productSave("import row (a new subject's first save, 12 facts)", false,
    range(12).map((i) => ({ op: "assert", entityId: `task/import-${run}`, attribute: `:task/f${i}`, value: str(value("import", i)), entityType: "Task" })));
  const corrected = `task/corrected-${run}`;
  await seed(corrected, 3);
  await productSave("correction of a past value (one field, from a past date)", true, boundedOps(corrected, [0], "fix", T0 + DAY));
  await productSave("bulk action (a batch and one pending item per subject: new entities)", false, [
    { op: "assert", entityId: `batch/${run}`, attribute: ":batch/form", value: str("form-1") },
    ...range(5).map((i) => ({ op: "assert", entityId: `batch/${run}/item-${i}`, attribute: ":item/subject", value: str(`subject-${i}`) })),
  ]);
  await productSave("progress copied from one subject to another (target's new task, reference to the source)", false, [
    { op: "assert", entityId: `task/copy-${run}`, attribute: ":task/progress", value: str("copied") },
    { op: "assert", entityId: `task/copy-${run}`, attribute: ":task/copied-from", value: { type: "ref", value: form } },
  ]);
}

// (c) Two saves of one subject sent together, on different fields. The second to reach the serial point is refused whole
// (the subject changed after its source cut) and the SDK replays it.
const raceSubject = `task/race-${run}`;
await seed(raceSubject, 4);
const conflictsBefore = on.client.commitDiagnostics.conflicts, replaysBefore = on.client.commitDiagnostics.replays;
const raceWire = on.wire.length;
const [r1, r2] = await Promise.all([
  save("race", "race-1", replaceOps(raceSubject, [0], "x")),
  save("race", "race-2", replaceOps(raceSubject, [1], "y")),
]);
const raceAttempts = on.wire.slice(raceWire);
const refused = raceAttempts.filter((w) => w.error);
const race = {
  attempts: raceAttempts.length, refused: refused.map((w) => w.error?.code), committed: raceAttempts.filter((w) => w.ack).length,
  conflicts: on.client.commitDiagnostics.conflicts - conflictsBefore, replays: on.client.commitDiagnostics.replays - replaysBefore,
  writers: raceAttempts.filter((w) => w.ack).map((w) => (w.ack?.subjectSave ? "per-subject" : "general")),
  refusedTokens: refused.map((w) => w.input.claims?.[0]?.txId), replayTokens: [r1, r2].map((r) => r.result.txId),
};
assert.equal(race.committed, 2, "both saves must commit, one after a replay");
assert(race.refused.length >= 1 && race.refused.every((c) => c === "CasConflict"), "the second save must be refused whole");
assert(race.replays >= 1, "the SDK must replay the refused save");
for (const w of refused) for (const id of w.input.newIds) {
  const rows = await on.client.rows(on.db, { id, history: true });
  assert.equal(rows.length, 0, "a refused attempt's identity must never be written");
}
for (const w of refused) assert(!race.replayTokens.includes(w.input.claims[0].txId), "a replay must take a new block");
const raceNow = await on.run(Effect.flatMap(core.Triples, (s: any) => s.entity(raceSubject)));
const nowValue = (a: string) => raceNow.filter((t: any) => t.attribute === a).map((t: any) => t.value.value);
assert.deepEqual(nowValue(":task/f0"), [value(`${raceSubject}/x`, 0)]);
assert.deepEqual(nowValue(":task/f1"), [value(`${raceSubject}/y`, 1)]);

// (d) A lost reply: the gateway commits, the answer is dropped; the SDK finds the receipt by operation. A resend with the
// same command ID writes nothing and names the original transaction.
const lostSubject = `task/lost-${run}`;
await seed(lostSubject, 3);
lostCommand = `lost-${run}`;
const lostWire = on.wire.length;
const lostResult = await on.transact(replaceOps(lostSubject, [0, 1], "l"), { commandId: lostCommand });
remember(lostResult, []);
commands.push(lostCommand);
const lostSent = on.wire.slice(lostWire);
const feedBefore = (await on.run(Effect.flatMap(core.Triples, (s: any) => s.transactions({ after: 0, limit: 1000 })))).transactions.length;
const resend = await on.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(replaceOps(lostSubject, [0], "again"), { commandId: lostCommand })));
const resendError = resend._tag === "Failure" ? JSON.stringify(resend.cause) : "";
const original = await on.run(Effect.flatMap(core.Triples, (s: any) => s.transactionByCommand(lostCommand)));
const feedAfter = (await on.run(Effect.flatMap(core.Triples, (s: any) => s.transactions({ after: 0, limit: 1000 })))).transactions.length;
const lost = {
  wireRequests: lostSent.length, ackAtGateway: Boolean(lostSent[0]?.ack), receiptPosition: lostResult.position,
  receiptTx: lostResult.txId, resendRefused: resend._tag === "Failure" && resendError.includes("CommandAlreadyCommittedError") && resendError.includes(lostResult.txId),
  originalByCommand: original?.txId === lostResult.txId && original?.position === lostResult.position,
  writer: lostSent[0]?.ack?.subjectSave ? "per-subject" : "general", feedBefore, feedAfter,
};
assert.equal(lost.wireRequests, 1, "a lost reply must not send the save again");
assert(lost.ackAtGateway && lost.resendRefused && lost.originalByCommand && feedBefore === feedAfter, "lost reply: " + JSON.stringify(lost));
lostCommand = undefined;

// The save-size rule (on this store): over the per-subject bound to the general writer with a reason; over 1,000 facts
// refused before sending; over 4 MiB refused as its own type; the default store keeps today's refusal.
const sizeSubject = `task/size-${run}`;
await seed(sizeSubject, 1);
const size: Record<string, unknown> = {};
{
  const wireBefore = on.wire.length;
  const big = await on.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(range(1001).map((i) => ({
    op: "assert", entityId: sizeSubject, attribute: `:task/big${i}`, value: str(value("big", i)) })), { commandId: `big-${run}` })));
  const err = big._tag === "Failure" ? (big.cause as any).reasons?.find((r: any) => r._tag === "Fail")?.error : undefined;
  // The measurement passes through the same transact call (and this gate's recorder) but stops at the encoder.
  const sentOver = on.wire.slice(wireBefore).filter((w) => w.error?.message !== "Request measured, not sent");
  size.over1000 = { refused: err?.reason, facts: err?.facts, bytes: err?.bytes, limitFacts: err?.limitFacts, sent: sentOver.length };
  assert(err instanceof datomic.SaveTooLarge && err.facts === 1001 && err.limitFacts === 1000 && err.bytes > 0 && sentOver.length === 0,
    "over 1,000 facts: " + JSON.stringify(size.over1000) + " " + String(err));
  const wideValues = await on.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(range(900).map((i) => ({
    op: "assert", entityId: sizeSubject, attribute: `:task/wide${i}`, value: str(value("wide", i, 5000)) })), { commandId: `wide-${run}` })));
  const err2 = wideValues._tag === "Failure" ? (wideValues.cause as any).reasons?.find((r: any) => r._tag === "Fail")?.error : undefined;
  size.over4MiB = { refused: err2?.reason, facts: err2?.facts, bytes: err2?.bytes, limitBytes: err2?.limitBytes };
  assert(err2 instanceof datomic.SaveRequestTooLarge && err2.facts === 900 && err2.bytes > 4 * 1024 * 1024);
  const offSubject = `task/size-off-${run}`;
  await off.transact([{ op: "assert", entityId: offSubject, attribute: ":task/x", value: str("x") }], { commandId: `off-seed-${run}` });
  const offBig = await off.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(range(900).map((i) => ({
    op: "assert", entityId: offSubject, attribute: `:task/wide${i}`, value: str(value("wide", i, 5000)) })), { commandId: `off-wide-${run}` })));
  const err3 = offBig._tag === "Failure" ? (offBig.cause as any).reasons?.find((r: any) => r._tag === "Fail")?.error : undefined;
  size.defaultOver4MiB = { tag: err3?._tag, cause: err3?.cause?.code, message: err3?.cause?.message };
  assert(err3?.cause?.code === "InvalidValue" && err3?.cause?.message === "Request too large" && !(err3 instanceof datomic.SaveRequestTooLarge));
  size.routes = Object.fromEntries(on.client.saveRoutes);
}

// The control: every committed request, in commit order, sent unchanged (without the subject gateway's snapshot handle)
// to a database whose per-subject writer is off.
const committed = on.wire.filter((w) => w.ack).sort((a, b) => Number(a.ack!.position.v) - Number(b.ack!.position.v));
const receipts = { compared: 0, differ: [] as string[] };
for (const w of committed) {
  const { handle: _h, release: _r, ...input } = w.input;
  const ack: any = await control.client.transact(control.db, input);
  receipts.compared++;
  const mine = [w.ack!.position.v, w.ack!.recordedAt.v, w.ack!.datoms], theirs = [ack.position.v, ack.recordedAt.v, ack.datoms];
  if (JSON.stringify(mine) !== JSON.stringify(theirs) || ack.subjectSave) receipts.differ.push(`${input.operationId}: ${JSON.stringify(mine)} vs ${JSON.stringify(theirs)} ${ack.subjectSave ?? ""}`);
}

// Every read route, on both databases.
const canonical = (v: unknown): string => JSON.stringify(v, (_k, x) =>
  x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x);
const subjects = [...live.keys()].sort();
const ids = [...new Set(committed.flatMap((w) => w.input.newIds as string[]))].sort();
const head = Number(committed.at(-1)!.ack!.position.v);
const FUTURE = Date.now() + 365 * DAY;
const validTimes = [T0 + DAY / 2, T0 + 2 * DAY, FUTURE];
// Pinned reads: each committed save's own entities just before and at its position, at three valid times.
const pins = committed.map((w) => ({
  p: Number(w.ack!.position.v),
  entities: [...new Set((w.input.rows as any[]).filter((r) => r.entity_type !== "_Transaction").map((r) => r.entity_id as string))].sort(),
}));
async function routes(store: ProductStore) {
  const T = (f: (s: any) => any) => store.run(Effect.flatMap(core.Triples, f));
  const out: Record<string, string[]> = { current: [], currentPast: [], pinned: [], history: [], byId: [], byIdHistory: [], reach: [], feed: [], byCommand: [], entityJournal: [] };
  for (const s of subjects) {
    out.current!.push(canonical(await T((x) => x.entity(s, { validAt: FUTURE }))));
    out.currentPast!.push(canonical(await T((x) => x.entity(s, { validAt: T0 + DAY / 2 }))));
    out.history!.push(canonical(await T((x) => x.history(s))));
    out.reach!.push(canonical(await T((x) => x.reach(s, { validAt: FUTURE }))));
    out.entityJournal!.push(canonical(await T((x) => x.transactionsForEntity(s, { limit: 100 }))));
  }
  for (const { p, entities } of pins)
    for (const recordedPosition of [p - 1, p])
      for (const validAt of validTimes)
        out.pinned!.push(canonical(await store.client.rows(store.db, { entityIds: entities, basis: { recordedPosition, validAt } })));
  for (let i = 0; i < ids.length; i += 32) {
    const batch = ids.slice(i, i + 32);
    out.byId!.push(...(await Promise.all(batch.map(async (id) => canonical(await T((x) => x.get(id)))))));
    out.byIdHistory!.push(...(await Promise.all(batch.map(async (id) => canonical(await store.client.rows(store.db, { id, history: true }))))));
  }
  for (let after = 0; ;) {
    const page = await T((x) => x.transactions({ after, limit: 1000 }));
    out.feed!.push(...page.transactions.map(canonical));
    if (page.next === undefined || page.transactions.length === 0) break;
    after = page.next;
  }
  for (const c of commands) out.byCommand!.push(canonical(await T((x) => x.transactionByCommand(c))));
  return out;
}
const mine = await routes(on), theirs = await routes(control);
const comparison = Object.fromEntries(Object.keys(mine).map((k) => {
  const a = mine[k]!, b = theirs[k]!;
  const digest = (xs: string[]) => createHash("sha256").update(xs.join("\n")).digest("hex");
  return [k, { answers: a.length, bytes: a.reduce((n, x) => n + x.length, 0), equal: digest(a) === digest(b), differing: a.filter((x, i) => x !== b[i]).length }];
}));

const qualify = (c: Case) => c.writer === "per-subject";
const summary = {
  run, wide, timings: "diagnostic",
  matrix: cases.filter((c) => c.group === "matrix"),
  product: cases.filter((c) => c.group === "product"),
  productQualifying: `${cases.filter((c) => c.group === "product" && qualify(c)).length} of ${product.length}`,
  productAsExpected: cases.filter((c) => c.group === "product").every((c) => qualify(c) === (wide ? c.expectQualifies : c.expectQualifies && c.assertions <= 3 && c.retirements === c.assertions)),
  seeds: cases.filter((c) => c.group === "seed").length,
  race, lost, size, receipts, comparison, subjects: subjects.length, ids: ids.length, head,
};
writeFileSync(outFile, JSON.stringify(summary, null, 2));
const ok = receipts.differ.length === 0 && Object.values(comparison).every((c: any) => c.equal);
console.log("DX-S2_GATE " + JSON.stringify({ run, wide, ok, productQualifying: summary.productQualifying, receipts: receipts.compared, routes: Object.fromEntries(Object.entries(comparison).map(([k, v]: any) => [k, `${v.answers}${v.equal ? "" : " DIFFER " + v.differing}`])) }));
await Promise.all([on.close(), off.close(), control.close()]);
process.exit(ok ? 0 : 1);
