// [DX-S3] Several-owners gate (Mac toy, correctness; times are diagnostic). Every save goes through TriplesLive and the
// Datomic adapter with `orderedSaves`, `saveSizeRule` and `severalOwners` on, to a gateway with the per-subject writer
// (wide, and TX2_SUBJECT_SEVERAL_OWNERS as the gateway was started). Each committed request is then sent unchanged to
// a control gateway whose per-subject writer is off (every save takes the general writer), and every read route is
// compared between the two databases, as s2/gate.ts does for one owner.
//   node --experimental-transform-types s3/gate.ts <subject url> <control url> <several 0|1> <out.json>
// Parts: (b) the matrix (1 to 4 owners; first writes, replacements, retirements, past-dated corrections, mixed; up to
// and over the 128-fact bound) and the product's save shapes at 1 to 4 owners, with every refusal and its reason;
// (c) two saves at once sharing one owner; (d) a lost reply and a resend of a two-owner save; then the control.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { core, Effect, openProduct, type ProductStore } from "../s2/product.ts";

const [subjectUrl, controlUrl, severalArg, outFile] = process.argv.slice(2);
assert(subjectUrl && controlUrl && (severalArg === "0" || severalArg === "1") && outFile,
  "usage: gate.ts <subject> <control> <several 0|1> <out>");
const several = severalArg === "1";
const run = randomUUID().slice(0, 8);
let lostCommand: string | undefined;
const on = await openProduct(subjectUrl, `s3-gate-${run}`, { orderedSaves: true, saveSizeRule: true, severalOwners: true },
  (input) => lostCommand !== undefined && input.claims?.[0]?.commandId === lostCommand);
const control = await openProduct(controlUrl, `s3-control-${run}`, {});

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const value = (label: string, i: number, width = 57) =>
  createHash("sha256").update(`${label}/${i}`).digest("hex").repeat(Math.ceil(width / 64)).slice(0, width);
const str = (v: string) => ({ type: "string", value: v });
type Live = { id: string; attribute: string; value: string; validFrom: number; validTo: number | null };
const live = new Map<string, Map<string, Live[]>>(); // owner -> attribute -> live rows

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
const rowsOf = (owner: string, attribute: string) => live.get(owner)?.get(attribute) ?? [];

type Case = {
  label: string; group: string; owners: number; kind?: string; facts: number; assertions: number; retirements: number;
  writer: "per-subject" | "general"; subjectOwners?: number; declined?: string; hints: boolean; block: string; routes: string;
  expect?: string; asExpected?: boolean; ms: number;
};
const cases: Case[] = [];
const commands: string[] = [];

async function save(group: string, label: string, ops: any[], meta: Record<string, unknown> = {}, expect?: string) {
  const commandId = `${label}-${run}`;
  const before = on.wire.length;
  const routesBefore = new Map(on.client.saveRoutes as Map<string, number>);
  const started = performance.now();
  const retracted = ops.filter((o) => o.op === "retract").map((o) => o.id);
  const result = await on.transact(ops, { commandId, ...meta });
  remember(result, retracted);
  commands.push(commandId);
  const last = on.wire.slice(before).filter((w) => w.ack).at(-1)!;
  const routes = [...(on.client.saveRoutes as Map<string, number>)].filter(([k, n]) => n !== (routesBefore.get(k) ?? 0)).map(([k]) => k);
  // Owners written: every entity with a business row in the request (asserted or retired).
  const owners = new Set((last.input.rows as any[]).filter((r) => r.entity_type !== "_Transaction").map((r) => r.entity_id)).size;
  const writer = last.ack?.subjectSave ? "per-subject" : "general";
  const c: Case = {
    label, group, owners,
    facts: Math.max(ops.filter((o) => o.op === "assert").length, retracted.length),
    assertions: ops.filter((o) => o.op === "assert").length, retirements: retracted.length,
    writer, subjectOwners: last.ack?.subjectOwners, declined: last.ack?.subjectDeclined, hints: last.ack?.subjectHintsAttached === true,
    block: routes.includes("ordered:wide") ? "wide" : routes.includes("ordered:one-byte") ? "one-byte" : "runtime",
    routes: routes.join(","), ms: Math.round((performance.now() - started) * 100) / 100,
  };
  if (expect !== undefined) {
    c.expect = expect;
    // "per-subject", "general:<gateway reason>" or "runtime:<SDK reason>" (the SDK gave no block).
    c.asExpected = expect === "per-subject" ? writer === "per-subject"
      : expect.startsWith("general:") ? writer === "general" && (c.declined ?? "-") === expect.slice(8)
      : writer === "general" && routes.includes(expect);
  }
  cases.push(c);
  return { result, c };
}

// Owners are created by a first save (the general writer: an owner that does not exist yet is never per-subject).
async function seed(owner: string, n: number, from = T0) {
  const ops = Array.from({ length: Math.max(1, n) }, (_, i) => ({
    op: "assert", entityId: owner, attribute: `:x/f${i}`, value: str(value(owner, i)), validFrom: from, entityType: "Task",
  }));
  await save("seed", `seed-${owner}`, ops);
}
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const spread = (owners: readonly string[], total: number) => owners.map((o, k) => ({ o, n: Math.floor(total / owners.length) + Number(k < total % owners.length) }));
const replaceOps = (owner: string, fields: number[], tag: string) => fields.flatMap((i) => [
  ...rowsOf(owner, `:x/f${i}`).map((r) => ({ op: "retract", id: r.id })),
  { op: "assert", entityId: owner, attribute: `:x/f${i}`, value: str(value(`${owner}/${tag}`, i)), validFrom: T0, entityType: "Task" },
]);
const firstOps = (owner: string, n: number, tag: string) => range(n).map((i) => ({
  op: "assert", entityId: owner, attribute: `:x/new-${tag}-${i}`, value: str(value(`${owner}/${tag}`, i)), entityType: "Task",
}));
const retireOps = (owner: string, fields: number[]) => fields.flatMap((i) => rowsOf(owner, `:x/f${i}`).map((r) => ({ op: "retract", id: r.id })));
// The console's and the playground's form: retire the current value, keep it true until `at` as a bounded row, assert
// the new value from `at` (a past-dated correction when `at` is in the past).
const boundedOps = (owner: string, fields: number[], tag: string, at: number) => fields.flatMap((i) => [
  ...rowsOf(owner, `:x/f${i}`).flatMap((r) => [
    { op: "retract", id: r.id },
    ...(r.validFrom < at ? [{ op: "assert", entityId: owner, attribute: r.attribute, value: str(r.value), validFrom: r.validFrom, validTo: at, entityType: "Task" }] : []),
  ]),
  { op: "assert", entityId: owner, attribute: `:x/f${i}`, value: str(value(`${owner}/${tag}`, i)), validFrom: at, entityType: "Task" },
]);

// (b) The matrix. Totals are facts asserted across all owners (a correction asserts two rows per field).
const kinds = ["first", "replace", "retire", "correct", "mixed"] as const;
// The SDK always runs with severalOwners on here; `several` is the gateway's option. A save over the per-subject bound
// keeps the runtime's IDs; a save of two to four owners gets a block and, with the gateway's option off, the general
// writer without a reason ("general:-").
const expectFor = (n: number, ops: any[]) => {
  const asserted = ops.filter((o) => o.op === "assert").length, retired = ops.filter((o) => o.op === "retract").length;
  if (asserted > 128 || retired > 128) return "runtime:over-subject-bound";
  return n === 1 || several ? "per-subject" : "general:-";
};
for (const n of [1, 2, 3, 4]) {
  for (const kind of kinds) {
    for (const total of [n, 20, 64, 128, 129]) {
      if (total < n) continue;
      const owners = range(n).map((k) => `${k === 0 ? "task" : "profile"}/${kind}-${n}-${total}-${k}-${run}`);
      const parts = spread(owners, total);
      if (kind !== "first") for (const { o, n: m } of parts) await seed(o, m);
      else for (const o of owners) await seed(o, 1);
      const ops = parts.flatMap(({ o, n: m }) => {
        if (kind === "first") return firstOps(o, m, "n");
        if (kind === "replace") return replaceOps(o, range(m), "r");
        if (kind === "retire") return retireOps(o, range(m));
        if (kind === "correct") return boundedOps(o, range(m), "c", T0 + DAY);
        // mixed: two fifths first writes, the rest of the seeded fields half replaced and half retired
        const fresh = Math.floor(m * 2 / 5), rest = m - fresh, rep = Math.ceil(rest / 2);
        return [...firstOps(o, fresh, "m"), ...replaceOps(o, range(rep), "m"), ...retireOps(o, range(rest).slice(rep))];
      });
      const c = (await save("matrix", `${kind}-${n}-${total}`, ops, {}, expectFor(n, ops))).c;
      c.kind = kind;
    }
  }
}

// The product's save shapes (v01/SAVE-SHAPE.md section 2; s2/PRODUCT-SAVES.md section 3), at 1 to 4 owners.
{
  const answers = range(20).map((i) => `:task/answer-${i}`);
  const formFields = [...answers, ":task/progress", ":task/status", ":task/audit-ip", ":task/audit-agent", ":task/audit-by"];
  const write = (owner: string, fields: string[], tag: string, at?: number) => fields.flatMap((a, i) => [
    ...rowsOf(owner, a).flatMap((r) => [
      { op: "retract", id: r.id },
      ...(at !== undefined && r.validFrom < at ? [{ op: "assert", entityId: owner, attribute: a, value: str(r.value), validFrom: r.validFrom, validTo: at, entityType: "Task" }] : []),
    ]),
    { op: "assert", entityId: owner, attribute: a, value: str(value(`${owner}/${tag}`, i)), ...(at === undefined ? { validFrom: T0 } : { validFrom: at }), entityType: "Task" },
  ]);
  const P = (label: string, expect: string, ops: any[], meta: Record<string, unknown> = {}) => save("product", label, ops, meta, expect);
  const S = several ? "per-subject" : "general:-";
  const form = `task/form-${run}`, profile = `profile/form-${run}`, other = `task/other-${run}`, doc = `document/form-${run}`;
  await seed(form, 1); await seed(profile, 3); await seed(other, 3); await seed(doc, 2);
  await save("seed", `seed-form-${run}`, write(form, formFields, "s0"));
  await P("form page submit, 20 rows (task only, plain replacement)", "per-subject", write(form, formFields, "s1"));
  await P("form page submit, kept true until now (task only)", "per-subject", write(form, formFields, "s2", Date.now()));
  await P("form page with two profile fields (task and profile, 2 owners)", S,
    [...write(form, formFields, "s3"), ...write(profile, [":employee/first-name", ":employee/last-name"], "p3")]);
  await P("form page with profile fields, kept true until now (2 owners)", S,
    [...write(form, formFields, "s4", Date.now()), ...write(profile, [":employee/first-name", ":employee/last-name"], "p4", Date.now())]);
  await P("form page with profile fields and a writeback to the subject's other form (3 owners)", S,
    [...write(form, formFields, "s5"), ...write(profile, [":employee/first-name"], "p5"), ...write(other, [":task/work-eligibility"], "o5")]);
  await P("form page with profile, other form and the signed document's fields (4 owners)", S,
    [...write(form, formFields, "s6"), ...write(profile, [":employee/first-name"], "p6"), ...write(other, [":task/work-eligibility"], "o6"),
     ...write(doc, [":document/signed-at", ":document/file-name"], "d6")]);
  await P("correction of a past value on the task and the profile (2 owners)", S,
    [...write(form, [":task/answer-0"], "fix", T0 + DAY), ...write(profile, [":employee/first-name"], "fix", T0 + DAY)]);
  await P("retirement of a profile field with a task replacement (2 owners)", S,
    [...write(form, [":task/answer-1"], "s7"), ...rowsOf(profile, ":employee/last-name").map((r) => ({ op: "retract", id: r.id }))]);
  await P("form page guarded by the task's state (EntityState on a written owner, 2 owners)", S,
    write(form, [":task/answer-2"], "g1").concat(write(profile, [":employee/first-name"], "g1")),
    { preconditions: [{ _tag: "EntityState", entityId: form, tripleIds: [...(live.get(form)?.values() ?? [])].flat().map((r) => r.id) }] });
  await P("two owners written, a third read only (EntityState on an owner it does not write)",
    several ? "general:read-only-entity" : "general:-",
    write(form, [":task/answer-3"], "g2").concat(write(profile, [":employee/first-name"], "g2")),
    { preconditions: [{ _tag: "EntityState", entityId: other, tripleIds: [...(live.get(other)?.values() ?? [])].flat().map((r) => r.id) }] });
  const status = `task/status-${run}`;
  await seed(status, 3);
  await save("seed", `seed-status-${run}`, write(status, [":task/status"], "s0"));
  await P("status change (status, completion time, file name, event)", "per-subject",
    [...write(status, [":task/status"], "done"), ...write(status, [":task/completed-at", ":task/file", ":task/event"], "e")]);
  const statusRef = `task/status-ref-${run}`;
  await seed(statusRef, 3);
  await P("status change with the file as a reference to its own entity", "runtime:reference-value",
    [...write(statusRef, [":x/f0"], "done"), { op: "assert", entityId: statusRef, attribute: ":task/file", value: { type: "ref", value: `file/${run}` } }]);
  const check = `task/check-${run}`;
  await seed(check, 3);
  await save("seed", `seed-check-${run}`, write(check, [":task/check", ":task/progress"], "s0"));
  await P("check result (check field and progress)", "per-subject", write(check, [":task/check", ":task/progress"], "r1"));
  await P("work-eligibility writeback to the subject's other form (one field)", "per-subject", write(other, [":x/f1"], "w1"));
  await P("import row (a new subject's first save, 12 facts)", "general:-",
    range(12).map((i) => ({ op: "assert", entityId: `task/import-${run}`, attribute: `:x/f${i}`, value: str(value("import", i)), entityType: "Task" })));
  await P("form page that creates the subject's profile (an owner that does not exist yet, 2 owners)",
    several ? "general:new-owner" : "general:-",
    [...write(form, [":task/answer-4"], "n1"), { op: "assert", entityId: `profile/new-${run}`, attribute: ":employee/first-name", value: str("new"), entityType: "Profile" }]);
  const corrected = `task/corrected-${run}`;
  await seed(corrected, 3);
  await P("correction of a past value (one field, from a past date)", "per-subject", boundedOps(corrected, [0], "fix", T0 + DAY));
  await P("bulk action (a batch and five items: six new entities)", "runtime:over-owner-bound", [
    { op: "assert", entityId: `batch/${run}`, attribute: ":batch/form", value: str("form-1") },
    ...range(5).map((i) => ({ op: "assert", entityId: `batch/${run}/item-${i}`, attribute: ":item/subject", value: str(`subject-${i}`) })),
  ]);
  await P("progress copied from one subject to another (reference to the source)", "runtime:reference-value", [
    { op: "assert", entityId: `task/copy-${run}`, attribute: ":task/progress", value: str("copied") },
    { op: "assert", entityId: `task/copy-${run}`, attribute: ":task/copied-from", value: { type: "ref", value: form } },
  ]);
  const a1 = `acct/a1/task-${run}`, a1p = `acct/a1/profile-${run}`, a2p = `acct/a2/profile-${run}`;
  await seed(a1, 2); await seed(a1p, 2); await seed(a2p, 2);
  await P("task and profile of one account (acct/a1)", S, [...write(a1, [":x/f0"], "a"), ...write(a1p, [":x/f0"], "a")]);
  await P("task of one account and a profile of another", "runtime:several-accounts",
    [...write(a1, [":x/f1"], "b"), ...write(a2p, [":x/f1"], "b")]);
  const five = range(5).map((k) => `profile/five-${k}-${run}`);
  for (const o of five) await seed(o, 1);
  await P("five existing owners", "runtime:over-owner-bound", five.flatMap((o) => write(o, [":x/f0"], "five")));
}

// (c) Two saves at once sharing ONE owner (the profile): each also writes its own task. The second to reach the
// serial point is refused whole and replayed by the SDK; its other owner must never be written by the refused attempt.
const shared = `profile/race-${run}`, taskA = `task/race-a-${run}`, taskB = `task/race-b-${run}`;
await seed(shared, 4); await seed(taskA, 2); await seed(taskB, 2);
const conflictsBefore = on.client.commitDiagnostics.conflicts, replaysBefore = on.client.commitDiagnostics.replays;
const raceWire = on.wire.length;
const [r1, r2] = await Promise.all([
  save("race", "race-1", [...replaceOps(shared, [0], "x"), ...replaceOps(taskA, [0, 1], "x")]),
  save("race", "race-2", [...replaceOps(shared, [1], "y"), ...replaceOps(taskB, [0, 1], "y")]),
]);
const raceAttempts = on.wire.slice(raceWire);
const refused = raceAttempts.filter((w) => w.error);
const race = {
  attempts: raceAttempts.length, refused: refused.map((w) => w.error?.code), committed: raceAttempts.filter((w) => w.ack).length,
  conflicts: on.client.commitDiagnostics.conflicts - conflictsBefore, replays: on.client.commitDiagnostics.replays - replaysBefore,
  writers: raceAttempts.filter((w) => w.ack).map((w) => (w.ack?.subjectSave ? "per-subject" : "general")),
  refusedIdsChecked: 0, refusedIdsWritten: 0,
  refusedTokens: refused.map((w) => w.input.claims?.[0]?.txId), replayTokens: [r1, r2].map((r) => r.result.txId),
};
assert.equal(race.committed, 2, "both saves must commit, one after a replay");
assert(race.refused.length >= 1 && race.refused.every((c) => c === "CasConflict"), "the second save must be refused whole: " + JSON.stringify(race));
assert(race.replays >= 1, "the SDK must replay the refused save");
for (const w of refused) for (const id of w.input.newIds) {
  race.refusedIdsChecked++;
  const rows = await on.client.rows(on.db, { id, history: true });
  if (rows.length) race.refusedIdsWritten++;
}
assert.equal(race.refusedIdsWritten, 0, "a refused attempt's identities (every owner's) must never be written");
for (const w of refused) assert(!race.replayTokens.includes(w.input.claims[0].txId), "a replay must take a new block");
const nowValues = async (owner: string, a: string) =>
  (await on.run(Effect.flatMap(core.Triples, (s: any) => s.entity(owner)))).filter((t: any) => t.attribute === a).map((t: any) => t.value.value);
assert.deepEqual(await nowValues(shared, ":x/f0"), [value(`${shared}/x`, 0)]);
assert.deepEqual(await nowValues(shared, ":x/f1"), [value(`${shared}/y`, 1)]);
for (const [t, tag] of [[taskA, "x"], [taskB, "y"]] as const)
  for (const i of [0, 1]) assert.deepEqual(await nowValues(t, `:x/f${i}`), [value(`${t}/${tag}`, i)], "each task holds one value per field");

// (d) A lost reply on a two-owner save: the gateway commits, the answer is dropped; the SDK resolves the receipt by
// operation and sends nothing again. A resend with the same command ID writes nothing and names the original.
const lostTask = `task/lost-${run}`, lostProfile = `profile/lost-${run}`;
await seed(lostTask, 3); await seed(lostProfile, 2);
lostCommand = `lost-${run}`;
const lostWire = on.wire.length;
const lostResult = await on.transact([...replaceOps(lostTask, [0, 1], "l"), ...replaceOps(lostProfile, [0], "l")], { commandId: lostCommand });
remember(lostResult, []);
commands.push(lostCommand);
const lostSent = on.wire.slice(lostWire);
const feedCount = async () => {
  let n = 0;
  for (let after = 0; ;) {
    const page = await on.run(Effect.flatMap(core.Triples, (s: any) => s.transactions({ after, limit: 1000 })));
    n += page.transactions.length;
    if (page.next === undefined || page.transactions.length === 0) return n;
    after = page.next;
  }
};
const feedBefore = await feedCount();
const resend = await on.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(replaceOps(lostTask, [0], "again"), { commandId: lostCommand })));
const resendError = resend._tag === "Failure" ? JSON.stringify(resend.cause) : "";
const original = await on.run(Effect.flatMap(core.Triples, (s: any) => s.transactionByCommand(lostCommand)));
const feedAfter = await feedCount();
const lost = {
  wireRequests: lostSent.length, ackAtGateway: Boolean(lostSent[0]?.ack), receiptPosition: lostResult.position,
  receiptTx: lostResult.txId, resendRefused: resend._tag === "Failure" && resendError.includes("CommandAlreadyCommittedError") && resendError.includes(lostResult.txId),
  originalByCommand: original?.txId === lostResult.txId && original?.position === lostResult.position,
  writer: lostSent[0]?.ack?.subjectSave ? "per-subject" : "general", subjectOwners: lostSent[0]?.ack?.subjectOwners, feedBefore, feedAfter,
};
assert.equal(lost.wireRequests, 1, "a lost reply must not send the save again");
assert(lost.ackAtGateway && lost.resendRefused && lost.originalByCommand && feedBefore === feedAfter, "lost reply: " + JSON.stringify(lost));
lostCommand = undefined;

// The control: every committed request, in commit order, sent unchanged to a database whose per-subject writer is off.
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
const owners = [...live.keys()].sort();
const ids = [...new Set(committed.flatMap((w) => w.input.newIds as string[]))].sort();
const FUTURE = Date.now() + 365 * DAY;
const validTimes = [T0 + DAY / 2, T0 + 2 * DAY, FUTURE];
const pins = committed.map((w) => ({
  p: Number(w.ack!.position.v),
  entities: [...new Set((w.input.rows as any[]).filter((r) => r.entity_type !== "_Transaction").map((r) => r.entity_id as string))].sort(),
}));
async function routes(store: ProductStore) {
  const T = (f: (s: any) => any) => store.run(Effect.flatMap(core.Triples, f));
  const out: Record<string, string[]> = { current: [], currentPast: [], pinned: [], history: [], byId: [], byIdHistory: [], reach: [], feed: [], byCommand: [], entityJournal: [] };
  for (const s of owners) {
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

const judged = cases.filter((c) => c.expect !== undefined);
const byOwners = (group: string) => Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => {
  const xs = cases.filter((c) => c.group === group && c.owners === n);
  return [n, `${xs.filter((c) => c.writer === "per-subject").length} of ${xs.length} per-subject`];
}).filter(([, v]) => !String(v).endsWith(" of 0 per-subject")));
const summary = {
  run, several, timings: "diagnostic",
  matrix: cases.filter((c) => c.group === "matrix"), product: cases.filter((c) => c.group === "product"),
  matrixByOwners: byOwners("matrix"), productByOwners: byOwners("product"),
  judged: judged.length, unexpected: judged.filter((c) => !c.asExpected).map((c) => `${c.label}: expected ${c.expect}, got ${c.writer} ${c.declined ?? ""} ${c.routes}`),
  seeds: cases.filter((c) => c.group === "seed").length, routes: Object.fromEntries(on.client.saveRoutes),
  // With the gateway's TX2_SUBJECT_HINTS=1: per-subject saves that carried hints (every owner's reads named).
  hinted: `${cases.filter((c) => c.writer === "per-subject" && c.hints).length} of ${cases.filter((c) => c.writer === "per-subject").length}`,
  race, lost, receipts, comparison, owners: owners.length, ids: ids.length,
};
writeFileSync(outFile, JSON.stringify(summary, null, 2));
const ok = receipts.differ.length === 0 && Object.values(comparison).every((c: any) => c.equal) && summary.unexpected.length === 0;
console.log("DX-S3_GATE " + JSON.stringify({
  run, several, ok, judged: judged.length, hinted: summary.hinted, unexpected: summary.unexpected.length, matrix: summary.matrixByOwners, product: summary.productByOwners,
  receipts: receipts.compared, routes: Object.fromEntries(Object.entries(comparison).map(([k, v]: any) => [k, `${v.answers}${v.equal ? "" : " DIFFER " + v.differing}`])),
}));
for (const u of summary.unexpected) console.log("DX-S3_UNEXPECTED " + u);
await Promise.all([on.close(), control.close()]);
process.exit(ok ? 0 : 1);
