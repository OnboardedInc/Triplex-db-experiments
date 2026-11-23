import assert from "node:assert/strict";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { scopeKey } from "../v01/adopt.ts";
import { now } from "../scale1/decision/observer.ts";

type Scope = { db: string; name: string; cut: number };

// [DX-INT1] Why: the held SCALE1 copy was sealed by an older build, so it holds no ordered per-person function with this
// build's name; opening the scope installs it (a native write at no logical position), exactly as a production restart
// on a new build does before its first save. The cold start counts that write: it runs after `ready` and before the
// first offer, and the write-options check below still requires the installed function.
// Rejected: installing the function into the held copy (its tree digest is pinned and other builds share it), or
// dropping the check (saves would then reach a writer that cannot run the ordered per-person path).
export async function openColdWriter(writer: DatomicClient, scope: Scope, attempt: string) {
  const initial = await writer.begin(scope.db);
  await writer.release(scope.db, initial.handle);
  assert.equal(initial.position, scope.cut);
  const before = await writer.request<any>("GET", "/v1/db/" + scope.db + "/write-options");
  const openStart = now();
  const opened = await writer.create(scopeKey(scope.name), "lean", true, 35000);
  const openEnd = now();
  assert(!opened.created && opened.strictRecordClocks && opened.db === scope.db);
  const options = await writer.request<any>("GET", "/v1/db/" + scope.db + "/write-options");
  assert.deepEqual([options.attempt, options.database, options.position, options.rowsVersion,
    options.strictRecordClocks, options.subjectSave, options.subjectNumericOwner, options.subjectOrderedIds,
    options.subjectPrefetch], [attempt, scope.db, scope.cut, 3, true, true, true, true, false]);
  assert.match(options.subjectFunction, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
  assert.match(options.subjectFunctionTx ?? "", /^[1-9][0-9]*$/);
  return { options, scopeOpen: { openStart, openEnd, subjectFunctionBefore: before.subjectFunction ?? null,
    subjectFunction: options.subjectFunction, subjectFunctionTx: options.subjectFunctionTx, position: options.position } };
}
