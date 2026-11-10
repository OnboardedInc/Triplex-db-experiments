# DX-B4 retained evidence

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B4/`.

`SHA256SUMS` uses paths relative to that root. Verify with `shasum -a 256 -c` from the root using this worktree's manifest. Bulky native/oracle/HTTP output stays there, outside git.

| Path under root | Content / status |
|---|---|
| `logs/` | First failures, final native-era 175+known-failure gate, current 143-pass/35-skipped offline suite, builds, typechecks, outage and failed cleanup attempts |
| `tx2-dxb4-dev1` through `dev4` | CPU-5 stack identities, source hashes, health, durability and container bindings |
| `mutants-20261110T004607Z/` | Cursor/entity mutated sources, actual failing property outputs, original restored source |
| `initial-route-equivalence/`, `final-route-equivalence/` | Generated native oracle gate output, retained outside git |
| `tx2-dxb4-small-1794271664758/` | Successful seed, then sandbox boot-clock denial; stack removed |
| `tx2-dxb4-small-1794271761811/` | T3 before command correction; stopped on queue growth and feed witness blocker |
| `tx2-dxb4-small-1794272383569/` | T3 after correction; all phases, zero whole-store scans, queue drained, final feed-witness fatal error |
| `tx2-dxb4-full-1794272803358/` | T4 real 10k run interrupted by private Docker/telemetry failure; incomplete report, HTTP headers, copied source/builds, stack identity, interruption and cleanup-recovery receipts |
| `publication-reproduction.json` | Real-client accepted shifted ACK rejected by inherited publication observer |
| `observer-fixture*` | HTTP observation helper exercised on the local transport reproduction |
| `oracle.tar`, `oracle/`, `oracle-commit.txt` | Actual extracted O-REPLAY archive; embedded commit read from the retained tar; final sample was not executed |
| `final-source-unqualified/` | Final working-source copies and hashes; explicitly not a pre-execution native anchor or a passing benchmark |
| `clojure-delimiters.txt` | Delimiter-only structural check, not native compilation |

The interrupted full stack is **not verified removed**. Its measurement lock is retained with its owner receipt. See `REPORT.md` and `recover-cleanup.mjs`; no cleanup PASS is asserted.
