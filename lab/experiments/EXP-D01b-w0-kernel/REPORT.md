# EXP-D01b TypeScript W0 reference kernel: report (saved by the orchestrator, 2026-11-07 23:49Z)

**Bottom line:** written from SPEC.md alone, the kernel matched 87/87 golden cases and all six 100k fingerprint values on its first run,
and every floor equals V-D01's. Three independent implementations (W0 author, O-DOMAIN, this kernel) now agree on 44.5M facts. Cost is
about 158 µs per subject per release (p50 85 µs, p99 1.04 ms), so a 100k sweep needs about 15.8 s of one core; the brief's predictions
(p50 < 50 µs, p99 < 1 ms, < 10 s per sweep) are falsified, and validating every fact (SPEC 4.4, about 96% ballast) is 80% of the cost.
Kernel 6d76f65, receipts 44bc957 on `exp/D01b-w0-kernel`; merged into main 02424ff.

## Results
- Tests: `cd packages/w0 && ./node_modules/.bin/vitest --run` 122/122 (87 case tests cutting each input as raw bytes so `1650.0`, `1.65e3`,
  `3.0` and C66's duplicate key arrive as written; an id check C01-C87; 34 unit tests); a deliberate mutation fails the harness. Rerun by
  the orchestrator: 122/122.
- Fingerprint: `W0_GIT_COMMIT=<sha> node lab/bin/heavy.mjs --label D01b -- node packages/w0/dist/cli/fingerprint.js --n 100000
  --wire-every 50 --out lab/experiments/EXP-D01b-w0-kernel/receipts/fingerprint-100k.json`, 113 s wall at load 15.6-18.9: basis.tx
  4,338,757; facts 44,537,987; worlds, R1, R2, R3 equal. 0 invalid worlds; wire path against typed path 6,000 evaluations, 0 mismatches.
  Floors equal V-D01 (R2 62.293%; MINWAGE under R1 7.810%; OT under R3 16.538%; locations 1,100 / 801 / rank 1,000 29 / smallest 14 /
  mean 49.54; 3+ items 1.567% and 2.459%; R3 reaches 9,497 and changes 418; buckets 50.098/34.894/15.008%; hops 40.14/35.01/24.85%; at most 32
  non-ballast facts in a world). An earlier version before an index rewrite gave the same fingerprint.

## Per-subject cost (Apple M3 Pro, Node 22.23.2, load 12.9-14.4, single thread; ~5% preemption: 81.9 s CPU over 86.7 s wall)
Total of index + rules + json + publish, mean / p50 / p99 µs:
| Bucket (subjects) | R1 | R2 | R3 |
| --- | --- | --- | --- |
| 50-200 facts (50,098) | 60.6 / 45.7 / 288 | 61.2 / 46.3 / 282 | 61.6 / 46.8 / 283 |
| 201-800 (34,894) | 169.2 / 134.5 / 715 | 170.5 / 135.0 / 731 | 172.1 / 135.4 / 733 |
| 801-2,000 (15,008) | 452.6 / 356.8 / 1,655 | 452.6 / 359.7 / 1,668 | 452.6 / 358.3 / 1,690 |
| All (100,000) | 157.3 / 84.6 / 1,040 | 158.0 / 85.5 / 1,033 | 158.8 / 85.8 / 1,045 |
| Sum over 100k | 15.73 s | 15.81 s | 15.88 s |
p99.9 about 2.1 ms; max 17-49 ms (GC or preemption). Segments (R1 mean/p50/p99): index 126.8/57.7/912 (80%, ~0.29 µs per fact); rules
22.9/14.1/126; json 6.0/4.2/23; publish 1.6/0.6/10. Narrow R3 sweep over the 9,497 reached subjects: 1.49 s. Wire path (JSON bytes): mean
508 µs, p50 278 µs, ~3.2x the typed path. Raw samples: /Users/sam/Claude/Projects/triplex-db-2/EXP-D01b/cost-samples-100k-6d76f65.csv.gz.

## SPEC-AMBIGUITY items beyond A01-A10 (ruled Q57)
A11 `NaN`, `Infinity`, `-Infinity` are E_SHAPE (extends A01). A12 integer tokens over 4,300 digits (CPython's int limit) are still
integer tokens: E_VALUE for a value, E_BASIS for a tx. A13 any nesting depth is a valid JSON value, then E_VALUE (iterative scanner;
Python's json raises RecursionError near 1,000). A14 strings order by code point (= UTF-8 byte order = Python sort_keys) for keys and the
sorts of items, subjects, effects, projection and the basis guard's validTime; A07 escapes. A15 inconsistent receiver snapshots are kept as
given and re-sorted stably by seq; only seq = done + 1 releases; entries at or below done, and the second of two duplicates, stay waiting.
Proposed golden cases for each are in the hand-back (A11 payRateCents `NaN`; A12 5,000 nines as payRateCents and as basis.tx; A13 2,000
nested arrays; A14 payload {"😀":1,"":2}; A15 done 2 with waiting seq 2, 4, 4 and a delivery of seq 3).

## API for the P5 sweep (packages/w0)
`sweepSubject(world, release, basis)` returns the output, its canonical bytes and the evaluation record for `publish`, over typed facts
(integers as numbers or bigints). Pure: evaluateWorld, reconcileWorld, affectedSubjects, publish, receive, compileRelease/diff/resolveRelease,
streamed population generator. Effect boundary: evaluate, reconcile, affected return W0Error with the W0.E_* code.

## Files and independence
Changed only packages/w0/**, lab/experiments/EXP-D01b-w0-kernel/receipts/** and the pnpm-lock importer block for packages/w0 (unrelated
lockfile drift, such as a missing packages/duckdb importer, was discarded). Did not read lab/oracles/domain, any D01c branch or report, or
the V-D01 scratch folders. sha256 list: receipts/packages-w0-6d76f65-SHA256SUMS.
