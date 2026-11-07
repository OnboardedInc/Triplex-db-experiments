/** Source template only. A future manifest copies this entry inside the anchored
 * private Q package so the ordinary public package self-reference selects it.
 * Only the SUPPORT_MODULE path is relocated; the public APIs and oracle stay fixed.
 */
import assert from "node:assert/strict";
import { readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { Attribute, EntityType, TypeExpr } from "@triplex-build/triplex/config";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeQleverClient, makeQleverNativeQueries, makeQleverRuntime } from "@triplex-build/triplex-qlever";
import {
  LowercaseInventory, LOWERCASE_SDK_CALLS, basisMatches, canonical, exact,
  membership, phases, rowsOf, safeError, sha,
} from "SUPPORT_MODULE";

const contractArg = process.argv.indexOf("--contract"); assert(contractArg >= 2);
const contractFile = realpathSync(process.argv[contractArg + 1]!);
const contractBytes = readFileSync(contractFile), contract = JSON.parse(contractBytes.toString());
assert.equal(contract.mode, "PUBLIC_Q_WRAPPER_LOWERCASE_PRIVATE_SDK");
const root = realpathSync(process.env["TRIPLEX_QUALIFICATION_ROOT"]!);
assert(contractFile.startsWith(root + path.sep));
assert.equal(import.meta.resolve("@triplex-build/triplex-qlever"), contract.publicFacadeUrl);
const grantFile = realpathSync(process.env["TRIPLEX_RESOURCE_ADMISSION"]!);
assert(grantFile.startsWith(root + "/.devloop/jobs/"));
assert.equal(sha(readFileSync(grantFile)), process.env["TRIPLEX_RESOURCE_ADMISSION_SHA256"]);
const grant = JSON.parse(readFileSync(grantFile, "utf8"));
assert.equal(grant.state, "ADMITTED"); assert.equal(grant.jobId, contract.jobId);
assert.equal(grant.resources.memoryBytes, 896 * 1024 ** 2); assert.equal(grant.resources.cpuUnits, 1);
assert.equal(grant.resources.diskBytes, 64 * 1024 ** 2); assert.equal(grant.resources.timeoutMilliseconds, 180000);
const owner = grant.requiredOwnerChecks?.find((row: any) => row.ownerId === "foundation-qlever")?.observation;
assert(owner?.running && owner.containerId === contract.containerId && owner.imageSha256 === contract.imageSha256 && owner.memoryBytes === 2 * 1024 ** 3);
const artifacts = realpathSync(process.env["TRIPLEX_RUN_ARTIFACTS"]!); assert(artifacts.startsWith(root + "/.devloop/jobs/"));
const credential = realpathSync(process.env["QLEVER_ACCESS_TOKEN_FILE"]!);
assert.equal(credential, path.join(root, ".runtime/engines/qlever-main/access-token"));
assert.equal(statSync(credential).mode & 0o777, 0o600); assert.equal(statSync(credential).uid, process.getuid!());
const token = readFileSync(credential, "utf8").trim(); assert(token.length >= 32 && token.length <= 256);
const url = process.env["QLEVER_URL"]!; assert.equal(new URL(url).href, "http://127.0.0.1:17019/");
const oracleBytes = readFileSync(path.join(root, contract.oracle.path)); assert.equal(sha(oracleBytes), contract.oracle.sha256);
const oracle = JSON.parse(oracleBytes.toString()); assert.equal(oracle.cases.length, 4);
assert.deepEqual(contract.sdkCalls, LOWERCASE_SDK_CALLS);
const scope = DatabaseScope.test(contract.scopeName);
const Label = Attribute.text(":wrapper-text/label");
const Subject = EntityType.make("WrapperTextProbe", { attributes: { label: Attribute.use(Label, { required: true }) } });
const required = (fields: Record<string, any>) => TypeExpr.struct(Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, TypeExpr.required(type)])));
const nativeContract = { name: "wrapper-lowercase-v1/schema-label", parameters: required({ bound: TypeExpr.text }), row: required({ entity: TypeExpr.text, label: Label.type }) };
const query = { find: ["?entity", "?label"], where: [["?entity", Label.key, "?label"]] } as const;
const order = [{ variable: "?label", direction: "asc" as const }, { variable: "?entity", direction: "asc" as const }];
const f1 = { aggregateAnswerPlan: "bounded" as const, sourcePlan: "persisted" as const,
  negationPlan: "minus" as const, retirementPlan: "paired" as const, timeoutMs: 5000, nativeTimeoutMs: 5000,
  maxResponseBytes: 2 * 1024 ** 2, maxResultRows: 32 };
const report: any = { format: "triplex-wrapper-lowercase-actual/1", status: "RUNNING", scope,
  publicFacadeUrl: import.meta.resolve("@triplex-build/triplex-qlever"), sdkBuild: contract.sdkBuild,
  owner, fixture: {}, checks: [], calls: [], settings: [], bases: [], cleanup: {},
  limitations: ["Four logical subjects, not configured-entity capacity.", "Lowercase range isolation only; no general native text order or performance acceptance.",
    "Fresh adapter/client lifecycle is not engine/file restart or restore.", "Other three query paths remain unexecuted."] };
const answers: any = { native: {}, datalogCurrent: {}, datalogReopen: {} };
const inventory = new LowercaseInventory(Date.now() + 120000);
let sequence = 0, evidenceBytes = 0, runtimeSequence = 0, pending = 0, p1 = 0;
let seedAckVerified = false, nativeMembershipVerified = false, datalogMembershipVerified = false, clientClosed = false;
const save = (name: string, value: any) => {
  const raw = canonical(value) + "\n"; assert(!raw.includes(token), "CREDENTIAL_ECHO_REFUSED");
  assert(Buffer.byteLength(raw) <= 2 * 1024 ** 2, "SINGLE_CAPTURE_LIMIT");
  evidenceBytes += Buffer.byteLength(raw); assert(evidenceBytes <= 32 * 1024 ** 2, "TOTAL_CAPTURE_LIMIT");
  writeFileSync(path.join(artifacts, name), raw, { flag: "wx", mode: 0o600 });
};
const event = (id: string, value: any) => save(`${String(++sequence).padStart(4, "0")}-${id}.json`, value);
const otherQ = () => Object.values(JSON.parse(readFileSync(path.join(root, ".devloop/state.json"), "utf8")).jobs as Record<string, any>)
  .filter(job => job.manifest.backend === "qlever" && job.manifest.id !== grant.jobId && ["running", "granted", "cleanup_unknown"].includes(job.status)).map(job => job.manifest.id);
const api = async (id: string, action: (signal: AbortSignal) => Promise<any>) => {
  const milliseconds = inventory.take(id), controller = new AbortController(), started = performance.now();
  const timer = setTimeout(() => controller.abort(new Error("Declared public call deadline")), milliseconds);
  pending++; event(id + "-start", { id, milliseconds });
  try {
    const value = await action(controller.signal); event(id + "-response", { id, value, elapsedMsClientWall: performance.now() - started, afterDeadline: controller.signal.aborted });
    assert(!controller.signal.aborted, "SDK_RESPONSE_OR_ACK_AFTER_DEADLINE");
    report.calls.push({ id, elapsedMsClientWall: performance.now() - started }); return value;
  } catch (error) { event(id + "-error", { id, error: safeError(error) }); throw error; }
  finally { clearTimeout(timer); pending--; }
};
const run = (program: any, signal: AbortSignal, selected = false) => Effect.runPromise(program.pipe(Effect.provide(
  makeQleverRuntime({ url, accessToken: token, ...(selected ? { queryLimits: f1 } : {}) }).layer({ scope, capabilities: Capabilities.none,
    deterministic: { startTime: 1000.25, seed: `${contract.runId}:${++runtimeSequence}` } })), Effect.scoped), { signal });
const basis = (response: any, position: number, page = false) => {
  const expected = { scope, recordedPosition: position, validAt: 10.5, ...(page ? { recordedAt: 1000.25 } : {}) };
  const passed = basisMatches(response.basis, expected); report.bases.push({ expected, actual: response.basis, passed });
  event("basis", report.bases.at(-1)); assert(passed, "PUBLIC_BASIS_MISMATCH_STOPS_DEPENDENT_CASES");
};
const check = (surface: string, id: string, actual: any[], expected: any[]) => {
  answers[surface][id] = actual; const passed = exact(actual, expected);
  report.checks.push({ surface, id, passed, actual, expected }); event(id + "-semantic", report.checks.at(-1));
};
const client = makeQleverClient(url, { accessToken: token, timeoutMs: 5000 });
const native = (id: string, item?: any) => api(id, signal => Effect.runPromise(makeQleverNativeQueries(client, scope,
  { maxResponseBytes: 2 * 1024 ** 2, defaultTimeoutMs: 5000, defaultMaxRows: 32 }).select(nativeContract, { bound: item?.boundary ?? "" }, (ctx: any, input: any) => {
    assert(item === undefined || [">", ">=", "<", "<="].includes(item.operator));
    return `SELECT ?entity ?label WHERE { ${ctx.fact("?entity", Label, "?label")} ${item ? `FILTER(STR(?label) ${item.operator} ${ctx.literal(input.bound)})` : ""} }${item ? " ORDER BY STR(?label) STR(?entity)" : ""}`;
  }, { basis: { recordedPosition: p1, validAt: 10.5 }, timeoutMs: 5000, maxRows: 32, includeRaw: true, signal }), { signal }));
const readPage = (id: string, item: any) => api(id, signal => run(Effect.gen(function* () {
  const t = yield* Triples; return yield* t.queryPage({ inner: query, filters: [{ column: "?label", op: item.operator, value: item.boundary }], orderBy: order, limit: 8, includeCount: false },
    { basis: { validAt: 10.5, recordedAt: 1000.25 }, includeBasis: true, debug: true });
}), signal, true)).then(value => { basis(value, p1, true); return value; });
const seenAdmin = new Set();
const admin = async (id: string, value?: "1" | "100") => {
  assert(!seenAdmin.has(id) && seenAdmin.size < 9); seenAdmin.add(id); assert.deepEqual(otherQ(), []);
  const target = new URL(url); target.searchParams.set(value === undefined ? "cmd" : "query-planning-budget", value ?? "get-settings");
  const response = await fetch(target, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000), redirect: "error" });
  const parts = []; let size = 0;
  for await (const part of response.body!) { size += part.length; assert(size <= 65536); parts.push(part); }
  assert(response.ok); const raw = Buffer.concat(parts).toString(); assert(!raw.includes(token)); const parsed = JSON.parse(raw);
  const observation = { id, value: value ?? "READ", rawBytes: size, rawSha256: sha(raw),
    settings: value === undefined ? Object.fromEntries(["query-planning-budget", "cache-max-size", "cache-max-size-single-entry"].map(key => [key, parsed[key]])) : null };
  event("setting-" + id, observation); report.settings.push(observation);
  if (value === undefined) { assert.equal(parsed["cache-max-size"], "64 MB"); assert.equal(parsed["cache-max-size-single-entry"], "32 MB"); }
  return parsed["query-planning-budget"];
};
const phase: any = {};
try {
  assert.deepEqual(otherQ(), []);
  event("contract", { sha256: sha(contractBytes), publicFacadeUrl: report.publicFacadeUrl, owner });
  await phases({ record: phase, settings: { read: (id: string) => admin(id), set: (value: "1" | "100", id: string) => admin(id, value) },
    readNativeBefore: async () => {
      const empty = await api("fresh-lowercase", signal => run(Effect.gen(function* () { const t = yield* Triples; return yield* t.queryAll(query, { basis: { validAt: 10.5 }, includeBasis: true }); }), signal));
      basis(empty, 0); assert.deepEqual(empty.results, []);
      const receipt = await api("seed-lowercase", signal => run(Effect.gen(function* () { const t = yield* Triples;
        return yield* t.transact(oracle.fixture.rows.map((row: any) => {
          const encoded = Subject.label.assertion(row.label); assert.deepEqual(encoded.value, string(row.label));
          return { op: "assert" as const, entityId: EntityId.make(row.entity), entityType: Subject.entityType, ...encoded, validFrom: 10.25, validTo: 10.75 };
        }), { commandId: contract.runId + ":seed" }); }), signal));
      event("seed-receipt-before-assert", receipt); report.fixture.receipt = receipt;
      assert.equal(receipt.position, 1); assert.equal(receipt.instant, 1000.25); assert.equal(receipt.triples.length, 4); assert.equal(receipt.retracted, 0); p1 = receipt.position;
      const ack = await api("ack-seed-lowercase", signal => run(Effect.gen(function* () { const t = yield* Triples; return yield* t.transactionByCommand(contract.runId + ":seed"); }), signal));
      assert.equal(ack?.position, p1); assert.equal(ack?.txId, receipt.txId); assert.equal(ack?.changes.length, 4);
      seedAckVerified = true;
      event("immutable-P1-cut-and-assertion-ids", { p1, recordedAt: receipt.instant, txId: receipt.txId, assertionIds: receipt.triples.map((row: any) => row.id), ack });
      const payload = await native("native-lowercase-membership"); basis(payload, p1);
      assert(membership(rowsOf(payload.rows, true), oracle.fixture.rows), "NATIVE_PAYLOAD_MEMBERSHIP_STOPS_PACKET");
      nativeMembershipVerified = true;
      for (const item of oracle.cases) {
        const id = item.id.split(".").at(-1); const answer = await native("native-" + id, item); basis(answer, p1);
        check("native", item.id, rowsOf(answer.rows, true), item.expectedRows);
      }
      await client.close(); clientClosed = true; event("native-client-closed-before-datalog", { pending });
    },
    readDatalog: async () => {
      const payload = await api("datalog-lowercase-membership", signal => run(Effect.gen(function* () { const t = yield* Triples;
        return yield* t.queryAll(query, { basis: { validAt: 10.5 }, includeBasis: true, debug: true }); }), signal, true));
      basis(payload, p1); assert(membership(rowsOf(payload.results), oracle.fixture.rows), "DATALOG_PAYLOAD_MEMBERSHIP_STOPS_PACKET");
      datalogMembershipVerified = true;
      for (const reopen of [false, true]) for (const item of oracle.cases) {
        const id = item.id.split(".").at(-1), answer = await readPage(`datalog-${reopen ? "reopen-" : ""}${id}`, item);
        report.checks.push({ surface: reopen ? "datalogReopen" : "datalogCurrent", id: item.id + ":terminal", passed: answer.nextCursor === undefined, actual: answer.nextCursor ?? null });
        check(reopen ? "datalogReopen" : "datalogCurrent", item.id, rowsOf(answer.results), item.expectedRows);
      }
    },
    readNativeAfter: async () => {},
  });
  assert.equal(inventory.seen.size, 17, "FULL_DECLARED_SDK_INVENTORY_REQUIRED");
  report.status = report.checks.every((row: any) => row.passed) ? "ALL_LOWERCASE_CASES_PASSED" : "COLLECTED_WITH_SEMANTIC_FAILURES";
} catch (error) { report.status = "STOPPED_PARTIAL_NO_REPLAY"; report.error = safeError(error); process.exitCode = 1; }
finally {
  try { if (!clientClosed) { await client.close(); clientClosed = true; } report.cleanup.clientCloseReturned = clientClosed; }
  catch (error) { report.cleanup.error = safeError(error); process.exitCode = 1; }
  report.cleanup.pending = pending; report.cleanup.phase = phase; report.cleanup.otherCanonicalQAtEnd = otherQ();
  report.sdkCalls = [...inventory.seen];
  if (pending || !phase.restored100 || report.cleanup.otherCanonicalQAtEnd.length) process.exitCode = 1;
  save("lowercase-answers.json", answers); save("lowercase-report.json", report);
  save("public-invariants.json", { seedAckVerified, nativeMembershipVerified, datalogMembershipVerified,
    allReturnedBasesValid: report.bases.length === 15 && report.bases.every((row: any) => row.passed),
    allEightRangePagesTerminal: report.checks.filter((row: any) => row.id.endsWith(":terminal")).length === 8 &&
      report.checks.filter((row: any) => row.id.endsWith(":terminal")).every((row: any) => row.passed),
    full17CallInventoryCompleted: inventory.seen.size === 17 && report.calls.length === 17 });
  save("settings-status.json", { restored100: phase.restored100 === true, pendingZero: pending === 0,
    noOtherCanonicalQAtEnd: report.cleanup.otherCanonicalQAtEnd.length === 0, clientCloseReturned: report.cleanup.clientCloseReturned === true,
    beforeBudget: report.settings.find((row: any) => row.id === "before")?.settings?.["query-planning-budget"] ?? null,
    selectedBudget: report.settings.find((row: any) => row.id === "selected-f1")?.settings?.["query-planning-budget"] ?? null,
    restoredBeforeNativeAfterBudget: report.settings.find((row: any) => row.id === "native-after-f1")?.settings?.["query-planning-budget"] ?? null,
    finalBudget: report.settings.find((row: any) => row.id === "finally-readback")?.settings?.["query-planning-budget"] ?? null });
}
