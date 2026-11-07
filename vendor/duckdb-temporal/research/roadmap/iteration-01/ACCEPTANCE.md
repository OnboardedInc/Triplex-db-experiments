# Iteration 1 accepted — bounded typed values end to end

Accepted source: `e42a8adc0f6f6f3c0b4eca903016a61bab4c3f67` on draft PR #7. Exact v1 baseline: `fcc3e71f0aa49069dd35384bf17f008421696e4d`. The complete offline `verify_typed.sh` exits 0 on the final stable sources. Every published source slice was checked against its stable handoff hashes and read back from GitHub.

| Required outcome | Evidence |
| --- | --- |
| Four disjoint values; no silent coercion | Native 57, independent SQL 29, browser 96 plus external contract 122; integer1/string1/booltrue/f64(1) remain distinct |
| Exact int64 and both temporal axes | Canonical decimal-string wire values; unsafe-JS-integer cuts on both axes and signed extrema checked |
| Finite float64, normalized zero, ordering | Subnormals/extrema/ties-to-even, positive-zero bits, UTF-8 byte order and unsupported families explicitly checked |
| Typed every derived position and recursive join | Shared compact uint32 kernel; independent golden/graph cases and all eight tuple positions |
| Preserve legacy behavior | 22 legacy native and 23 legacy storage cases; 12,024 exact frozen/current rows/counters/errors; old JS files unchanged |
| History-preserving transactional migration | 26 real migration cases with a transparent adapter and actual native evaluation; physical history/receipts/clock/timestamps, rollback/retry, lost acknowledgement and old-code refusal |
| Robust source boundaries and missing engine | Browser iterator/getter/Proxy correction; all rows validate; genuine missing-artifact persistence/reopen and failed-evaluation rollback |
| Actual v2, not a renamed v1 function | Real C_STRUCT_UNSTABLE v2.0.0 LOAD; pinned headers/footer; host1.4.3 rejection; no version-check bypass |
| Memory/lifetime controls exercised | Core ASan/UBSan and actual-binding 57-case ASan/UBSan pass with leak detection off; bounded resources remain explicit, not full accounting |
| Honest performance evidence | Initial isolated losses retained; tighter paired controls remove strong ABI attribution; slower compact-host proposal rejected |

Heavy primary-source domain/performance research preceded the feature. Actual C API v2 selection reopened the architecture gate; performance and sanitizer-runtime obstacles received further primary-source research and controlled experiments. No speculative hotfix was adopted merely to explain noisy timings.

**Acceptance scope:** the declared small typed whitelist and experimental bounded interfaces. It does not certify a production triple store, complete allocator/cancellation coverage, crash recovery, SQL planning, negation, aggregates, incrementality, temporal intervals or Triplex conformance. Items 2–10 remain ordered future work; begin item 2 with fresh research. Keep the PR draft until the wider requested scope is finished and verified.

See [curated final evidence](checkpoints/1950/README.md); direct native/SQL/migration/source-provenance summaries accompany it. Historical failed setup/helper runs remain in the archive, not relabeled as passes.
