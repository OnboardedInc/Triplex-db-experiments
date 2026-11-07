# V-D01 independent review of the W0 world definition (exp/D01-world-definition a10cd1e)

**North star:** P5 and P3 cannot be judged, and no golden scenario's domain answer can be trusted, until W0 is reviewed by someone who
did not write it (RULINGS Q31i; TARGETS 6.1 items 6 and 7). **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md 2, 6, 6.1, 7;
lab/research/SAM-pasted-targets-2026-11-07.md and SAM-pasted-numbers-2026-11-07.md; RULINGS Q31i and Q36 (including Q36a-clarified).

## Commander's intent
Decide ACCEPT or FIX-FIRST for W0 as the frozen spec that two independent implementers (a TypeScript kernel and the O-DOMAIN oracle)
will build from SPEC.md alone. ACCEPT means: two careful implementers would produce byte-identical outputs on every case and every
generated subject, the coverage floors hold on the generated population, and the workload is representative enough that P5 and GS
results mean something for Onboarded's usage.

## What to check
1. **Precision.** Re-derive every one of the 45 golden cases by hand from SPEC.md (not from the case's expected output). Any mismatch or
   any step where the spec allows two readings is a finding.
2. **Coverage floors on the generated population.** Implement only the population generator from SPEC section 12 (parameters, draw
   function, Zipf weights) plus a minimal rule evaluator in a scratch directory outside the repo, generate the 100k population, and
   measure the four floors (R2 changes ≥ 20% of in-scope subjects' outputs; every rule fires for ≥ 5%; evaluations with 3+ work items
   ≥ 1%; Zipf s = 0.5 fanout over 2,000 locations). Compare with SPEC's expected values. Delete nothing, but never commit this evaluator
   to the repo: the later O-DOMAIN and kernel authors must not see it.
3. **Representativeness.** Against Sam's pasted workload (command sizes 5 to 50 facts, writer mix, duplicates, corrections, read
   fan-out) and TARGETS 6: do the rules exercise P3's dependency-through-reference case, P5's release blast radius and the golden
   scenarios' stories? Name gaps that would let a weak system pass.
4. **Numeric rule.** No floats; token-level integer checks; boundaries at 2^53 - 1 and 2^53; instants as strings.
5. **Determinism.** Canonical JSON, work item id and version hashing (Q36a and the clarified outbox rule), static read sets, the dense
   ordinal for positions under Q31c.

## Boundaries
Worktree branch `verify/D01`; merge `exp/D01-world-definition` into it. Write only `lab/verify/D01/**` (report, findings, a hash table of
lab/world/W0/**). No edits to W0, packages/, oracles, contract. No engines. Python with `python3 -I`.

## Report
Verdict; per-case re-derivation table (45 rows: match or finding); measured coverage floors against SPEC's expected values; findings with
proposed fixes; the verified hash table of every file under lab/world/W0. The orchestrator saves it as VERIFY.md.
