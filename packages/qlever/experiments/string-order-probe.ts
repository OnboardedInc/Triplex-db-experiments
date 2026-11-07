/** Bounded public-SDK semantic extension; no operation without exact admission.
 * The common ASCII policy and language-specific Unicode rules are independently
 * frozen in oracle.json/policy.json. Native order is never normalized to pass.
 */
import assert from "node:assert/strict";
import { readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect, Option } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { Attribute, EntityType, TypeExpr } from "@triplex-build/triplex/config";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeQleverClient, makeQleverNativeQueries, makeQleverRuntime } from "@triplex-build/triplex-qlever";
import { Inventory, basisMatches, canonical, codepoints, exact, membership, phases, rowsOf, safeError, sha } from "../../../qualification/extensions/string-order-v1/probe-support.mjs";

const root = path.resolve(import.meta.dirname, "../../.."), here = path.join(root, "qualification/extensions/string-order-v1");
const arg = process.argv.indexOf("--contract");
assert(arg >= 2, "FROZEN_CONTRACT_REQUIRED");
const contractPath = realpathSync(process.argv[arg + 1]!);
assert(contractPath.startsWith(root + path.sep));
const contractBytes = readFileSync(contractPath), contract = JSON.parse(contractBytes.toString());
assert.equal(contract.mode, "PUBLIC_QLEVER_STRING_EXTENSION_BOTH");
const admissionPath = realpathSync(process.env["TRIPLEX_RESOURCE_ADMISSION"]!);
assert(admissionPath.startsWith(root + "/.devloop/jobs/"));
assert.equal(sha(readFileSync(admissionPath)), process.env["TRIPLEX_RESOURCE_ADMISSION_SHA256"]);
const grant = JSON.parse(readFileSync(admissionPath, "utf8"));
assert.equal(grant.state, "ADMITTED"); assert.equal(grant.jobId, contract.jobId);
assert.equal(grant.resources.memoryBytes, 896 * 1024 ** 2); assert.equal(grant.resources.cpuUnits, 1);
assert.equal(grant.resources.diskBytes, 64 * 1024 ** 2); assert.equal(grant.resources.timeoutMilliseconds, 180000);
const owner = grant.requiredOwnerChecks?.find((entry: any) => entry.ownerId === "foundation-qlever")?.observation;
assert(owner?.running && owner.containerId === contract.containerId && owner.imageSha256 === contract.imageSha256 && owner.memoryBytes === 2 * 1024 ** 3);
const artifacts = realpathSync(process.env["TRIPLEX_RUN_ARTIFACTS"]!);
assert(artifacts.startsWith(root + "/.devloop/jobs/"));
const credential = realpathSync(process.env["QLEVER_ACCESS_TOKEN_FILE"]!);
assert.equal(credential, path.join(root, ".runtime/engines/qlever-main/access-token"));
assert.equal(statSync(credential).mode & 0o777, 0o600); assert.equal(statSync(credential).uid, process.getuid!());
const token = readFileSync(credential, "utf8").trim(); assert(token.length >= 32 && token.length <= 256);
const url = process.env["QLEVER_URL"]!; assert.equal(new URL(url).href, "http://127.0.0.1:17019/");
const oracleBytes = readFileSync(path.join(here, "oracle.json")); assert.equal(sha(oracleBytes), contract.oracleSha256);
const oracle = JSON.parse(oracleBytes.toString());
const asciiScope = DatabaseScope.test(contract.asciiScopeLabel), unicodeScope = DatabaseScope.test(contract.unicodeScopeLabel);
assert.notEqual(asciiScope, unicodeScope);
const Label = Attribute.text(":string-order/label");
const Subject = EntityType.make("StringOrderProbe", { attributes: { label: Attribute.use(Label, { required: true }) } });
const fields = (values: Record<string, any>) => TypeExpr.struct(Object.fromEntries(Object.entries(values).map(([key, type]) => [key, TypeExpr.required(type)])));
const nativeContract = { name: "string-order-v1/schema-label", parameters: fields({ bound: TypeExpr.text }), row: fields({ entity: TypeExpr.text, label: Label.type }) };
const report: any = { format: "triplex-public-string-extension/1", status: "RUNNING", runId: contract.runId,
  scopes: { ascii: asciiScope, unicode: unicodeScope }, paths: ["qlever-datalog", "qlever-native"],
  otherPaths: Object.fromEntries(["duckdb-datalog", "xtdb-datalog", "xtdb-native"].map(name => [name, "UNEXECUTED"])),
  declaration: "Distinct small extension;20families/71tasks/142packets unchanged",
  fixtureIdentityPolicy: { logicalSubjectIdsExpected: 11, configuredEntityCapacityClaimed: false,
    configuredPresenceOrTypeVersionState: "NOT_SEPARATELY_QUALIFIED;retain actual assertion/schema annotations and command history" },
  ownerProof: owner, grant: process.env["TRIPLEX_RESOURCE_ADMISSION"], cohort: grant.cohort,
  fixture: {}, checks: [], basisChecks: [], calls: [], settings: [], cleanup: {},
  limitations: ["No performance, scale, full continuity, recovery or default promotion.",
    "Unique labels do not qualify equal-label ties.", "Datalog Unicode order policy remains unresolved.",
    "Public SDK deadlines can request cancellation; timeout is not proof of physical cancellation."] };
const answers: Record<string, any> = { "qlever-datalog": {}, "qlever-native": {} };
const invariants = { firstDatalogCursorPresent: false, continuedDatalogTerminal: false, reopenedDatalogTerminal: false,
  greaterRangeDatalogTerminal: false, lesserRangeDatalogTerminal: false, correctedHistoryLineage: false, allCapturedBasisValid: false,
  originalDatalogPageMembership: false, originalNativePageMembership: false };
const inventory = new Inventory(Date.now() + 120000);
let sequence = 0, evidenceBytes = 0, runtimeSequence = 0, pending = 0;
let currentClock = 1000.25;
const save = (name: string, value: any) => {
  const raw = canonical(value) + "\n";
  assert(!raw.includes(token), "CREDENTIAL_ECHO_REFUSED");
  assert(Buffer.byteLength(raw) <= 2 * 1024 ** 2, "SINGLE_EVIDENCE_CAP");
  evidenceBytes += Buffer.byteLength(raw); assert(evidenceBytes <= 32 * 1024 ** 2, "EVIDENCE_TOTAL_CAP");
  writeFileSync(path.join(artifacts, name), raw, { flag: "wx", mode: 0o600 });
};
const event = (id: string, value: any) => save(`${String(++sequence).padStart(4, "0")}-${id}.json`, value);
const otherQ = () => Object.values(JSON.parse(readFileSync(path.join(root, ".devloop/state.json"), "utf8")).jobs as Record<string, any>)
  .filter(job => job.manifest.backend === "qlever" && job.manifest.id !== grant.jobId && ["running", "granted", "cleanup_unknown"].includes(job.status)).map(job => job.manifest.id);
const api = async (id: string, action: (signal: AbortSignal) => Promise<any>) => {
  const timeout = inventory.take(id), abort = new AbortController(), started = performance.now();
  const timer = setTimeout(() => abort.abort(new Error("Declared SDK call deadline")), timeout);
  pending++; event(id + "-start", { id, timeoutMs: timeout, startedAt: new Date().toISOString() });
  try {
    const value = await action(abort.signal);
    event(id + "-response", { id, value, elapsedMsClientWall: performance.now() - started, afterDeadline: abort.signal.aborted });
    assert(!abort.signal.aborted, "SDK_ACK_OR_RESPONSE_AFTER_CALL_DEADLINE");
    report.calls.push({ id, elapsedMsClientWall: performance.now() - started, status: "RETURNED" }); return value;
  } catch (error) { event(id + "-error", { id, error: safeError(error) }); throw error; }
  finally { clearTimeout(timer); pending--; }
};
const observe = (surface: string, id: string, actual: any, expected: any, kind = "ORDERED_ROWS") => {
  const passed = exact(actual, expected);
  answers[surface][id] = actual;
  report.checks.push({ surface, id, kind, status: passed ? "PASS" : "FAIL", expected, actual });
  event(id + "-check", report.checks.at(-1)); return passed;
};
const memberRows = (surface: string, id: string, actual: any[], expected: any[]) => {
  const canonicalByIdentity = expected.map(row => ({ entity: row.entity, label: actual.find(value => value.entity === row.entity)?.label ?? null }));
  const passed = membership(actual, expected);
  answers[surface][id] = { membershipExact: passed, rowsByExpectedIdentity: canonicalByIdentity,
    returnedCount: actual.length, uniqueIdentityCount: new Set(actual.map(row => row.entity)).size };
  report.checks.push({ surface, id, kind: "MEMBERSHIP_BY_FIXED_IDENTITY_NOT_ORDER", status: passed ? "PASS" : "FAIL", expected, actual, passed });
  event(id + "-check", report.checks.at(-1)); return passed;
};
const basis = (response: any, scope: string, position: number, recordedAt?: number) => {
  const actual = response.basis, expected = { scope, recordedPosition: position, validAt: 10.5, ...(recordedAt === undefined ? {} : { recordedAt }) };
  const passed = basisMatches(actual, expected);
  report.basisChecks.push({ expected, actual, passed });
  event("captured-basis", report.basisChecks.at(-1));
  assert(passed, "RETURNED_PUBLIC_BASIS_MISMATCH_STOP_DEPENDENT_PACKET");
};
const query = { find: ["?entity", "?label"], where: [["?entity", Label.key, "?label"]] } as const;
const order = (direction: "asc" | "desc") => [{ variable: "?label", direction }, { variable: "?entity", direction: "asc" as const }];
const f1 = { aggregateAnswerPlan: "bounded" as const, sourcePlan: "persisted" as const, negationPlan: "minus" as const, retirementPlan: "paired" as const,
  timeoutMs: 5000, nativeTimeoutMs: 5000, maxResponseBytes: 2 * 1024 ** 2, maxResultRows: 32 };
const runTriples = (program: any, scope: any, signal: AbortSignal, selected = true, clock = currentClock) => Effect.runPromise(program.pipe(Effect.provide(
  makeQleverRuntime({ url, accessToken: token, ...(selected ? { queryLimits: f1 } : {}) }).layer({ scope, capabilities: Capabilities.none,
    deterministic: { startTime: clock, seed: `${contract.runId}:${scope}:${++runtimeSequence}` } })), Effect.scoped), { signal });
const dRead = (id: string, scope: any, page: boolean, request: any, position: number, selected = true) => api(id, async signal => {
  return await runTriples(Effect.gen(function* () { const triples = yield* Triples; return page
    ? yield* triples.queryPage(request, { basis: { validAt: 10.5 }, includeBasis: true, debug: true })
    : yield* triples.queryAll(request, { basis: { validAt: 10.5 }, includeBasis: true, debug: true }); }), scope, signal, selected);
}).then(value => { basis(value, scope, position, page ? 1000.25 : undefined); return value; });
let client = makeQleverClient(url, { accessToken: token, timeoutMs: 5000 });
const nRead = (id: string, scope: any, position: number | undefined, options: { direction?: "asc" | "desc"; operator?: ">" | "<"; bound?: string; page?: 0 | 2; unordered?: boolean } = {}) => api(id, signal => Effect.runPromise(
  makeQleverNativeQueries(client, scope, { maxResponseBytes: 2 * 1024 ** 2, defaultTimeoutMs: 5000, defaultMaxRows: 32 }).select(nativeContract, { bound: options.bound ?? "" }, (ctx: any, input: any) => {
    const filter = options.operator ? `FILTER(STR(?label) ${options.operator} ${ctx.literal(input.bound)})` : "";
    const ordering = options.unordered ? "" : `ORDER BY ${options.direction === "desc" ? "DESC(STR(?label))" : "STR(?label)"} STR(?entity)`;
    return `SELECT ?entity ?label WHERE { ${ctx.fact("?entity", Label, "?label")} ${filter} } ${ordering}${options.page === undefined ? "" : ` LIMIT 2 OFFSET ${options.page}`}`;
  }, { basis: { validAt: 10.5, ...(position === undefined ? {} : { recordedPosition: position }) }, timeoutMs: 5000, maxRows: 32, includeRaw: true, signal }), { signal }));
const adminSeen = new Set<string>();
const admin = async (id: string, value?: "1" | "100") => {
  assert(!adminSeen.has(id) && adminSeen.size < 9, "CONTROL_CALL_INVENTORY"); adminSeen.add(id); assert.deepEqual(otherQ(), []);
  const target = new URL(url); target.searchParams.set(value === undefined ? "cmd" : "query-planning-budget", value ?? "get-settings");
  const started = performance.now();
  const response = await fetch(target, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000), redirect: "error" });
  const parts = []; let size = 0;
  for await (const part of response.body!) { size += part.length; assert(size <= 65536, "SETTING_REPLY_CAP"); parts.push(part); }
  assert(response.ok, "SETTING_HTTP_FAILURE"); const raw = Buffer.concat(parts).toString(); assert(!raw.includes(token));
  const parsed = JSON.parse(raw);
  const observation = { id, value: value ?? "READ", elapsedMsClientWall: performance.now() - started, rawSha256: sha(raw), rawBytes: size,
    settings: value === undefined ? Object.fromEntries(["query-planning-budget", "cache-max-size", "cache-max-size-single-entry"].map(key => [key, parsed[key]])) : null };
  event("setting-" + id, observation); report.settings.push(observation);
  if (value === undefined) { assert.equal(parsed["cache-max-size"], "64 MB"); assert.equal(parsed["cache-max-size-single-entry"], "32 MB"); }
  return parsed["query-planning-budget"];
};
let p1 = 0, up1 = 0, p2 = 0, originalC: any, nativeFirst: any, datalogFirst: any, nativeFirstRows: any[], datalogFirstRows: any[];
let nativeUnicodeQualified = false;
const ascii = oracle.asciiInput, unicode = oracle.unicodeInput.map(({ entity, label }: any) => ({ entity, label }));
const common = (id: string) => oracle.commonTasks.find((task: any) => task.id === id).expectedRows;
const semanticBoolean = (id: string, passed: boolean, actual: any) => {
  const check = { surface: "qlever-datalog", id, kind: "PUBLIC_PAGINATION_CONTRACT", status: passed ? "PASS" : "FAIL", actual };
  report.checks.push(check); event(id + "-check", check); return passed;
};
const snapshotPage = { inner: query, orderBy: order("asc"), limit: 2, includeCount: false };
const phaseRecord: any = {};
try {
  assert.deepEqual(otherQ(), []); event("contract", { contractSha256: sha(contractBytes), oracleSha256: sha(oracleBytes), ownerProof: owner, profile: contract.profile });
  await phases({ record: phaseRecord, settings: { read: (id: string) => admin(id), set: (value: "1" | "100", id: string) => admin(id, value) },
    readNativeBefore: async () => {
      for (const [name, scope] of [["ascii", asciiScope], ["unicode", unicodeScope]] as const) {
        const empty = await dRead("fresh-" + name, scope, false, query, 0, false); assert.deepEqual(empty.results, []);
      }
      for (const [name, scope, values] of [["ascii", asciiScope, ascii], ["unicode", unicodeScope, unicode]] as const) {
        const receipt = await api("seed-" + name, signal => runTriples(Effect.gen(function* () {
          const triples = yield* Triples; return yield* triples.transact(values.map((row: any) => {
            const assertion = Subject.label.assertion(row.label); assert.deepEqual(assertion.value, string(row.label));
            return { op: "assert" as const, entityId: EntityId.make(row.entity), entityType: Subject.entityType,
              ...assertion, validFrom: 10.25, validTo: 10.75 };
          }), { commandId: contract.runId + ":seed:" + name });
        }), scope, signal, false));
        assert(Number.isSafeInteger(receipt.position) && receipt.position > 0); report.fixture[name] = { receipt };
        if (name === "ascii") { p1 = receipt.position; originalC = receipt.triples[2].id; } else up1 = receipt.position;
        const ack = await api("ack-seed-" + name, signal => runTriples(Effect.gen(function* () { const triples = yield* Triples; return yield* triples.transactionByCommand(contract.runId + ":seed:" + name); }), scope, signal, false));
        assert.equal(ack?.position, receipt.position);
      }
      const asciiMember = await nRead("native-ascii-membership", asciiScope, p1, { unordered: true }); basis(asciiMember, asciiScope, p1);
      assert(membership(rowsOf(asciiMember.rows, true), ascii), "ASCII_SEED_PAYLOAD_NOT_QUALIFIED");
      const um = await nRead("native-unicode-membership", unicodeScope, up1, { unordered: true }); basis(um, unicodeScope, up1);
      nativeUnicodeQualified = memberRows("qlever-native", "string.unicode.exact_membership", rowsOf(um.rows, true), unicode);
      for (const [id, sdkId, options] of [
        ["string.ascii.order.asc.p1", "native-ascii-asc", {}], ["string.ascii.order.desc.p1", "native-ascii-desc", { direction: "desc" }],
        ["string.ascii.wrapper_gt_E.p1", "native-ascii-gt-E", { operator: ">", bound: "E" }], ["string.ascii.wrapper_lt_c.p1", "native-ascii-lt-c", { operator: "<", bound: "c" }],
      ] as const) { const answer = await nRead(sdkId, asciiScope, p1, options); basis(answer, asciiScope, p1); observe("qlever-native", id, rowsOf(answer.rows, true), common(id)); }
      nativeFirst = await nRead("native-page-first", asciiScope, p1, { page: 0 }); basis(nativeFirst, asciiScope, p1); nativeFirstRows = rowsOf(nativeFirst.rows, true);
      observe("qlever-native", "string.ascii.page.first.p1", nativeFirstRows, common("string.ascii.page.first.p1"));
    },
    readDatalog: async () => {
      const all = await dRead("datalog-ascii-membership", asciiScope, false, query, p1); assert(membership(rowsOf(all.results), ascii), "DATALOG_ASCII_PAYLOAD_NOT_QUALIFIED");
      for (const [id, sdkId, direction] of [["string.ascii.order.asc.p1", "datalog-ascii-asc", "asc"], ["string.ascii.order.desc.p1", "datalog-ascii-desc", "desc"]] as const) {
        const answer = await dRead(sdkId, asciiScope, false, { ...query, orderBy: order(direction) }, p1); observe("qlever-datalog", id, rowsOf(answer.results), common(id));
      }
      for (const [id, sdkId, op, bound] of [["string.ascii.wrapper_gt_E.p1", "datalog-ascii-gt-E", ">", "E"], ["string.ascii.wrapper_lt_c.p1", "datalog-ascii-lt-c", "<", "c"]] as const) {
        const answer = await dRead(sdkId, asciiScope, true, { inner: query, filters: [{ column: "?label", op, value: bound }], orderBy: order("asc"), limit: 8, includeCount: false }, p1);
        const terminal = semanticBoolean(sdkId + "-terminal", answer.nextCursor === undefined, { nextCursor: answer.nextCursor ?? null });
        if (sdkId === "datalog-ascii-gt-E") invariants.greaterRangeDatalogTerminal = terminal; else invariants.lesserRangeDatalogTerminal = terminal;
        observe("qlever-datalog", id, rowsOf(answer.results), common(id));
      }
      datalogFirst = await dRead("datalog-page-first", asciiScope, true, snapshotPage, p1); datalogFirstRows = rowsOf(datalogFirst.results);
      invariants.firstDatalogCursorPresent = semanticBoolean("datalog-first-cursor-present", typeof datalogFirst.nextCursor === "string" && datalogFirst.nextCursor.length > 0,
        { nextCursor: datalogFirst.nextCursor ?? null });
      report.fixture.originalCursor = datalogFirst.nextCursor ?? null; report.fixture.originalCursorSha256 = invariants.firstDatalogCursorPresent ? sha(datalogFirst.nextCursor) : null;
      observe("qlever-datalog", "string.ascii.page.first.p1", datalogFirstRows, common("string.ascii.page.first.p1"));
      const corrected = await api("correct-ascii", signal => runTriples(Effect.gen(function* () { const triples = yield* Triples; return yield* triples.transact([
        { op: "retract", id: originalC }, { op: "assert", entityId: EntityId.make(ascii[2].entity), entityType: Subject.entityType, ...Subject.label.assertion("0"), validFrom: 10.25, validTo: 10.75 },
      ], { commandId: contract.runId + ":correction" }); }), asciiScope, signal, true, 2000.25));
      p2 = corrected.position; assert(p2 > p1); report.fixture.correction = corrected; currentClock = 2000.25;
      const ack = await api("ack-correction", signal => runTriples(Effect.gen(function* () { const triples = yield* Triples; return yield* triples.transactionByCommand(contract.runId + ":correction"); }), asciiScope, signal)); assert.equal(ack?.position, p2);
      const history = await api("ascii-history", signal => runTriples(Effect.gen(function* () { const triples = yield* Triples; return yield* triples.history(EntityId.make(ascii[2].entity)); }), asciiScope, signal));
      report.fixture.correctedEntityHistory = history;
      const labelled = history.filter((row: any) => row.attribute === Label.key), newId = corrected.triples[0]?.id;
      const oldRow = labelled.find((row: any) => row.id === originalC), newRow = labelled.find((row: any) => row.id === newId);
      invariants.correctedHistoryLineage = labelled.length === 2 && corrected.retracted === 1 && corrected.triples.length === 1 && newId !== originalC &&
        oldRow?.entityId === ascii[2].entity && newRow?.entityId === ascii[2].entity && oldRow?.value.type === "string" && oldRow.value.value === "c" &&
        newRow?.value.type === "string" && newRow.value.value === "0" && oldRow.recordedAt === report.fixture.ascii.receipt.instant &&
        Option.getOrUndefined(oldRow.txId) === report.fixture.ascii.receipt.txId && Option.getOrUndefined(oldRow.retractedAt) === corrected.instant &&
        Option.getOrUndefined(oldRow.retractTxId) === corrected.txId && Option.getOrUndefined(newRow.txId) === corrected.txId &&
        newRow.recordedAt === corrected.instant && Option.isNone(newRow.retractedAt) && Option.isNone(newRow.retractTxId) &&
        oldRow.validFrom === 10.25 && newRow.validFrom === 10.25 && Option.getOrUndefined(oldRow.validTo) === 10.75 && Option.getOrUndefined(newRow.validTo) === 10.75 &&
        ack?.txId === corrected.txId && ack.changes.length === 2 && ack.changes.some((change: any) => change.op === "retract" && change.tripleId === originalC) &&
        ack.changes.some((change: any) => change.op === "assert" && change.tripleId === newId);
      event("correction-lineage", { passed: invariants.correctedHistoryLineage, originalId: originalC, newId, position: p2, ack, history });
      assert(invariants.correctedHistoryLineage, "ACKNOWLEDGED_CORRECTION_LINEAGE_MISMATCH_NO_REPLAY");
      for (const [id, sdkId] of [["string.ascii.page.continue_p1_after_p2", "datalog-page-continue"], ["string.ascii.page.reopen_p1_after_p2", "datalog-page-reopen"]] as const) {
        if (!invariants.firstDatalogCursorPresent) { report.checks.push({ surface: "qlever-datalog", id, status: "UNEXECUTED_DEPENDENCY_FAILED", reason: "ORIGINAL_CURSOR_MISSING_NO_REPLACEMENT" }); continue; }
        const page = await dRead(sdkId, asciiScope, true, { ...snapshotPage, cursor: datalogFirst.nextCursor }, p1);
        const terminal = semanticBoolean(sdkId + "-terminal", page.nextCursor === undefined, { nextCursor: page.nextCursor ?? null });
        if (sdkId === "datalog-page-continue") invariants.continuedDatalogTerminal = terminal; else invariants.reopenedDatalogTerminal = terminal;
        const rows = rowsOf(page.results); observe("qlever-datalog", id, rows, common(id));
        invariants.originalDatalogPageMembership = membership([...datalogFirstRows!, ...rows], ascii) &&
          (sdkId === "datalog-page-continue" || invariants.originalDatalogPageMembership);
        event(sdkId + "-cut-membership", { originalCursorSha256: sha(datalogFirst.nextCursor), position: page.basis.recordedPosition,
          originalP1MembershipComplete: membership([...datalogFirstRows!, ...rows], ascii), orderingFailureDependency: !exact(datalogFirstRows, common("string.ascii.page.first.p1")) });
      }
      const latest = await dRead("datalog-latest", asciiScope, false, { ...query, orderBy: order("asc") }, p2); observe("qlever-datalog", "string.ascii.latest.order.asc.p2", rowsOf(latest.results), common("string.ascii.latest.order.asc.p2"));
      const unicodeAnswer = await dRead("datalog-unicode-observe", unicodeScope, false, { ...query, orderBy: order("asc") }, up1), observed = rowsOf(unicodeAnswer.results);
      memberRows("qlever-datalog", "string.unicode.exact_membership", observed, unicode);
      report.datalogUnicodeObservation = { status: "POLICY_UNRESOLVED", actual: observed, codepoints: observed.map(row => codepoints(row.label)),
        candidateExpectedOrders: oracle.unresolvedDatalogUnicodeObservation.candidateExpectedEntityOrders, orderQualified: false };
    },
    readNativeAfter: async () => {
      for (const [id, sdkId] of [["string.ascii.page.continue_p1_after_p2", "native-page-continue"], ["string.ascii.page.reopen_p1_after_p2", "native-page-reopen"]] as const) {
        if (sdkId === "native-page-reopen") { await client.close(); event("native-client-closed-before-reopen", { pendingSdkCalls: pending }); client = makeQleverClient(url, { accessToken: token, timeoutMs: 5000 }); }
        const page = await nRead(sdkId, asciiScope, p1, { page: 2 }); basis(page, asciiScope, p1); const rows = rowsOf(page.rows, true);
        invariants.originalNativePageMembership = membership([...nativeFirstRows!, ...rows], ascii) &&
          (sdkId === "native-page-continue" || invariants.originalNativePageMembership);
        observe("qlever-native", id, rows, common(id)); event(sdkId + "-cut-membership", { position: page.basis.recordedPosition,
          originalP1MembershipComplete: membership([...nativeFirstRows!, ...rows], ascii), orderingFailureDependency: !exact(nativeFirstRows, common("string.ascii.page.first.p1")) });
      }
      const latest = await nRead("native-latest", asciiScope, undefined); basis(latest, asciiScope, p2); observe("qlever-native", "string.ascii.latest.order.asc.p2", rowsOf(latest.rows, true), common("string.ascii.latest.order.asc.p2"));
      if (nativeUnicodeQualified) for (const [task, sdkId, options] of [[oracle.nativeSparqlOnlyTasks[0], "native-unicode-asc", {}], [oracle.nativeSparqlOnlyTasks[1], "native-unicode-gt-private-use", { operator: ">", bound: "\ue000" }]] as const) {
        const answer = await nRead(sdkId, unicodeScope, up1, options); basis(answer, unicodeScope, up1); const rows = rowsOf(answer.rows, true);
        observe("qlever-native", task.id, rows, task.expectedEntityOrder.map((entity: string) => unicode.find((row: any) => row.entity === entity)));
      } else for (const task of oracle.nativeSparqlOnlyTasks) report.checks.push({ surface: "qlever-native", id: task.id, status: "UNEXECUTED_DEPENDENCY_FAILED", reason: "UNICODE_EXACT_PAYLOAD_MEMBERSHIP_FAILED_NO_NORMALIZATION" });
    },
  });
  report.status = report.checks.some((check: any) => check.status !== "PASS") ? "COLLECTED_WITH_SEMANTIC_FAILURES" : "ALL_DECLARED_SEMANTIC_CASES_PASSED";
} catch (error) { report.status = "STOPPED_ON_PUBLIC_CONTRACT_OR_INFRASTRUCTURE_FAILURE_PARTIAL_NO_REPLAY"; report.error = safeError(error); process.exitCode = 1; }
finally {
  try { await client.close(); report.cleanup.nativeClientCloseReturned = true; }
  catch (error) { report.cleanup.error = safeError(error); process.exitCode = 1; }
  report.cleanup.pendingSdkCalls = pending; report.cleanup.settings = phaseRecord;
  report.cleanup.otherQAtEnd = otherQ(); if (report.cleanup.otherQAtEnd.length || !phaseRecord.restored100 || pending) process.exitCode = 1;
  report.sdkCallsAttempted = [...inventory.seen];
  report.actualReceiptInventory = { assertionVersions: [report.fixture.ascii?.receipt, report.fixture.unicode?.receipt, report.fixture.correction]
    .reduce((sum: number, value: any) => sum + (value?.triples?.length ?? 0), 0),
    retractions: report.fixture.correction?.retracted ?? 0, configuredEntityCapacityClaimed: false };
  invariants.allCapturedBasisValid = report.basisChecks.length > 0 && report.basisChecks.every((value: any) => value.passed);
  save("public-invariants.json", invariants);
  save("datalog-answers.json", answers["qlever-datalog"]); save("native-answers.json", answers["qlever-native"]);
  save("report.json", report);
  save("settings-status.json", { restored100: phaseRecord.restored100 === true, noOtherQAtEnd: report.cleanup.otherQAtEnd.length === 0,
    beforeBudget: report.settings.find((value: any) => value.id === "before")?.settings?.["query-planning-budget"] ?? null,
    selectedBudget: report.settings.find((value: any) => value.id === "selected-f1")?.settings?.["query-planning-budget"] ?? null,
    nativeAfterBudget: report.settings.find((value: any) => value.id === "native-after-f1")?.settings?.["query-planning-budget"] ?? null,
    finalBudget: report.settings.find((value: any) => value.id === "finally-readback")?.settings?.["query-planning-budget"] ?? null,
    pendingSdkCallsZero: pending === 0, nativeClientCloseReturned: report.cleanup.nativeClientCloseReturned === true });
}
