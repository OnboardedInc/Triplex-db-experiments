# EXP-E01 the claim evaluator: admit a comparison or promotion claim only on verified evidence (Q38b, Q42a)

**North star:** every P1 to P5 verdict the loop reports is a claim; a claim admitted on fabricated or stale receipts turns the hill-climb
into noise. Correctness floor for every comparison and promotion. **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/acceptance/ACCEPTANCE.md
0.3.5 (claim rules, VA rules, receipt format), RULINGS.md Q34d, Q37b, Q38b and RULINGS-PENDING.md Q41d, Q42a; Codex rounds 4 and 5
(lab/reviews/plan-v2-round4.codex.md, plan-v2-round5.codex.md).

## Commander's intent
`node lab/bin/claim.mjs admit <claim.json>` returns QUALIFIED only when every piece of evidence the claim depends on exists, verifies and
is fresh; otherwise DIAGNOSTIC with the exact reasons. When this lands, Codex's fabricated receipt (all-zero object hashes, a different
binary under the same source label) and every other Q42a counterexample are rejected by a test, and the generator's admit_claim
reference model and the lab evaluator agree on every fixture.

## Point of view
1. **Open the objects.** Every object a receipt references must exist in `runs/objects/` and hash to its recorded sha256.
2. **Bind binaries to source.** A receipt names a build/import manifest object listing the executed entry points and module hashes; the
   evaluator recomputes them from the claimed commit's tree and rejects any mismatch (a stale binary under the same source label fails).
3. **Freshness.** Receipts must be produced at the claim's commit, after the last change to any file in their dependency closure.
4. **The claim's own evidence.** An NS or GS claim needs its own measurement receipts with their correctness checks, plus a matched
   control (A0 on the same slot, trace hash, seed and window); prerequisites alone never qualify. Unknown obligation ids are an error.
5. **Oracle and W0 pins (Q37b).** Any null or unaccepted pin the claim depends on makes it DIAGNOSTIC, screening included.
6. **One fixture set, two implementations.** Port the generator's evaluator fixtures (positive and negative) and add Q42a's
   counterexamples; both the reference model and the lab evaluator must give the same verdict on each.

## Boundaries
Worktree branch `exp/E01-claim-evaluator`. Files: `lab/bin/claim.mjs` (new), small shared helpers in `lab/bin/lib.mjs` or `receipt.mjs`
(coordinate: other branches touch gate.mjs, engine.mjs; keep changes local and rebase), tests under `lab/bin/test/`, this folder. Do not
edit lab/acceptance (report contract mismatches as questions). No engines needed.

## Report
Commit hash; the fixture table (fixture, expected, reference model, lab evaluator); the receipt and manifest format you require; questions.
