# Write-path review

The single-account runtime includes WFIX1 at `cd2151749`. The zero-reader and bounded-reader arms use the same 100,000-person image and frozen offers. The placement study waits for these results. Q106f currently assigns large accounts their own Datomic systems and pools small ones. [Handoff](HANDOFF.md) · [Forecasts](PREDICTIONS.md)

The next grouped arm uses WFIX1 `6b83caa71` or later. The merge takes WFIX1's compact JSON escaping and legacy retirement behavior and its synchronized native function readback. The grouped pilot uses bounded mode with compact rows and prepared reuse. Predecessor lookup, retained ledger, packed journal and fast reply stay off for that comparison. Each flag is included in the live gateway readback and checked at the restored cut. The current single-account retries use the same writer revision and original verified image.

The latest WFIX1 merge includes the native layout-replay check and the managed SQL recovery evidence. The imported tests compare exact journal rows and original receipt tuples on a fresh scoped replay, and the SQL checks match source, slot, nonce and the captured durable cut. Those gates are recorded in the upstream report. [WFIX1 report](../wfix1/REPORT.md)

The eight findings cover resend settlement (1), predecessor lifetime in the feed (2), scope-owned progress (3), bulk versus live scheduling (4), tenant admission and fair turns (5), ordered size caps (6), effective predecessor selection (7), and complete feed verification (8).

| Earlier arm, all unfixed | What may change |
| --- | --- |
| `arm-d19-i1-zero-a`, `arm-d19-i1-zero-b` | Resend settlement (1) can change receipt time and disposition. The one-account individual writer offers no fair-turn, grouped lifetime, or prepared-predecessor comparison. |
| `arm-d19-i1-reader-a`, `arm-d19-i1-reader-b` | Resend settlement (1) can change the observed writer contribution. The separate recorder and coverage failures left both arms incomplete. |
| `arm-p6-i1-seed-a`, `arm-d7-small-seed-b` | These were ungrouped seed jobs, with zero scheduled live save retries. Their exact ingest claims and feed should be read within their recorded seed method. |
| `arm-p6-i1-pool-staggered-a` | Resend settlement (1) can change outcomes. The individual writer had no grouped/prepared policy or fair scheduling. Feed exactness and effective writer feature comparisons were unmeasured when the harness stopped. [Recovered windows](STAGGERED-CAPACITY.md) |
| `arm-d7-small-seed` | CPU admission refused the setup before database open. There were zero saves. |

Each zero-reader arm sent 1,633 planned resends. All 1,633 returned their original receipt via the already-committed path. The reports record zero unexpected typed conflicts in either run. Neither incomplete reader arm emitted the terminal retry ledger, so its count is unmeasured.

The staggered archive contains 14,236 planned resend traces. Of those, 9,515 reached a transact route and 9,514 received HTTP 409. All 9,514 match an original acknowledgement by the end of that retry. Separately, 3,391 primary save traces had more than one transact and at least one HTTP 409. All 3,391 eventually acknowledged. No retained primary ended in a typed conflict. HTTP traces record status without the gateway error code, so CAS-only counts are unmeasured. [Retry evidence](evidence/write-audit-retries.sha256)

The new gateway gate reads the active writer options and selected base or versioned function at the actual restored cut. It binds the gateway hash, attempt nonce, source, slot and scope before timing. Native preflight and the independent per-cell replay compare the entire typed change payload and positions. Exclusive runtime and source pinning give each result a fresh deployment.
