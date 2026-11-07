# Orchestrator responses to Codex plan-v2 round 6 (2026-11-08)

Round 6 (`lab/reviews/plan-v2-round6.codex.md`): R5-8, R5-9, R5-10 CLOSED; R5-4 and R5-11 PARTIAL; 2 new (6, 7). Verdict NOT READY. All
accepted. Finding 7 was caused by the orchestrator appending Q46 to RULINGS-PENDING.md, which the 0.3.6 validator forbids; Q46 and the new
Q47 are held here (no contract authority) until contract 0.3.7 compiles them and implements Q47d.

## Q46 (held here, no authority): rulings on contract 0.3.6 questions (2026-11-08; to compile in the next version)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q46a crash pairs | Accepted: Q42c's crash cases cover all 10 pairs of the five transitions, not only the 4 consecutive gaps. | Q42c |
| Q46b A0 control identity | Accepted: once EXP-N01/N02 measures A0 (at the budget re-freeze), the A0 commit and tree are pinned in the contract and the evaluator takes the control's identity from there, never from the claim. | Q42a |
| Q46c W0 pin layout | Accepted: the W0 pin's file list is adjusted when W0-1.1.1 merges, before V-D01's delta check. | Q44 |
| Q46d O04 follow-up | Accepted: when EXP-O04 lands and is re-verified, a new pin is compiled and the excludes and refusals shrink in that version, with the pin-scope expected-differences list updated. | Q45e |

## Q47 (held here, no authority): rulings on round 6
| Q | Ruling | Basis |
| --- | --- | --- |
| Q47a evidence meaning, not only hashes (R5-4) | Admission validates the complete object graph and every record's schema: the build/import manifest's executed modules are retained objects whose bytes hash to the manifest; verifier records must match the verifier-record schema; every case verdict is recomputed from the retained raw result (an oracle exit 2 or X-NOT-MODELED can never count as PASS). Implemented in EXP-E01; the generator's reference model mirrors it. | round 6 finding 1 |
| Q47b genuine matched control (R5-11) | Both the claim's measurement receipt and its control carry nonempty, validated workload identity (trace generator hash, seed, offer schedule hash, measurement window bounds, slot identity); a missing field never matches a missing field. The A0 control's identity comes from the frozen A0 registry in the contract (Q46b), never from the claim; a candidate-selected control cannot qualify a comparison. | round 6 finding 5 |
| Q47c refusals resolved per case (finding 6) | Admission re-judges the oracle on every case the obligation selects, directly or through a broader case set, and rejects the claim if any case's retained oracle run refused; the per-oracle scope list is advisory, and the generator propagates unsupported-rule dependencies through indirect selections (for example CS-MIGRATION and CS-WIDEN reaching decimal scale evolution), so G7.migration.schema-evolution and G1.types.storage-widening-safe are classified blocked for any case that redeclares a decimal attribute. | round 6 finding 6 |
| Q47d pending rulings (finding 7) | RULINGS-PENDING.md may hold ruling rows; they carry no authority, are never compiled, and their presence is recorded (file hash, listed as pending) without invalidating generation. Until 0.3.7 implements this, pending rows live in review response files. | round 6 finding 7 |

## Q48 (held here, no authority): W0 accepted; delta-check notes
| Q | Ruling | Basis |
| --- | --- | --- |
| Q48a W0 pin | W0-1.1.1 at ada2e90 is ACCEPTED (V-D01 delta check); the contract pins its 95 file hashes (lab/verify/D01/W0-1.1.1-ada2e90-SHA256SUMS) and the fingerprint once the O-DOMAIN author's independent generator reproduces it (Q40g). | V-D01 ACCEPT |
| Q48b narrow-release rung (N3, N4) | The scoped-release P5 measurement runs at the 100k rung; a P5 receipt for a scoped sweep binds the reached-subject list (and its hash) instead of every placement. | V-D01 N3, N4 |
| Q48c next W0 edit (N1, N2, N5) | W0-1.1.2 adds an R3 case with a listed jurisdiction that has no facts, adds "and A's entry for that rule is unscoped" to the SPEC 5.3 skip rule, and records measured R3 counts (9,497 reached, 418 changed) beside the expected ones; none changes an output, a case result, a floor or the fingerprint. | V-D01 N1, N2, N5 |

## Q49 (held here, no authority): EXP-O04 erasure and decimal questions
| Q | Ruling | Basis |
| --- | --- | --- |
| Q49a erasure commit in the journal (R-ERA-2, R-ERA-5) | An erasure commit is an ordinary data-journal transaction: it has a position, a txId, a record in `transactions()` and its own `:_tx/` facts, and its changes list only identities (entity, attribute, assertion ids), never values. It is also written to the erasure ledger kept apart from the data (TARGETS 7 item 5), which restore and rebuild replay. Earlier transactions' `:_tx/change` facts for erased values show the ErasedValue marker (modulo erasure), so the whole-journal comparison of ER-JOURNAL-MODULO compares markers on both sides. | TARGETS 7; Q24, Q31f |
| Q49b idempotence (R-ERA-3) | Accepted: the first erasure of an identity sets `erasedAt`; erasing it again changes nothing; an erase that matches nothing still commits (a journal record with an empty change list). | idempotent commands |
| Q49c erased values in queries (R-ERA-4; provisional, under the Q24 flag for Sam) | An erased value is present with no readable value: it matches no value predicate (equality, inequality, range, pattern), so a filter never selects or rejects a subject by it; value aggregates (SUM, AVG, MIN, MAX) skip it while COUNT of assertions counts it; ORDER BY places erased markers last in a deterministic order by assertion id; grouping puts all erased values of an attribute in one group keyed by the marker; Unique ignores erased values; an erased reference cannot be followed (an include returns the marker). | hard error, never silent; deterministic answers |
| Q49d in-flight reads (R-ERA-6) | Accepted: for a read that started before the erasure published, each erased value may be the old value or the marker. | TARGETS 7 item 1 |
| Q49e JSON number to decimal (R-DEC-18) | A JSON number converts from its as-written reading (Q33a's read-back-as-written text): toDecimal(json 0.1, 2, 1) = 0.1. The exact binary64 expansion is never used for JSON. Decimal text inside a JSON string is E-INVALID-VALUE unless the query converts the string explicitly. | Q33a |

## Q50 (held here, no authority): EXP-P2Q open questions
| Q | Ruling | Basis |
| --- | --- | --- |
| Q50a replica unreachable (open question 2) | Entity and repository pulls fall back to the broker's own record when the replica is unreachable (TARGETS 4.1: the source of truth's own query surface is an eligible fallback). The cheap way is a broker-side current-entity index, which is also a candidate current-index layer for P4 (per-subject current document served from the host, QLever kept for history and analytics); EXP-Q05 builds and measures it. | TARGETS 4.1 items 4-6; P4 |
| Q50b native and Datalog reads beyond the watermark (open question 3) | Native SPARQL and Datalog reads at a basis the replica has not reached wait within the read's deadline (Q31d's 10 ms, extended to the request's own timeout for native queries that name an explicit basis) and then fail with a typed `BasisNotAvailable` error, never an untyped failure; repository reads use the overlay or the broker. Read-your-own-write is a repository-pull guarantee. | Q31d, Q31e |
| Q50c write amplification (open question 4) | Measure and reduce triples per command on QLever (about 750 per 10-fact command against R17's 94): the journal encoding is the first suspect. Owner: EXP-Q05 with EXP-R02. | P2, delta growth |
| Q50d hardening (open question 5) | Required before promotion of the broker composition: an overlay memory bound with backpressure (typed `Overloaded` beyond the bound) for GS.04b-style replica outages, segment rotation with checkpoints, a kernel file lock (flock) in addition to the epoch and marker guard. Out-of-process broker and off-device copies are deferred. | GS.04b; C3 fencing |
| Q50e measurement (open questions 1, 6) | The exclusive-slot run list (A0 and candidate at delta 0/100k/500k, persist-updates off, kill -9 replay, rebuild trigger cost, full trace with burst against QLever, keep-alive recheck on an idle slot) joins the QLever exclusive queue first. | Q47b matched controls |
