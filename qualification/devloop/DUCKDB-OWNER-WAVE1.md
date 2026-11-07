# DuckDB owner-audit wave1: frozen design

Status: design only. No candidate or production change is implemented. The
controls are current `duckdb-sdk-entry-v8/0001` (48),
`duckdb-datalog-packet-v4/0001` (142), and
`duckdb-public-read-stages-v1/0001` (measurement only). The exact stage evidence
is [linked here](../evidence/duckdb-public-read-stages-v1-analysis.json).

The measured38 activations consumed3,870.64ms of wrapper wall, including
3,822.13ms in the `td_owner_probe_activate(0)` dispatches. The17 final point SQL
calls consumed54.62ms. These nested spans are not additive or pure engine CPU.
The point query has no operated variable, so its type-domain resolver issues no
probe. Binding/layout/projection work is deferred unless later evidence differs.

## Candidate A: one acknowledged scope for captured basis and answer

The measured extra transaction comes from `queryAll(...,{includeBasis:true})`:
core reads `adapter.currentCommitPosition`, then Duck's query executor opens its
own snapshot. Each physical transaction performs complete owner reconciliation.
A will combine those operations in one existing acknowledged transaction while
retaining every C++ owner check and the unchanged compiler/native SQL.

The proposed opt-in is `DuckDBRuntimeOptions.readScopePlan = "combined"`, with
`"separate"` as the existing default. A backward-compatible optional internal
`QueryExecutorService.withReadScope` callback scopes an Effect and returns its
errors plus `ReadError`. Only the Duck candidate supplies it, using the **same**
`makeEffectStorage` bundle as its storage and query services. Core uses it only
for `queryAll` with `includeBasis:true`; other paths keep their existing flow.
This is an optional backend SPI, not a new query/schema DSL or public DTO shape.

The proposed flow is precise:

1. Capture `now` once and resolve requested V/R before waiting for the physical
   queue, preserving the current default-time admission point.
2. Enter the optional backend read scope. Inside it, capture the actual source P
   once through the existing storage method.
3. Run the existing typed-domain/compiler/SQL/result-ownership work at that P/V/R.
   Duck's nested snapshot reuses the current private transaction token, rather
   than opening a second physical transaction.
4. Complete result copying, COMMIT/rollback acknowledgment and the unchanged
   ownership activation/audit before the outer scope returns rows and basis.
   Never reread current P after the answer or infer it from a cursor.

The optional hook is absent for non-Duck providers and disabled for the default
Duck profile. The fallback must execute the exact current code path. Direct
executor calls retain their current standalone snapshot. Existing cursor/page
paths remain unchanged in this first candidate; no page speedup is claimed.
Historical R and intentional earlier cuts retain their meaning. No new public
commit-position input is introduced, and unsupported public cut combinations
stay unsupported rather than being silently rounded or cast.

Failures remain transactional: nested failures poison the scope; malformed typed
rows cannot escape before acknowledgment; rollback/unknown/fencing behavior is
preserved. The same-bundle owner identity check must still reject a foreign
physical transaction token. Deadlines, memory, spill and threading stay fixed.
Queued/active cancellation, caller settlement and later physical drain must be
reported separately. Existing acquisition masking is a known risk; A must not
claim to withdraw queued work or weaken cleanup to return earlier.

## Competing mechanisms and separate queue repair

B proposes a validated read epoch: retain an audit only while physical commit,
catalog, connection/enrollment and mutation epochs prove it remains valid.
Logical P alone is insufficient. Writes, unsafe SQL, foreign contexts, schema
changes, uncertain outcomes or failed proofs require complete validation or
fencing. It is a competing native-owner protocol hypothesis, not part of A.

C retains every complete audit but targets its planning/scanning cost. Finer
internal audit spans must first locate the expensive validation query. Possible
consolidated or admissibly prepared native validation must preserve all data,
catalog, uniqueness/presence and foreign-context checks. No long-lived internal
connection or cached result is assumed safe merely because it is faster.

Queued-work withdrawal is a separate correctness item. The measured cancelled
caller returned promptly, yet its accepted metadata transaction later acquired
the owner and spent104.9ms. The repair must propagate read cancellation into
pending acquisition/metadata work, withdraw before physical BEGIN when possible,
and retain actual interrupt plus rollback/ACK safety after acquisition. It must
not interrupt another request, abandon a write, or count caller interruption as
proof of physical cleanup. It is not bundled into A's performance experiment.

## Required gates and comparison

- Targeted core hook/fallback tests must show one captured clock/P, unchanged
  result shapes, explicit historical R, and no extra P capture after results.
- Actual Duck current48 and common142 must pass with exact preimages and
  unchanged expectations. Relevant package/type/consumer checks apply to any
  shared API change; no native rebuild is needed for A unless native code changes.
- Independent read/write interference, old-cut/cursor behavior, reopen, malformed
  row failure, foreign-token refusal, active cancellation and acknowledged
  cleanup must retain the existing owner/integrity guarantees. Existing native
  owner negative gates remain mandatory; no ownership audit is bypassed.
- Repeat the frozen stage observer without changing its resource/oracle contract.
  A's normal public read should use one acknowledged physical transaction and
  one activation. The explicit cancelled request remains separately classified;
  no cancellation qualification is inferred from a measurement-only pass.
- Only then repeat a matched offered-load profile with retained co-runners,
  writer liveness and actual timed populations. Minimum repeats, calibrated
  writer floor, tails and independent promotion gates still apply. A faster
  microdiagnostic is not a throughput/default/target-scale promotion.

All work remains in the Mac C++ engine/owner and returns through TypeScript.
The fixed profile is one engine thread,128,000,000-byte memory,
64,000,000-byte spill,30s request deadline,2GiB/2CPU aggregate group and the
original bounded filesystem. Sources and measurements are hypotheses and
evidence for this wave, not authority to remove an invariant.
