# Reader trial: modest isolated gains, residual accepted-baseline cost

**Item 2 remains held.** The isolated fresh public FP-mode reader is correctness-verified, but this trial does not establish full performance recovery. Source stays `ae50094cd242c4d46950f8a9a99d1ecdca03b7f8`; no follow-on codec patch has been made. Items 3–10 remain queued. The next step is renewed primary-source research on the independently documented per-cell key/validation leaf, not another reader timing rerun or a production-readiness claim.

## Captured results

All 168 timed processes / 11,760 public outcomes pass. Each comparison has 42 fresh-process pairs across two rounds: three measured calls and two warmups per control in each process. A (current FFC reader versus new reader, SAME native480456 artifact) terminates with actual controller exit0 and full captured closure before B (accepted item1+5b661 versus new reader+480456). The whole timing invocation and capture pipeline exit0. Separate profiles run afterward only under the original immutable conditional gate: all three processes /294 public outcomes pass, with zero accepted-baseline FP reads and unchanged six/query or seven/query_json for both hardened variants across all shapes.

The ratio is **reader-only / baseline; greater than 1 is slower**. Intervals below are descriptive 95% pair-bootstrap intervals, not family-wise or equivalence guarantees. The signal screen was predeclared: median above 1.05, lower interval above 1, both round medians above 1. A has no such regression signals. B still has five; positive estimates below the screen are reported rather than described as no effect.

| Control | A: reader / FFC [95% interval] | B: reader / accepted item1 [95% interval] | B investigation signal |
| --- | --- | --- | --- |
| float256-query | 0.9829 [0.9361, 1.0169] | 1.0878 [1.0464, 1.1103] | Yes |
| float256-query_json | 0.9703 [0.9272, 1.0098] | 1.0833 [1.0622, 1.1377] | Yes |
| mixed64-query | 0.9722 [0.9474, 1.0149] | 1.0307 [0.9933, 1.0752] | No |
| mixed64-query_json | 0.9567 [0.9200, 0.9892] | 1.0535 [1.0225, 1.0983] | Yes |
| empty-query | 0.9849 [0.9316, 1.0405] | 1.0366 [0.9775, 1.0734] | No |
| empty-query_json | 0.9763 [0.9282, 1.0171] | 1.0162 [0.9576, 1.0472] | No |
| no_float64-query | 0.9683 [0.9432, 1.0029] | 1.0388 [1.0066, 1.0546] | No |
| no_float64-query_json | 0.9650 [0.9234, 1.0199] | 1.0396 [0.9794, 1.0801] | No |
| tiny_float1-query | 0.9518 [0.9168, 0.9853] | 1.0400 [0.9996, 1.0559] | No |
| tiny_float1-query_json | 1.0193 [0.9805, 1.0723] | 1.0085 [0.9621, 1.0492] | No |
| tiny_no_float1-query | 0.9857 [0.9552, 1.0538] | 1.0062 [0.9804, 1.0365] | No |
| tiny_no_float1-query_json | 0.9463 [0.9065, 0.9790] | 0.9984 [0.9518, 1.0402] | No |
| wide_float256-query | 0.9631 [0.9402, 0.9755] | 1.1162 [1.0773, 1.1538] | Yes |
| wide_float256-query_json | 0.9709 [0.9519, 1.0043] | 1.1192 [1.0768, 1.1526] | Yes |

For the wide query, A estimates about 3.7% lower statement-level time; its interval is below 1. The corresponding wide JSON and both float256 intervals include1. The B float256 and wide estimates remain about 8–12% slower, with all four intervals above 1. Mixed64 JSON also retains a 5.3% signal. This is a small pinned-history experiment, not evidence about all production workloads, exclusive Python/native causation or full storage scalability.

## Independent verification and preserved boundaries

The frozen owner analyzers and both saved-statistic verifiers exit0. Root uses separate stdlib code, not the study analyzer, to reconstruct every 1,176 pair row,28 control summaries, all round/load-order medians and 560,000 seeded bootstrap medians exactly. Its verifier passes 23 standalone median/strict-type/JSON/optimized-mode controls before reading actual data; the actual first derivation exits0. A distinct reviewer independently joins actual outer/controller/child exits, provenance, phase order, all 11,760 checksum/counter outcomes and all 56 complete untimed tagged payloads, without importing the harness validators, application, DuckDB or FP reader. Its first audit hashes 1,363 actual files and passes 40 targeted negative checks. Full reports and any supplementary profile checks are preserved alongside raw records; these counts overlap, not a combined certification score.

The physical database is the original closed320-fact/10-commit history. Wide means 256 result rows ×8 cells (2,048 total cells /1,024 float cells), not 1,024 stored facts. The CPU8 affinity is not exclusive CPU isolation. DuckDB threads1, ordinary CPython3.12.14/glibc2.41, GC enabled, supported controls, original caps and exact source/runtime/artifact/template identities are retained. The statement `result = fn(request)` may dispose the previous result before the stop clock; external oracle normalization is afterward. No preclear, GC suppression, trimming, favorable new seed, pooled campaign or automatic rerun was used. Profile seconds overlap and are distorted diagnostics, not latency ratios or disjoint/exclusive causes.

Earlier initial27% persisted cost, researched batch recovery, reader-preparation self-capture failure, QA setup/sticky-flag failures, negative candidate and incomplete large Python-carrier sanitizer evidence remain preserved in earlier checkpoints. This trial does not replace or relabel them. The earlier reader correctness/strict untimed freeze is main`d01d36e22d7fb3a8eef74331dd20e88da927765b`, checkpoint0049. This later checkpoint adds the actual immutable gate, all timed/profile raw and analysis, capture exits, independent derivation/review and renewed blocker state.

## Current action

Two fresh native Sol 6.1 max research lanes have completed renewed primary-source and model work. The selected [C1-P + C2 decision](../../residual-research/codec-renewal/CODEC-DECISION.md) keeps the entire public carrier function verbatim, adds one private identical after-key shape tail bound by an actual-suite AST identity invariant, and replaces only private expected-key sets with immutable metadata. Shared domain logic, both selected-payload lookups, initial exact admission and all guards/transactions remain unchanged. Unlike the earlier shared-tail alternative, this adds no public helper frame. No codec patch has started. The decision and full research must be durably verified before an explicit writer handoff. Performance source-only method preparation may proceed separately; actual candidate/DB/preflight/timing require new gates. No Codex, user computer, source force-push, merge, deployment or GitHub deletion.
