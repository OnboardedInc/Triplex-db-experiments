# V-D01c independent review of O-DOMAIN (exp/D01c-o-domain 276a280)

**North star:** P5 (release activation over 100k subjects without hurting live traffic) and P3's dependency-through-reference case cannot
be judged, and no golden scenario's domain answer can be trusted, until the W0 world and its oracle are pinned (RULINGS Q31i; TARGETS
6.1 items 6 and 7). W0-1.1.1 is accepted (V-D01); O-DOMAIN is its second implementation. **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md,
lab/TARGETS.md 6, 6.1; lab/world/W0/SPEC.md; lab/verify/D01/VERIFY.md; lab/experiments/EXP-D01c-o-domain/REPORT.md; Q53 in
lab/reviews/plan-v2-round6.responses.md.

## Commander's intent
Decide ACCEPT or FIX-FIRST for pinning O-DOMAIN at 276a280 as the domain oracle that judges the TypeScript kernel and every golden
scenario's domain expectation. ACCEPT means O-DOMAIN implements SPEC.md, not the golden outputs: a kernel that follows the SPEC and
differs from O-DOMAIN would be right and O-DOMAIN wrong in no case you can find.

## What to check
1. **Rule fidelity.** Read w0.py against SPEC.md section by section (rules R1-R3, the 11 rules, validation order 4.4, hashing 5.2, diffs
   5.3, activation 5.4, business days 6.1, publish and receive 8.8-8.9, invariants 13). Any place the code does something the SPEC does not
   say, or fits a golden output rather than a rule, is a finding.
2. **Can the cases fail it?** Make at least 15 single-point mutations of w0.py and population.py in a scratch copy outside the repo (an
   off-by-one in addBusinessDays, a swapped tie-break in 5.4, a dropped wage-floor hop, a validation step reordered, a float sneaking into
   canonical JSON, a Zipf weight changed). Report which ones the 87 cases, the 119 tests and the fingerprint catch. A mutation nothing
   catches is a coverage finding against W0, with the case that would catch it.
3. **Fingerprint.** Re-run the 100k fingerprint yourself through `node lab/bin/heavy.mjs --label V-D01c -- python3 -I
   lab/oracles/domain/cli.py --population --rung 100k --fingerprint --expect` and compare the receipt's source hashes with the files.
4. **The ten readings A01-A10 (Q53).** For each, say whether the SPEC already decides it (then the reading must match), or it is a real
   gap (then write the golden case W0-1.1.2 should add: input and expected output).
5. **Independence.** Check that O-DOMAIN shares no code with V-D01's evaluator or with packages/ (search for distinctive helper names and
   structure); report anything that looks copied.
6. **Numeric rule.** No floats anywhere; token-level integer handling at 2^53 - 1 and 2^53; instants as strings.

## Boundaries
Worktree branch `verify/D01c` from `exp/D01c-o-domain`. Write only `lab/verify/D01c/**`; scratch mutations live outside the repo under
/Users/sam/Claude/Projects/triplex-db-2/V-D01c/. No edits to lab/oracles/domain, lab/world/W0, packages/ or the contract. No engines.
Python with `python3 -I`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Report (return as text; the orchestrator saves it as lab/verify/D01c/VERIFY.md)
Verdict; a table of checks 1-6 (PASS or FINDING with evidence); the mutation table (mutation, caught by, or uncaught plus the proposed
case); per-reading verdicts for A01-A10 with proposed golden cases; the recomputed hash table of lab/oracles/domain at 276a280.
