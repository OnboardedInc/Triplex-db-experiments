# EXP-O02 O-REPLAY conformance to contract 0.3.1 (fix the V-O01 FIX-FIRST list)

**North star:** correctness floor that every P1 to P5 measurement and all 20 golden scenarios stand on. The GS gate takes its expected
answers from this oracle, so a wrong oracle turns every scenario into a wrong verdict. Direct priority links: AMB-09 (duplicates never
double a total) is P2's idempotency under the 10% duplicate and 1% lost-ACK trace; the corrected numeric rule governs every value the
P2 commit path accepts.
**Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md. Contract: lab/acceptance/ACCEPTANCE.md 0.3.1 (section 4 tables), RULINGS.md
Q1 to Q21, lab/research/SAM-pasted-numbers-2026-11-07.md. Inherited homebase files are for code facts only.

## Commander's intent
O-REPLAY becomes a judge the loop can trust without a human: it agrees with every non-ambiguous golden vector, follows every row of
contract section 4 and every ruling through Q21, and gives a typed rejection (not a silently rounded value) as the expected answer
wherever a lane cannot hold a value. When this lands, V-O01's re-run moves the verdict to ACCEPT, the oracle's hashes are pinned in the
contract, and W01's golden scenarios can use its answers as expectations.

## Point of view
- **Independence is the asset; protect it.** Stdlib-only Python, no imports from or reads of `packages/` code. Everything you need
  from the implementation side is stated below; if something is still missing, write it as a RULING-NEEDED item, never read the
  implementation to find out. A shared bug between oracle and product is the failure this whole design exists to prevent.
- **The contract is the spec, the vectors are the check.** Implement section 4 table by table, one unit test per table row (name the
  row id in the test name). Then rerun V-O01's converter (`lab/verify/O01/convert_and_run.py` on branch verify/O01) and drive
  DISAGREE to zero. If a vector and the contract disagree, the contract plus rulings win; report the vector.
- **Facts you need (stated here so you do not read packages/):**
  1. Assert changes in the journal carry `assertionTxId` (assert: value, validFrom, assertionTxId; retract: value, recordedAt,
     retractedAt, retractionTxId).
  2. Reserved namespaces, rejected with WriteError / reserved-namespace: entity ids starting `_triplex/`, attributes starting
     `:triplex/`, entity types starting `triplex.`.
  3. `entityPage` limit is an integer 1..200, default 50; out of range is a typed error; a malformed or foreign cursor is a typed
     cursor error.
  4. Journal facts `:_tx/change` and `:_tx/changed-entity` are queryable like ordinary facts (C6).
- **Section 4 breaks to fix (V-O01 probes):** family order per Q14a with decimal inserted between number and datetime (Q18);
  -0.0 and +0.0 one value with the lowest (recordedPosition, op index) representative (Q14b, AMB-08); `integer < number` is the
  mixed-family preflight error (Q14d); text-to-integer cast rejects '+1', '01', '-0'; add `rem`, `toNumber`, `toInt64`; error tags
  and reasons exactly as section 4.7 (`mixed-family`, `invalid-conversion`, InvalidTripleError, WriteError).
- **Q21 rulings to encode:** AMB-01 A, AMB-02 logical retirement content renamed `retractedAt`/`retractTxId`, AMB-03 no V filter on
  timeline, AMB-04 bit-exact -0 in journal, AMB-06 A (retract-pattern sees staged facts, in order), AMB-07 creation order, AMB-09 B
  (one binding row: SUM 10, COUNT 1), AMB-10 IntegerValue decimal text, AMB-11 `toNumber`, AMB-12 reject empty interval, AMB-13,
  AMB-14, AMB-15 codepoint order, AMB-16 integer range predicates, AMB-17 A. Also the oracle-side RULING-NEEDED changes listed in
  RULINGS Q21 (R-VAL-3, R-ORD-2, R-CMP-3, R-NUM-5, R-NUM-6, R-CMD-6, R-CMD-9, R-JNL-1, R-ENT-6, R-ENT-7).
- **The corrected numeric rule as a lane profile.** Add a per-lane accepted-range profile: XTDB integers to the full signed 64-bit
  range; QLever integers within its exact range (60-bit storage; take ±2^59 as the declared bound unless the contract states
  otherwise); every lane at least ±2^53. A value outside a lane's range has expected answer "typed rejection at write" for that lane.
  A JSON number that is not exactly a binary64 value is an input error. Decimal per Q18 (declared precision and scale; excess digits
  are a typed error, never rounded).

## Boundaries
- Worktree branch `exp/O02-oracle-conformance`. First merge `exp/O01-replay-oracle` into it (main does not contain the oracle yet).
- Files: `lab/oracles/replay/**` only, plus a report. Do not edit golden vectors (report vector bugs), the contract, or packages/*.
- No engine slots needed. Python runs with `python3 -I`.

## Gates
1. Oracle unit tests pass, including one test per section 4 table row and per Q21 ruling.
2. `--self-check` passes.
3. V-O01 converter rerun: DISAGREE = 0 on all 49 vectors; every remaining AMBIGUOUS item cites the ruling that leaves it open.
4. The 8-mutant negative control still yields 8 DISAGREE.
5. Hashes of every oracle file listed in the report.

## Report
Return: commit hash; counts before and after (vectors and items, AGREE/AMBIGUOUS/DISAGREE); the list of vector bugs found, if any; new
RULING-NEEDED items; the file hash table. The orchestrator saves the report as REPORT.md.
