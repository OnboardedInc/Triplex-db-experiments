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
