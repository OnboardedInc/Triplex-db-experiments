# V-O02 independent verification of O-REPLAY 0.2.0 (EXP-O02 at 03519ae) against contract 0.3.3

**North star:** correctness floor. The oracle is the judge for every golden scenario and for P2's idempotency semantics; it may judge
only after an independent verifier accepts it. **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/acceptance/ACCEPTANCE.md 0.3.3,
RULINGS.md Q1 to Q33.

## Commander's intent
Decide ACCEPT or FIX-FIRST for O-REPLAY 0.2.0 without trusting its author's report. The riskiest part is the converter patch: a patch
that "adapts field names" can also hide disagreements. When this lands, either the oracle is merged and its hashes pinned in the
contract, or there is a precise fix list.

## What to check
1. **The converter patch first.** Diff the patched converter against V-O01's original (`git show verify/O01:lab/verify/O01/convert_and_run.py`;
   the patch is `/Users/sam/Claude/Projects/triplex-db-2/EXP-O02-oracle-conformance/converter-rerun/patch_converter.py`). For each of
   P1 to P9, decide whether it only maps names and query kinds, or whether it changes how an answer is judged. Plant at least 8 new wrong
   expectations, some of them in the areas the patch touches (errors, retirement fields, `find` and `count`, journal facts, cursors), and
   confirm each comes back DISAGREE through the patched converter.
2. **Rerun everything yourself:** unit tests, `--self-check`, the patched converter on the core lane and with `O02_LANE=qlever`, V-O01's
   23 section 4 probes, the 8-mutant negative control. Compare with the author's counts.
3. **Independence:** stdlib-only imports; no reads of packages/ code (search the oracle for paths, `packages`, `require`, subprocess calls).
4. **Delta to contract 0.3.3:** list which 0.3.3 rules the oracle does not yet model (Q22 decimal operations and `divide`, Q30 wire
   guards, Q31c totally ordered coordinates, Q33 rulings) and whether any golden vector depends on them. These do not block ACCEPT if no
   vector or obligation that the oracle would close depends on them; they become EXP-O03.
5. **Vector bugs:** confirm or refute each of the author's four vector bugs.

## Boundaries
Worktree branch `verify/O02`. Merge `exp/O02-oracle-conformance` into it. Write only `lab/verify/O02/**` (scripts, results, a hash table).
No edits to the oracle, vectors, contract or packages/. No engines. Python with `python3 -I`.

## Report
Verdict (ACCEPT or FIX-FIRST) with the evidence table; the patch review per P1 to P9; planted-error results; your rerun counts; the 0.3.3
delta list; vector-bug verdicts; the per-file hash table you verified. The orchestrator saves it as VERIFY.md.
