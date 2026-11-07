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

# Re-review of W0-1.1.0 (50d92ef), 2026-11-08: FIX-FIRST on small fixes only (a delta check suffices after them)
- The reviewer's independent evaluator matches all 82 cases byte for byte; all three release hashes recompute; the C01-C45 migration
  changed only what it should (44 of 45 expected outputs identical; C24 drops a dependency by SPEC 6.3's intended rule); every 1.0.0 finding
  is addressed; all six 1.0.0 surviving mutants are now killed.
- Floors measured on the 100k population (44,537,987 facts; 0 invalid worlds): R2 changes 62.293%; lowest firing 7.810% (R1 MINWAGE);
  Zipf largest 1,100, mean 49.54; 3+ work items 1.567% (R1) / 2.459% (R2, R3), margin 0.57 points; R3 changes 4.291% of subjects. World
  sizes match P4's buckets (50.10 / 34.89 / 15.01%; means 124.0 / 499.6 / 1,392.1; hops 3/4/6 at 40.14 / 35.01 / 24.85%); ballast is
  neutral (1,031 sampled worlds, identical bytes with and without ballast under all three releases).
- Must fix: G1 C68 holds `1650.0` not `1.65e3` (exponent mutant survives); G2 C76 carries `wi:TBD`; G3 receive dedup unpinned (projection
  re-applying an equal seq and a duplicated waiting seq both survive; GS.19b depends on them); G4 fingerprint recipe missing from SPEC 12.7;
  G5 SPEC self-contradictions (section 15 item 1, invariant 13.4, 12.2 item 2 numbers, the section 0 title, row 40's citation).
- Decide: G8 R3 narrows by rule, not by subject (OT's read pair is in every placement's static dependencies, so the index reaches all
  100,000 while 4,291 change). Low: G6 K multiple-of-4 claim false at 10k; G7 some worlds 1-2 facts under their bucket; G9 publish and
  receive shape validation underspecified; G10 publish wording (delivery subject source; only live reconciles are published).
- Candidate fingerprint (pin after O-DOMAIN reproduces it with the G4 recipe): basis.tx 4,338,757; worlds sha256:fec1d7ce...c760; R1
  sha256:c1b2d410...1a79; R2 sha256:551bbbc4...b562; R3 sha256:948ba617...698a. Hash table at 50d92ef in W0-1.1.0-50d92ef-SHA256SUMS
  (not for pinning).
