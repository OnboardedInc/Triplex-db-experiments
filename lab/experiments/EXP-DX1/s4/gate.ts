// [DX-S4] Creation-saves gate (Mac toy, correctness; times are diagnostic). Every save goes through TriplesLive and the
// Datomic adapter, with the SDK options of the arm, to a gateway with the per-subject writer (wide, several owners, and
// TX2_SUBJECT_CREATE as the gateway was started). Each committed request is then sent unchanged to a control gateway
// whose per-subject writer is off (every save takes the general writer), every read route is compared between the two
// databases (as s3/gate.ts does), and the same requests go to a third, profiling general writer that counts each
// commit's history lookups.
//   node --experimental-transform-types s4/gate.ts <subject url> <control url> <profile url> <arm> <out.json>
// arm: "before" (the SDK as the several-owners builder left it: orderedSaves, saveSizeRule, severalOwners; gateway
// creation option off), "after" (plus creationSaves; gateway option on), "sdk-only" (creationSaves on, gateway off).
// Parts: (a) every real kind of save (s4/CREATION-SAVES.md section 1), with its writer, typed reason and counted work;
// (c) two creations of one new ID at once; (d) a lost reply and a resend of a creation; then the control.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { core, Effect, openProduct, type ProductStore } from "../s2/product.ts";

const [subjectUrl, controlUrl, profileUrl, arm, outFile] = process.argv.slice(2);
assert(subjectUrl && controlUrl && profileUrl && ["before", "after", "sdk-only"].includes(arm!) && outFile,
  "usage: gate.ts <subject> <control> <profile> <before|after|sdk-only> <out>");
const creationSaves = arm !== "before";
const gatewayCreates = arm === "after";
const run = randomUUID().slice(0, 8);
let lostCommand: string | undefined;
const on = await openProduct(subjectUrl, `s4-gate-${run}`,
  { orderedSaves: true, saveSizeRule: true, severalOwners: true, ...(creationSaves ? { creationSaves: true } : {}) },
  (input) => lostCommand !== undefined && input.claims?.[0]?.commandId === lostCommand);
const control = await openProduct(controlUrl, `s4-control-${run}`, {});
const profile = await openProduct(profileUrl, `s4-profile-${run}`, {});

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const value = (label: string, i: number, width = 57) =>
  createHash("sha256").update(`${label}/${i}`).digest("hex").repeat(Math.ceil(width / 64)).slice(0, width);
const str = (v: string) => ({ type: "string", value: v });
const ref = (id: string) => ({ type: "ref", value: id });
type Live = { id: string; attribute: string; value: string; validFrom: number };
const live = new Map<string, Map<string, Live[]>>();
function remember(result: any, retracted: readonly string[]) {
  const gone = new Set(retracted);
  for (const rows of live.values()) for (const [a, list] of rows) rows.set(a, list.filter((r) => !gone.has(r.id)));
  for (const t of result.triples) {
    const rows = live.get(t.entityId) ?? new Map<string, Live[]>();
    live.set(t.entityId, rows);
    rows.set(t.attribute, [...(rows.get(t.attribute) ?? []), { id: t.id, attribute: t.attribute, value: t.value.value, validFrom: t.validFrom }]);
  }
}
const rowsOf = (owner: string, attribute: string) => live.get(owner)?.get(attribute) ?? [];

type Case = {
  label: string; kind: string; group: string; owners: number; created: number; facts: number; retirements: number; refs: number;
  writer: "per-subject" | "general"; fn?: string; declined?: string; routes: string; expect?: string; asExpected?: boolean;
  datoms: number; requestBytes: number; newIds: number; bounds: boolean; ms: number;
};
const cases: Case[] = [];
const commands: string[] = [];
const committedIds = new Set<string>();

async function save(group: string, kind: string, label: string, ops: any[], expect?: string) {
  const commandId = `${label}-${run}`;
  const before = on.wire.length;
  const routesBefore = new Map(on.client.saveRoutes as Map<string, number>);
  const started = performance.now();
  const retracted = ops.filter((o) => o.op === "retract").map((o) => o.id);
  const owners = new Set(ops.filter((o) => o.op === "assert").map((o) => o.entityId));
  const created = [...owners].filter((o) => !live.has(o)).length;
  const result = await on.transact(ops, { commandId });
  remember(result, retracted);
  commands.push(commandId);
  const last = on.wire.slice(before).filter((w) => w.ack).at(-1)!;
  for (const id of last.input.newIds) committedIds.add(id);
  const routes = [...(on.client.saveRoutes as Map<string, number>)].filter(([k, n]) => n !== (routesBefore.get(k) ?? 0)).map(([k]) => k);
  const writer = last.ack?.subjectSave ? "per-subject" : "general";
  const c: Case = {
    label, kind, group, owners: owners.size, created,
    facts: ops.filter((o) => o.op === "assert").length, retirements: retracted.length,
    refs: ops.filter((o) => o.op === "assert" && o.value.type === "ref").length,
    writer, fn: last.ack?.subjectSave, declined: last.ack?.subjectDeclined,
    routes: routes.join(","), datoms: last.ack?.datoms, requestBytes: Buffer.byteLength(JSON.stringify(last.input)),
    newIds: last.input.newIds.length, bounds: last.input.declareIdentityBounds === true || Array.isArray(last.input.historyIdentityBounds),
    ms: Math.round((performance.now() - started) * 100) / 100,
  };
  // A save a per-subject function took carries no refusal reason.
  assert(!(c.writer === "per-subject" && c.declined), `${label}: per-subject with a refusal reason ${c.declined}`);
  if (expect !== undefined) {
    c.expect = expect;
    c.asExpected = expect === "per-subject" ? writer === "per-subject"
      : expect.startsWith("general:") ? writer === "general" && (c.declined ?? "-") === expect.slice(8)
      : writer === "general" && routes.includes(expect);
  }
  cases.push(c);
  return { result, c };
}
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const asserts = (owner: string, fields: readonly [string, any][]) =>
  fields.map(([a, v]) => ({ op: "assert", entityId: owner, attribute: a, value: v, validFrom: T0 }));
const replace = (owner: string, fields: readonly string[], tag: string) => fields.flatMap((a, i) => [
  ...rowsOf(owner, a).map((r) => ({ op: "retract", id: r.id })),
  { op: "assert", entityId: owner, attribute: a, value: str(value(`${owner}/${tag}`, i)), validFrom: T0 },
]);

// Expected writer per arm: creations and reference saves take the creation function only with both halves on; before,
// the SDK names its reason (references) or the gateway refuses the new owner; with the SDK alone, the general writer
// with a block and declared bounds and no gateway reason.
const C = (beforeReason: string, sdkOnly = "general:-") => gatewayCreates ? "per-subject" : creationSaves ? sdkOnly : beforeReason;
const A = "acct/a1";
const subjects = range(4).map((k) => `${A}/subject/${run}-${k}`);
const profileFields = ["first-name", "last-name", "email", "phone", "birth-date", "address-1", "address-2", "city",
  "region", "postal-code", "country", "external-id"].map((f) => `:subject/${f}`);
const subjectFacts = (s: string, tag: string) => asserts(s, profileFields.map((a, i) => [a, str(value(`${s}/${tag}`, i))]));
const enrolmentFacts = (e: string, s: string, tag: string) => asserts(e, [
  [":enrolment/subject", ref(s)], [":enrolment/client", ref(`${A}/client/7`)], [":enrolment/job-type", ref(`${A}/job-type/3`)],
  [":enrolment/status", str("active")], [":enrolment/start-date", str(value(`${e}/${tag}`, 0, 10))],
  [":enrolment/external-id", str(value(`${e}/${tag}`, 1, 24))],
]);
const plainEnrolment = (e: string, s: string, tag: string) => enrolmentFacts(e, s, tag)
  .map((o) => o.value.type === "ref" ? { ...o, value: str(o.value.value) } : o);
const taskFacts = (t: string, e: string, tag: string) => asserts(t, [
  [":task/form", ref(`${A}/form/w4`)], [":task/enrolment", ref(e)], [":task/status", str("pending")],
  [":task/due", str(value(`${t}/${tag}`, 0, 10))], [":task/created-by", str("api")],
]);

// The real kinds of save, in the order the product makes them for one subject. Two instances of each where it matters.
for (const [k, s] of subjects.entries()) {
  // A new subject with its profile values (about a fifth of real saves): one new owner, 12 facts.
  await save("kind", "new-subject", `new-subject-${k}`, subjectFacts(s, "p0"), C("general:-"));
  // A new enrolment of that (now existing) subject (over half of real saves): one new owner, a reference to the subject.
  const e = `${A}/enrolment/${run}-${k}`;
  await save("kind", "enrolment", `enrolment-${k}`, enrolmentFacts(e, s, "e0"), C("runtime:reference-value"));
  // The same with the subject as a plain ID (no reference value).
  const ep = `${A}/enrolment/${run}-${k}-plain`;
  await save("kind", "enrolment-plain", `enrolment-plain-${k}`, plainEnrolment(ep, s, "e0"), C("general:-"));
  // Attribute writes right after creation (about a tenth): two references and one plain value on the new enrolment.
  await save("kind", "attributes-after-creation", `attributes-${k}`, asserts(e, [
    [":enrolment/cost-centre", ref(`${A}/cost-centre/2`)], [":enrolment/manager", ref(`${A}/manager/5`)], [":enrolment/pay-rate", str("31.50")],
  ]), C("runtime:reference-value"));
  await save("kind", "attributes-after-creation-plain", `attributes-plain-${k}`, asserts(ep, [
    [":enrolment/cost-centre", str("2")], [":enrolment/pay-rate", str("31.50")],
  ]), "per-subject");
  // A new owed form (a task) for the enrolment: one new owner with two references.
  const t = `${A}/task/${run}-${k}`;
  await save("kind", "owed-form", `owed-form-${k}`, taskFacts(t, e, "t0"), C("runtime:reference-value"));
  // A prefill of the new task: ten first writes on an existing owner.
  await save("kind", "prefill", `prefill-${k}`, asserts(t, range(10).map((i) => [`:task/answer-${i}`, str(value(`${t}/pre`, i))])), "per-subject");
  // A form page save: two answers replaced, progress, status and three audit facts, and two page-submission records
  // as facts of the task (one fact each: the page's state).
  await save("kind", "form-page", `form-page-${k}`, [
    ...replace(t, [":task/answer-0", ":task/answer-1"], "f1"),
    ...asserts(t, [[":task/progress", str("40")], [":task/status", str("in-progress")], [":task/audit-ip", str("10.0.0.1")],
      [":task/audit-agent", str("browser")], [":task/audit-by", str("candidate")], [":task/page-1", str("submitted")], [":task/page-2", str("needs-signature")]]),
  ], "per-subject");
  // The same page with two fields mapped to the subject's profile (task and profile, two owners; several owners).
  await save("kind", "form-page-profile", `form-page-profile-${k}`, [
    ...replace(t, [":task/answer-2"], "f2"), ...replace(s, [":subject/first-name", ":subject/phone"], "f2"),
  ], "per-subject");
  // A status change and a check result on the task.
  await save("kind", "status-change", `status-${k}`, [...replace(t, [":task/status"], "done"),
    ...asserts(t, [[":task/completed-at", str("2026-11-24")], [":task/file-name", str("w4.pdf")], [":task/event", str("completed")]])], "per-subject");
  await save("kind", "check-result", `check-${k}`, asserts(t, [[":task/check", str("clear")], [":task/check-provider", str("p")]]), "per-subject");
}
// A new subject, its profile and its first enrolment arriving as one API action: two new owners, one commit.
for (const k of range(2)) {
  const s = `${A}/subject/${run}-both-${k}`, e = `${A}/enrolment/${run}-both-${k}`;
  await save("kind", "new-subject-with-enrolment", `both-${k}`, [...subjectFacts(s, "b"), ...enrolmentFacts(e, s, "b")],
    C("runtime:reference-value", "general:new-owner"));
}
// A large form page: 45 answers and 80 page-submission records (130 facts, over 128): the general writer, with a block
// (creation saves) or the runtime's IDs (before).
{
  const t = `${A}/task/${run}-large`;
  await save("seed", "seed", "large-seed", taskFacts(t, `${A}/enrolment/${run}-0`, "l"));
  await save("kind", "form-page-large", "form-page-large", asserts(t, [
    ...range(45).map((i) => [`:task/answer-${i}`, str(value(`${t}/l`, i))] as [string, any]),
    ...range(80).map((i) => [`:task/page-${i}`, str(i % 8 ? "needs-signature" : "submitted")] as [string, any]),
    [":task/progress", str("90")], [":task/status", str("in-progress")], [":task/audit-ip", str("10.0.0.2")],
    [":task/audit-agent", str("browser")], [":task/audit-by", str("candidate")],
  ]), creationSaves ? "general:-" : "runtime:over-subject-bound");
}
// A bulk action: a batch and five items, six new entities (over the four-owner bound).
await save("kind", "bulk-action", "bulk", [
  ...asserts(`${A}/batch/${run}`, [[":batch/form", ref(`${A}/form/w4`)]]),
  ...range(5).flatMap((i) => asserts(`${A}/batch/${run}/item-${i}`, [[":item/subject", ref(subjects[i % 4]!)]])),
], creationSaves ? "general:over-owner-bound" : "runtime:reference-value");
// Refusals of the creation writer, each with its reason.
await save("kind", "refusal", "five-new-owners-plain", range(5).flatMap((i) => asserts(`${A}/note/${run}-${i}`, [[":note/text", str("n")]])),
  creationSaves ? "general:over-owner-bound" : "runtime:over-owner-bound");
await save("kind", "refusal", "two-accounts", [...asserts(`acct/a2/subject/${run}`, [[":subject/first-name", str("x")]]),
  ...asserts(`${A}/enrolment/${run}-a2`, [[":enrolment/status", str("x")]])], "runtime:several-accounts");

// (c) Two creations of one new ID at once (two commands). The first to reach the serial point creates it; the second
// is refused whole and replayed by the SDK, which then writes onto the entity that now exists, as the general writer does.
const raceId = `${A}/enrolment/${run}-race`;
const raceWire = on.wire.length;
const conflictsBefore = on.client.commitDiagnostics.conflicts, replaysBefore = on.client.commitDiagnostics.replays;
const [r1, r2] = await Promise.all([
  save("race", "race", "race-1", asserts(raceId, [[":enrolment/status", str("one")], [":enrolment/subject", ref(subjects[0]!)]])),
  save("race", "race", "race-2", asserts(raceId, [[":enrolment/status", str("two")], [":enrolment/subject", ref(subjects[1]!)]])),
]);
const raceAttempts = on.wire.slice(raceWire);
const refused = raceAttempts.filter((w) => w.error);
const race = {
  attempts: raceAttempts.length, refused: refused.map((w) => w.error?.code), committed: raceAttempts.filter((w) => w.ack).length,
  conflicts: on.client.commitDiagnostics.conflicts - conflictsBefore, replays: on.client.commitDiagnostics.replays - replaysBefore,
  writers: raceAttempts.filter((w) => w.ack).map((w) => w.ack?.subjectSave ?? "general"),
  created: raceAttempts.filter((w) => w.ack).map((w) => w.ack?.subjectCreated ?? null),
  refusedIdsChecked: 0, refusedIdsWritten: 0, replayTokens: [r1, r2].map((r) => r.result.txId),
};
assert.equal(race.committed, 2, "both saves must commit, one after a replay");
// Before (no block, so the SDK states no source cut): the general writer checks no revision and both creations commit
// onto one entity without a conflict. With a block the save states its source cut, and the second is refused whole.
if (creationSaves)
  assert(race.refused.length >= 1 && race.refused.every((c) => c === "CasConflict"), "the second creation must be refused whole: " + JSON.stringify(race));
else assert.equal(race.refused.length, 0, "before: " + JSON.stringify(race));
for (const w of refused) for (const id of w.input.newIds) {
  race.refusedIdsChecked++;
  if ((await on.client.rows(on.db, { id, history: true })).length) race.refusedIdsWritten++;
}
assert.equal(race.refusedIdsWritten, 0, "a refused creation's identities must never be written");
const raceNow = (await on.run(Effect.flatMap(core.Triples, (s: any) => s.entity(raceId)))).map((t: any) => `${t.attribute}=${t.value.value}`).sort();

// (d) A lost reply on a creation: the gateway commits, the answer is dropped; the SDK resolves the receipt by its
// operation and sends nothing again. A resend with the same command ID writes nothing and names the original.
const lostId = `${A}/subject/${run}-lost`;
lostCommand = `lost-${run}`;
const lostWire = on.wire.length;
const lostOps = [...subjectFacts(lostId, "lost"), ...enrolmentFacts(`${A}/enrolment/${run}-lost`, lostId, "lost")];
const lostResult = await on.transact(lostOps, { commandId: lostCommand });
remember(lostResult, []);
commands.push(lostCommand);
const lostSent = on.wire.slice(lostWire);
for (const id of lostSent[0]?.input.newIds ?? []) committedIds.add(id);
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
const resend = await on.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(subjectFacts(lostId, "again"), { commandId: lostCommand })));
const resendError = resend._tag === "Failure" ? JSON.stringify(resend.cause) : "";
const original = await on.run(Effect.flatMap(core.Triples, (s: any) => s.transactionByCommand(lostCommand)));
const feedAfter = await feedCount();
const lost = {
  wireRequests: lostSent.length, ackAtGateway: Boolean(lostSent[0]?.ack), receiptPosition: lostResult.position,
  resendRefused: resend._tag === "Failure" && resendError.includes("CommandAlreadyCommittedError") && resendError.includes(lostResult.txId),
  originalByCommand: original?.txId === lostResult.txId && original?.position === lostResult.position,
  writer: lostSent[0]?.ack?.subjectSave ?? "general", created: lostSent[0]?.ack?.subjectCreated ?? null, feedBefore, feedAfter,
};
assert.equal(lost.wireRequests, 1, "a lost reply must not send the save again");
assert(lost.ackAtGateway && lost.resendRefused && lost.originalByCommand && feedBefore === feedAfter, "lost reply: " + JSON.stringify(lost));
lostCommand = undefined;

// The control and the profiling writer: every committed request, in commit order, sent unchanged.
const committed = on.wire.filter((w) => w.ack).sort((a, b) => Number(a.ack!.position.v) - Number(b.ack!.position.v));
const receipts = { compared: 0, differ: [] as string[] };
const lookups: Record<string, unknown>[] = [];
for (const w of committed) {
  const { handle: _h, release: _r, ...input } = w.input;
  const ack: any = await control.client.transact(control.db, input);
  receipts.compared++;
  const mine = [w.ack!.position.v, w.ack!.recordedAt.v, w.ack!.datoms], theirs = [ack.position.v, ack.recordedAt.v, ack.datoms];
  if (JSON.stringify(mine) !== JSON.stringify(theirs) || ack.subjectSave) receipts.differ.push(`${input.operationId}: ${JSON.stringify(mine)} vs ${JSON.stringify(theirs)} ${ack.subjectSave ?? ""}`);
  const p: any = await profile.client.transact(profile.db, input);
  const [, singles, , ranges, empty] = p.loadProfile?.tx ?? [];
  lookups.push({ command: input.claims?.[0]?.commandId, newIds: input.newIds.length, perIdSeeks: singles ?? null, rangeProbes: ranges ?? null, emptyRanges: empty ?? null });
}
const byCommand = new Map(lookups.map((l) => [String(l.command).replace(`-${run}`, ""), l]));
for (const c of cases) Object.assign(c, { generalWriterHistory: byCommand.get(c.label) ?? null });

// Every read route, on both databases (s3/gate.ts's routes).
const canonical = (v: unknown): string => JSON.stringify(v, (_k, x) =>
  x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x);
const owners = [...live.keys()].sort();
const ids = [...committedIds].sort();
const FUTURE = Date.now() + 365 * DAY;
const validTimes = [T0 - DAY, T0 + DAY / 2, FUTURE];
const pins = committed.map((w) => ({
  p: Number(w.ack!.position.v),
  entities: [...new Set((w.input.rows as any[]).filter((r) => r.entity_type !== "_Transaction").map((r) => r.entity_id as string))].sort(),
}));
async function routes(store: ProductStore) {
  const T = (f: (s: any) => any) => store.run(Effect.flatMap(core.Triples, f));
  const out: Record<string, string[]> = { current: [], currentPast: [], pinned: [], history: [], byId: [], byIdHistory: [], reach: [], feed: [], byCommand: [], entityJournal: [] };
  for (const s of owners) {
    out.current!.push(canonical(await T((x) => x.entity(s, { validAt: FUTURE }))));
    out.currentPast!.push(canonical(await T((x) => x.entity(s, { validAt: T0 - DAY }))));
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
  return [k, { answers: a.length, equal: digest(a) === digest(b), differing: a.filter((x, i) => x !== b[i]).length }];
}));

const judged = cases.filter((c) => c.expect !== undefined);
const kinds = [...new Set(cases.filter((c) => c.group === "kind").map((c) => c.kind))];
const byKind = Object.fromEntries(kinds.map((k) => {
  const xs = cases.filter((c) => c.group === "kind" && c.kind === k);
  const h = xs.map((c: any) => c.generalWriterHistory?.perIdSeeks).filter((x) => typeof x === "number");
  return [k, { saves: xs.length, perSubject: xs.filter((c) => c.writer === "per-subject").length, fn: [...new Set(xs.map((c) => (c.fn ?? "general").replace(/-[0-9a-f]{24}$/, "")))].join(","),
    reasons: [...new Set(xs.map((c) => c.declined ? `general:${c.declined}` : c.routes))].join(" | "),
    owners: xs[0]!.owners, created: xs[0]!.created, facts: xs[0]!.facts, retired: xs[0]!.retirements, datoms: xs[0]!.datoms,
    requestBytes: xs[0]!.requestBytes, newIds: xs[0]!.newIds, bounds: xs[0]!.bounds,
    generalWriterHistorySeeks: h.length ? Math.max(...h) : null, generalWriterRangeProbes: (xs[0] as any).generalWriterHistory?.rangeProbes ?? null }];
}));
const summary = {
  run, arm, creationSaves, gatewayCreates, timings: "diagnostic", byKind, cases,
  judged: judged.length, unexpected: judged.filter((c) => !c.asExpected).map((c) => `${c.label}: expected ${c.expect}, got ${c.writer} ${c.declined ?? ""} ${c.routes}`),
  routes: Object.fromEntries(on.client.saveRoutes), race, raceNow, lost, receipts, comparison, owners: owners.length, ids: ids.length, lookups,
};
writeFileSync(outFile, JSON.stringify(summary, null, 2));
const ok = receipts.differ.length === 0 && Object.values(comparison).every((c: any) => c.equal) && summary.unexpected.length === 0;
console.log("DX-S4_GATE " + JSON.stringify({
  run, arm, ok, judged: judged.length, unexpected: summary.unexpected.length,
  kinds: Object.fromEntries(Object.entries(byKind).map(([k, v]: any) => [k, `${v.perSubject}/${v.saves} ${v.fn}`])),
  race: { refused: race.refused, writers: race.writers, created: race.created }, lost: { writer: lost.writer, created: lost.created },
  receipts: receipts.compared, routes: Object.fromEntries(Object.entries(comparison).map(([k, v]: any) => [k, `${v.answers}${v.equal ? "" : " DIFFER " + v.differing}`])),
}));
for (const u of summary.unexpected) console.log("DX-S4_UNEXPECTED " + u);
for (const d of receipts.differ.slice(0, 5)) console.log("DX-S4_DIFFER " + d);
await Promise.all([on.close(), control.close(), profile.close()]);
process.exit(ok ? 0 : 1);
