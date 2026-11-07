# V-D01: independent review of W0 (exp/D01-world-definition a10cd1e, SPEC W0-1.0.0) (saved by the orchestrator, 2026-11-08)

**Verdict: FIX-FIRST.** Evaluation is deterministic (the reviewer's own evaluator, written from SPEC.md alone, matches all 45 expected
outputs byte for byte; both release hashes recompute) and all four coverage floors hold on a measured 100k population. Not ready to pin:
the outbox rule, golden-case coverage, the position mapping and workload representativeness. Branch `verify/D01` (9e9a1d9 adds
`lab/verify/D01/W0-SHA256SUMS`, copied here). Scratch evaluator and generator are outside the repo
(`/Users/sam/Claude/Projects/triplex-db-2/V-D01/`) to keep the later implementers independent.

## Coverage floors measured (seed W0-pop-1, N = 100,000, L = 2,000, basis valid time 2026-11-04T12:00Z)
| Floor | SPEC expected | Measured | Holds |
| --- | --- | --- | --- |
| R2 changes ≥ 20% of outputs | 62.3% | 62.293% (I9S2 46.11%, DOCEXP 22.52%, MINWAGE 9.80%) | yes |
| Every rule fires ≥ 5% | lowest 7.9% | 7.810% (MINWAGE under R1); lowest under R2 PAYCHG 9.585% | yes |
| Zipf s = 0.5 over 2,000 locations | largest about 1,125, mean 49.5 | largest 1,100; rank 2 801; rank 1,000 29; smallest 14; mean 49.54 | yes |
| ≥ 1% of evaluations with 3+ work items | 2.0% / 3.0% | 1.890% / 2.928% | yes |

Candidate population fingerprint (pin after a second generator reproduces it): basis.tx 548,695; 1,631,475 facts; worlds digest
sha256:8e121547...c5c4; R1 outputs sha256:ba6df5eb...760d; R2 outputs sha256:9b3ef32f...0b55.

## Findings
| Id | Severity | Finding | Ruling |
| --- | --- | --- | --- |
| F1 | high | Generated worlds hold 6 to 31 facts (p50 17), one reference hop; P4's frozen pull mix is 50 to 2,000 facts over 3 to 6 hops and Sam's paste says 300 to 1,000 facts per placement, so a 100k sweep reads 1.6M facts instead of about 25M to 50M | Q40a |
| F2 | medium-high | Dependencies through references are one hop deep (S.location -> L.*) | Q40b |
| F3 | high | (id, version) delivery key repeats on rollback and on a correction revert (two witnesses) | Q38f; SPEC changes in Q40c |
| F4 | high | Publication order undefined: a late older-basis evaluation publishes after a newer one and the receiver ends stale | Q40d |
| F5 | medium | Six plausible misreadings pass all 45 cases; no case covers MINWAGE row 2, PAYCHG row 4 or W0.E_UNKNOWN | Q40e |
| F6 | medium | The dense ordinal for positions has no stated origin or scope | Q40f |
| F7 | medium | Facts outside W0's schema have no defined handling while the trace needs 5 to 50 facts per command | Q40a (ballast) |
| F8 | low | Passport-expiry draw field unnamed; no reference fingerprint | Q40g |
| F9 | low | An id whose payload returns to its last published value never republishes (second FNC notice) | Q40h |
| F10 | note | Population facts all valid from 2000-01-01; no runtime-outcome attribute; R2's diff reaches every subject, so P5 never exercises "re-run only the affected subjects" | Q40i |

The EXP-D01 REPORT.md coverage numbers (61.7%, s = 1.0) are stale; the measured values above supersede them.
