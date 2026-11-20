# Write-path review

The audited runtime includes WFIX1 at `cd2151749`. The single-account zero-reader and bounded-reader arms use the same 100,000-person image and frozen offers. Their report follows [the forecasts](PREDICTIONS.md). The full placement study waits for these results. Q106f currently assigns large accounts their own Datomic systems and pools small ones. [Handoff](HANDOFF.md)

The eight findings cover resend settlement (1), predecessor lifetime in the feed (2), scope-owned progress (3), bulk versus live scheduling (4), tenant admission and fair turns (5), ordered size caps (6), effective predecessor selection (7), and complete feed verification (8).

| Earlier arm, all unfixed | What may change |
| --- | --- |
| `arm-d19-i1-zero-a`, `arm-d19-i1-zero-b` | Resend settlement (1) can change receipt time and disposition. The one-account individual writer offers no fair-turn, grouped lifetime, or prepared-predecessor comparison. |
| `arm-d19-i1-reader-a`, `arm-d19-i1-reader-b` | Resend settlement (1) can change the observed writer contribution. The separate recorder and coverage failures left both arms incomplete. |
| `arm-p6-i1-seed-a`, `arm-d7-small-seed-b` | These were ungrouped seed jobs, with zero scheduled live save retries. Their exact ingest claims and feed should be read within their recorded seed method. |
| `arm-p6-i1-pool-staggered-a` | Resend settlement (1) can change outcomes. The individual writer had no grouped/prepared policy or fair scheduling. Feed exactness and effective writer feature comparisons were unmeasured when the harness stopped. [Recovered windows](STAGGERED-CAPACITY.md) |
| `arm-d7-small-seed` | CPU admission refused the setup before database open. There were zero saves. |

The replay of old retries reports directly observed conflicts and identifies an original committed receipt where those source bytes are present. A missing ledger leaves the conflict count unmeasured. A general HTTP 409 cannot identify a typed resend conflict.

The new gateway gate reads the active writer options and selected base or versioned function at the actual restored cut. It binds the gateway hash, attempt nonce, source, slot and scope before timing. Native preflight and the independent per-cell replay compare the entire typed change payload and positions. Exclusive runtime and source pinning give each result a fresh deployment.
