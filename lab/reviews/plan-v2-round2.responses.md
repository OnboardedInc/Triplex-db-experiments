# Orchestrator responses to Codex plan-v2 round 2 (2026-11-07)

Round 2 (`lab/reviews/plan-v2-round2.codex.md`): 7 CLOSED (1, 3, 4, 5, 10, 12, 13), 7 PARTIAL (2, 6, 7, 8, 9, 11, 14), 6 new (15 to 20).
Verdict NOT READY. All partial and new items are accepted; rulings Q31a to Q31k in `lab/acceptance/RULINGS.md`; TARGETS 1.1, 4.1, 6.1
and 7 updated.

| Finding | Decision | Ruling |
| --- | --- | --- |
| 2 P2 rejection loophole | every oracle-valid command must publish; bounded outstanding work | Q31a |
| 6 W0 is a topic list | domain comparisons blocked until V-D01 reviews and pins W0 | Q31i |
| 7 GS.19 wording | zero duplicate externally visible effects | Q31h |
| 8, 17 erasure versus C6, current frontier | erasure frontier independent of basis; modulo erasure on C6, raw, native, SDK; key-exclusivity evidence | Q31f |
| 9 decimal widening | metadata-only only with preserved integer digits and proven key compatibility | Q31g |
| 11, 16 watermark routing, ACK during outage | coordinates with epochs, fully resolved prefix, reconstructability, 10 ms deadline-aware fallback; ACK after source publication with routed read-your-own-write | Q31d, Q31e |
| 14 negative-only evaluator catalog | add positive fixtures | Q31k |
| 15 non-dense positions | (stream, epoch, offset, ordinal) coordinates, atomic ordinal assignment, aborted-offset accounting, four falsifiers before claims | Q31c |
| 18 W0 coverage self-selected | frozen coverage floors, independent review | Q31i |
| 19 forced mutations scale with readers | split reads straddle existing trace commands | Q31b |
| 20 legacy signed-64 vectors | compiled lane-specific outcomes, originals kept | Q31j |

Design change worth noting: Q31e reverses Q28's "ACK only after the current index reaches the commit". A current-index outage would
otherwise stop all ACKs (P2) for its duration; routing keeps read-your-own-write exact while the index is behind.
