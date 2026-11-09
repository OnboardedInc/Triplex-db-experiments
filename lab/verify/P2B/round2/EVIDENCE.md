# CX-VP2B round-two evidence

Verdict: **ACCEPT-OFFLINE for F1/F2**. Full report:
[VERIFY-round2.md](../VERIFY-round2.md). Candidate:
`e9f0014b0181ec536ffba599551a68a3f5bdb5cd`.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2B/round2/`.

| Retained path | Evidence scope |
| --- | --- |
| `gate-9899538e-0699-44de-98cb-bce6cfd0261c/` | First complete fresh gate: 38 tests in ten files, including 24 unchanged broker tests, nine adapted builder regressions and five new independent schedules. `before.json`, `result.json`, exact `preimages/` and `tests.log` bind candidate/source/runner/dependency/native bytes and unchanged inputs. |
| `independent-1ea0fb25-4e45-43a2-af3c-bf3e0fe36f75/` | Five independent schedule observations and their actual databases. Includes duplicate plus checkpoint, lost ACK with behind watermark, post-marker pause, native-statement pause, and retirement/purge fallback. |
| `gate-30470d1b-b4e5-48fb-b242-1d80ce537b2a/` | Separate checkpoint-first duplicate arrival: 1/1 completed. Later test/runner source versions are captured separately; inputs unchanged. |
| Other `independent-*/` | The focused arrival attempt's own database and receipt observations, linked by its gate's time/input window. These are not substituted for the earlier five schedules. |
| `review-*/` | Fresh databases and observations from the builder's nine regressions, mechanically adapted to this worktree/evidence ownership. Assertion bodies are unchanged. |
| `builder-original.test.ts` | Exact fixture bytes from the reviewed candidate, before adapting relative imports, output ownership and fixture-identity path. |
| `tools-final/` | Final independent tools/configuration copies collected after gate exit. Earlier executing versions remain in the respective gates' `preimages/`. |
| `terminal-logs/` | Original terminal gate/audit logs before removing trailing blank lines from small committed log copies. |
| `unit-files.json` | Exact new regular files under the existing owned `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2B/upstream/` tree created during the first gate. These upstream-test fixtures stay in place and are included by absolute path in this round's manifest. Earlier fixtures/round-one evidence are unchanged. |

The committed `long-audit-attempt1.json` audits historical builder evidence, not
a fresh ten-minute run. It checks the immutable result, all 2,827 raw samples,
a complete hand-derived expected row, WAL measurements, 93 captured source/build
files and source equality to the reviewed candidate. It does not repeat the
builder's entire 162-test gate or re-hash its whole evidence archive.

The two new pause modes are explicit in `read-worker.cjs`. `probe` waits after
a completed marker `get()`; `native` pauses a reviewer-only SQLite function while
the real statement is active. No fabricated query rows are returned. The native
case's incomplete checkpoint demonstrates a retained implicit snapshot. Its
capacity refusal and identical-command recovery are independent of cooperative
reader scheduling.

`SHA256SUMS` indexes retained regular files plus the specifically listed new
owned upstream fixtures. Dependency links are not recursively archived. No
source, prior failure, engine state or durable evidence was deleted. Verify with:

```sh
shasum -a 256 -c lab/verify/P2B/round2/SHA256SUMS
```

Current default suite: 39 tests, including the later arrival variation. Historical
fresh executions in this review are **38 + 1**, not a relabeled 39-test full run.
The candidate was applied without changing product code; original independent
review fixtures were preserved when resolving the two copied-fixture conflicts.
