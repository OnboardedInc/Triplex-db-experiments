# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q41: rulings on contract 0.3.5 questions (2026-11-08; to compile in 0.3.6 with Q40)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q41a Q40 timing | Compile Q40 into 0.3.6 once W0-1.1.0 lands (Q40c and Q40h change the outbox rules again: a reappearing work item publishes a new sequence even with an unchanged payload). | Q40 |
| Q41b Q37c correction | Q37c's tdk1_reference.py hash 923f7577... is superseded by Q38e's fix; the pinned hash is 73467589...bf33. | Q38e |
| Q41c Q39b enforcement | Accepted: the 19 engine-scope XTDB obligations touching a native or raw surface are keyed by native language. | Q39b |
| Q41d admit_claim | Accepted: the generator's admit_claim is a reference model with structural receipt checks; lab/bin's evaluator implements it as a minimum and adds the full receipt-validity (VA) rules. | Q38b |
| Q41e O-TDK1 gating | Accepted: TDK1 and decimal-routing obligations fail closed until the independent vector review sets O-TDK1's acceptance and the V5 pin. | Q37b |

## Q42: rulings on Codex plan-v2 round 5 (2026-11-08; review lab/reviews/plan-v2-round5.codex.md; to compile in 0.3.6)
Round 5: R4-1, 2, 3, 5, 6, 7 CLOSED; R4-4 and R4-8 PARTIAL; 3 new (9 to 11). All accepted.

| Q | Ruling | Basis |
| --- | --- | --- |
| Q42a evidence-backed admission (R4-4, finding 11) | Claim admission opens and verifies the evidence, never only its shape: every referenced object exists in the content-addressed store and its bytes hash to the recorded value; the executed binary and modules are bound to the claimed source tree through a build/import manifest that is itself an object; receipts are fresh (produced at the claim's commit, after the last change to any file in their dependency closure); fault repetitions, modes and verifier evidence required by the obligation are present; the claimed obligation's own measurement receipts exist (for example NS.P2 measurements for an NS.P2 claim) with their correctness checks and a matched control (A0 on the same slot, trace, seed and window); unknown obligation ids are rejected, never dropped. Counterexample fixtures: all-zero object hashes, a stale binary under the same source label, a falsifier receipt from an earlier commit, a claim with prerequisites but no measurement receipt, an unknown id. This is implemented in lab/bin (EXP-E01), with the generator's admit_claim as the reference model. | round 5 findings 4, 11 |
| Q42b receiver ordering (finding 9) | Receivers apply deliveries per id by publication sequence: a state projection records the highest sequence applied and ignores any lower one (it never regresses); an effect that needs every transition processes sequences in order and recovers gaps from the outbox before applying a later one; receiver deduplication is persisted atomically with the receiver's state or effect (or the recipient is idempotent by (id, seq)). Cases: reversed arrival (seq 2 before seq 1 ends on seq 2's payload), a gap, and receiver restart mid-sequence. W0 adds a sixth pure operation `receive(state, deliveries)` so O-DOMAIN gives the expected receiver state. | round 5 finding 9 |
| Q42c one atomic unit (finding 10) | Per subject, the basis guard (Q40d), retirement state (Q40h), publication sequence, latest published payload and the outbox records are persisted in one atomic write under the subject's CAS; the guard advances on empty and unchanged evaluations too. Crash injection between every pair of these transitions is a required case set. | round 5 finding 10 |
