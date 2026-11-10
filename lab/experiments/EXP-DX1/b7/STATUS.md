# DX-B7 handoff

Steps 1–3 committed: `7dd9877f`, `73b9f41a`, `a3a49968`; each completed both native layouts and all 300 differential scenarios.
Step 4 is an unpromoted prototype: notification waits plus an exact-cut revision memo within the configured byte budget.

Final legacy: 21 tests passed. Final Clojure: 14 / 53,715 assertions; feed: 13 / 85. Final performance completed with verified
keep-awake and four workers: O1–O5 missed; O6 met (quiet ACK-to-feed p99 16.8 ms at 1/s, 13.6 ms at Poisson 15/s).

O7 is incomplete. Final lean admission waited 15 minutes; the full gate job queued 28 minutes. After the approximate three-hour
budget, own queued jobs were explicitly cancelled before engine creation. No owned containers remain. See `BUDGET-CANCELLATION.json`.
No final lean or memo-verifier differential success is claimed. Earlier step-3 differential verified parsed entities only.

Resume with a fresh attempt (no source changes first):

```sh
node lab/bin/heavy.mjs --label DX-B7-resume-c -- bash lab/experiments/EXP-DX1/b7/finish-gates.sh c
python3 lab/experiments/EXP-DX1/b7/verify-final.py c
```

The current after-profile still ranks Datomic numeric comparisons and retraction filtering highest. Isolate scope freshness and
cut-selection work, and wake-helper scheduling/cgroup effects, before another optimization claim. No step-5 parser/escaping work.

Durable evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7/`. Report and compact checksum index are in this directory.
No acceptance promotion, contract edits, merge, push or deployment.
